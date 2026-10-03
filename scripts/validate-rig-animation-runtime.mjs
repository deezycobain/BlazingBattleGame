import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const fail=message=>{throw new Error('Rig animation validation: '+message)};
const read=rel=>fs.readFile(path.join(root,rel),'utf8');
const readJson=async rel=>JSON.parse(await read(rel));

const [runtime,profiles,preview,postprocess,standard,pkg]=await Promise.all([
  read('runtime/animation/rig-runtime.js'),
  read('runtime/animation/rig-profiles.js'),
  read('runtime/animation/rig-preview.js'),
  read('scripts/rig-animation-postprocess.mjs'),
  readJson('config/rig-animation-standard.json'),
  readJson('package.json')
]);

for(const [name,source] of [['rig-runtime.js',runtime],['rig-profiles.js',profiles],['rig-preview.js',preview]]){
  try{new vm.Script(source,{filename:name})}catch(error){fail(`${name} invalid syntax: ${error.message}`)}
}
for(const marker of ['register','drawMesh','samplePins','trigger','active','impulses','sourceImage=null','window.BlazingRigRuntime'])if(!runtime.includes(marker))fail('runtime missing '+marker);
for(const marker of ["runtime.register('Scorpion'","runtime.register('Mashle'",'recoilClip','sources:{idle:sourceIdle,recoil:sourceRecoil}','mobileCols:4','mobileRows:6'])if(!profiles.includes(marker))fail('pilot profiles missing '+marker);
for(const marker of ['bb-rig-lab','AUTHORED FRAME','RIG DEFORMATION','INSPECT 3×','TRIGGER RECOIL','FEET BASELINE · y=700','drawMesh','samplePins'])if(!preview.includes(marker))fail('preview missing '+marker);
for(const marker of ['bb-rig-animation-runtime','bb-rig-animation-profiles','bb-rig-animation-preview','bbRigRecoilPilotV1','const bbRigAttackState=S?.anim?.attackPose?.[name]||null;','bbRigRecoilV1','bbRigImpulse','bbRigIdleV1','sourceImage:bbRigSource','if(!bbRigDrawn)ctx.drawImage'])if(!postprocess.includes(marker))fail('postprocess missing '+marker);
const browserSmoke=await read('scripts/rig-animation-browser-smoke.mjs');
for(const marker of ['bb-rig-lab-launch','INSPECT 3×','TRIGGER RECOIL','canvasDimensions'])if(!browserSmoke.includes(marker))fail('browser smoke missing Rig Lab check '+marker);
if(postprocess.includes("ensureAnimState()?.attackPose?.[name]"))fail('rig draw must not create animation state');

if(standard.version!=='1.0.0')fail('unsupported standard version');
if(standard.mode!=='hybrid')fail('rig standard must remain hybrid');
if(standard.source_frame?.width_px!==512||standard.source_frame?.height_px!==768)fail('canonical source frame changed');
if(standard.source_frame?.feet_baseline_y_px!==700)fail('canonical feet baseline changed');
if(standard.policy?.frame_animation_fallback!==true)fail('frame fallback must remain enabled');
if(standard.policy?.signature_attacks_stay_frame_authored!==true)fail('signature attacks must stay frame-authored by default');
if(standard.policy?.light_recoil_overlays_authored_frames!==true)fail('recoil overlay must preserve authored frame animation');
if(!standard.pilot?.states?.includes('idle')||!standard.pilot?.states?.includes('light_recoil_overlay'))fail('pilot states must include idle and light recoil overlay');

const validate=pkg.scripts?.validate||'',build=pkg.scripts?.build||'';
if(!validate.includes('validate-rig-animation-runtime.mjs'))fail('package validate script missing rig validator');
const fighter=build.indexOf('fighter-visual-contract-postprocess.mjs');
const rig=build.indexOf('rig-animation-postprocess.mjs');
if(fighter<0||rig<0||!(rig<fighter))fail('rig integration must run before final fighter visual contract');
if(!build.trim().endsWith('node scripts/fighter-visual-contract-postprocess.mjs'))fail('fighter visual contract must remain final build authority');

console.log('Rig Animation V1 validation PASS: normalized hybrid idle mesh, authored-frame light recoil overlay, non-mutating draw state, mobile mesh budget, frame fallback, and final fighter visual authority are intact.');
