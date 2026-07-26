#!/usr/bin/env python3
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
paths=list((ROOT/'assets/characters').glob('*/data/unit.json'))+list((ROOT/'assets/enemies').glob('**/data/unit.json'))
units={}
for p in paths:
 d=json.loads(p.read_text());units[d['id']]=d
out=ROOT/'assets/data/units_registry.json'
out.write_text(json.dumps({'schema_version':2,'source':'canonical unit.json files','units':units},indent=2)+'\n')
print(f'Rebuilt {out.relative_to(ROOT)} with {len(units)} units')
