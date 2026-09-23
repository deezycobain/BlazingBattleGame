#!/usr/bin/env python3
from pathlib import Path
from collections import deque
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
AUDIT_REPORT = EVENT_ROOT / "sprite-audit.json"
UNIT_INDEX = ROOT / "runtime" / "registry" / "unit-index.json"

CANVAS_W = 512
CANVAS_H = 768
CONTENT_MAX_W = 456
CONTENT_MAX_H = 704
BOTTOM_ANCHOR = 742
ALPHA_THRESHOLD = 12

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

# The packs are not homogeneous. Pack v1 uses 3 columns x 2 rows.
# Packs v2/v3 use 6 columns x 1 row. This is explicit by unit so no
# aspect-ratio guess can silently corrupt a sheet again.
STRIP_UNITS = {"rock_lee", "mashle", "jackie_chan", "gabimaru", "killua", "zabuza"}

def safe_target(base: Path, member: str) -> Path:
    candidate = (base / member).resolve()
    root = base.resolve()
    if root not in candidate.parents and candidate != root:
        raise RuntimeError(f"Unsafe archive path: {member}")
    return candidate

def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def layout_for(unit_id: str):
    return (6, 1) if unit_id in STRIP_UNITS else (3, 2)

def alpha_bbox(image: Image.Image):
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)
    return mask.getbbox()

def choose_x_boundary(alpha: Image.Image, y0: int, y1: int, expected: int, radius: int) -> int:
    px = alpha.load()
    lo = max(2, expected - radius)
    hi = min(alpha.width - 2, expected + radius)
    best = expected
    best_score = None
    for x in range(lo, hi + 1):
        mass = 0
        for xx in range(max(0, x - 1), min(alpha.width, x + 2)):
            mass += sum(1 for y in range(y0, y1) if px[xx, y] > ALPHA_THRESHOLD)
        score = mass + abs(x - expected) * 0.03
        if best_score is None or score < best_score:
            best_score = score
            best = x
    return best

def choose_y_boundary(alpha: Image.Image, expected: int, radius: int) -> int:
    px = alpha.load()
    lo = max(2, expected - radius)
    hi = min(alpha.height - 2, expected + radius)
    best = expected
    best_score = None
    for y in range(lo, hi + 1):
        mass = 0
        for yy in range(max(0, y - 1), min(alpha.height, y + 2)):
            mass += sum(1 for x in range(alpha.width) if px[x, yy] > ALPHA_THRESHOLD)
        score = mass + abs(y - expected) * 0.03
        if best_score is None or score < best_score:
            best_score = score
            best = y
    return best

def grid_cells(image: Image.Image, cols: int, rows: int):
    alpha = image.getchannel("A")
    if rows == 1:
        y_bounds = [0, image.height]
    else:
        approx_h = image.height / rows
        y_bounds = [0]
        for row in range(1, rows):
            expected = round(image.height * row / rows)
            radius = max(18, round(approx_h * 0.16))
            y_bounds.append(choose_y_boundary(alpha, expected, radius))
        y_bounds.append(image.height)

    cells = []
    for row in range(rows):
        y0, y1 = y_bounds[row], y_bounds[row + 1]
        approx_w = image.width / cols
        x_bounds = [0]
        for col in range(1, cols):
            expected = round(image.width * col / cols)
            radius = max(18, round(approx_w * 0.18))
            x_bounds.append(choose_x_boundary(alpha, y0, y1, expected, radius))
        x_bounds.append(image.width)
        for col in range(cols):
            cells.append((x_bounds[col], y0, x_bounds[col + 1], y1))
    if len(cells) != 6:
        raise RuntimeError(f"Expected 6 cells, got {len(cells)} from {cols}x{rows}")
    return cells

