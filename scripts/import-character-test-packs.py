#!/usr/bin/env python3
"""Import the uploaded twelve-frame character and elemental VFX test packs.

The root ZIP files remain the source-of-record uploads. This importer copies only
runtime frames into versioned directories, preserving prior six-frame assets.
"""
from pathlib import Path
from shutil import copy2
from tempfile import TemporaryDirectory
from zipfile import ZipFile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CHARACTER_PACKS = {
    'subzero': 'Blazing_Battle_SubZero_Test_Assets.zip',
    'scorpion': 'Blazing_Battle_Scorpion_Test_Assets.zip',
    'mashle': 'Blazing_Battle_Mashle_Test_Assets.zip',
}
VFX_PACKS = {
    'particle': 'blazing_battle_particle_vfx_upload_ready.zip',
    'attack': 'blazing_battle_vfx_pack.zip',
}
GRID = (6, 2)
OBITO_RECOIL_SOURCE = ROOT / 'obito recoil sprite sheet.png'


def edges(length, count):
    return [round(index * length / count) for index in range(count + 1)]


def copy_character_frames(extracted, character):
    source = next(extracted.rglob(f'assets/characters/{character}/sprites/runtime'))
    destination = ROOT / 'assets' / 'characters' / character / 'sprites' / 'runtime' / 'v2'
    for animation in ('idle', 'run', 'attack', 'recoil'):
        source_dir = source / animation
        target_dir = destination / animation
        target_dir.mkdir(parents=True, exist_ok=True)
        for frame in sorted(source_dir.glob('frame_*.png')):
            copy2(frame, target_dir / frame.name)


def split_vfx(source, destination):
    image = Image.open(source).convert('RGBA')
    columns, rows = GRID
    xs, ys = edges(image.width, columns), edges(image.height, rows)
    destination.mkdir(parents=True, exist_ok=True)
    for row in range(rows):
        for column in range(columns):
            index = row * columns + column + 1
            cell = image.crop((xs[column], ys[row], xs[column + 1], ys[row + 1]))
            cell.save(destination / f'frame_{index:02d}.png', optimize=True)


def import_obito_recoil():
    image = Image.open(OBITO_RECOIL_SOURCE).convert('RGBA')
    if image.size != (1774, 887):
        raise SystemExit(f'unexpected Obito recoil sheet size: {image.size}')
    columns, rows = GRID
    xs, ys = edges(image.width, columns), edges(image.height, rows)
    destination = ROOT / 'assets' / 'characters' / 'obito' / 'sprites' / 'runtime' / 'v2' / 'recoil'
    destination.mkdir(parents=True, exist_ok=True)
    for row in range(rows):
        for column in range(columns):
            index = row * columns + column + 1
            gutter = 56
            crop = image.crop((max(0, xs[column] - gutter), max(0, ys[row] - gutter), min(image.width, xs[column + 1] + gutter), min(image.height, ys[row + 1] + gutter)))
            alpha = crop.getchannel('A').getbbox()
            if not alpha:
                raise SystemExit(f'empty Obito recoil frame: {index}')
            pose = crop.crop(alpha)
            scale = min(704 / pose.height, 420 / pose.width)
            size = (round(pose.width * scale), round(pose.height * scale))
            pose = pose.resize(size, Image.Resampling.LANCZOS)
            canvas = Image.new('RGBA', (512, 768))
            canvas.alpha_composite(pose, ((512 - pose.width) // 2, 742 - pose.height))
            canvas.save(destination / f'frame_{index:02d}.png', optimize=True)


def main():
    with TemporaryDirectory(prefix='blazing-test-packs-') as temp:
        temp = Path(temp)
        for character, archive_name in CHARACTER_PACKS.items():
            extracted = temp / character
            with ZipFile(ROOT / archive_name) as archive:
                archive.extractall(extracted)
            copy_character_frames(extracted, character)
        for category, archive_name in VFX_PACKS.items():
            extracted = temp / category
            with ZipFile(ROOT / archive_name) as archive:
                archive.extractall(extracted)
            for atlas in extracted.rglob('*.png'):
                split_vfx(atlas, ROOT / 'assets' / 'vfx' / 'uploaded-v2' / atlas.stem)
        import_obito_recoil()
    print('Character test-pack import PASS: Sub-Zero, Scorpion, Mashle V2 body frames and uploaded VFX sequences are isolated.')


if __name__ == '__main__':
    main()
