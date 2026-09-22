#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import shutil
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EVENT_ROOT = ROOT / "assets" / "events" / "legacy-of-shinobi"
ARCHIVES = [
    ROOT / "legacy_of_the_shinobi_banner_pack_v1_under25.zip",
    ROOT / "legacy_of_the_shinobi_banner_pack_v2.zip",
    ROOT / "legacy_of_the_shinobi_banner_pack_v3_clean_cards.zip",
]
MANIFEST = EVENT_ROOT / "extracted-manifest.json"

def safe_target(base: Path, member: str) -> Path:
    candidate = (base / member).resolve()
    root = base.resolve()
    if root not in candidate.parents and candidate != root:
        raise RuntimeError(f"Unsafe archive path: {member}")
    return candidate

packages = []
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
            record = {
                "path": dest.relative_to(ROOT).as_posix(),
                "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
            if data.startswith(b"\\x89PNG\\r\\n\\x1a\\n") and len(data) >= 24:
                width, height = struct.unpack(">II", data[16:24])
                record["width"] = width
                record["height"] = height
            files.append(record)
    packages.append({
        "version": index,
        "source_archive": archive.name,
        "source_sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
        "file_count": len(files),
        "files": files,
    })
    print(f"Extracted {len(files)} files from {archive.name} to {target.relative_to(ROOT)}")

EVENT_ROOT.mkdir(parents=True, exist_ok=True)
MANIFEST.write_text(json.dumps({
    "schema_version": 2,
    "packages": packages,
    "total_file_count": sum(p["file_count"] for p in packages),
}, indent=2) + "\n")
