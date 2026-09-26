#!/usr/bin/env python3
"""Copy the English battle fonts from the supplied Unity export.

These are kept as external files (not base64-embedded) so the browser only
requests them when the battle dock is visible and the source provenance stays
clear in the repository.
"""
from pathlib import Path
from shutil import copy2

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/Volumes/Samsung_T5/blazing export/NARUTO BLAZING-2.28.0/Assets/Resources/font/en')
OUTPUT = ROOT / 'assets' / 'ui' / 'fonts' / 'blazing-archive'

OUTPUT.mkdir(parents=True, exist_ok=True)
for folder, source_name, output_name in [
    ('fontmain', 'FOT-MatisseProN-EB-en.otf', 'matisse-pro-n-eb-en.otf'),
    ('fontsub', 'FOT-ReggaeStd-B-en.otf', 'reggae-std-b-en.otf'),
]:
    copy2(SOURCE / folder / source_name, OUTPUT / output_name)

print('Blazing archive font import complete: Matisse main and Reggae sub fonts.')
