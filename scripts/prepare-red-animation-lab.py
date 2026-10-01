#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from PIL import Image


def find_source_root(extracted: Path) -> Path:
    candidates = [
        extracted / "red_runtime_assets_v1" / "assets" / "characters" / "red",
        extracted / "assets" / "characters" / "red",
    ]
    for candidate in candidates:
        if (candidate / "reference" / "red_master_reference.png").is_file():
            return candidate
    matches = list(extracted.rglob("red_master_reference.png"))
    if not matches:
        raise SystemExit("Could not locate Red source root in uploaded archive")
    return matches[0].parent.parent


def copy_file(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def crop_grid(src: Path, cols: int, rows: int, count: int, out_dir: Path, start_index: int = 1, qa=None, sequence="") -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(src).convert("RGBA") as image:
        width, height = image.size
        frame = 0
        for row in range(rows):
            y0 = round(row * height / rows)
            y1 = round((row + 1) * height / rows)
            for col in range(cols):
                if frame >= count:
                    return
                x0 = round(col * width / cols)
                x1 = round((col + 1) * width / cols)
                cell = image.crop((x0, y0, x1, y1))
                index = start_index + frame
                out = out_dir / f"frame_{index:02d}.png"
                cell.save(out, format="PNG")
                if qa is not None:
                    alpha = cell.getchannel("A")
                    bbox = alpha.getbbox()
                    if bbox:
                        bx0, by0, bx1, by1 = bbox
                        margins = {
                            "left": bx0,
                            "right": cell.width - bx1,
                            "top": by0,
                            "bottom": cell.height - by1,
                        }
                        touches = [side for side, margin in margins.items() if margin <= 2]
                    else:
                        margins = {"left": cell.width, "right": cell.width, "top": cell.height, "bottom": cell.height}
                        touches = ["empty"]
                    qa.append({
                        "sequence": sequence,
                        "frame": index,
                        "source_cell": [cell.width, cell.height],
                        "margins": margins,
                        "touches": touches,
                    })
                frame += 1


def make_manifest() -> dict:
    def frames(path: str, count: int):
        return [f"{path}/frame_{i:02d}.png" for i in range(1, count + 1)]

    return {
        "schema_version": 3,
        "id": "red",
        "display_name": "Red",
        "title": "Capture Prodigy",
        "role": "playable",
        "archetype": "ranged",
        "element": "Fire",
        "rarity": "Legendary",
        "collection": {"owned": True, "inventory_visible": False, "battle_ready": False},
        "stats": {"level": 1, "hp": 80, "attack": 82, "defense": 72, "speed": 84},
        "combat": {
            "mark": "R",
            "movement_range": 90,
            "basic_shape": {"type": "circle", "r": 120},
            "jutsu_shape": {"type": "circle", "r": 135},
            "chakra_max": 8,
            "chakra_start": 2,
        },
        "render": {"scale": 1, "sprite_anchor": "bottom_center", "sprite_canvas": {"width": 512, "height": 768}},
        "abilities": {
            "basic": {
                "id": "basic_attack",
                "name": "Capture Orb Throw",
                "damage_multiplier": 1,
                "chakra_gain": 1,
                "delivery": "projectile",
                "target_mode": "single",
                "presentation": {"animation_kind": "basic_attack", "projectile_asset": "props/red_capture_orb.png"},
            },
            "jutsu": {
                "id": "monster_release_pending",
                "name": "Monster Release Pending",
                "cost": 99,
                "damage_multiplier": 0,
                "delivery": "disabled",
                "category": "jutsu",
                "ultimate": False,
            },
        },
        "assets": {
            "portrait": "reference/red_master_reference.png",
            "card": None,
            "icon": None,
            "sprites": {
                "idle": "sprites/runtime/v2/idle/",
                "attack_basic": "sprites/runtime/v2/attack/",
                "recoil": "sprites/runtime/v2/recoil/",
                "run": None,
                "jutsu": None,
            },
            "projectile": "props/red_capture_orb.png",
            "vfx": "vfx/runtime/orb_release/",
        },
        "readiness": {
            "collection": False,
            "battle": False,
            "idle": True,
            "run": False,
            "basic_attack": True,
            "recoil": True,
            "jutsu": False,
            "notes": "Animation Lab candidate only. Source sheets include edge-touching cells; inspect before production promotion.",
        },
        "animation_standard": {
            "version": "production-sprite-quality-v1.1-lab-candidate",
            "animations": {
                "idle": {"frames": frames("sprites/runtime/v2/idle", 12), "frame_ms": 115, "loop": True, "events": []},
                "basic_attack": {"frames": frames("sprites/runtime/v2/attack", 14), "frame_ms": 90, "loop": False, "events": [{"frame": 7, "event": "release_projectile"}]},
                "recoil": {"frames": frames("sprites/runtime/v2/recoil", 8), "frame_ms": 95, "loop": False, "events": []},
            },
            "vfx": {"orb_release": {"frames": frames("vfx/runtime/orb_release", 14), "frame_ms": 80, "loop": False}},
        },
    }


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: prepare-red-animation-lab.py <extracted-archive-dir> <repo-root>")
    extracted = Path(sys.argv[1]).resolve()
    repo = Path(sys.argv[2]).resolve()
    src = find_source_root(extracted)
    out = repo / "assets" / "characters" / "red"
    if out.exists():
        shutil.rmtree(out)

    copy_file(src / "reference" / "red_master_reference.png", out / "reference" / "red_master_reference.png")
    copy_file(src / "props" / "red_capture_orb.png", out / "props" / "red_capture_orb.png")

    source_map = {
        "red_idle_orb_toss_12f.png": src / "sprites" / "runtime" / "idle" / "red_idle_orb_toss_12f.png",
        "red_basic_orb_throw_part01_f01-f07.png": src / "sprites" / "runtime" / "basic" / "red_basic_orb_throw_part01_f01-f07.png",
        "red_basic_orb_throw_part02_f08-f14.png": src / "sprites" / "runtime" / "basic" / "red_basic_orb_throw_part02_f08-f14.png",
        "red_recoil_8f.png": src / "sprites" / "runtime" / "recoil" / "red_recoil_8f.png",
    }
    for name, path in source_map.items():
        copy_file(path, out / "source" / name)
    copy_file(src / "vfx" / "red_capture_orb_release_blue_14f.png", out / "vfx" / "source" / "red_capture_orb_release_blue_14f.png")

    qa = []
    crop_grid(source_map["red_idle_orb_toss_12f.png"], 6, 2, 12, out / "sprites" / "runtime" / "v2" / "idle", 1, qa, "idle")
    crop_grid(source_map["red_basic_orb_throw_part01_f01-f07.png"], 4, 2, 7, out / "sprites" / "runtime" / "v2" / "attack", 1, qa, "attack")
    crop_grid(source_map["red_basic_orb_throw_part02_f08-f14.png"], 4, 2, 7, out / "sprites" / "runtime" / "v2" / "attack", 8, qa, "attack")
    crop_grid(source_map["red_recoil_8f.png"], 4, 2, 8, out / "sprites" / "runtime" / "v2" / "recoil", 1, qa, "recoil")
    crop_grid(src / "vfx" / "red_capture_orb_release_blue_14f.png", 7, 2, 14, out / "vfx" / "runtime" / "orb_release", 1, qa, "orb_release")

    (out / "data").mkdir(parents=True, exist_ok=True)
    (out / "data" / "unit.json").write_text(json.dumps(make_manifest(), indent=2) + "\n", encoding="utf-8")
    (out / "data" / "source-qa.json").write_text(json.dumps({"generated_from": "red_runtime_assets_v1", "qa": qa}, indent=2) + "\n", encoding="utf-8")
    touches = [item for item in qa if item["touches"]]
    (out / "SOURCE_QA.md").write_text(
        "# Red Animation Lab source QA\n\n"
        f"Generated {len(qa)} sliced frames from the supplied source sheets.\n\n"
        f"{len(touches)} frames touch at least one source-cell edge. These are intentionally preserved for Animation Lab diagnostics rather than masked.\n",
        encoding="utf-8",
    )
    print(f"Prepared Red Animation Lab runtime at {out}")
    print(f"QA: {len(touches)}/{len(qa)} frames touch a source-cell edge")


if __name__ == "__main__":
    main()
