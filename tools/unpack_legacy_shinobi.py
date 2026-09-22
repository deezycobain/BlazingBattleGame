#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "legacy_of_the_shinobi_banner_pack_v3_clean_cards.zip"
TARGET = ROOT / "assets" / "events" / "legacy-of-shinobi" / "package-v3"
MANIFEST = ROOT / "assets" / "events" / "legacy-of-shinobi" / "extracted-manifest.json"

def safe_target(base: Path, member: str) -> Path:
    candidate = (base / member).resolve()
    if base.resolve() not in candidate.parents and candidate != base.resolve():
        raise RuntimeError(f"Unsafe archive path: {member}")
    return candidate

if not ARCHIVE.exists():
    raise SystemExit(f"Missing archive: {ARCHIVE.relative_to(ROOT)}")

if TARGET.exists():
    shutil.rmtree(TARGET)
TARGET.mkdir(parents=True, exist_ok=True)

files = []
with zipfile.ZipFile(ARCHIVE) as zf:
    for info in zf.infolist():
        if info.is_dir():
            safe_target(TARGET, info.filename).mkdir(parents=True, exist_ok=True)
            continue
        dest = safe_target(TARGET, info.filename)
        dest.parent.mkdir(parents=True, exist_ok=True)
        data = zf.read(info)
        dest.write_bytes(data)
        files.append({
            "path": dest.relative_to(ROOT).as_posix(),
            "size": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
        })

MANIFEST.parent.mkdir(parents=True, exist_ok=True)
MANIFEST.write_text(json.dumps({
    "schema_version": 1,
    "source_archive": ARCHIVE.name,
    "source_sha256": hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(),
    "file_count": len(files),
    "files": files,
}, indent=2) + "\n")

print(f"Extracted {len(files)} files to {TARGET.relative_to(ROOT)}")