def isolate_subject(frame: Image.Image, core_box):
    # Find all half-resolution components first so the intended pose can be chosen
    # by its centroid inside the nominal cell. Then flood-fill that exact component
    # at full resolution and clear every unrelated pixel. This is the key difference
    # from the old crop-only approach: neighboring hair, legs, cloth and weapons are
    # removed instead of merely sitting inside a wider transparent crop.
    alpha = frame.getchannel("A")
    threshold_mask = alpha.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)
    small_w = max(1, (frame.width + 1) // 2)
    small_h = max(1, (frame.height + 1) // 2)
    small = threshold_mask.resize((small_w, small_h), Image.Resampling.NEAREST)
    px = small.load()
    visited = bytearray(small_w * small_h)
    components = []

    for sy in range(small_h):
        for sx in range(small_w):
            idx = sy * small_w + sx
            if visited[idx] or px[sx, sy] == 0:
                continue
            visited[idx] = 1
            queue = deque([(sx, sy)])
            area = 0
            core_hits = 0
            core_seed = None
            sum_x = sum_y = 0
            min_x = max_x = sx
            min_y = max_y = sy
            while queue:
                x, y = queue.popleft()
                area += 1
                fx = x * 2
                fy = y * 2
                if core_box[0] <= fx <= core_box[2] and core_box[1] <= fy <= core_box[3]:
                    core_hits += 1
                    if core_seed is None:
                        core_seed = (fx, fy)
                sum_x += x
                sum_y += y
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
                for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1),(x-1,y-1),(x+1,y-1),(x-1,y+1),(x+1,y+1)):
                    if nx < 0 or ny < 0 or nx >= small_w or ny >= small_h:
                        continue
                    nidx = ny * small_w + nx
                    if visited[nidx] or px[nx, ny] == 0:
                        continue
                    visited[nidx] = 1
                    queue.append((nx, ny))
            if area >= 4:
                components.append({
                    "area": area,
                    "core_hits": core_hits,
                    "seed": core_seed or (sx*2, sy*2),
                    "bbox": (min_x*2, min_y*2, min(frame.width,(max_x+1)*2), min(frame.height,(max_y+1)*2)),
                    "cx": (sum_x/area)*2,
                    "cy": (sum_y/area)*2,
                })

    if not components:
        return None, None, None

    # Pick the component that actually occupies the nominal cell most strongly.
    # Centroid-only selection can choose a tiny detached spark/VFX fragment when a
    # dynamic pose extends across a cell boundary (Scorpion attack frame 3 exposed this).
    core_components = [c for c in components if c["core_hits"] > 0]
    primary = max(core_components or components, key=lambda c: (c.get("core_hits", 0), c["area"]))

    # Seed from a pixel known to belong to the chosen half-resolution component.
    # Using the component centroid is unsafe for crescent / ring / lunging poses:
    # the centroid can fall on transparent space next to a detached VFX island.
    full_px = alpha.load()
    seed_x = max(0, min(frame.width-1, round(primary["seed"][0])))
    seed_y = max(0, min(frame.height-1, round(primary["seed"][1])))
    seed = None
    for radius in range(0, 8):
        x0=max(0,seed_x-radius); x1=min(frame.width-1,seed_x+radius)
        y0=max(0,seed_y-radius); y1=min(frame.height-1,seed_y+radius)
        for y in range(y0,y1+1):
            for x in range(x0,x1+1):
                if full_px[x,y] > ALPHA_THRESHOLD:
                    seed=(x,y); break
            if seed: break
        if seed: break
    if not seed:
        return None, None, None

    selected = bytearray(frame.width * frame.height)
    queue = deque([seed])
    selected[seed[1]*frame.width+seed[0]] = 1
    left=right=seed[0]
    top=bottom=seed[1]
    area=0
    while queue:
        x,y=queue.popleft()
        area += 1
        left=min(left,x); right=max(right,x)
        top=min(top,y); bottom=max(bottom,y)
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1),(x-1,y-1),(x+1,y-1),(x-1,y+1),(x+1,y+1)):
            if nx<0 or ny<0 or nx>=frame.width or ny>=frame.height:
                continue
            nidx=ny*frame.width+nx
            if selected[nidx] or full_px[nx,ny] <= ALPHA_THRESHOLD:
                continue
            selected[nidx]=1
            queue.append((nx,ny))

    if area < 100:
        return None, None, None

    # Preserve original antialiased alpha for the selected component only.
    cleaned = frame.copy()
    clean_alpha = Image.new("L", frame.size, 0)
    clean_px = clean_alpha.load()
    for y in range(frame.height):
        row=y*frame.width
        for x in range(frame.width):
            if selected[row+x]:
                clean_px[x,y]=full_px[x,y]
    cleaned.putalpha(clean_alpha)

    pad_x=max(8,round((right-left+1)*0.06))
    pad_y=max(8,round((bottom-top+1)*0.05))
    subject_box=(
        max(0,left-pad_x),
        max(0,top-pad_y),
        min(frame.width,right+1+pad_x),
        min(frame.height,bottom+1+pad_y),
    )
    component_audit={
        "component_area": area,
        "selected_core_hits": primary.get("core_hits", 0),
        "component_bbox": [left,top,right+1,bottom+1],
        "discarded_components": max(0,len(components)-1),
    }
    return cleaned, subject_box, component_audit

