#!/usr/bin/env python3
"""Import the user-provided 4x3 Itachi body and crow VFX sheets as runtime PNGs."""
from pathlib import Path
import sys

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BODY_SOURCE = ROOT / 'assets/characters/itachi/sprites/source/basic_attack_12frame_sheet.png'
VFX_SOURCE = ROOT / 'assets/characters/itachi/vfx/basic/crows/crow_attack_12frame_sheet.png'
BODY_OUTPUT = ROOT / 'assets/characters/itachi/sprites/runtime/attack/basic'
VFX_OUTPUT = ROOT / 'assets/characters/itachi/vfx/basic/crows/runtime'
SHEET_SIZE = (1448, 1086)
GRID = (4, 3)
RUNTIME_SIZE = (420, 420)


def import_sheet(source, output):
    if not source.is_file():
        raise SystemExit(f'missing sheet: {source}')
    sheet = Image.open(source).convert('RGBA')
    if sheet.size != SHEET_SIZE:
        raise SystemExit(f'unexpected sheet size for {source.name}: {sheet.size}')
    if sheet.getbbox() is None:
        raise SystemExit(f'empty alpha sheet: {source}')
    columns, rows = GRID
    cell_width, cell_height = sheet.width // columns, sheet.height // rows
    if cell_width * columns != sheet.width or cell_height * rows != sheet.height:
        raise SystemExit(f'non-integral {columns}x{rows} grid: {sheet.size}')
    output.mkdir(parents=True, exist_ok=True)
    for row in range(rows):
        for column in range(columns):
            frame = row * columns + column + 1
            cell = sheet.crop((column * cell_width, row * cell_height, (column + 1) * cell_width, (row + 1) * cell_height))
            if cell.getbbox() is None:
                raise SystemExit(f'empty frame {frame} in {source.name}')
            cell.resize(RUNTIME_SIZE, Image.Resampling.LANCZOS).save(output / f'frame_{frame:02d}.png', optimize=True)


def main():
    if len(sys.argv) != 1:
        raise SystemExit('this importer has fixed canonical source paths')
    import_sheet(BODY_SOURCE, BODY_OUTPUT)
    import_sheet(VFX_SOURCE, VFX_OUTPUT)
    print('Itachi crow import PASS: 12 body frames and 12 crow VFX frames created from the user-supplied 4x3 sheets.')


if __name__ == '__main__':
    main()
