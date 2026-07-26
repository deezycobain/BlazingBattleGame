#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
paths=list((ROOT/'assets/characters').glob('*/data/unit.json'))+list((ROOT/'assets/enemies').glob('**/data/unit.json'))
errors=[]
required=['schema_version','id','display_name','role','archetype','stats','combat','abilities','assets','readiness','balance']
for p in paths:
 d=json.loads(p.read_text())
 for k in required:
  if k not in d: errors.append(f'{p}: missing {k}')
 if d.get('schema_version')!=2: errors.append(f'{p}: schema_version must be 2')
 for k in ['hp','attack','defense','speed']:
  if not isinstance(d.get('stats',{}).get(k),(int,float)): errors.append(f'{p}: stats.{k} must be numeric')
 if d.get('archetype') is None: errors.append(f'{p}: archetype required')
print(f'Validated {len(paths)} unit definitions.')
if errors:
 print('\n'.join(errors));sys.exit(1)
print('PASS')
