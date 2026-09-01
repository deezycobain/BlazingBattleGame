import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const read=rel=>fs.readFile(path.join(ROOT,rel),'utf8');
const json=async rel=>JSON.parse(await read(rel));
const exists=async rel=>{try{await fs.access(path.join(ROOT,rel));return true}catch{return false}};
const fail=msg=>{throw new Error(`Tyler/browser validation failed: ${msg}`)};

const tyler=await json('assets/characters/tyler/data/unit.json');
const map=await json('assets/characters/tyler/data/runtime-map.json');
const index=await json('runtime/registry/unit-index.json');
const manifest=await json('runtime/registry/asset-manifest.json');

if(tyler.id!=='tyler'||tyler.role!=='playable'||tyler.collection?.battle_ready!==true)fail('Tyler must be a battle-ready playable canonical unit');
if(tyler.readiness?.basic_attack!==true||tyler.abilities?.basic?.delivery!=='melee')fail('Tyler Basic Attack is not battle-ready melee');
if(tyler.abilities?.basic?.presentation?.runtime_driver!=='animateLunge'||tyler.abilities?.basic?.presentation?.melee_animation_kind!=='basic_attack')fail('Tyler Basic Attack presentation is not routed to the shared melee runtime');
if(tyler.readiness?.jutsu!==false||!(tyler.abilities?.jutsu?.cost>tyler.combat?.chakra_max))fail('Tyler placeholder Jutsu must remain visibly locked');

if(tyler.assets?.art!=='art/current_collection_art.png'||tyler.assets?.card!=='cards/current_collection_card.png'||tyler.assets?.portrait!=='art/current_collection_art.png')fail('Tyler collection/card/portrait art must use the supplied artwork');
const idle=tyler.animation_standard?.animations?.idle?.source_sheet;
const basic=tyler.animation_standard?.animations?.basic_attack?.source_sheet;
if(idle?.path!=='sprites/source/idle_sheet.png'||idle?.columns!==4||idle?.rows!==2||idle?.frame_count!==8||idle?.content_top_px!==100)fail('Tyler idle sheet metadata must be the supplied 4x2 / 8-pose sheet');
if(basic?.path!=='sprites/source/basic_attack_sheet.png'||basic?.columns!==5||basic?.rows!==1||basic?.frame_count!==5||basic?.content_top_px!==100)fail('Tyler Basic Attack sheet metadata must be the supplied 5x1 / 5-pose sheet');

for(const rel of [
  'assets/characters/tyler/art/current_collection_art.png',
  'assets/characters/tyler/cards/current_collection_card.png',
  'assets/characters/tyler/sprites/source/idle_sheet.png',
  'assets/characters/tyler/sprites/source/basic_attack_sheet.png'
])if(!await exists(rel))fail(`missing supplied Tyler asset ${rel}`);

if(!index.units?.some(entry=>entry.id==='tyler'&&entry.path==='assets/characters/tyler/data/unit.json'))fail('Tyler missing from unit-index');
if(map.abilities?.basic_strike?.runtime_handler!=='animateLunge')fail('Tyler Basic Attack must use shared lunge runtime');
if(manifest.units?.tyler?.animations?.idle?.path!=='assets/characters/tyler/sprites/source/idle_sheet.png'||manifest.units.tyler.animations.idle.generated_runtime_frames!==8)fail('Tyler idle manifest does not describe the supplied generated sheet runtime');
if(manifest.units?.tyler?.animations?.basic_attack?.path!=='assets/characters/tyler/sprites/source/basic_attack_sheet.png'||manifest.units.tyler.animations.basic_attack.generated_runtime_frames!==5)fail('Tyler Basic Attack manifest does not describe the supplied generated sheet runtime');

const team=await read('scripts/tyler-playable-postprocess.mjs');
for(const marker of [
  "['crimson','subzero','lebee','senku','tyler','anubis']",
  "['Crimson','Sub-Zero','Lebee','Senku','Tyler']",
  "['Tyler','Lebee','Sub-Zero']",
  'activeTeam.v4',
  'fighterTeamImage',
  'canonicalUnit(name)',
  'TYLER_BODY_RUNTIME',
  "idle:buildSheet('${idlePath}',4,2,8,100)",
  "basic:buildSheet('${basicPath}',5,1,5,100)"
])if(!team.includes(marker))fail(`Tyler runtime integration missing ${marker}`);

const mouse=await read('scripts/browser-mouse-input-postprocess.mjs');
for(const marker of [
  "cvs.addEventListener('pointerdown'",
  "cvs.addEventListener('pointermove'",
  "cvs.addEventListener('pointerup'",
  "ev.pointerType==='mouse'?Math.max(UNIT_TOUCH_RADIUS,96):UNIT_TOUCH_RADIUS",
  'dispatchPointer',
  '__bbMouseBridge',
  "event.pointerType!=='mouse'"
])if(!mouse.includes(marker))fail(`desktop native PointerEvent integration missing ${marker}`);

const pkg=JSON.parse(await read('package.json'));
if(!pkg.scripts?.build?.includes('tyler-playable-postprocess.mjs')||!pkg.scripts?.build?.includes('browser-mouse-input-postprocess.mjs')||!pkg.scripts?.build?.includes('validate-final-tyler-browser.mjs'))fail('build chain does not include Tyler/browser integration plus final-shell validation');
if(pkg.scripts?.validate?.includes('inspect-team-input-temp.mjs'))fail('temporary runtime inspector still wired into validation');

console.log('Tyler/browser PASS: correct supplied art + 8/5-pose sheets declared, canonical team identity wired, and desktop input uses native Pointer Events.');
