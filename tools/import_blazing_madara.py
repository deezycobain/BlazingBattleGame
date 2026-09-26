#!/usr/bin/env python3
"""Create a local Six Paths Madara pilot from the supplied Blazing archive.

The archive exposes pose PNGs, not a native six-frame animation set.  This tool
keeps that limitation explicit: it normalizes the archival poses onto the
project's established 512x768, bottom-centre canvas without inventing cropped
body art or mixing Madara's separate classic-armour form into this unit.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/Volumes/Samsung_T5/Naruto Blazing Assets-20211211T220230Z-001/Naruto Blazing Assets')
SPRITES = SOURCE / 'Complete Sprites'
SHEETS = SOURCE / 'Spritesheets'
UNIT = ROOT / 'assets' / 'characters' / 'madara'
CANVAS = (512, 768)
BOTTOM = 742
SCALE = 2.9

# White-robed Six Paths Madara only. Madara2/Madara8/Madara9 are the distinct
# classic-armour form and intentionally excluded from this character package.
SEQUENCES = {
    'idle': ['Madara.png', 'Madara3.png', 'Madara4.png', 'Madara5.png', 'Madara7.png', 'Madara.png'],
    'run': ['Madara5.png', 'Madara3.png', 'Madara4.png', 'Madara7.png', 'Madara5.png', 'Madara.png'],
    'attack/basic': ['Madara5.png', 'Madara3.png', 'Madara4.png', 'Madara3.png', 'Madara7.png', 'Madara.png'],
}

def normalize(name: str) -> Image.Image:
    with Image.open(SPRITES / name).convert('RGBA') as source:
        width, height = source.size
        scaled = source.resize((round(width * SCALE), round(height * SCALE)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', CANVAS, (0, 0, 0, 0))
    x = (CANVAS[0] - scaled.width) // 2
    y = BOTTOM - scaled.height
    canvas.alpha_composite(scaled, (x, y))
    return canvas

for kind, names in SEQUENCES.items():
    output = UNIT / 'sprites' / 'runtime' / kind
    output.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(names, start=1):
        normalize(name).save(output / f'frame_{index:02d}.png', optimize=True)

art = UNIT / 'art'
art.mkdir(parents=True, exist_ok=True)
with Image.open(SPRITES / 'Madara.png').convert('RGBA') as source:
    source.save(art / 'madara_six_paths_source.png', optimize=True)

# The full Uchiha effect sheet cannot be rendered as a single sprite because it
# is an atlas.  The black orb is an isolated, useful source element for the
# pilot's Truth-Seeking Orb projectile.
vfx = UNIT / 'vfx' / 'jutsu' / 'truth_seeking_orb'
vfx.mkdir(parents=True, exist_ok=True)
with Image.open(SHEETS / 'spl_21434_uchihano_presentjustu.png').convert('RGBA') as sheet:
    sheet.crop((448, 191, 512, 255)).save(vfx / 'orb.png', optimize=True)

print('Madara archive import complete: 18 normalized body frames, source art, and one isolated orb VFX.')
