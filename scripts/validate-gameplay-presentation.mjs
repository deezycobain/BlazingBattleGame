import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=process.cwd();
const fail=msg=>{throw new Error(`Gameplay presentation validation failed: ${msg}`)};
const read=rel=>fs.readFile(path.join(ROOT,rel),'utf8');
const readJson=async rel=>JSON.parse(await read(rel));
const approx=(a,b,eps=1e-9)=>Math.abs(a-b)<=eps;

// Load the pure presentation helper in a minimal browser-like global.
globalThis.window={};
vm.runInThisContext(await read('runtime/animation/attack-presentation.js'),{filename:'attack-presentation.js'});
const P=window.BlazingAttackPresentation;
if(!P)fail('BlazingAttackPresentation did not initialize');

// Exact-target facing is independent from mechanical hitbox rotation.
if(!approx(P.rotationToward({x:0,y:0},{x:10,y:0}),0))fail('rotationToward must face right target at 0 radians');
if(!approx(P.rotationToward({x:0,y:0},{x:0,y:-10}),-Math.PI/2))fail('rotationToward must preserve exact target direction');
const anim={};
P.lockFacing(anim,'Sub-Zero',{x:10,y:20},{x:-10,y:20});
if(!approx(P.lockedFacing(anim,'Sub-Zero'),Math.PI))fail('locked attack facing must point at the resolved target');
P.clearFacing(anim,'Sub-Zero');
if(P.lockedFacing(anim,'Sub-Zero')!==null)fail('attack-facing lock must clear after the action');

// Missing optional attack kinds must fall back to real canonical basic art.
const punchFrame={id:'punch'};
const kickFrame={id:'kick'};
if(P.resolveFrameKind('kick',{punch:[punchFrame],kick:[]})!=='punch')fail('missing kick frames must fall back to punch frames');
if(P.resolveFrameKind('kick',{punch:[punchFrame],kick:[kickFrame]})!=='kick')fail('existing kick frames must remain selectable');
if(P.resolveFrameKind('freeze',{punch:[punchFrame],freeze:[]})!=='freeze')fail('special/Jutsu kinds must not silently fall back to melee art');

const senku=await readJson('assets/characters/senku/data/unit.json');
const subzero=await readJson('assets/characters/subzero/data/unit.json');
const subzeroMap=await readJson('assets/characters/subzero/data/runtime-map.json');

// Senku close/far presentation is metadata-driven and does not change combat values.
const near=P.selectBasicPresentation(senku,{x:0,y:0},{x:70,y:0},'kick');
const far=P.selectBasicPresentation(senku,{x:0,y:0},{x:90,y:0},'kick');
if(senku.abilities?.basic?.presentation?.close_range_threshold_px!==78)fail('Senku close-range threshold must remain 78 px');
if(near.mode!=='close'||near.runtimeDriver!=='animateLunge'||near.animationKind!=='punch')fail('Senku close basic must select punch/lunge presentation');
if(far.mode!=='far'||far.runtimeDriver!=='animateSenkuBomb'||far.animationKind!=='punch')fail('Senku far basic must select bomb presentation');
if(senku.abilities?.basic?.damage_multiplier!==1||senku.abilities?.basic?.target_mode!=='single'||senku.abilities?.basic?.single_target_selector!=='nearest_in_shape')fail('Senku Pass 4.1 must not alter basic damage/targeting semantics');

// Sub-Zero authored range rotation and punch semantics are explicit canonical data.
if(subzero.combat?.basic_rotation_deg!==0||subzero.combat?.jutsu_rotation_deg!==0)fail('Sub-Zero authored basic/Jutsu rotation must remain horizontal at 0 degrees');
if(subzero.combat?.jutsu_shape?.type!=='cone'||subzero.combat.jutsu_shape.r!==205||subzero.combat.jutsu_shape.a!==1.05)fail('Sub-Zero Freeze Blast cone geometry changed unexpectedly');
if(subzero.abilities?.basic?.presentation?.runtime_driver!=='animateLunge'||subzero.abilities?.basic?.presentation?.animation_kind!=='punch')fail('Sub-Zero basic must use canonical lunge/punch presentation');
const subzeroBasic=P.selectBasicPresentation(subzero,{x:0,y:0},{x:50,y:0},'kick');
if(subzeroBasic.runtimeDriver!=='animateLunge'||subzeroBasic.animationKind!=='punch')fail('Sub-Zero helper/basic selection must not alternate into missing kick art');
if(subzero.abilities?.jutsu?.cost!==4||subzero.abilities?.jutsu?.damage_multiplier!==2.1)fail('Freeze Blast cost/damage changed unexpectedly');
const freeze=subzeroMap.abilities?.freeze_blast;
if(freeze?.projectile_presentation?.cast_duration_ms!==340||freeze?.projectile_presentation?.flight_duration_ms!==420||freeze?.projectile_presentation?.freeze_hold_ms!==520)fail('Freeze Blast timing changed unexpectedly');
const gaugeAction=(freeze.gameplay_actions||[]).find(a=>a.action_id==='reduce_target_gauge');
if(gaugeAction?.parameters?.amount!==35)fail('Freeze Blast gauge reduction must remain 35');

// Shell integration: mechanical geometry, body facing, animation kind and distance split are separate contracts.
const shell=await read('index.html');
for(const marker of [
  'runtime/animation/attack-presentation.js',
  'window.BlazingAttackPresentation.resolveFrameKind',
  'function bodyFacingRotation(',
  'window.BlazingAttackPresentation.lockedFacing',
  'facingFlip(bodyFacingRotation(u,pos,false),u.name)',
  'facingFlip(bodyFacingRotation(e,pos,true),(e.spriteKey||e.name))',
  'window.BlazingAttackPresentation.lockFacing(anim,unitName,from,to)',
  'window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy)',
  'window.BlazingAttackPresentation.selectBasicPresentation(canonicalUnit(au.name),from,enemy,requestedBasicKind)',
  "basicPresentation.runtimeDriver==='animateSenkuBomb'?animateSenkuBomb:animateLunge",
  'basicPresentation.animationKind',
  'function authoredAttackRotation('
])if(!shell.includes(marker))fail(`index.html missing Pass 4.1 marker: ${marker}`);
if(shell.includes("const runBasicAttack=(au.name==='Lebee')?animateLebeeStarBlast:(au.name==='Senku'?animateSenkuBomb:animateLunge);"))fail('legacy forced-Senku-bomb dispatcher returned');

const staticPass=await read('scripts/static-hitbox-postprocess.mjs');
for(const marker of ['combat.jutsu_rotation_deg','combat.basic_rotation_deg','authored action-specific hitbox rotations'])if(!staticPass.includes(marker))fail(`static hitbox compatibility pass missing ${marker}`);

console.log('Gameplay presentation smoke PASS: authored hitbox rotation, exact-target body facing, Sub-Zero punch fallback, Senku 78px close melee split, and unchanged Freeze Blast combat semantics verified.');
