#!/usr/bin/env python3
"""Non-destructive QA and optional rectangular packing for authored fighter frames.

Only individual PNGs are source of truth; this tool never edits input frames.
Usage:
  python3 scripts/qa-sprite-frames.py assets/characters/road_rookie/sprites/runtime/idle --animation idle --count 6 --strict
  python3 scripts/qa-sprite-frames.py /path/to/source/poses --mode source --report /tmp/road-qa.json
  python3 scripts/qa-sprite-frames.py /path/to/runtime/idle --pack-dir /tmp/road-atlases
"""
import argparse
import hashlib
import json
import re
import statistics
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "fighter-visual-standard.json"
NAME_PATTERN = re.compile(r"(?:frame_|_f)(\d+)\.png$", re.IGNORECASE)
ALPHA_CUTOFF = 12


def inspect(folder, mode="runtime", animation="idle", expected_count=None):
    cfg = json.loads(CONFIG.read_text())["source_frame"]
    errors, warnings, frames = [], [], []
    if not folder.is_dir():
        return {"pass": False, "errors": ["Frame directory does not exist: " + str(folder)],
                "warnings": [], "frames": []}

    files = []
    for file in folder.iterdir():
        if not file.is_file() or file.suffix.lower() != ".png":
            continue
        match = NAME_PATTERN.search(file.name)
        if match:
            files.append((int(match.group(1)), file))
        else:
            warnings.append("Ignored PNG without numbered frame suffix: " + file.name)
    files.sort(key=lambda pair: pair[0])
    if not files:
        errors.append("No numbered frame PNGs found (frame_01.png or unit_idle_f00.png)")
    if expected_count is not None and len(files) != expected_count:
        errors.append("Expected " + str(expected_count) + " frames, found " + str(len(files)))
    numbers = [number for number, _ in files]
    if len(set(numbers)) != len(numbers):
        errors.append("Duplicate frame indices")
    if numbers and numbers != list(range(numbers[0], numbers[0] + len(numbers))):
        errors.append("Frame sequence has missing or nonconsecutive indices")

    for number, file in files:
        entry = {"file": file.name, "index": number}
        try:
            with Image.open(file) as image:
                if image.format != "PNG" or image.mode != "RGBA":
                    errors.append(file.name + ": must be real RGBA PNG")
                    continue
                width, height = image.size
                entry["size"] = [width, height]
                if mode == "runtime" and (width, height) != (cfg["width_px"], cfg["height_px"]):
                    errors.append(file.name + ": runtime frame must be 512x768")
                alpha = image.getchannel("A")
                # Ignore nearly transparent antialiasing fringe when measuring silhouette.
                opaque = alpha.point(lambda value: 255 if value > ALPHA_CUTOFF else 0)
                bounds = opaque.getbbox()
                if not bounds:
                    errors.append(file.name + ": empty or invisible frame")
                    continue
                left, top, right, bottom = bounds
                margins = [left, top, width - right, height - bottom]
                entry.update(bounds=[left, top, right, bottom], margins=margins,
                             body_height=bottom - top, center_x=(left + right) / 2,
                             feet_y=bottom)
                entry["fingerprint"] = hashlib.sha256(image.tobytes()).hexdigest()[:12]
                if min(margins) < 4:
                    errors.append(file.name + ": character nearly touches/crosses rectangular crop boundary")
                if alpha.getextrema()[0] == 255:
                    errors.append(file.name + ": background is fully opaque")
                if mode == "source":
                    if bottom - top < 700:
                        warnings.append(file.name + ": source character below preferred 700px visible height")
                    if min(margins) < 96:
                        warnings.append(file.name + ": source safety margin below preferred 96px")
                elif animation == "idle":
                    if abs(bottom - cfg["feet_baseline_y_px"]) > cfg["feet_baseline_tolerance_px"]:
                        warnings.append(file.name + ": idle feet differ from canonical y=700 by over 8px")
                    if abs((bottom - top) - cfg["standard_body_height_px"]) > cfg["standard_body_height_tolerance_px"]:
                        warnings.append(file.name + ": idle body height outside 600±30px")
                frames.append(entry)
        except (OSError, ValueError) as exc:
            errors.append(file.name + ": cannot read PNG: " + str(exc))

    if len(frames) >= 2:
        if len({frame["fingerprint"] for frame in frames}) == 1:
            warnings.append("All frames are identical: no visible animation")
        if animation == "idle":
            centers = [frame["center_x"] for frame in frames]
            heights = [frame["body_height"] for frame in frames]
            if max(centers) - min(centers) > 20:
                warnings.append("Idle centers vary by over 20px; check unintended horizontal jitter")
            if max(heights) - min(heights) > 24:
                warnings.append("Idle silhouette heights vary by over 24px; check scale pumping")
    return {"pass": not errors, "mode": mode, "animation": animation,
            "frame_count": len(files), "errors": errors, "warnings": warnings,
            "frames": frames}


def pack_frames(folder, report, output):
    if not report["pass"] or report["mode"] != "runtime":
        raise ValueError("Only structurally passing runtime frames can be packed")
    files = [folder / frame["file"] for frame in report["frames"]]
    if len(files) % 6:
        raise ValueError("3x2 atlas export requires a multiple of six frames")
    output.mkdir(parents=True, exist_ok=True)
    destinations = []
    for start in range(0, len(files), 6):
        atlas = Image.new("RGBA", (1536, 1536), (0, 0, 0, 0))
        for offset, file in enumerate(files[start:start + 6]):
            with Image.open(file) as image:
                atlas.alpha_composite(image, ((offset % 3) * 512, (offset // 3) * 768))
        dest = output / ("atlas_part_" + str(start // 6 + 1).zfill(2) + ".png")
        atlas.save(dest, optimize=True)
        destinations.append(str(dest))
    return destinations


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("frames", type=Path)
    parser.add_argument("--mode", choices=("source", "runtime"), default="runtime")
    parser.add_argument("--animation", choices=("idle", "run", "basic", "recoil"), default="idle")
    parser.add_argument("--count", type=int)
    parser.add_argument("--strict", action="store_true", help="Warnings also reject the pack")
    parser.add_argument("--report", type=Path, help="Write machine-readable QA JSON")
    parser.add_argument("--pack-dir", type=Path, help="Optional deterministic 3x2 runtime atlases")
    args = parser.parse_args(argv)

    result = inspect(args.frames, args.mode, args.animation, args.count)
    if args.strict and result["warnings"]:
        result["pass"] = False
    if args.pack_dir:
        if result["pass"]:
            try:
                result["packed_atlases"] = pack_frames(args.frames, result, args.pack_dir)
            except ValueError as exc:
                result["errors"].append(str(exc))
                result["pass"] = False
        else:
            result["errors"].append("Atlas export refused because QA did not pass")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, indent=2) + "\n")
    print("Sprite QA " + ("PASS" if result["pass"] else "FAIL") + ": " + str(result["frame_count"]) + " frames")
    for warning in result["warnings"]:
        print("WARN: " + warning)
    for error in result["errors"]:
        print("ERROR: " + error)
    return 0 if result["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
