#!/usr/bin/env python3
"""Normalize the user-provided 6x2 Itachi idle and run sheets without stale runtime paths."""
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SHEET_SIZE = (1774, 887)
GRID = (6, 2)
CANVAS = (420, 420)
BASELINE = 402
# The supplied poses overlap their neighboring grid cells. A small gutter keeps
# wide stride feet and coat edges intact before the largest body is isolated.
CELL_GUTTER = 56
SOURCES = {
    'idle': ROOT / 'assets/characters/itachi/sprites/source/idle_12frame_sheet.png',
    'run': ROOT / 'assets/characters/itachi/sprites/source/run_12frame_sheet.png',
}
OUTPUTS = {
    'idle': ROOT / 'assets/characters/itachi/sprites/runtime/idle',
    'run': ROOT / 'assets/characters/itachi/sprites/runtime/run',
}


def cell_edges(length, count):
    return [round(index * length / count) for index in range(count + 1)]


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


def import_motion(kind):
    source = SOURCES[kind]
    if not source.is_file():
        raise SystemExit(f'missing {kind} source sheet: {source}')
    sheet = Image.open(source).convert('RGBA')
    if sheet.size != SHEET_SIZE:
        raise SystemExit(f'unexpected {kind} sheet size: {sheet.size}')
    columns, rows = GRID
    xs, ys = cell_edges(sheet.width, columns), cell_edges(sheet.height, rows)
    poses = []
    for row in range(rows):
        for column in range(columns):
            left = max(0, xs[column] - CELL_GUTTER)
            top = max(0, ys[row] - CELL_GUTTER)
            right = min(sheet.width, xs[column + 1] + CELL_GUTTER)
            bottom = min(sheet.height, ys[row + 1] + CELL_GUTTER)
            cell = sheet.crop((left, top, right, bottom))
            cell = keep_largest_silhouette(cell)
            content = cell.getbbox()
            if not content:
                raise SystemExit(f'empty {kind} frame {len(poses) + 1}')
            poses.append(cell.crop(content))
    scale = 392 / max(pose.height for pose in poses)
    output = OUTPUTS[kind]
    output.mkdir(parents=True, exist_ok=True)
    for index, pose in enumerate(poses, 1):
        size = (round(pose.width * scale), round(pose.height * scale))
        if size[0] > CANVAS[0] - 8:
            ratio = (CANVAS[0] - 8) / size[0]
            size = (round(size[0] * ratio), round(size[1] * ratio))
        normalized = pose.resize(size, Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', CANVAS)
        canvas.alpha_composite(normalized, ((CANVAS[0] - normalized.width) // 2, BASELINE - normalized.height))
        canvas.save(output / f'frame_{index:02d}.png', optimize=True)


def main():
    for kind in ('idle', 'run'):
        import_motion(kind)
    print('Itachi motion import PASS: user-provided idle/run sheets normalized into 12-frame runtime sequences.')


if __name__ == '__main__':
    main()
