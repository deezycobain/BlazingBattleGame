import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const fail=message=>{throw new Error(`Sub-Zero Basic Attack validation failed: ${message}`)};
const exists=async rel=>{try{await fs.access(path.join(ROOT,rel));return true}catch{return false}};

const unit=JSON.parse(await fs.readFile(path.join(ROOT,'assets/characters/subzero/data/unit.json'),'utf8'));
const basic=unit.animation_standard?.animations?.basic_attack;
const sheet=basic?.source_sheet;

if(unit.id!=='subzero')fail('canonical unit id changed');
if(!sheet?.path)fail('source_sheet.path is missing');
if(sheet.columns!==3||sheet.rows!==2)fail('source sheet must remain a 3x2 grid');
if(sheet.frame_width!==512||sheet.frame_height!==512)fail('source sheet cells must remain 512x512');
if(sheet.frame_count!==6)fail('source sheet must expose exactly six attack poses');
if(basic.frame_ms!==95)fail('approved attack frame timing changed');
if(!Array.isArray(basic.events)||basic.events[0]?.frame!==4)fail('melee impact event must remain on frame 4');

const sheetPath=path.posix.join('assets/characters/subzero',sheet.path);
if(!(await exists(sheetPath)))fail(`missing source sheet ${sheetPath}`);

const postprocess=await fs.readFile(path.join(ROOT,'scripts/postprocess-build.mjs'),'utf8');
for(const marker of [
  'SUBZERO_BASIC_ATTACK_RUNTIME',
  'light_checkerboard_to_alpha',
  "name==='Sub-Zero'",
  'state.ready=true'
]){
  if(!postprocess.includes(marker))fail(`postprocess runtime marker missing: ${marker}`);
}

console.log(`Sub-Zero Basic Attack validation PASS: 6 poses from ${sheetPath}, frame 4 impact, runtime checkerboard cleanup wired.`);
