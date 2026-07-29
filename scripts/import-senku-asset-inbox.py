#!/usr/bin/env python3
from collections import deque
from pathlib import Path
import sys
import numpy as np
from PIL import Image

SOURCE = Path(sys.argv[1])
ROOT = Path.cwd() / 'assets/characters/senku/sprites'
PERIOD = 128
CELL = 512
DIFF_THRESHOLD = 10
BBOXES = [
    (80, 15, 400, 460),
    (25, 85, 470, 490),
    (25, 85, 465, 490),
    (70, 30, 410, 510),
    (45, 30, 500, 510),
    (45, 25, 500, 510),
]

def largest_component(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=np.uint8)
    best = []
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or seen[y, x]:
                continue
            seen[y, x] = 1
            q = deque([(x, y)])
            comp = []
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if dx == 0 and dy == 0:
                            continue
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = 1
                            q.append((nx, ny))
            if len(comp) > len(best):
                best = comp
    if not best:
        raise RuntimeError('No foreground component found')
    out = np.zeros((h, w), dtype=np.uint8)
    for x, y in best:
        out[y, x] = 255
    return out

def main() -> None:
    source = Image.open(SOURCE).convert('RGB')
    if source.size != (1536, 1024):
        raise ValueError(f'Unexpected Senku sheet size: {source.size}')
    rgb = np.asarray(source, dtype=np.uint8)
    h, w, _ = rgb.shape
    blocks = rgb.reshape(h // PERIOD, PERIOD, w // PERIOD, PERIOD, 3).transpose(0, 2, 1, 3, 4)
    template = np.median(blocks, axis=(0, 1)).astype(np.uint8)
    reconstructed = np.tile(template, (h // PERIOD, w // PERIOD, 1))
    diff = np.abs(rgb.astype(np.int16) - reconstructed.astype(np.int16)).max(axis=2)
    foreground = diff > DIFF_THRESHOLD

    melee_out = ROOT / 'runtime/attack/melee'
    retreat_out = ROOT / 'runtime/movement/retreat_run'
    melee_source = ROOT / 'source/attack/melee'
    retreat_source = ROOT / 'source/retreat_run'
    for directory in (melee_out, retreat_out, melee_source, retreat_source):
        directory.mkdir(parents=True, exist_ok=True)

    source.save(melee_source / 'source_sheet.webp', 'WEBP', quality=78, method=6)
    source.save(retreat_source / 'source_sheet.webp', 'WEBP', quality=78, method=6)

    for index in range(6):
        row, col = divmod(index, 3)
        cell_rgb = rgb[row * CELL:(row + 1) * CELL, col * CELL:(col + 1) * CELL]
        cell_fg = foreground[row * CELL:(row + 1) * CELL, col * CELL:(col + 1) * CELL]
        x0, y0, x1, y1 = BBOXES[index]
        roi = np.zeros((CELL, CELL), dtype=np.uint8)
        roi[y0:y1, x0:x1] = cell_fg[y0:y1, x0:x1].astype(np.uint8)
        mask = largest_component(roi)
        ys, xs = np.where(mask > 0)
        bbox = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        rgba = np.dstack((cell_rgb, mask))
        crop = Image.fromarray(rgba, 'RGBA').crop(bbox)
        cw, ch = crop.size
        scale = min(370 / cw, 382 / ch)
        nw, nh = max(1, round(cw * scale)), max(1, round(ch * scale))
        resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (420, 420), (0, 0, 0, 0))
        canvas.alpha_composite(resized, (round(210 - nw / 2), 412 - nh))
        if not canvas.getchannel('A').getbbox():
            raise RuntimeError(f'Empty Senku frame {index + 1}')
        for directory in (melee_out, retreat_out):
            canvas.save(directory / f'frame_{index + 1:02d}.webp', 'WEBP', quality=75, method=6)

    print('Senku Asset Inbox import PASS: source sheet + 6 melee + 6 retreat frames generated.')

if __name__ == '__main__':
    main()