def keep_largest_component(image: Image.Image):
    alpha = image.getchannel("A")
    px = alpha.load()
    visited = bytearray(image.width * image.height)
    components = []

    for sy in range(image.height):
        for sx in range(image.width):
            idx = sy * image.width + sx
            if visited[idx] or px[sx, sy] <= ALPHA_THRESHOLD:
                continue
            visited[idx] = 1
            queue = deque([(sx, sy)])
            points = []
            while queue:
                x, y = queue.popleft()
                points.append((x, y))
                for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1),(x-1,y-1),(x+1,y-1),(x-1,y+1),(x+1,y+1)):
                    if nx < 0 or ny < 0 or nx >= image.width or ny >= image.height:
                        continue
                    nidx = ny * image.width + nx
                    if visited[nidx] or px[nx, ny] <= ALPHA_THRESHOLD:
                        continue
                    visited[nidx] = 1
                    queue.append((nx, ny))
            if points:
                components.append(points)

    if not components:
        return image

    primary = max(components, key=len)
    keep = bytearray(image.width * image.height)
    for x, y in primary:
        keep[y * image.width + x] = 1

    cleaned = image.copy()
    clean_alpha = Image.new("L", image.size, 0)
    out = clean_alpha.load()
    for y in range(image.height):
        row = y * image.width
        for x in range(image.width):
            if keep[row + x]:
                out[x, y] = px[x, y]
    cleaned.putalpha(clean_alpha)
    return cleaned

def normalize_pose(frame: Image.Image, subject_box):
    content = frame.crop(subject_box)
    bbox = alpha_bbox(content)
    if not bbox:
        raise RuntimeError("Frame contains no visible fighter pixels")
    content = content.crop(bbox)

    scale = min(CONTENT_MAX_W / content.width, CONTENT_MAX_H / content.height, 1.35)
    out_w = max(1, round(content.width * scale))
    out_h = max(1, round(content.height * scale))
    content = content.resize((out_w, out_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0,0,0,0))
    x = (CANVAS_W - out_w) // 2
    y = BOTTOM_ANCHOR - out_h
    if y < 18:
        shrink = (BOTTOM_ANCHOR - 18) / out_h
        out_w = max(1, round(out_w * shrink))
        out_h = max(1, round(out_h * shrink))
        content = content.resize((out_w, out_h), Image.Resampling.LANCZOS)
        x = (CANVAS_W - out_w) // 2
        y = BOTTOM_ANCHOR - out_h
    canvas.alpha_composite(content, (x, y))
    # Final island cleanup removes any tiny neighboring foot/hair/effect fragment
    # that survived the source-cell guard. Runtime body frames intentionally keep
    # one coherent fighter component; standalone VFX will be authored separately.
    canvas = keep_largest_component(canvas)

    out_bbox = alpha_bbox(canvas)
    if not out_bbox:
        raise RuntimeError("Normalized frame became empty")
    if out_bbox[0] <= 1 or out_bbox[1] <= 1 or out_bbox[2] >= CANVAS_W - 1 or out_bbox[3] >= CANVAS_H - 1:
        raise RuntimeError(f"Normalized fighter touches canvas edge: {out_bbox}")

    return canvas, {
        "subject_box": list(subject_box),
        "output_bbox": list(out_bbox),
        "output_size": [CANVAS_W, CANVAS_H],
        "visible_size": [out_bbox[2]-out_bbox[0], out_bbox[3]-out_bbox[1]],
    }

