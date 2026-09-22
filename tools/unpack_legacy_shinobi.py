#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
EVENT_ROOT = ROOT / "assets" / "events" / "legacy-of-shinobi"
ARCHIVES = [
    ROOT / "legacy_of_the_shinobi_banner_pack_v1_under25.zip",
    ROOT / "legacy_of_the_shinobi_banner_pack_v2.zip",
    ROOT / "legacy_of_the_shinobi_banner_pack_v3_clean_cards.zip",
]
MANIFEST = EVENT_ROOT / "extracted-manifest.json"
UNIT_INDEX = ROOT / "runtime" / "registry" / "unit-index.json"

UNIT_META = {
    "kakashi": {"name":"Kakashi","title":"Copy Ninja","element":"Lightning","archetype":"tactician","stats":{"hp":82,"attack":78,"defense":70,"speed":84}},
    "obito": {"name":"Obito","title":"Masked Flame","element":"Fire","archetype":"phase_bruiser","stats":{"hp":88,"attack":82,"defense":78,"speed":74}},
    "jiraiya": {"name":"Jiraiya","title":"Toad Sage","element":"Fire","archetype":"sage_brawler","stats":{"hp":92,"attack":76,"defense":80,"speed":62}},
    "sasuke": {"name":"Sasuke","title":"Avenger","element":"Lightning","archetype":"duelist","stats":{"hp":80,"attack":86,"defense":68,"speed":88}},
    "pain": {"name":"Pain","title":"Six Paths","element":"Dark","archetype":"controller","stats":{"hp":90,"attack":84,"defense":82,"speed":64}},
    "scorpion": {"name":"Scorpion","title":"Hellfire Shinobi","element":"Fire","archetype":"assassin","stats":{"hp":84,"attack":82,"defense":74,"speed":76}},
    "rock_lee": {"name":"Rock Lee","title":"Taijutsu Prodigy","element":"Neutral","archetype":"speed_brawler","stats":{"hp":86,"attack":76,"defense":72,"speed":92}},
    "mashle": {"name":"Mashle","title":"Iron Magic","element":"Neutral","archetype":"power_brawler","stats":{"hp":94,"attack":88,"defense":86,"speed":70}},
    "jackie_chan": {"name":"Jackie Chan","title":"Drunken Master","element":"Neutral","archetype":"counter_fighter","stats":{"hp":88,"attack":74,"defense":78,"speed":80}},
    "killua": {"name":"Killua","title":"Godspeed Heir","element":"Lightning","archetype":"assassin","stats":{"hp":76,"attack":82,"defense":62,"speed":96}},
    "zabuza": {"name":"Zabuza","title":"Demon of the Mist","element":"Water","archetype":"bruiser","stats":{"hp":90,"attack":80,"defense":84,"speed":60}},
    "gabimaru": {"name":"Gabimaru","title":"The Hollow","element":"Fire","archetype":"assassin","stats":{"hp":82,"attack":84,"defense":70,"speed":88}},
}

def safe_target(base: Path, member: str) -> Path:
    candidate = (base / member).resolve()
    root = base.resolve()
    if root not in candidate.parents and candidate != root:
        raise RuntimeError(f"Unsafe archive path: {member}")
    return candidate

def sheet_grid(width: int, height: int):
    ratio = width / max(1, height)
    if ratio >= 3.5:
        return 6, 1
    if ratio <= 0.29:
        return 1, 6
    if width >= height:
        return 3, 2
    return 2, 3

