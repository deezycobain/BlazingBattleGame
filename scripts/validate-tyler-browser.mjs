import fs from 'node:fs/promises';
import path from 'node:path';
const ROOT=process.cwd(),read=rel=>fs.readFile(path.join(ROOT,rel),'utf8'),json=async rel=>JSON.parse(await read(rel)),exists=async rel=>{try{await fs.access(path.join(ROOT,rel));return true}catch{return false}},fail=msg=>{throw new Error(`Tyler/browser validation failed: ${msg}`)};
const tyler=await json('assets/characters/tyler/data/unit.json'),map=await json('assets/characters/tyler/data/runtime-map.json'),index=await json('runtime/registry/unit-index.json');
if(tyler.id!=='tyler'||tyler.role!=='playable'||tyler.collection?.battle_ready!==true)fail('Tyler must be battle-ready playable');
if(tyler.readiness?.basic_attack!==true||tyler.abilities?.basic?.delivery!=='melee')fail('Tyler Basic Attack must remain melee/battle-ready');
if(tyler.readiness?.jutsu!==false||!(tyler.abilities?.jutsu?.cost>tyler.combat?.chakra_max))fail('Tyler Jutsu must remain locked');
const idle=tyler.animation_standard?.animations?.idle?.source_sheet,basic=tyler.animation_standard?.animations?.basic_attack?.source_sheet;
if(idle?.path!=='sprites/source/idle_sheet.png'||idle?.columns!==5||idle?.rows!==1||idle?.frame_count!==5||idle?.content_top_px!==100)fail('Tyler idle metadata must be corrected 5x1 / 5-pose source');
if(basic?.path!=='sprites/source/basic_attack_sheet.png'||basic?.columns!==4||basic?.rows!==2||basic?.frame_count!==8||basic?.content_top_px!==100)fail('Tyler Basic Attack metadata must be corrected 4x2 / 8-pose source');
for(const rel of ['assets/characters/tyler/art/current_collection_art.png','assets/characters/tyler/cards/current_collection_card.png','assets/characters/tyler/sprites/source/idle_sheet.png','assets/characters/tyler/sprites/source/basic_attack_sheet.png'])if(!await exists(rel))fail(`missing Tyler asset ${rel}`);
if(!index.units?.some(e=>e.id==='tyler'))fail('Tyler missing from unit index');if(map.abilities?.basic_strike?.runtime_handler!=='animateLunge')fail('Tyler Basic must use shared lunge runtime');
const team=await read('scripts/tyler-playable-postprocess.mjs');for(const marker of ["idle:buildSheet('${idlePath}',5,1,5,100)","basic:buildSheet('${basicPath}',4,2,8,100)",'edgeBackground','activeTeam.v4'])if(!team.includes(marker))fail(`Tyler runtime missing ${marker}`);
const route=await read('scripts/team-editor-route-postprocess.mjs');for(const marker of ['button,[role=\\"button\\"]','data-inventory-action','protectedControl'])if(!route.includes(marker))fail(`team-editor routing fix missing ${marker}`);
const mouse=await read('scripts/browser-mouse-input-postprocess.mjs');for(const marker of ["cvs.addEventListener('pointerdown'","cvs.addEventListener('pointermove'","cvs.addEventListener('pointerup'","ev.pointerType==='mouse'?Math.max(UNIT_TOUCH_RADIUS,96):UNIT_TOUCH_RADIUS"]){if(!mouse.includes(marker))fail(`desktop input missing ${marker}`);}
const pkg=JSON.parse(await read('package.json'));for(const script of ['tyler-playable-postprocess.mjs','ui-runtime-finalize.mjs','team-editor-route-postprocess.mjs','browser-mouse-input-postprocess.mjs','validate-final-tyler-browser.mjs'])if(!pkg.scripts?.build?.includes(script))fail(`build chain missing ${script}`);
console.log('Tyler/browser PASS: corrected 5-frame idle + 8-frame Basic roles, hardened background cleanup, team controls protected, desktop PointerEvents retained.');
