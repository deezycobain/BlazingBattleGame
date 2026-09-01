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
if(tyler.readiness?.jutsu!==false||!(tyler.abilities?.jutsu?.cost>tyler.combat?.chakra_max))fail('Tyler placeholder Jutsu must remain visibly locked');
if((tyler.animation_standard?.animations?.idle?.frames||[]).length!==6)fail('Tyler must retain all six existing idle frames');
if((tyler.animation_standard?.animations?.basic_attack?.frames||[]).length!==1)fail('Tyler Basic Attack must route the existing base pose');
for(const rel of [...tyler.animation_standard.animations.idle.frames,...tyler.animation_standard.animations.basic_attack.frames,'cards/summon_card_legacy.jpg']){
  if(!await exists(path.posix.join('assets/characters/tyler',rel)))fail(`missing promoted Tyler asset ${rel}`);
}
for(const oldPath of ['assets/archive/legacy_characters/tyler/cards/summon_card_legacy.jpg','assets/archive/legacy_characters/tyler/sprites/base.png'])if(await exists(oldPath))fail(`legacy Tyler asset still present at ${oldPath}`);
if(!index.units?.some(entry=>entry.id==='tyler'&&entry.path==='assets/characters/tyler/data/unit.json'))fail('Tyler missing from unit-index');
if(map.abilities?.basic_strike?.runtime_handler!=='animateLunge')fail('Tyler Basic Attack must use shared lunge runtime');
if(manifest.units?.tyler?.animations?.idle?.required_runtime_frames!==6)fail('Tyler idle manifest is incomplete');
if(manifest.units?.tyler?.animations?.basic_attack?.required_runtime_frames!==1)fail('Tyler Basic Attack manifest is incomplete');
const mouse=await read('scripts/browser-mouse-input-postprocess.mjs');
for(const marker of ["addEventListener('mousedown'","dispatchTouch('touchstart'","dispatchTouch('touchmove'","finish(event,'touchend')","now()-recentRealTouch<900"])if(!mouse.includes(marker))fail(`desktop input adapter missing ${marker}`);
const team=await read('scripts/tyler-playable-postprocess.mjs');
if(!team.includes("['Tyler','Lebee','Sub-Zero']")||!team.includes('activeTeam.v3'))fail('fresh default team does not include Tyler');
const pkg=JSON.parse(await read('package.json'));
if(!pkg.scripts?.build?.includes('tyler-playable-postprocess.mjs')||!pkg.scripts?.build?.includes('browser-mouse-input-postprocess.mjs'))fail('build chain does not include Tyler/browser integration passes');
console.log('Tyler/browser PASS: Tyler assets canonicalized, six-frame idle + Basic Attack wired, Jutsu locked, fresh default team enabled, mouse compatibility source verified.');
