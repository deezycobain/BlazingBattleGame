from __future__ import annotations

from pathlib import Path
from PIL import Image
from statistics import median
import json
import math

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / "assets" / "fonts" / "blazing-brush"
SOURCE = FONT / "source"
GLYPHS = FONT / "glyphs"

SHEETS = {
    "uppercase": {
        "legacy": FONT / "uppercase_alphabet.png",
        "source": SOURCE / "uppercase_alphabet.png",
        "chars": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "cols": 6,
        "rows": 5,
    },
    "lowercase": {
        "legacy": FONT / "lowercase_alphabet.png",
        "source": SOURCE / "lowercase_alphabet.png",
        "chars": "abcdefghijklmnopqrstuvwxyz",
        "cols": 6,
        "rows": 5,
    },
    "numbers": {
        "legacy": FONT / "numbers_0_to_9.png",
        "source": SOURCE / "numbers_0_to_9.png",
        "chars": "0123456789",
        "cols": 5,
        "rows": 2,
    },
}


def ensure_sources() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    for meta in SHEETS.values():
        src = meta["source"]
        legacy = meta["legacy"]
        if src.exists():
            continue
        if not legacy.exists():
            raise FileNotFoundError(f"Missing brush source sheet: {src.name}")
        legacy.replace(src)


def smoothstep(value: float, lo: float, hi: float) -> int:
    if value <= lo:
        return 0
    if value >= hi:
        return 255
    t = (value - lo) / (hi - lo)
    t = t * t * (3.0 - 2.0 * t)
    return round(t * 255)


def luminance(rgb: tuple[int, int, int]) -> float:
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def estimate_background(sheet: Image.Image) -> tuple[int, int, int]:
    rgb = sheet.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    samples: list[tuple[int, int, int]] = []
    step = max(2, min(w, h) // 280)
    band = 18
    for x in range(0, w, step):
        for y in (2, band, h - 1 - band, h - 3):
            c = px[x, max(0, min(h - 1, y))]
            if luminance(c) > 185:
                samples.append(c)
    for y in range(0, h, step):
        for x in (2, band, w - 1 - band, w - 3):
            c = px[max(0, min(w - 1, x)), y]
            if luminance(c) > 185:
                samples.append(c)
    if not samples:
        return (240, 232, 216)
    return tuple(round(median([c[i] for c in samples])) for i in range(3))


def make_transparent(cell: Image.Image, background: tuple[int, int, int]) -> Image.Image:
    rgb = cell.convert("RGB")
    src_px = rgb.load()
    out = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    out_px = out.load()
    bg_luma = luminance(background)

    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = src_px[x, y]
            lum = luminance((r, g, b))
            dist = math.sqrt((r - background[0]) ** 2 + (g - background[1]) ** 2 + (b - background[2]) ** 2)
            darkness = max(0.0, bg_luma - lum)
            chroma = max(r, g, b) - min(r, g, b)

            # The paper is light, warm, and comparatively low-contrast. True ink is
            # darker and/or substantially farther from the parchment color. Using a
            # global parchment estimate avoids turning the paper grain into alpha.
            alpha_distance = smoothstep(dist, 42, 102)
            alpha_dark = smoothstep(darkness, 24, 84)
            alpha_color = smoothstep(chroma, 48, 118) if lum < 218 else 0
            alpha = max(alpha_distance, alpha_dark, alpha_color)

            # Kill the remaining light paper texture aggressively. Brush antialiasing
            # survives through the soft ramps above, while random parchment grain does not.
            if lum > 215 and dist < 66 and darkness < 32:
                alpha = 0
            if alpha < 8:
                alpha = 0
            out_px[x, y] = (r, g, b, alpha)

    return out


def tight_crop(image: Image.Image, pad: int = 18) -> tuple[Image.Image, list[int]]:
    alpha = image.getchannel("A")
    # Crop from confident ink rather than any faint surviving paper pixel. Padding
    # around the confident ink preserves the softer tapered edge and nearby splatter.
    core = alpha.point(lambda a: 255 if a >= 48 else 0)
    bbox = core.getbbox() or alpha.getbbox()
    if not bbox:
        raise RuntimeError("Generated empty glyph cell")
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(image.width, r + pad)
    b = min(image.height, b + pad)
    cropped = image.crop((l, t, r, b))

    # Remove weak alpha islands at the crop perimeter. This keeps the artistic ink
    # flecks near the glyph while preventing full-cell parchment halos.
    a = cropped.getchannel("A")
    cp = cropped.load()
    ap = a.load()
    edge = 5
    for y in range(cropped.height):
        for x in range(cropped.width):
            if x < edge or y < edge or x >= cropped.width - edge or y >= cropped.height - edge:
                if ap[x, y] < 40:
                    rr, gg, bb, _ = cp[x, y]
                    cp[x, y] = (rr, gg, bb, 0)
    return cropped, [l, t, r, b]


def generate() -> dict:
    ensure_sources()
    GLYPHS.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": 2,
        "family": "Blazing Brush",
        "format": "transparent raster glyphs",
        "sourceBackground": "parchment",
        "glyphs": {},
    }

    for group, meta in SHEETS.items():
        source_path: Path = meta["source"]
        sheet = Image.open(source_path).convert("RGB")
        background = estimate_background(sheet)
        cols = int(meta["cols"])
        rows = int(meta["rows"])
        chars = str(meta["chars"])
        out_dir = GLYPHS / group
        out_dir.mkdir(parents=True, exist_ok=True)

        for index, char in enumerate(chars):
            row = index // cols
            col = index % cols
            if row >= rows:
                raise RuntimeError(f"Grid overflow for {group} {char}")

            x0 = round(col * sheet.width / cols)
            x1 = round((col + 1) * sheet.width / cols)
            y0 = round(row * sheet.height / rows)
            y1 = round((row + 1) * sheet.height / rows)
            cell = sheet.crop((x0, y0, x1, y1))
            transparent = make_transparent(cell, background)
            glyph, inner_bbox = tight_crop(transparent)

            name = f"{char}.png"
            out_path = out_dir / name
            glyph.save(out_path, optimize=True)
            manifest["glyphs"][char] = {
                "path": out_path.relative_to(ROOT).as_posix(),
                "group": group,
                "sheet": source_path.name,
                "backgroundRGB": list(background),
                "grid": {"row": row, "column": col, "rows": rows, "columns": cols},
                "cell": [x0, y0, x1, y1],
                "contentInCell": inner_bbox,
                "width": glyph.width,
                "height": glyph.height,
            }

    expected = 26 + 26 + 10
    if len(manifest["glyphs"]) != expected:
        raise RuntimeError(f"Expected {expected} glyphs, got {len(manifest['glyphs'])}")

    (FONT / "glyph-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (FONT / "manifest.md").write_text(
        "# Blazing Brush\n\n"
        "Custom raster display lettering for cinematic UI. Source sheets live in `source/`; "
        "transparent per-character PNGs live in `glyphs/`. Generated by "
        "`scripts/generate-brush-glyphs.py`.\n\n"
        "Use for short dramatic display text such as 3-2-1-FIGHT, victory/defeat, boss, "
        "awakening and chapter splashes. Do not use for body copy or ordinary menu labels.\n",
        encoding="utf-8",
    )
    return manifest


if __name__ == "__main__":
    result = generate()
    print(f"Generated {len(result['glyphs'])} Blazing Brush glyphs")
