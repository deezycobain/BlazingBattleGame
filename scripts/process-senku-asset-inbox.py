from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CANVAS = (420, 420)
ANCHOR = (210, 392)
SCALE = 0.78


def fail(message: str) -> None:
    raise SystemExit(f"Senku Asset Inbox processing failed: {message}")


def main() -> None:
    if len(sys.argv) != 2:
        fail("expected source image path")
    source_path = Path(sys.argv[1])
    if not source_path.is_file():
        fail(f"missing source image: {source_path}")

    source = Image.open(source_path).convert("RGB")
    if source.size != (1536, 1024):
        fail(f"expected 1536x1024 six-pose sheet, got {source.size[0]}x{source.size[1]}")

    arr = np.asarray(source)
    hi = arr.max(axis=2)
    lo = arr.min(axis=2)
    background_candidate = (hi >= 242) & ((hi - lo) <= 5)

    _, background_labels = cv2.connectedComponents(background_candidate.astype(np.uint8), connectivity=8)
    border_labels = np.unique(
        np.concatenate(
            [
                background_labels[0, :],
                background_labels[-1, :],
                background_labels[:, 0],
                background_labels[:, -1],
            ]
        )
    )
    background = np.isin(background_labels, border_labels) & background_candidate
    foreground = (~background).astype(np.uint8)

    count, labels, stats, _ = cv2.connectedComponentsWithStats(foreground, connectivity=8)
    components: list[tuple[int, int, int, int, int, int]] = []
    for label in range(1, count):
        x, y, width, height, area = [int(v) for v in stats[label]]
        if area > 30000:
            components.append((y, x, width, height, label, area))
    components.sort(key=lambda item: (0 if item[0] < 500 else 1, item[1]))
    if len(components) != 6:
        fail(f"expected six character components, found {len(components)}")

    melee_dir = ROOT / "assets/characters/senku/sprites/runtime/attack/melee"
    retreat_dir = ROOT / "assets/characters/senku/sprites/runtime/movement/retreat_run"
    melee_source_dir = ROOT / "assets/characters/senku/sprites/source/attack/melee"
    retreat_source_dir = ROOT / "assets/characters/senku/sprites/source/retreat_run"
    for directory in (melee_dir, retreat_dir, melee_source_dir, retreat_source_dir):
        directory.mkdir(parents=True, exist_ok=True)

    source.save(melee_source_dir / "source_sheet.webp", "WEBP", quality=65, method=6)
    source.save(retreat_source_dir / "source_sheet.webp", "WEBP", quality=65, method=6)

    kernel = np.ones((3, 3), np.uint8)
    for index, (y, x, width, height, label, _area) in enumerate(components, start=1):
        padding = 4
        x0 = max(0, x - padding)
        y0 = max(0, y - padding)
        x1 = min(arr.shape[1], x + width + padding)
        y1 = min(arr.shape[0], y + height + padding)

        rgb = arr[y0:y1, x0:x1].copy()
        component = (labels[y0:y1, x0:x1] == label).astype(np.uint8)
        dilated = cv2.dilate(component, kernel, iterations=1)
        alpha = (component * 255 + ((dilated - component) * 110)).astype(np.uint8)
        body = Image.fromarray(np.dstack([rgb, alpha]), "RGBA")

        new_width = max(1, round(body.width * SCALE))
        new_height = max(1, round(body.height * SCALE))
        body = body.resize((new_width, new_height), Image.Resampling.LANCZOS)

        canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        paste_x = round(ANCHOR[0] - new_width / 2)
        paste_y = ANCHOR[1] - new_height
        canvas.alpha_composite(body, (paste_x, paste_y))

        filename = f"frame_{index:02d}.webp"
        canvas.save(melee_dir / filename, "WEBP", quality=55, method=6)
        canvas.save(retreat_dir / filename, "WEBP", quality=55, method=6)

    print("Senku Asset Inbox processing PASS: source sheet + six melee frames + six retreat frames written")


if __name__ == "__main__":
    main()
