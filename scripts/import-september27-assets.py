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

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RUNTIME_CANVAS = (512, 768)
BODY_GRID = (3, 2)
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


def normalize_body(cell):
    cell = cell.convert('RGBA')
    alpha = cell.getchannel('A').getbbox()
    if not alpha:
        raise SystemExit('body sheet has an empty frame')
    pose = cell.crop(alpha)
    max_width, max_height = 418, 676
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
    for index, cell in enumerate(cells(image, columns, rows), start=1):
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
            save_split(find_one(extracted, filename), unit_root / 'sprites' / 'runtime' / 'v1' / animation, BODY_GRID, normalize=True)
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
