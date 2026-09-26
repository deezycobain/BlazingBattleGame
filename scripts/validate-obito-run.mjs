import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const unitPath=path.join(root,'assets','characters','obito','data','unit.json');
const unit=JSON.parse(fs.readFileSync(unitPath,'utf8'));
const fail=message=>{throw new Error(`Obito run validation FAIL: ${message}`)};

const run=unit?.animation_standard?.animations?.run;
if(!run)fail('animation_standard.animations.run missing');
if(!Array.isArray(run.frames)||run.frames.length!==6)fail(`expected six run frames, got ${run?.frames?.length??0}`);
if(run.frame_ms!==100)fail(`expected 100ms run cadence, got ${run.frame_ms}`);
if(run.loop!==true)fail('run animation must loop while the unit is held');
if(unit?.readiness?.run!==true)fail('readiness.run must be true');
if(unit?.assets?.sprites?.run!=='sprites/runtime/run/')fail('assets.sprites.run must point at sprites/runtime/run/');

const expected=Array.from({length:6},(_,index)=>`sprites/runtime/run/frame_${String(index+1).padStart(2,'0')}.png`);
for(let i=0;i<expected.length;i++){
  if(run.frames[i]!==expected[i])fail(`run frame ${i+1} path mismatch: ${run.frames[i]}`);
  const full=path.join(root,'assets','characters','obito',expected[i]);
  if(!fs.existsSync(full))fail(`missing ${expected[i]}`);
  const png=fs.readFileSync(full);
  if(png.length<24||png.toString('hex',0,8)!=='89504e470d0a1a0a')fail(`${expected[i]} is not a valid PNG`);
  const width=png.readUInt32BE(16);
  const height=png.readUInt32BE(20);
  if(width!==512||height!==768)fail(`${expected[i]} must be 512x768, got ${width}x${height}`);
}

const hookPath=path.join(root,'scripts','obito-run-postprocess.mjs');
const hook=fs.readFileSync(hookPath,'utf8');
for(const marker of [
  "run:name=>resolve(name,'run')",
  "name==='Obito'&&typeof S!=='undefined'&&S?.drag",
  'S.dragFacing=',
  'const draggedObitoFacing=',
  'S.dragGrabOffset=null;S.dragFacing=null;'
])if(!hook.includes(marker))fail(`movement hook marker missing: ${marker}`);

console.log('Obito run validation PASS: six 512x768 frames, 100ms looping metadata, drag-state switch, direction mirroring, and idle release contract are present.');