def split_sheet(unit_id: str, kind: str, sheet_path: Path, output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    cols, rows = layout_for(unit_id)

    with Image.open(sheet_path).convert("RGBA") as image:
        source_w, source_h = image.width, image.height
        ratio = source_w / max(1, source_h)
        if cols == 6 and ratio < 2.35:
            raise RuntimeError(f"{unit_id} {kind}: expected 6x1 strip, got {source_w}x{source_h}")
        if cols == 3 and not (0.80 <= ratio <= 1.25):
            raise RuntimeError(f"{unit_id} {kind}: expected 3x2 grid, got {source_w}x{source_h}")

        cells = grid_cells(image, cols, rows)
        frames = []
        audit_frames = []

        for index, nominal in enumerate(cells):
            left, top, right, bottom = nominal
            cell_w = right - left
            cell_h = bottom - top

            # Expand around the nominal cell so a foot/hair/weapon crossing the
            # authored gutter is still recoverable before subject isolation.
            pad_x = max(8, round(cell_w * 0.11))
            pad_y = max(8, round(cell_h * 0.10))
            ex_left = max(0, left - pad_x)
            ex_top = max(0, top - pad_y)
            ex_right = min(source_w, right + pad_x)
            ex_bottom = min(source_h, bottom + pad_y)
            expanded = image.crop((ex_left, ex_top, ex_right, ex_bottom))
            core = (left-ex_left, top-ex_top, right-ex_left, bottom-ex_top)

            # Hard spatial guard around the content-aware cell. This severs rare
            # generated effects that physically connect one pose to its neighbor
            # (Killua lightning was the clearest example) before component tracing.
            # A small recovery margin keeps hair, feet and weapons that cross the
            # detected gutter by a handful of pixels.
            guard_x = 2
            guard_y = 2
            gx0 = max(0, core[0] - guard_x)
            gy0 = max(0, core[1] - guard_y)
            gx1 = min(expanded.width, core[2] + guard_x)
            gy1 = min(expanded.height, core[3] + guard_y)
            original_alpha = expanded.getchannel("A")
            guarded_alpha = Image.new("L", expanded.size, 0)
            guarded_alpha.paste(original_alpha.crop((gx0, gy0, gx1, gy1)), (gx0, gy0))
            expanded.putalpha(guarded_alpha)

            cleaned, subject_box, component_audit = isolate_subject(expanded, core)
            if not subject_box or cleaned is None:
                raise RuntimeError(f"{unit_id} {kind} frame {index+1}: subject isolation failed")

            normalized, frame_audit = normalize_pose(cleaned, subject_box)
            frame_audit["component"] = component_audit
            frame_path = output_dir / f"frame_{index+1:02d}.png"
            normalized.save(frame_path, optimize=True)
            frames.append(frame_path)

            frame_audit.update({
                "frame": index + 1,
                "nominal_cell": list(nominal),
                "expanded_cell": [ex_left, ex_top, ex_right, ex_bottom],
                "sha256": sha256_file(frame_path),
            })
            audit_frames.append(frame_audit)

    return {
        "columns": cols,
        "rows": rows,
        "source_size": [source_w, source_h],
        "output_canvas": [CANVAS_W, CANVAS_H],
        "anchor": "bottom_center",
        "frames": frames,
        "audit_frames": audit_frames,
    }

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
                "gameplay_actions": [{
                    "event": "on_impact",
                    "action_id": "damage_target",
                    "parameters": {"multiplier_source": "abilities.basic.damage_multiplier"},
                }],
                "vfx": {"impact": "shared.vfx.impact.default"},
            },
            "legacy_jutsu_pending": {
                "slot": "jutsu",
                "animation_id": f"{unit_id}.animation.idle",
                "runtime_handler": "disabled",
                "execution_status": "declared_not_wired",
                "migration_note": "Dedicated Legacy of the Shinobi Jutsu and VFX are intentionally deferred to the next character-authoring pass.",
                "gameplay_actions": [],
            },
        },
        "states": {"idle": f"{unit_id}.animation.idle"},
    }

