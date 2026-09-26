from __future__ import annotations

import io
import json
import re
import shutil
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ROOT_ZIP = ROOT / "Blazing_Battle_Obito_Run_6Frame.zip"
SOURCE_DIR = ROOT / "assets" / "characters" / "obito" / "source"
SOURCE_ZIP = SOURCE_DIR / "Blazing_Battle_Obito_Run_6Frame.zip"
RUN_DIR = ROOT / "assets" / "characters" / "obito" / "sprites" / "runtime" / "run"
UNIT_PATH = ROOT / "assets" / "characters" / "obito" / "data" / "unit.json"

CANVAS = (512, 768)
CENTER_X = CANVAS[0] // 2
GROUND_Y = 744
FRAME_RE = re.compile(r"(?:frame|run)[ _-]*0*([1-6])(?:\D|$)", re.I)


def locate_archive() -> Path:
    if ROOT_ZIP.exists():
        SOURCE_DIR.mkdir(parents=True, exist_ok=True)
        if SOURCE_ZIP.exists():
            SOURCE_ZIP.unlink()
        shutil.move(str(ROOT_ZIP), str(SOURCE_ZIP))
    if not SOURCE_ZIP.exists():
        raise SystemExit("Obito run archive missing")
    return SOURCE_ZIP


def natural_key(name: str):
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", name)]


def select_pngs(zf: zipfile.ZipFile):
    pngs = [m for m in zf.infolist() if not m.is_dir() and m.filename.lower().endswith(".png") and "__macosx" not in m.filename.lower()]
    explicit = []
    for member in pngs:
        match = FRAME_RE.search(Path(member.filename).stem)
        if match:
            explicit.append((int(match.group(1)), member))
    if len(explicit) == 6 and len({index for index, _ in explicit}) == 6:
        return [member for _, member in sorted(explicit, key=lambda item: item[0])]
    if len(pngs) == 6:
        return sorted(pngs, key=lambda member: natural_key(member.filename))
    names = "\n".join(member.filename for member in pngs)
    raise SystemExit(f"Expected exactly six run-frame PNGs; found {len(pngs)}:\n{names}")


def normalize_frame(rgba: Image.Image, filename: str):
    if rgba.size != CANVAS:
        raise SystemExit(f"{filename}: expected {CANVAS[0]}x{CANVAS[1]}, got {rgba.size[0]}x{rgba.size[1]}")

    alpha = rgba.getchannel("A")
    extrema = alpha.getextrema()
    if not extrema or extrema[0] == 255:
        raise SystemExit(f"{filename}: frame has no transparent pixels")
    bbox = alpha.getbbox()
    if not bbox:
        raise SystemExit(f"{filename}: empty alpha bounds")

    left, top, right, bottom = bbox
    body_w = right - left
    body_h = bottom - top
    if body_h > GROUND_Y:
        raise SystemExit(f"{filename}: visible body is too tall to bottom-anchor safely ({body_h}px)")

    center = (left + right) / 2
    dx = round(CENTER_X - center)
    dy = GROUND_Y - bottom
    shifted = (left + dx, top + dy, right + dx, bottom + dy)
    if shifted[0] < 0 or shifted[1] < 0 or shifted[2] > CANVAS[0] or shifted[3] > CANVAS[1]:
        raise SystemExit(f"{filename}: normalized bounds would clip: source={bbox}, shifted={shifted}")

    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    # Copy RGBA pixels directly. Passing the frame alpha as an extra mask would apply
    # alpha twice and erase very faint edge pixels used to detect the feet baseline.
    canvas.paste(rgba, (dx, dy))
    normalized_bbox = canvas.getchannel("A").getbbox()
    if not normalized_bbox or normalized_bbox[3] != GROUND_Y:
        raise SystemExit(f"{filename}: baseline normalization failed: {normalized_bbox}")
    return canvas, bbox, normalized_bbox, (body_w, body_h)


def prepare_frames(archive: Path):
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    for old in RUN_DIR.glob("frame_*.png"):
        old.unlink()

    source_baselines = []
    normalized_baselines = []
    body_sizes = []
    with zipfile.ZipFile(archive) as zf:
        members = select_pngs(zf)
        for index, member in enumerate(members, 1):
            raw = zf.read(member)
            with Image.open(io.BytesIO(raw)) as image:
                image.load()
                rgba = image.convert("RGBA")
                normalized, source_bbox, normalized_bbox, body_size = normalize_frame(rgba, member.filename)
                source_baselines.append(source_bbox[3])
                normalized_baselines.append(normalized_bbox[3])
                body_sizes.append(body_size)
                out = RUN_DIR / f"frame_{index:02d}.png"
                normalized.save(out, format="PNG", optimize=True)

    if len(set(normalized_baselines)) != 1 or normalized_baselines[0] != GROUND_Y:
        raise SystemExit(f"Run-frame normalized baselines are inconsistent: {normalized_baselines}")
    return source_baselines, normalized_baselines, body_sizes


def update_manifest():
    unit = json.loads(UNIT_PATH.read_text())
    assets = unit.setdefault("assets", {})
    sprites = assets.setdefault("sprites", {})
    sprites["run"] = "sprites/runtime/run/"

    readiness = unit.setdefault("readiness", {})
    readiness["run"] = True

    standard = unit.setdefault("animation_standard", {})
    animations = standard.setdefault("animations", {})
    animations["run"] = {
        "frames": [f"sprites/runtime/run/frame_{index:02d}.png" for index in range(1, 7)],
        "frame_ms": 100,
        "loop": True,
        "events": [],
    }
    UNIT_PATH.write_text(json.dumps(unit, indent=2) + "\n")


def main():
    archive = locate_archive()
    source_baselines, normalized_baselines, body_sizes = prepare_frames(archive)
    update_manifest()
    print(
        "Obito run asset PASS: 6 frames -> "
        f"{RUN_DIR.relative_to(ROOT)}; source baselines={source_baselines}; "
        f"normalized baselines={normalized_baselines}; body sizes={body_sizes}"
    )


if __name__ == "__main__":
    main()
