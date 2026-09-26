#!/usr/bin/env python3
"""Import the small, runtime-safe battle HUD pieces from the supplied archive.

The BattleAtlas is a packed texture, so only the named, isolated HUD strip is
cropped.  Chakra pips are copied from their standalone source files.  Keeping
the extraction here makes the provenance and crop coordinates reproducible.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/Volumes/Samsung_T5/Naruto Blazing Assets-20211211T220230Z-001/Naruto Blazing Assets/UI')
OUTPUT = ROOT / 'assets' / 'ui' / 'battle' / 'blazing-archive'

OUTPUT.mkdir(parents=True, exist_ok=True)

# The upper-left BattleAtlas strip is the original gold-trimmed battle gauge.
# It is used as a clipped *fill* texture, while the browser renderer owns the
# dynamic HP amount and therefore never bakes a full-health value into the UI.
with Image.open(SOURCE / 'BattleAtlas.png').convert('RGBA') as atlas:
    atlas.crop((5, 29, 510, 65)).save(OUTPUT / 'hp-gauge-fill.png', optimize=True)
    # The lower-right ornamental ring is an isolated portrait/action frame.
    # Its transparent centre lets the live unit portrait and chakra meter stay
    # interactive beneath it.
    atlas.crop((808, 257, 1019, 464)).save(OUTPUT / 'portrait-frame.png', optimize=True)
    # A source medallion used as the shared visual carrier for status counters.
    # The text/turn count remains HTML so effects are never baked into an image.
    atlas.crop((636, 183, 704, 254)).save(OUTPUT / 'status-medallion.png', optimize=True)

for source_name, output_name in [
    ('06_chakra.png', 'chakra-active.png'),
    ('06_chakra2.png', 'chakra-empty.png'),
]:
    with Image.open(SOURCE / source_name).convert('RGBA') as image:
        image.save(OUTPUT / output_name, optimize=True)

print('Blazing battle HUD import complete: gauge fill, portrait/status frames, and standalone chakra pips.')
