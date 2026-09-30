import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const fail=message=>{throw new Error('Animation V2 validation: '+message)};
const readJson=async rel=>JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));
const countFrames=async rel=>(await fs.readdir(path.join(root,rel))).filter(name=>/^frame_\d+\.png$/.test(name)).length;

for(const id of ['scorpion','mashle']){
  for(const kind of ['idle','run','attack','recoil']){
    const rel=`assets/characters/${id}/sprites/runtime/v2/${kind}`;
    const count=await countFrames(rel);
    if(count!==12)fail(`${id} ${kind} expected 12 authored V2 frames, got ${count}`);
  }
  const map=await readJson(`assets/characters/${id}/data/runtime-map.json`);
  if(!map.states?.run||!map.states?.recoil)fail(`${id} runtime map must explicitly declare run and recoil states`);
}

const scorpionMap=await readJson('assets/characters/scorpion/data/runtime-map.json');
if(scorpionMap.abilities?.basic_attack?.runtime_handler!=='animateScorpionSpearStrike')fail('Scorpion basic must remain on animateScorpionSpearStrike');
if(scorpionMap.abilities?.basic_attack?.vfx?.projectile!=='runtime.scorpion_chain_spear')fail('Scorpion basic must use the runtime hand-connected chain until replacement traveling VFX is approved');

const finalizer=await fs.readFile(path.join(root,'scripts/animation-v2-finalize-postprocess.mjs'),'utf8');
for(const marker of [
  "sprites/runtime/v2/idle',count:12",
  "sprites/runtime/v2/run',count:12",
  "sprites/runtime/v2/attack',count:12",
  "sprites/runtime/v2/recoil',count:12",
  'attackFrameOrder',
  'motionQuality=v5'
])if(!finalizer.includes(marker))fail('finalizer missing marker '+marker);

const packageJson=await readJson('package.json');
const build=packageJson.scripts?.build||'';
const order=[
  'animation-quality-postprocess.mjs',
  'animation-quality-hotfix-postprocess.mjs',
  'animation-v2-finalize-postprocess.mjs',
  'fighter-visual-contract-postprocess.mjs'
].map(name=>build.indexOf(name));
if(order.some(index=>index<0)||!(order[0]<order[1]&&order[1]<order[2]&&order[2]<order[3]))fail('animation/fighter postprocess ordering is invalid');

console.log('Animation V2 validation PASS: Scorpion and Mashle own 12-frame V2 idle/run/attack/recoil sets; runtime states and final postprocess ordering are locked.');
