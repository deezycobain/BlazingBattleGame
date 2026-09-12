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

# These sheets are deliberately hand-composed rather than a uniform sprite grid.
# The alphabet rows are 5 / 6 / 5 / 5 / 5 characters, with the second row carrying
# F-K. Boundaries below sit in the visible whitespace between strokes so long brush
# tails and ink flecks are preserved instead of being assigned to a neighboring glyph.
ALPHABET_LAYOUT = [
    {"chars": "ABCDE",  "y": (0, 328),    "x": (0, 254, 465, 679, 897, 1122)},
    {"chars": "FGHIJK", "y": (328, 609),  "x": (0, 193, 394, 601, 708, 917, 1122)},
    {"chars": "LMNOP",  "y": (609, 895),  "x": (0, 229, 469, 691, 906, 1122)},
    {"chars": "QRSTU",  "y": (895, 1122), "x": (0, 262, 482, 664, 888, 1122)},
    {"chars": "VWXYZ",  "y": (1122, 1402),"x": (0, 221, 454, 653, 851, 1122)},
]
NUMBER_LAYOUT = [
    {"chars": "01234", "y": (250, 695),  "x": (0, 266, 408, 649, 867, 1122)},
    {"chars": "56789", "y": (695, 1120), "x": (0, 245, 463, 674, 892, 1122)},
]

SHEETS = {
    "uppercase": {
        "legacy": FONT / "uppercase_alphabet.png",
        "source": SOURCE / "uppercase_alphabet.png",
        "layout": ALPHABET_LAYOUT,
        "transform": str.upper,
    },
    "lowercase": {
        "legacy": FONT / "lowercase_alphabet.png",
        "source": SOURCE / "lowercase_alphabet.png",
        "layout": ALPHABET_LAYOUT,
        "transform": str.lower,
    },
    "numbers": {
        "legacy": FONT / "numbers_0_to_9.png",
        "source": SOURCE / "numbers_0_to_9.png",
        "layout": NUMBER_LAYOUT,
        "transform": lambda value: value,
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
            high = max(r, g, b)
            low = min(r, g, b)
            saturation = (high - low) / max(1, high)

            # Strong dark ink is retained directly. Gold brush color is retained only
            # when it is both saturated and measurably displaced from the parchment.
            # Requiring both properties strips the warm paper grain that caused a
            # smoky rectangle around the first-generation glyphs.
            alpha_dark = smoothstep(darkness, 42, 100)
            alpha_distance = smoothstep(dist, 72, 130)
            saturation_score = smoothstep(saturation, 0.15, 0.36)
            color_distance = smoothstep(dist, 28, 85)
            warm_ink = r > b + 12 and g > b + 6 and lum < 236
            alpha_gold = min(saturation_score, color_distance) if warm_ink else 0
            alpha = max(alpha_dark, alpha_distance, alpha_gold)

            if lum > 215 and saturation < 0.16 and dist < 75:
                alpha = 0
            if alpha < 8:
                alpha = 0
            out_px[x, y] = (r, g, b, alpha)

    return out


def tight_crop(image: Image.Image, pad: int = 12) -> tuple[Image.Image, list[int]]:
    alpha = image.getchannel("A")
    core = alpha.point(lambda a: 255 if a >= 40 else 0)
    bbox = core.getbbox() or alpha.getbbox()
    if not bbox:
        raise RuntimeError("Generated empty glyph cell")
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(image.width, r + pad)
    b = min(image.height, b + pad)
    cropped = image.crop((l, t, r, b))

    # Clean only weak pixels at the perimeter. Intentional splatter close to the
    # brush stroke stays intact; pale paper crumbs at the crop edge do not.
    cp = cropped.load()
    edge = 4
    for y in range(cropped.height):
        for x in range(cropped.width):
            if x < edge or y < edge or x >= cropped.width - edge or y >= cropped.height - edge:
                rr, gg, bb, aa = cp[x, y]
                if aa < 32:
                    cp[x, y] = (rr, gg, bb, 0)
    return cropped, [l, t, r, b]


def iter_cells(meta: dict, sheet: Image.Image):
    transform = meta["transform"]
    for row_index, row in enumerate(meta["layout"]):
        chars = transform(row["chars"])
        x_bounds = row["x"]
        y0, y1 = row["y"]
        if len(x_bounds) != len(chars) + 1:
            raise RuntimeError(f"Invalid brush row geometry for {chars}")
        if not (0 <= y0 < y1 <= sheet.height):
            raise RuntimeError(f"Invalid brush row y bounds for {chars}: {(y0, y1)}")
        for column_index, char in enumerate(chars):
            x0, x1 = x_bounds[column_index], x_bounds[column_index + 1]
            if not (0 <= x0 < x1 <= sheet.width):
                raise RuntimeError(f"Invalid brush column bounds for {char}: {(x0, x1)}")
            yield row_index, column_index, chars, char, (x0, y0, x1, y1)


def generate() -> dict:
    ensure_sources()
    GLYPHS.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": 3,
        "family": "Blazing Brush",
        "format": "transparent raster glyphs",
        "sourceBackground": "parchment",
        "layout": "hand-authored irregular rows",
        "glyphs": {},
    }

    for group, meta in SHEETS.items():
        source_path: Path = meta["source"]
        sheet = Image.open(source_path).convert("RGB")
        background = estimate_background(sheet)
        out_dir = GLYPHS / group
        out_dir.mkdir(parents=True, exist_ok=True)

        for row, column, row_chars, char, cell_box in iter_cells(meta, sheet):
            x0, y0, x1, y1 = cell_box
            cell = sheet.crop(cell_box)
            transparent = make_transparent(cell, background)
            glyph, inner_bbox = tight_crop(transparent)

            out_path = out_dir / f"{char}.png"
            glyph.save(out_path, optimize=True)
            manifest["glyphs"][char] = {
                "path": out_path.relative_to(ROOT).as_posix(),
                "group": group,
                "sheet": source_path.name,
                "backgroundRGB": list(background),
                "grid": {
                    "row": row,
                    "column": column,
                    "rowCharacters": row_chars,
                    "columnsInRow": len(row_chars),
                },
                "cell": [x0, y0, x1, y1],
                "contentInCell": inner_bbox,
                "width": glyph.width,
                "height": glyph.height,
            }

    expected_chars = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
    actual_chars = set(manifest["glyphs"])
    if actual_chars != expected_chars:
        missing = "".join(sorted(expected_chars - actual_chars))
        extra = "".join(sorted(actual_chars - expected_chars))
        raise RuntimeError(f"Glyph set mismatch; missing={missing!r} extra={extra!r}")

    (FONT / "glyph-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (FONT / "manifest.md").write_text(
        "# Blazing Brush\n\n"
        "Custom raster display lettering for cinematic UI. Source sheets live in `source/`; "
        "transparent per-character PNGs live in `glyphs/`. Generated by "
        "`scripts/generate-brush-glyphs.py` using the hand-authored 5/6/5/5/5 alphabet row layout.\n\n"
        "Use for short dramatic display text such as 3-2-1-FIGHT, victory/defeat, boss, "
        "awakening and chapter splashes. Do not use for body copy or ordinary menu labels.\n",
        encoding="utf-8",
    )
    return manifest


if __name__ == "__main__":
    result = generate()
    print(f"Generated {len(result['glyphs'])} correctly mapped Blazing Brush glyphs")
