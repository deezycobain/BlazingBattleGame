#!/usr/bin/env python3
"""Import the September 27 uploaded combat assets into versioned runtime paths.

The ZIP files at repository root remain the immutable user-upload source record.
Only split, normalized runtime frames and selected card art are written beneath
assets/. Existing V1/V2 character assets are intentionally never replaced.
"""
from pathlib import Path
from shutil import copy2
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from collections import deque

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RUNTIME_CANVAS = (512, 768)
# The approved Egyptian character sheets contain eight poses arranged 4×2.
# They are not the older six-frame (3×2) layout.  Treating them as 3×2
# combines adjacent poses into one image, which produces doubled characters
# and makes each character appear far too small in battle.
BODY_GRIDS = {
    'gaara': {
        'idle': (3, 2),
        'run': (5, 2),
        'attack/basic': (4, 3),
        'recoil': (4, 2),
    },
    'naruto_solar': {
        'idle': (4, 2),
        'run': (5, 2),
        'attack/basic': (4, 3),
        'recoil': (4, 2),
    },
}
ATLAS_GRIDS = {
    '01_fireball_animation_sprite_sheet.png': (4, 2),
    '02_fire_explosion_impact_sprite_sheet.png': (4, 2),
    '01_universal_hit_spark.png': (6, 2),
    '02_heavy_impact_and_smoke_vfx.png': (6, 2),
    '03_ground_dust_and_slash_vfx.png': (6, 2),
    '04_blue_energy_slash.png': (4, 2),
    '05_wind_attack.png': (4, 2),
    '06_lightning_attack.png': (4, 2),
    '07_paper_bomb_vfx.png': (6, 2),
    '08_rasengan_vfx.png': (3, 2),
    '09_rasengan_hit_fx.png': (3, 2),
    '04_earth_sand_style_12_frame_atlas.png': (6, 2),
}
CHARACTERS = {
    'gaara': {
        'archive': 'egyptian_gaara_approved_assets.zip',
        'prefix': 'egyptian_gaara',
        'card': 'egyptian_gaara_card_art.png',
    },
    'naruto_solar': {
        'archive': 'solar_pharaoh_naruto_approved_assets.zip',
        'prefix': 'solar_pharaoh_naruto',
        'card': 'solar_pharaoh_naruto_card_art.png',
    },
}
VFX_ARCHIVES = {
    'blazing_battle_vfx_fireball_pack_03.zip': {
        '01_fireball_animation_sprite_sheet.png': 'fireball/projectile',
        '02_fire_explosion_impact_sprite_sheet.png': 'fireball/impact',
    },
    'blazing_battle_vfx_upload_pack_02.zip': {
        '01_universal_hit_spark.png': 'common/hit_spark',
        '02_heavy_impact_and_smoke_vfx.png': 'common/heavy_impact_smoke',
        '03_ground_dust_and_slash_vfx.png': 'common/ground_dust_slash',
        '04_blue_energy_slash.png': 'common/blue_energy_slash',
        '05_wind_attack.png': 'common/wind_attack',
        '06_lightning_attack.png': 'common/lightning_attack',
        '07_paper_bomb_vfx.png': 'common/paper_bomb',
        '08_rasengan_vfx.png': 'rasengan/projectile',
        '09_rasengan_hit_fx.png': 'rasengan/impact',
    },
    'blazing_battle_vfx_upload_pack_01.zip': {
        '04_earth_sand_style_12_frame_atlas.png': 'sand/blast',
    },
}
LIGHTNING_ARCHIVE = 'Blazing_Battle_Lightning_QC_Pack_v2.zip'
LIGHTNING_FRAMES = {
    'lightning_projectile_8f.png': 8,
    'lightning_hit_burst_10f.png': 10,
    'lightning_charge_aura_12f.png': 12,
    'lightning_pillar_strike_10f.png': 10,
    'lightning_spark_particles_8f.png': 8,
}


def edges(length, count):
    return [round(index * length / count) for index in range(count + 1)]


def find_one(root, name):
    matches = list(root.rglob(name))
    if len(matches) != 1:
        raise SystemExit(f'expected exactly one {name} under {root}, found {len(matches)}')
    return matches[0]


def cells(image, columns, rows):
    xs, ys = edges(image.width, columns), edges(image.height, rows)
    for row in range(rows):
        for column in range(columns):
            yield image.crop((xs[column], ys[row], xs[column + 1], ys[row + 1]))


def connected_components(image):
    """Return substantial, isolated RGBA silhouettes from a packed sheet.

    Several supplied run/recoil frames extend a few pixels past their nominal
    grid boundary.  Selecting the connected silhouette by its grid-cell
    centroid retains that edge of the intended pose while discarding its
    neighbour, instead of baking both into a runtime frame.
    """
    source = image.convert('RGBA')
    alpha = source.getchannel('A')
    width, height = source.size
    pixels = alpha.tobytes()
    visited = bytearray(width * height)
    components = []
    # Ignore near-transparent anti-alias/glow pixels while grouping.  They can
    # form invisible bridges between neighbouring packed poses even though the
    # visible silhouettes are separate.
    alpha_floor = 10
    for start, value in enumerate(pixels):
        if value <= alpha_floor or visited[start]:
            continue
        queue = deque([start])
        visited[start] = 1
        members = []
        min_x = max_x = start % width
        min_y = max_y = start // width
        sum_x = sum_y = 0
        while queue:
            index = queue.popleft()
            members.append(index)
            x, y = index % width, index // width
            min_x, max_x = min(min_x, x), max(max_x, x)
            min_y, max_y = min(min_y, y), max(max_y, y)
            sum_x += x
            sum_y += y
            if x and pixels[index - 1] > alpha_floor and not visited[index - 1]:
                visited[index - 1] = 1
                queue.append(index - 1)
            if x + 1 < width and pixels[index + 1] > alpha_floor and not visited[index + 1]:
                visited[index + 1] = 1
                queue.append(index + 1)
            if y and pixels[index - width] > alpha_floor and not visited[index - width]:
                visited[index - width] = 1
                queue.append(index - width)
            if y + 1 < height and pixels[index + width] > alpha_floor and not visited[index + width]:
                visited[index + width] = 1
                queue.append(index + width)
        if len(members) < 1000:
            continue
        components.append({
            'area': len(members),
            'center': (sum_x / len(members), sum_y / len(members)),
            'bbox': (min_x, min_y, max_x + 1, max_y + 1),
            'members': members,
        })
    return components


