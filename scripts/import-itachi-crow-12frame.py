#!/usr/bin/env python3
"""Import the user-provided 4x3 Itachi body and crow VFX sheets as runtime PNGs."""
from collections import deque
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


def keep_largest_silhouette(image):
    width, height = image.size
    pixels = image.load()
    seen = bytearray(width * height)
    largest = []
    for start_y in range(height):
        for start_x in range(width):
            start = start_y * width + start_x
            if seen[start] or pixels[start_x, start_y][3] < 24:
                continue
            seen[start] = 1
            component = []
            todo = deque([(start_x, start_y)])
            while todo:
                x, y = todo.popleft()
                component.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    index = ny * width + nx
                    if not seen[index] and pixels[nx, ny][3] >= 24:
                        seen[index] = 1
                        todo.append((nx, ny))
            if len(component) > len(largest):
                largest = component
    keep = {y * width + x for x, y in largest}
    for y in range(height):
        for x in range(width):
            if y * width + x not in keep:
                r, g, b, _ = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)
    return image


def frames_from_sheet(source):
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
    frames = []
    for row in range(rows):
        for column in range(columns):
            frame = row * columns + column + 1
            cell = sheet.crop((column * cell_width, row * cell_height, (column + 1) * cell_width, (row + 1) * cell_height))
            if cell.getbbox() is None:
                raise SystemExit(f'empty frame {frame} in {source.name}')
            frames.append(cell)
    return frames


def import_body():
    poses = []
    for cell in frames_from_sheet(BODY_SOURCE):
        pose = keep_largest_silhouette(cell)
        content = pose.getbbox()
        if not content:
            raise SystemExit('empty body pose after separating the crow VFX')
        poses.append(pose.crop(content))
    scale = 370 / max(pose.height for pose in poses)
    BODY_OUTPUT.mkdir(parents=True, exist_ok=True)
    for frame, pose in enumerate(poses, 1):
        sized = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', RUNTIME_SIZE)
        canvas.alpha_composite(sized, ((RUNTIME_SIZE[0] - sized.width) // 2, 402 - sized.height))
        canvas.save(BODY_OUTPUT / f'frame_{frame:02d}.png', optimize=True)


def import_vfx():
    VFX_OUTPUT.mkdir(parents=True, exist_ok=True)
    for frame, cell in enumerate(frames_from_sheet(VFX_SOURCE), 1):
        cell.resize(RUNTIME_SIZE, Image.Resampling.LANCZOS).save(VFX_OUTPUT / f'frame_{frame:02d}.png', optimize=True)


def main():
    if len(sys.argv) != 1:
        raise SystemExit('this importer has fixed canonical source paths')
    import_body()
    import_vfx()
    print('Itachi crow import PASS: 12 padded body frames and 12 dedicated crow VFX frames created from the user-supplied 4x3 sheets.')


if __name__ == '__main__':
    main()
