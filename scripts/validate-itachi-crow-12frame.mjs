import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const read=(rel,encoding)=>fs.readFile(path.join(root,rel),encoding);
const pngSize=async rel=>{
 const data=await read(rel);
 if(data.toString('ascii',1,4)!=='PNG')throw new Error(`Itachi crow validator: invalid PNG ${rel}`);
 return [data.readUInt32BE(16),data.readUInt32BE(20)];
};
const unit=JSON.parse((await read('assets/characters/itachi/data/unit.json')).toString('utf8'));
const basic=unit?.animation_standard?.animations?.basic_attack;
const crow=unit?.animation_standard?.vfx?.['basic/crow_attack'];
if(!basic||basic.frames?.length!==12||basic.frame_ms!==85||basic.events?.[0]?.frame!==5)throw new Error('Itachi crow validator: 12-frame body timeline is invalid');
if(!crow||crow.frames?.length!==12||crow.frame_ms!==85||crow.loop!==false)throw new Error('Itachi crow validator: 12-frame VFX timeline is invalid');
for(const [label,frames] of [['body',basic.frames],['VFX',crow.frames]]){
 for(let i=0;i<frames.length;i++){
  const expected=`frame_${String(i+1).padStart(2,'0')}.png`;
  if(!frames[i].endsWith(expected))throw new Error(`Itachi crow validator: ${label} frame order drifted at ${i+1}`);
  const [width,height]=await pngSize('assets/characters/itachi/'+frames[i]);
  if(width!==420||height!==420)throw new Error(`Itachi crow validator: ${label} ${expected} is ${width}x${height}, expected 420x420`);
 }
}
for(const rel of ['assets/characters/itachi/sprites/source/basic_attack_12frame_sheet.png','assets/characters/itachi/vfx/basic/crows/crow_attack_12frame_sheet.png']){
 const [width,height]=await pngSize(rel);
 if(width!==1448||height!==1086)throw new Error(`Itachi crow validator: source sheet ${rel} is not the canonical 1448x1086 4x3 layout`);
}
const importer=await read('scripts/import-itachi-crow-12frame.py','utf8');
for(const marker of ['GRID = (4, 3)','RUNTIME_SIZE = (420, 420)','12 body frames and 12 crow VFX frames'])if(!importer.includes(marker))throw new Error(`Itachi crow validator: importer missing ${marker}`);
const postprocess=await read('scripts/itachi-playable-postprocess.mjs','utf8');
for(const marker of ['ITACHI_CROW_ATTACK_VFX_FRAMES','releaseDelay=340,bodyDuration=1020,flightDuration=680,impactHold=340','drawItachiCrowFrame','vfx/basic/crows/runtime/frame_12.png'])if(!postprocess.includes(marker))throw new Error(`Itachi crow validator: postprocess missing ${marker}`);
console.log('Itachi crow 12-frame PASS: body and VFX sheets, 85ms timeline, authored release, and runtime renderer are aligned.');