def split_sheet(sheet_path: Path, output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(sheet_path).convert("RGBA") as image:
        cols, rows = sheet_grid(image.width, image.height)
        cell_w = image.width // cols
        cell_h = image.height // rows
        frames = []
        for index in range(6):
            col = index % cols
            row = index // cols
            left = col * cell_w
            top = row * cell_h
            right = image.width if col == cols - 1 else left + cell_w
            bottom = image.height if row == rows - 1 else top + cell_h
            frame = image.crop((left, top, right, bottom))
            frame_path = output_dir / f"frame_{index+1:02d}.png"
            frame.save(frame_path, optimize=True)
            frames.append(frame_path)
    return {"columns": cols, "rows": rows, "cell_width": cell_w, "cell_height": cell_h, "frames": frames}

def runtime_map_json(unit_id: str):
    return {
        "schema_version": 3,
        "unit_id": unit_id,
        "source_unit_data": f"assets/characters/{unit_id}/data/unit.json",
        "abilities": {
            "basic_attack": {
                "slot": "basic",
                "animation_id": f"{unit_id}.animation.basic_attack",
                "runtime_handler": "animateLunge",
                "gameplay_actions": [
                    {
                        "event": "on_impact",
                        "action_id": "damage_target",
                        "parameters": {
                            "multiplier_source": "abilities.basic.damage_multiplier"
                        }
                    }
                ],
                "vfx": {
                    "impact": "shared.vfx.impact.default"
                }
            },
            "legacy_jutsu_pending": {
                "slot": "jutsu",
                "animation_id": f"{unit_id}.animation.idle",
                "runtime_handler": "disabled",
                "execution_status": "declared_not_wired",
                "migration_note": "Dedicated Legacy of the Shinobi Jutsu and VFX are intentionally deferred to the next character-authoring pass.",
                "gameplay_actions": []
            }
        },
        "states": {
            "idle": f"{unit_id}.animation.idle"
        }
    }

def unit_json(unit_id: str, card_name: str):
    meta = UNIT_META[unit_id]
    stats = meta["stats"]
    return {
        "schema_version": 3,
        "id": unit_id,
        "display_name": meta["name"],
        "title": meta["title"],
        "role": "playable",
        "archetype": meta["archetype"],
        "element": meta["element"],
        "rarity": "Legendary",
        "collection": {"owned": True, "inventory_visible": True, "battle_ready": True},
        "stats": {"level": 1, **stats},
        "combat": {
            "mark": "".join(part[0] for part in meta["name"].replace("-", " ").split())[:3].upper(),
            "movement_range": 90,
            "basic_shape": {"type": "circle", "r": 96},
            "jutsu_shape": {"type": "circle", "r": 118},
            "chakra_max": 8,
            "chakra_start": 2,
        },
        "render": {"scale": 1},
        "abilities": {
            "basic": {
                "id": "basic_attack",
                "name": "Basic Attack",
                "damage_multiplier": 1,
                "chakra_gain": 1,
                "delivery": "melee",
                "target_mode": "single",
                "single_target_selector": "nearest_in_shape",
                "presentation": {
                    "runtime_driver": "animateLunge",
                    "animation_kind": "basic_attack",
                    "melee_animation_kind": "basic_attack",
                    "range_visual_scale": 1,
                },
            },
            "jutsu": {
                "id": "legacy_jutsu_pending",
                "name": "Jutsu Pending",
                "cost": 99,
                "damage_multiplier": 0,
                "delivery": "disabled",
                "category": "jutsu",
                "ultimate": False,
            },
        },
        "assets": {
            "art": f"cards/{card_name}",
            "card": f"cards/{card_name}",
            "portrait": f"cards/{card_name}",
            "icon": None,
            "sprites": {
                "idle": "sprites/runtime/idle/",
                "attack_basic": "sprites/runtime/attack/basic/",
                "jutsu": None,
            },
            "vfx": None,
        },
        "readiness": {
            "collection": True,
            "battle": True,
            "idle": True,
            "basic_attack": True,
            "jutsu": False,
            "recoil": False,
            "notes": "Legacy of the Shinobi first-pass integration. Card art plus six-frame idle/basic attack are live; dedicated VFX and jutsu will be authored in a later pass.",
            "animation_map": True,
        },
        "balance": {
            "status": "provisional",
            "pass": "legacy-shinobi-banner-v1",
            "notes": "Temporary first-pass combat values for banner testing. Jutsu intentionally disabled until authored.",
        },
        "animation_standard": {
            "version": "legacy-shinobi-v1",
            "animations": {
                "idle": {
                    "frames": [f"sprites/runtime/idle/frame_{i:02d}.png" for i in range(1, 7)],
                    "frame_ms": 145,
                    "loop": True,
                    "events": [],
                },
                "basic_attack": {
                    "frames": [f"sprites/runtime/attack/basic/frame_{i:02d}.png" for i in range(1, 7)],
                    "frame_ms": 105,
                    "loop": False,
                    "events": [{"frame": 4, "event": "apply_melee"}],
                },
            },
            "vfx": {},
        },
    }

packages = []
unit_sources = {}
for index, archive in enumerate(ARCHIVES, start=1):
    if not archive.exists():
        raise SystemExit(f"Missing archive: {archive.relative_to(ROOT)}")
    target = EVENT_ROOT / f"package-v{index}"
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)
    files = []
    with zipfile.ZipFile(archive) as zf:
        for info in zf.infolist():
            if info.is_dir():
                safe_target(target, info.filename).mkdir(parents=True, exist_ok=True)
                continue
            dest = safe_target(target, info.filename)
            dest.parent.mkdir(parents=True, exist_ok=True)
            data = zf.read(info)
            dest.write_bytes(data)
            files.append({
                "path": dest.relative_to(ROOT).as_posix(),
                "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            })
    packages.append({
        "version": index,
        "source_archive": archive.name,
        "source_sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
        "file_count": len(files),
        "files": files,
    })
    for child in target.rglob("*"):
        if not child.is_dir():
            continue
        names = {p.name for p in child.iterdir() if p.is_file()}
        if {"idle_6f.png", "basic_attack_6f.png"} <= names and any(n.startswith("card_art.") for n in names):
            unit_sources[child.name] = child
    print(f"Extracted {len(files)} files from {archive.name} to {target.relative_to(ROOT)}")

missing = sorted(set(UNIT_META) - set(unit_sources))
if missing:
    raise SystemExit(f"Missing expected unit packages: {', '.join(missing)}")

generated_units = []
for unit_id, source_dir in sorted(unit_sources.items()):
    if unit_id not in UNIT_META:
        continue
    canonical = ROOT / "assets" / "characters" / unit_id
    if canonical.exists():
        shutil.rmtree(canonical)
    card_dir = canonical / "cards"
    card_dir.mkdir(parents=True, exist_ok=True)
    source_card = next(p for p in source_dir.iterdir() if p.is_file() and p.name.startswith("card_art."))
    card_name = f"legacy_of_shinobi_card{source_card.suffix.lower()}"
    shutil.copy2(source_card, card_dir / card_name)

    idle_meta = split_sheet(source_dir / "idle_6f.png", canonical / "sprites" / "runtime" / "idle")
    attack_meta = split_sheet(source_dir / "basic_attack_6f.png", canonical / "sprites" / "runtime" / "attack" / "basic")

    data_dir = canonical / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    data = unit_json(unit_id, card_name)
    data["animation_standard"]["source_sheets"] = {
        "idle": {
            "path": source_dir.relative_to(ROOT).joinpath("idle_6f.png").as_posix(),
            "columns": idle_meta["columns"],
            "rows": idle_meta["rows"],
        },
        "basic_attack": {
            "path": source_dir.relative_to(ROOT).joinpath("basic_attack_6f.png").as_posix(),
            "columns": attack_meta["columns"],
            "rows": attack_meta["rows"],
        },
    }
    (data_dir / "unit.json").write_text(json.dumps(data, indent=2) + "\n")
    (data_dir / "runtime-map.json").write_text(json.dumps(runtime_map_json(unit_id), indent=2) + "\n")
    runtime_map = {
        "schema_version": 3,
        "unit_id": unit_id,
        "source_unit_data": f"assets/characters/{unit_id}/data/unit.json",
        "abilities": {
            "basic_attack": {
                "slot": "basic",
                "animation_id": f"{unit_id}.animation.basic_attack",
                "runtime_handler": "animateLunge",
                "gameplay_actions": [
                    {
                        "event": "on_impact",
                        "action_id": "damage_target",
                        "parameters": {"multiplier_source": "abilities.basic.damage_multiplier"},
                    }
                ],
                "vfx": {"impact": "shared.vfx.impact.default"},
            },
            "legacy_jutsu_pending": {
                "slot": "jutsu",
                "animation_id": f"{unit_id}.animation.idle",
                "runtime_handler": "disabled",
                "execution_status": "declared_not_wired",
                "migration_note": "Legacy of the Shinobi first-pass integration keeps Jutsu locked until dedicated VFX and Jutsu are authored.",
                "gameplay_actions": [],
                "vfx": {},
            },
        },
        "states": {"idle": f"{unit_id}.animation.idle"},
    }
    (data_dir / "runtime-map.json").write_text(json.dumps(runtime_map, indent=2) + "\n")
    generated_units.append(unit_id)

index_data = json.loads(UNIT_INDEX.read_text())
existing = [entry for entry in index_data.get("units", []) if entry.get("id") not in UNIT_META]
boss = [entry for entry in existing if entry.get("id") == "anubis"]
playable = [entry for entry in existing if entry.get("id") != "anubis"]
for unit_id in UNIT_META:
    playable.append({"id": unit_id, "path": f"assets/characters/{unit_id}/data/unit.json"})
index_data["units"] = playable + boss
UNIT_INDEX.write_text(json.dumps(index_data, indent=2) + "\n")

EVENT_ROOT.mkdir(parents=True, exist_ok=True)
MANIFEST.write_text(json.dumps({
    "schema_version": 3,
    "packages": packages,
    "total_file_count": sum(p["file_count"] for p in packages),
    "generated_units": generated_units,
}, indent=2) + "\n")

print(f"Prepared {len(generated_units)} playable Legacy of the Shinobi units: {', '.join(generated_units)}")
