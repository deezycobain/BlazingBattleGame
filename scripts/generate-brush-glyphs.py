from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageFilter
import json

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


def make_transparent(cell: Image.Image) -> Image.Image:
    rgb = cell.convert("RGB")
    gray = rgb.convert("L")

    # The generated sheets use light parchment rather than transparency. A large
    # max filter estimates the nearby light paper value while ignoring dark ink.
    # This preserves brush taper, colored ink and speckle without retaining the page.
    local_light = gray.filter(ImageFilter.MaxFilter(31))
    src_px = rgb.load()
    lum_px = gray.load()
    light_px = local_light.load()
    out = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    out_px = out.load()

    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = src_px[x, y]
            lum = lum_px[x, y]
            local = light_px[x, y]
            darkness = max(0, local - lum)
            chroma = max(r, g, b) - min(r, g, b)

            # Paper texture usually lives below ~18 points of local contrast.
            # Real brush edges begin above it and strong ink is fully opaque.
            alpha_dark = smoothstep(darkness, 14, 72)
            alpha_color = smoothstep(chroma, 34, 104) if lum < 224 else 0
            alpha = max(alpha_dark, alpha_color)

            # Suppress isolated light parchment flecks while retaining tiny dark ink.
            if lum > 225 and darkness < 24 and chroma < 48:
                alpha = 0
            out_px[x, y] = (r, g, b, alpha)

    return out


def tight_crop(image: Image.Image, pad: int = 12) -> tuple[Image.Image, list[int]]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise RuntimeError("Generated empty glyph cell")
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(image.width, r + pad)
    b = min(image.height, b + pad)
    return image.crop((l, t, r, b)), [l, t, r, b]


def generate() -> dict:
    ensure_sources()
    GLYPHS.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": 1,
        "family": "Blazing Brush",
        "format": "transparent raster glyphs",
        "sourceBackground": "parchment",
        "glyphs": {},
    }

    for group, meta in SHEETS.items():
        source_path: Path = meta["source"]
        sheet = Image.open(source_path).convert("RGB")
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
            transparent = make_transparent(cell)
            glyph, inner_bbox = tight_crop(transparent)

            name = f"{char}.png"
            out_path = out_dir / name
            glyph.save(out_path, optimize=True)
            key = char
            manifest["glyphs"][key] = {
                "path": out_path.relative_to(ROOT).as_posix(),
                "group": group,
                "sheet": source_path.name,
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
