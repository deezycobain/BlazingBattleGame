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


def prepare_frames(archive: Path):
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    for old in RUN_DIR.glob("frame_*.png"):
        old.unlink()

    baselines = []
    with zipfile.ZipFile(archive) as zf:
        members = select_pngs(zf)
        for index, member in enumerate(members, 1):
            raw = zf.read(member)
            with Image.open(io.BytesIO(raw)) as image:
                image.load()
                if image.size != (512, 768):
                    raise SystemExit(f"{member.filename}: expected 512x768, got {image.size[0]}x{image.size[1]}")
                rgba = image.convert("RGBA")
                alpha = rgba.getchannel("A")
                extrema = alpha.getextrema()
                if not extrema or extrema[0] == 255:
                    raise SystemExit(f"{member.filename}: frame has no transparent pixels")
                bbox = alpha.getbbox()
                if not bbox:
                    raise SystemExit(f"{member.filename}: empty alpha bounds")
                baselines.append(bbox[3])
                out = RUN_DIR / f"frame_{index:02d}.png"
                rgba.save(out, format="PNG", optimize=True)

    if max(baselines) - min(baselines) > 8:
        raise SystemExit(f"Run-frame baseline jitter is too large: {baselines}")
    return baselines


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
    baselines = prepare_frames(archive)
    update_manifest()
    print(f"Obito run asset PASS: 6 frames -> {RUN_DIR.relative_to(ROOT)}; alpha baselines={baselines}")


if __name__ == "__main__":
    main()
