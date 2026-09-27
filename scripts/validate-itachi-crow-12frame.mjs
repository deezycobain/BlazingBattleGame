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
const idle=unit?.animation_standard?.animations?.idle;
const run=unit?.animation_standard?.animations?.run;
const basic=unit?.animation_standard?.animations?.basic_attack;
const crow=unit?.animation_standard?.vfx?.['basic/crow_attack'];
if(!idle||idle.frames?.length!==12||idle.frame_ms!==100||idle.loop!==true)throw new Error('Itachi motion validator: 12-frame idle timeline is invalid');
if(!run||run.frames?.length!==12||run.frame_ms!==85||run.loop!==true)throw new Error('Itachi motion validator: 12-frame run timeline is invalid');
if(!basic||basic.frames?.length!==12||basic.frame_ms!==85||basic.events?.[0]?.frame!==5)throw new Error('Itachi crow validator: 12-frame body timeline is invalid');
if(!crow||crow.frames?.length!==12||crow.frame_ms!==85||crow.loop!==false)throw new Error('Itachi crow validator: 12-frame VFX timeline is invalid');
for(const [label,frames] of [['idle',idle.frames],['run',run.frames],['body',basic.frames],['VFX',crow.frames]]){
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
for(const marker of ['GRID = (4, 3)','RUNTIME_SIZE = (420, 420)','keep_largest_silhouette','12 padded body frames and 12 dedicated crow VFX frames'])if(!importer.includes(marker))throw new Error(`Itachi crow validator: importer missing ${marker}`);
const postprocess=await read('scripts/itachi-playable-postprocess.mjs','utf8');
for(const marker of ['ITACHI_IDLE_FRAMES','ITACHI_RUN_FRAMES','ITACHI_CROW_ATTACK_VFX_FRAMES','releaseDelay=340,bodyDuration=1020,flightDuration=680,impactHold=340','drawItachiCrowFrame','vfx/basic/crows/runtime/frame_12.png'])if(!postprocess.includes(marker))throw new Error(`Itachi crow validator: postprocess missing ${marker}`);
const motionImporter=await read('scripts/import-itachi-idle-run-12frame.py','utf8');
for(const marker of ['SHEET_SIZE = (1774, 887)','GRID = (6, 2)','keep_largest_silhouette','12-frame runtime sequences'])if(!motionImporter.includes(marker))throw new Error(`Itachi motion validator: importer missing ${marker}`);
for(const rel of ['assets/characters/itachi/sprites/source/idle_12frame_sheet.png','assets/characters/itachi/sprites/source/run_12frame_sheet.png']){
 const [width,height]=await pngSize(rel);
 if(width!==1774||height!==887)throw new Error(`Itachi motion validator: source sheet ${rel} is not the canonical 1774x887 6x2 layout`);
}
const motionPostprocess=await read('scripts/itachi-motion-postprocess.mjs','utf8');
for(const marker of ["const itachiMotionFrames=name==='Itachi'",'const itachiRunning=Boolean',"name==='Itachi'?ITACHI_IDLE_FRAMES:unitIdleFrames(name)","heldName==='Itachi'","actor.name==='Itachi'"])if(!motionPostprocess.includes(marker))throw new Error(`Itachi motion validator: postprocess missing ${marker}`);
const retired=['assets/characters/itachi/sprites/retired/idle_v1/frame_01.png','assets/characters/itachi/sprites/retired/source/idle_sheet_v1.png'];
for(const rel of retired)await read(rel);
const activeText=[JSON.stringify(unit),postprocess,motionPostprocess].join('\n');
if(activeText.includes('sprites/runtime/idle/frame_06.png')&&idle.frames.length!==12)throw new Error('Itachi motion validator: stale six-frame idle path remained active');
if(activeText.includes('sprites/retired/idle_v1'))throw new Error('Itachi motion validator: retired idle assets became active runtime dependencies');
console.log('Itachi 12-frame PASS: idle/run sheets, crow body/VFX sheets, source retirement, authored release, and held-only movement runtime are aligned.');
