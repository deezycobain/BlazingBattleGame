import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=process.cwd();
const read=rel=>fs.readFile(path.join(ROOT,rel),'utf8');
const json=async rel=>JSON.parse(await read(rel));
const exists=async rel=>{try{await fs.access(path.join(ROOT,rel));return true}catch{return false}};
const fail=msg=>{throw new Error(`Tyler/browser validation failed: ${msg}`)};
const pngSize=async rel=>{
 const buf=await fs.readFile(path.join(ROOT,rel));
 if(buf.length<24||buf.toString('ascii',1,4)!=='PNG')fail(`${rel} is not a PNG`);
 return {w:buf.readUInt32BE(16),h:buf.readUInt32BE(20)};
};

const tyler=await json('assets/characters/tyler/data/unit.json');
const map=await json('assets/characters/tyler/data/runtime-map.json');
const index=await json('runtime/registry/unit-index.json');
const manifest=await json('runtime/registry/asset-manifest.json');
if(tyler.id!=='tyler'||tyler.role!=='playable'||tyler.collection?.battle_ready!==true)fail('Tyler must be a battle-ready playable canonical unit');
if(tyler.readiness?.basic_attack!==true||tyler.abilities?.basic?.delivery!=='melee')fail('Tyler Basic Attack is not battle-ready melee');
if(tyler.abilities?.basic?.presentation?.runtime_driver!=='animateLunge'||tyler.abilities?.basic?.presentation?.melee_animation_kind!=='basic_attack')fail('Tyler Basic Attack presentation is not routed to the canonical base pose');
if(tyler.readiness?.jutsu!==false||!(tyler.abilities?.jutsu?.cost>tyler.combat?.chakra_max))fail('Tyler placeholder Jutsu must remain visibly locked');
if((tyler.animation_standard?.animations?.idle?.frames||[]).length!==6)fail('Tyler must retain all six existing idle frames');
if((tyler.animation_standard?.animations?.basic_attack?.frames||[]).length!==1)fail('Tyler Basic Attack must route the existing base pose');
if(tyler.assets?.art!=='art/current_collection_art.png')fail('Tyler clean art must use the promoted uploaded portrait');
if(tyler.assets?.card!=='cards/current_collection_card.png')fail('Tyler card must use the promoted uploaded portrait');
if(JSON.stringify(tyler.assets||{}).includes('summon_card_legacy.jpg'))fail('Tyler still references the mismatched legacy summon card');

for(const rel of [
 ...tyler.animation_standard.animations.idle.frames,
 ...tyler.animation_standard.animations.basic_attack.frames,
 tyler.assets.art,
 tyler.assets.card,
 'sprites/source/imported/tyler_sheet_01.png',
 'sprites/source/imported/tyler_sheet_02.png'
]){
 if(!await exists(path.posix.join('assets/characters/tyler',rel)))fail(`missing canonical Tyler asset ${rel}`);
}
const artSize=await pngSize('assets/characters/tyler/art/current_collection_art.png');
if(artSize.w!==1086||artSize.h!==1448)fail(`Tyler promoted portrait dimensions changed (${artSize.w}x${artSize.h})`);
if(await exists('assets/characters/tyler/cards/summon_card_legacy.jpg'))fail('mismatched legacy summon card still lives in active Tyler assets');
if(!await exists('assets/archive/legacy_characters/tyler/cards/summon_card_legacy.jpg'))fail('mismatched legacy summon card was not returned to the archive');
if(await exists('assets/characters/tyler/incoming'))fail('Tyler incoming staging folder must be empty/removed after canonicalization');

if(!index.units?.some(entry=>entry.id==='tyler'&&entry.path==='assets/characters/tyler/data/unit.json'))fail('Tyler missing from unit-index');
if(map.abilities?.basic_strike?.runtime_handler!=='animateLunge')fail('Tyler Basic Attack must use shared lunge runtime');
if(manifest.units?.tyler?.animations?.idle?.required_runtime_frames!==6)fail('Tyler idle manifest is incomplete');
if(manifest.units?.tyler?.animations?.basic_attack?.required_runtime_frames!==1)fail('Tyler Basic Attack manifest is incomplete');

globalThis.window={BlazingFrameRuntime:{loadFrames:paths=>paths.map(src=>({src}))}};
vm.runInThisContext(await read('runtime/animation/attack-presentation.js'),{filename:'attack-presentation.js'});
const resolved=window.BlazingAttackPresentation.resolveFrames(tyler,'basic_attack',{});
if(resolved.length!==1||resolved[0]?.src!=='assets/characters/tyler/sprites/runtime/attack/basic/frame_01.png')fail('Tyler canonical Basic Attack frame does not resolve through attack-presentation runtime');

const shell=await read('index.html');
for(const marker of ["cvs.addEventListener('pointerdown'","cvs.addEventListener('pointermove'","cvs.addEventListener('pointerup'"])if(!shell.includes(marker))fail(`native battle input missing ${marker}`);

const mouse=await read('scripts/browser-mouse-input-postprocess.mjs');
for(const marker of [
 "addEventListener('pointerdown'",
 "addEventListener('pointermove'",
 "addEventListener('pointerup'",
 'new PointerEvent',
 '__bbMouseBridge',
 "pointerType!=='mouse'",
 "document.getElementById('game')"
])if(!mouse.includes(marker))fail(`desktop PointerEvents adapter missing ${marker}`);
for(const forbidden of ['TouchEvent(','dispatchTouch('])if(mouse.includes(forbidden))fail(`desktop adapter still uses stale touch synthesis: ${forbidden}`);

const team=await read('scripts/tyler-playable-postprocess.mjs');
for(const marker of [
 "['crimson','subzero','lebee','senku','tyler','anubis']",
 "['Crimson','Sub-Zero','Lebee','Senku','Tyler']",
 "['Tyler','Lebee','Sub-Zero']",
 'activeTeam.v3',
 "name==='Tyler'",
 "canonicalAnimationFrames(canonicalUnit(name),'idle')",
 'assets/characters/tyler/'
])if(!team.includes(marker))fail(`Tyler runtime integration missing ${marker}`);

const pkg=JSON.parse(await read('package.json'));
if(!pkg.scripts?.build?.includes('tyler-playable-postprocess.mjs')||!pkg.scripts?.build?.includes('browser-mouse-input-postprocess.mjs'))fail('build chain does not include Tyler/browser integration passes');
if(pkg.scripts?.validate?.includes('inspect-team-input-temp.mjs'))fail('temporary Tyler inspector is still in validation');
if(await exists('scripts/inspect-team-input-temp.mjs'))fail('temporary Tyler inspector still exists');

console.log('Tyler/browser PASS: Tyler registered in battle/team editing with canonical uploaded art, idle/basic frames routed, Jutsu locked, and desktop PointerEvents compatibility verified.');
