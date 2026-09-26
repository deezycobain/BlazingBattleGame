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
if(unit?.element!=='Fire')fail(`Obito canonical element must remain Fire, got ${unit?.element}`);

const basic=unit?.abilities?.basic||{};
if(basic.name!=='Great Fireball Jutsu')fail(`expected Great Fireball Jutsu basic name, got ${basic.name||'missing'}`);
if(basic.damage_multiplier!==1)fail(`Great Fireball damage multiplier changed: ${basic.damage_multiplier}`);
if(basic.chakra_gain!==1)fail(`Great Fireball chakra gain changed: ${basic.chakra_gain}`);
if(basic.delivery!=='short_range_cast')fail(`Great Fireball must use short_range_cast presentation delivery, got ${basic.delivery}`);
if(basic.target_mode!=='single'||basic.single_target_selector!=='nearest_in_shape')fail('Great Fireball targeting contract changed');
if(basic?.presentation?.runtime_driver!=='animateObitoFireball')fail(`Great Fireball runtime driver mismatch: ${basic?.presentation?.runtime_driver}`);
if(basic?.presentation?.projectile_element!=='Fire')fail('Great Fireball projectile element must be Fire');
if(unit?.combat?.basic_shape?.type!=='circle'||unit?.combat?.basic_shape?.r!==96)fail('Great Fireball must preserve the existing 96-radius Basic range');

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
  "S?.drag&&S?.dragUnitName===name",
  'S.dragUnitName=p.name||null;',
  'S.dragUnitRef=p;',
  'S.dragGhost={name:p.name||null,x:p.x,y:p.y};',
  'const held=S.dragUnitRef||p;',
  '// OBITO PICKUP ORIGIN GHOST',
  'const returnRadius=28;',
  "S.log='Movement cancelled'",
  'S.dragGhost=null;S.dragUnitName=null;S.dragUnitRef=null;',
  'function animateObitoFireball(',
  "f.kind==='obitoFireball'",
  "au.name==='Obito'",
  "rgba(255,91,8,.94)",
  "rgba(184,18,0,.72)"
])if(!hook.includes(marker))fail(`movement/fireball hook marker missing: ${marker}`);

const facingPath=path.join(root,'scripts','strict-attack-facing-postprocess.mjs');
const facing=fs.readFileSync(facingPath,'utf8');
for(const marker of [
  "actor.name==='Obito'&&S.drag&&S.dragUnitName===actor.name&&Number.isFinite(S.dragFacing)",
  'return S.dragFacing<0?Math.PI:0;'
])if(!facing.includes(marker))fail(`drag-facing marker missing: ${marker}`);

console.log('Obito validation PASS: six 512x768 run frames, Fire affinity, persistent held-unit run/ghost/cancel, and dedicated Great Fireball presentation are enforced without changing Basic combat values.');
