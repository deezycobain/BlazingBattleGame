#!/usr/bin/env python3
"""Convert the user-supplied 6x2 Obito run sheet into normalized alpha frames."""
from collections import deque
from pathlib import Path
import sys

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / 'assets/characters/obito/source/obito_run_12frame_sheet_user.jpg'
OUTPUT = ROOT / 'assets/characters/obito/sprites/runtime/run'
def near_white(pixel):
    r, g, b, _ = pixel
    return min(r, g, b) >= 215 and max(r, g, b) - min(r, g, b) <= 18


def connected_backdrop(image):
    width, height = image.size
    pixels = image.load()
    backdrop = bytearray(width * height)
    todo = deque()

    def add(x, y):
        index = y * width + x
        if not backdrop[index] and near_white(pixels[x, y]):
            backdrop[index] = 1
            todo.append((x, y))

    for x in range(width):
        add(x, 0)
        add(x, height - 1)
    for y in range(height):
        add(0, y)
        add(width - 1, y)
    while todo:
        x, y = todo.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                add(nx, ny)
    return backdrop


def clear_backdrop(image):
    width, height = image.size
    pixels = image.load()
    backdrop = connected_backdrop(image)
    for y in range(height):
        for x in range(width):
            if backdrop[y * width + x]:
                r, g, b, _ = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)
    return image


def character_components(image):
    width, height = image.size
    pixels = image.load()
    seen = bytearray(width * height)
    components = []
    for start_y in range(height):
        for start_x in range(width):
            start = start_y * width + start_x
            if seen[start] or pixels[start_x, start_y][3] < 24:
                continue
            seen[start] = 1
            todo = deque([(start_x, start_y)])
            left = right = start_x
            top = bottom = start_y
            count = 0
            while todo:
                x, y = todo.popleft()
                count += 1
                left, right = min(left, x), max(right, x)
                top, bottom = min(top, y), max(bottom, y)
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    index = ny * width + nx
                    if not seen[index] and pixels[nx, ny][3] >= 24:
                        seen[index] = 1
                        todo.append((nx, ny))
            if count >= 800:
                components.append((left, top, right + 1, bottom + 1, count))
    return components


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    if not source.is_file():
        raise SystemExit(f'missing sheet: {source}')
    sheet = clear_backdrop(Image.open(source).convert('RGBA'))
    components = character_components(sheet)
    if len(components) != 12:
        raise SystemExit(f'expected 12 character silhouettes, found {len(components)}: {components}')
    components.sort(key=lambda box: (box[1] > sheet.height // 2, box[0]))
    tallest = max(bottom - top for left, top, right, bottom, count in components)
    scale = 615 / tallest
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for frame, (left, top, right, bottom, _) in enumerate(components, 1):
        pose = sheet.crop((left, top, right, bottom))
        sized = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (512, 768))
        canvas.alpha_composite(sized, ((512 - sized.width) // 2, 700 - sized.height))
        canvas.save(OUTPUT / f'frame_{frame:02d}.png', optimize=True)
    print(f'Obito run sheet imported: {len(components)} alpha frames from {source}')


if __name__ == '__main__':
    main()