def isolated_body_cells(image, columns, rows):
    """Yield the intended pose per grid cell, falling back to a cell crop.

    A few source frames deliberately touch in the packed sheet.  Those merged
    clusters are safely handled by the ordinary grid crop; all independent
    silhouettes use their full isolated bounds and therefore cannot show a
    neighbouring character.
    """
    source = image.convert('RGBA')
    width, height = source.size
    alpha_values = source.getchannel('A').tobytes()
    xs, ys = edges(width, columns), edges(height, rows)
    components = connected_components(source)
    median_area = sorted(component['area'] for component in components)[len(components) // 2] if components else 0
    for row in range(rows):
        for column in range(columns):
            left, top, right, bottom = xs[column], ys[row], xs[column + 1], ys[row + 1]
            candidates = [
                component for component in components
                if left <= component['center'][0] < right
                and top <= component['center'][1] < bottom
                and component['area'] <= median_area * 1.5
            ]
            if not candidates:
                yield source.crop((left, top, right, bottom))
                continue
            component = max(candidates, key=lambda candidate: candidate['area'])
            x0, y0, x1, y1 = component['bbox']
            pose = source.crop(component['bbox'])
            mask = bytearray((x1 - x0) * (y1 - y0))
            for index in component['members']:
                x, y = index % width, index // width
                mask[(y - y0) * (x1 - x0) + (x - x0)] = alpha_values[index]
            pose.putalpha(Image.frombytes('L', pose.size, bytes(mask)))
            yield pose


def normalize_body(cell):
    cell = cell.convert('RGBA')
    alpha = cell.getchannel('A').getbbox()
    if not alpha:
        raise SystemExit('body sheet has an empty frame')
    pose = cell.crop(alpha)
    # Keep a deliberate transparent safety border.  This prevents fast cloak,
    # staff, and run-pose extremities from touching the runtime canvas edge.
    max_width, max_height = 400, 660
    scale = min(max_width / pose.width, max_height / pose.height)
    size = (max(1, round(pose.width * scale)), max(1, round(pose.height * scale)))
    pose = pose.resize(size, Image.Resampling.LANCZOS)
    output = Image.new('RGBA', RUNTIME_CANVAS)
    output.alpha_composite(pose, ((RUNTIME_CANVAS[0] - pose.width) // 2, 742 - pose.height))
    return output


def save_split(source, destination, grid, normalize=False):
    image = Image.open(source).convert('RGBA')
    columns, rows = grid
    destination.mkdir(parents=True, exist_ok=True)
    for old_frame in destination.glob('frame_*.png'):
        old_frame.unlink()
    source_cells = isolated_body_cells(image, columns, rows) if normalize else cells(image, columns, rows)
    for index, cell in enumerate(source_cells, start=1):
        output = normalize_body(cell) if normalize else cell
        output.save(destination / f'frame_{index:02d}.png', optimize=True)


def import_characters(temp):
    for unit_id, config in CHARACTERS.items():
        extracted = temp / unit_id
        with ZipFile(ROOT / config['archive']) as archive:
            archive.extractall(extracted)
        unit_root = ROOT / 'assets' / 'characters' / unit_id
        prefix = config['prefix']
        animation_sources = {
            'idle': f'{prefix}_idle.png',
            'run': f'{prefix}_run.png',
            'attack/basic': f'{prefix}_basic_attack.png',
            'recoil': f'{prefix}_recoil.png',
        }
        for animation, filename in animation_sources.items():
            save_split(find_one(extracted, filename), unit_root / 'sprites' / 'runtime' / 'v1' / animation, BODY_GRIDS[unit_id][animation], normalize=True)
        card_source = find_one(extracted, config['card'])
        card_target = unit_root / 'cards' / f'{unit_id}_approved_card_art.png'
        card_target.parent.mkdir(parents=True, exist_ok=True)
        copy2(card_source, card_target)


def import_vfx(temp):
    for archive_name, mappings in VFX_ARCHIVES.items():
        extracted = temp / archive_name.removesuffix('.zip')
        with ZipFile(ROOT / archive_name) as archive:
            archive.extractall(extracted)
        for filename, target in mappings.items():
            save_split(find_one(extracted, filename), ROOT / 'assets' / 'vfx' / 'uploaded-v3' / target, ATLAS_GRIDS[filename])

    extracted = temp / 'lightning-qc'
    with ZipFile(ROOT / LIGHTNING_ARCHIVE) as archive:
        archive.extractall(extracted)
    for filename, frame_count in LIGHTNING_FRAMES.items():
        save_split(find_one(extracted, filename), ROOT / 'assets' / 'vfx' / 'uploaded-v3' / 'lightning' / filename.removesuffix('.png'), (frame_count, 1))


def main():
    with TemporaryDirectory(prefix='blazing-september27-assets-') as directory:
        temp = Path(directory)
        import_characters(temp)
        import_vfx(temp)
    print('September 27 asset import PASS: Egyptian Gaara/Solar Naruto V1 body sheets and uploaded V3 VFX are versioned and normalized.')


if __name__ == '__main__':
    main()