def unit_json(unit_id: str, card_name: str):
    meta = UNIT_META[unit_id]
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
        "stats": {"level": 1, **meta["stats"]},
        "combat": {
            "mark": "".join(part[0] for part in meta["name"].replace("-", " ").split())[:3].upper(),
            "movement_range": 90,
            "basic_shape": {"type": "circle", "r": 96},
            "jutsu_shape": {"type": "circle", "r": 118},
            "chakra_max": 8,
            "chakra_start": 2,
        },
        "render": {
            "scale": 1,
            "sprite_anchor": "bottom_center",
            "sprite_canvas": {"width": CANVAS_W, "height": CANVAS_H},
        },
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
            "notes": "Legacy of the Shinobi audited sprite pass. Six-frame idle/basic sheets are content-isolated and normalized to a shared bottom-center runtime canvas; dedicated VFX and jutsu remain deferred.",
            "animation_map": True,
        },
        "balance": {
            "status": "provisional",
            "pass": "legacy-shinobi-banner-v1",
            "notes": "Temporary first-pass combat values for banner testing. Jutsu intentionally disabled until authored.",
        },
        "animation_standard": {
            "version": "legacy-shinobi-v2-audited",
            "animations": {
                "idle": {
                    "frames": [f"sprites/runtime/idle/frame_{i:02d}.png" for i in range(1,7)],
                    "frame_ms": 145,
                    "loop": True,
                    "events": [],
                },
                "basic_attack": {
                    "frames": [f"sprites/runtime/attack/basic/frame_{i:02d}.png" for i in range(1,7)],
                    "frame_ms": 105,
                    "loop": False,
                    "events": [{"frame":4,"event":"apply_melee"}],
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
        "source_sha256": sha256_file(archive),
        "file_count": len(files),
        "files": files,
    })

    for child in target.rglob("*"):
        if not child.is_dir():
            continue
        names = {p.name for p in child.iterdir() if p.is_file()}
        if {"idle_6f.png","basic_attack_6f.png"} <= names and any(n.startswith("card_art.") for n in names):
            unit_sources[child.name] = child

    print(f"Extracted {len(files)} files from {archive.name} to {target.relative_to(ROOT)}")

missing = sorted(set(UNIT_META) - set(unit_sources))
if missing:
    raise SystemExit(f"Missing expected unit packages: {', '.join(missing)}")

generated_units = []
audit_units = {}

for unit_id, source_dir in sorted(unit_sources.items()):
    if unit_id not in UNIT_META:
        continue

    canonical = ROOT / "assets" / "characters" / unit_id
    if canonical.exists():
        shutil.rmtree(canonical)

    source_card = next(p for p in source_dir.iterdir() if p.is_file() and p.name.startswith("card_art."))
    with Image.open(source_card) as card:
        card_size = [card.width, card.height]
        card_mode = card.mode
    if min(card_size) < 512:
        raise RuntimeError(f"{unit_id}: card art unexpectedly small: {card_size}")

    card_dir = canonical / "cards"
    card_dir.mkdir(parents=True, exist_ok=True)
    card_name = f"legacy_of_shinobi_card{source_card.suffix.lower()}"
    shutil.copy2(source_card, card_dir / card_name)

    idle_meta = split_sheet(
        unit_id,
        "idle",
        source_dir / "idle_6f.png",
        canonical / "sprites" / "runtime" / "idle",
    )
    attack_meta = split_sheet(
        unit_id,
        "basic_attack",
        source_dir / "basic_attack_6f.png",
        canonical / "sprites" / "runtime" / "attack" / "basic",
    )

    data_dir = canonical / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    data = unit_json(unit_id, card_name)
    data["animation_standard"]["source_sheets"] = {
        "idle": {
            "path": source_dir.relative_to(ROOT).joinpath("idle_6f.png").as_posix(),
            "columns": idle_meta["columns"],
            "rows": idle_meta["rows"],
            "source_size": idle_meta["source_size"],
            "normalized_canvas": idle_meta["output_canvas"],
            "anchor": idle_meta["anchor"],
        },
        "basic_attack": {
            "path": source_dir.relative_to(ROOT).joinpath("basic_attack_6f.png").as_posix(),
            "columns": attack_meta["columns"],
            "rows": attack_meta["rows"],
            "source_size": attack_meta["source_size"],
            "normalized_canvas": attack_meta["output_canvas"],
            "anchor": attack_meta["anchor"],
        },
    }

    (data_dir / "unit.json").write_text(json.dumps(data, indent=2) + "\n")
    (data_dir / "runtime-map.json").write_text(json.dumps(runtime_map_json(unit_id), indent=2) + "\n")

    audit_units[unit_id] = {
        "display_name": UNIT_META[unit_id]["name"],
        "package": source_dir.relative_to(ROOT).as_posix(),
        "card": {
            "path": source_card.relative_to(ROOT).as_posix(),
            "size": card_size,
            "mode": card_mode,
            "sha256": sha256_file(source_card),
        },
        "idle": {k:v for k,v in idle_meta.items() if k != "frames"},
        "basic_attack": {k:v for k,v in attack_meta.items() if k != "frames"},
    }
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

AUDIT_REPORT.write_text(json.dumps({
    "schema_version": 1,
    "audit": "legacy-shinobi-sprite-and-card-assets",
    "runtime_canvas": {
        "width": CANVAS_W,
        "height": CANVAS_H,
        "anchor": "bottom_center",
        "bottom_anchor_y": BOTTOM_ANCHOR,
    },
    "layout_contract": {
        "pack_v1_units": sorted(set(UNIT_META) - STRIP_UNITS),
        "pack_v2_v3_strip_units": sorted(STRIP_UNITS),
    },
    "units": audit_units,
}, indent=2) + "\n")

print(f"Prepared and audited {len(generated_units)} Legacy of the Shinobi units: {', '.join(generated_units)}")
print(f"Runtime sprite normalization: {CANVAS_W}x{CANVAS_H}, bottom-center anchored")
print(f"Audit report: {AUDIT_REPORT.relative_to(ROOT)}")
