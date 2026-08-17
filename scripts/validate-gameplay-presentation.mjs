import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=process.cwd();
const fail=msg=>{throw new Error(`Gameplay presentation validation failed: ${msg}`)};
const read=rel=>fs.readFile(path.join(ROOT,rel),'utf8');
const readJson=async rel=>JSON.parse(await read(rel));
const exists=async rel=>{try{await fs.access(path.join(ROOT,rel));return true}catch{return false}};
const approx=(a,b,eps=1e-9)=>Math.abs(a-b)<=eps;

globalThis.window={};
vm.runInThisContext(await read('runtime/animation/attack-presentation.js'),{filename:'attack-presentation.js'});
vm.runInThisContext(await read('runtime/movement/retreat-runtime.js'),{filename:'retreat-runtime.js'});
const P=window.BlazingAttackPresentation;
const R=window.BlazingRetreatRuntime;
if(!P)fail('BlazingAttackPresentation did not initialize');
if(!R)fail('BlazingRetreatRuntime did not initialize');

if(!approx(P.rotationToward({x:0,y:0},{x:10,y:0}),0))fail('rotationToward must face right target at 0 radians');
if(!approx(P.rotationToward({x:0,y:0},{x:0,y:-10}),-Math.PI/2))fail('rotationToward must preserve exact target direction');
if(!approx(P.horizontalRotationToward({x:0,y:0},{x:-10,y:-80},0),Math.PI))fail('horizontalRotationToward must face left without vertical rotation');
if(!approx(P.horizontalRotationToward({x:0,y:0},{x:10,y:80},Math.PI),0))fail('horizontalRotationToward must face right without vertical rotation');
const anim={};
P.lockFacing(anim,'Sub-Zero',{x:10,y:20},{x:-10,y:20});
if(!approx(P.lockedFacing(anim,'Sub-Zero'),Math.PI))fail('locked attack facing must point at the resolved target');
P.lockRotation(anim,'Sub-Zero',0);
if(!approx(P.lockedFacing(anim,'Sub-Zero'),0))fail('lockRotation must preserve an authored action rotation');
P.clearFacing(anim,'Sub-Zero');
if(P.lockedFacing(anim,'Sub-Zero')!==null)fail('attack-facing lock must clear after the action');

const punchFrame={id:'punch'};
const kickFrame={id:'kick'};
if(P.resolveFrameKind('kick',{punch:[punchFrame],kick:[]})!=='punch')fail('missing kick frames must fall back to punch frames');
if(P.resolveFrameKind('kick',{punch:[punchFrame],kick:[kickFrame]})!=='kick')fail('existing kick frames must remain selectable');
if(P.resolveFrameKind('freeze',{punch:[punchFrame],freeze:[]})!=='freeze')fail('special/Jutsu kinds must not silently fall back to melee art');

if(!approx(R.randomDistance(64,144,()=>0),64)||!approx(R.randomDistance(64,144,()=>1),144))fail('retreat RNG endpoints must remain 64-144 px');
const bounds={left:24,right:616,top:70,bottom:318};
const leftPlan=R.computeRetreatPlan({from:{x:100,y:100},threat:{x:120,y:100},minDistance:64,maxDistance:144,bounds,rng:()=>0.5});
if(!approx(leftPlan.requestedDistance,104)||leftPlan.destination.x>=100||!approx(leftPlan.destination.y,100))fail('retreat must move directly away from a right-side threat');
if(Math.hypot(leftPlan.destination.x-120,leftPlan.destination.y-100)<=20)fail('retreat must increase separation from the threat');
const clamped=R.computeRetreatPlan({from:{x:30,y:80},threat:{x:80,y:120},minDistance:144,maxDistance:144,bounds,rng:()=>1});
if(clamped.destination.x<bounds.left||clamped.destination.y<bounds.top||clamped.destination.x>bounds.right||clamped.destination.y>bounds.bottom)fail('retreat destination must clamp inside battlefield bounds');
const overlap=R.computeRetreatPlan({from:{x:100,y:100},threat:{x:100,y:100},minDistance:64,maxDistance:144,bounds,rng:()=>0});
if(!Number.isFinite(overlap.destination.x)||!Number.isFinite(overlap.destination.y))fail('overlap retreat fallback must remain finite');
const p0=R.interpolate({x:10,y:20},{x:60,y:80},0),p1=R.interpolate({x:10,y:20},{x:60,y:80},1);
if(!approx(p0.x,10)||!approx(p0.y,20)||!approx(p1.x,60)||!approx(p1.y,80))fail('retreat interpolation endpoints changed');

const senku=await readJson('assets/characters/senku/data/unit.json');
const senkuMap=await readJson('assets/characters/senku/data/runtime-map.json');
const manifest=await readJson('runtime/registry/asset-manifest.json');
const subzero=await readJson('assets/characters/subzero/data/unit.json');
const subzeroMap=await readJson('assets/characters/subzero/data/runtime-map.json');

const sm=senku.abilities?.basic?.presentation||{};
const pear=senku.combat?.basic_shape||{};
if(pear.type!=='pear'||pear.rear!==24||pear.reach!==82||pear.width!==58)fail('Senku basic must use the approved short, thin directional pear geometry');
if(!approx(pear.curve,.72)||!approx(pear.stem,.52)||!approx(pear.bulge,.72))fail('Senku pear curvature changed unexpectedly');
if(sm.range_rotation_mode!=='nearest_enemy_facing')fail('Senku pear range must point toward the nearest live enemy');
const near=P.selectBasicPresentation(senku,{x:0,y:0},{x:55,y:0},'kick');
const far=P.selectBasicPresentation(senku,{x:0,y:0},{x:125,y:0},'kick');
for(const [label,presentation] of [['near',near],['far',far]]){
  if(presentation.mode!=='default'||presentation.runtimeDriver!=='animateSenkuRetreatBomb'||presentation.animationKind!=='retreat_run'||presentation.repositionScope!=='primary_attacker'){
    fail(`Senku ${label} basic must use the evasive bomb retreat presentation`);
  }
}
const upPear=P.resolveActionRotation(senku,'normal',{x:0,y:0},[{x:0,y:-50,hp:10}],0);
const leftPear=P.resolveActionRotation(senku,'normal',{x:0,y:0},[{x:-50,y:0,hp:10}],0);
if(!approx(upPear,-Math.PI/2)||!approx(leftPear,Math.PI))fail('Senku pear range rotation must follow nearest-enemy direction');
if(sm.close_retreat_min_px!==64||sm.close_retreat_max_px!==144||sm.close_retreat_duration_ms!==540||sm.close_retreat_frame_ms!==90||!approx(sm.close_bomb_release_ratio,.68))fail('Senku retreat distance/timing/release contract changed');
if(senku.abilities?.basic?.damage_multiplier!==1||senku.abilities?.basic?.target_mode!=='single'||senku.abilities?.basic?.single_target_selector!=='nearest_in_shape')fail('Senku retreat change must retain basic damage/targeting semantics');

for(const source of [
  'assets/characters/senku/sprites/source/retreat_run/source_sheet.webp',
  'assets/characters/senku/sprites/source/attack/melee/source_sheet.webp'
])if(!await exists(source))fail(`missing Senku source artwork: ${source}`);
if(await exists('assets/characters/senku/sprites/source/retreat_run/retreat_run_assets.tar.gz'))fail('legacy Senku retreat archive must not return');
if(await exists('scripts/materialize-senku-retreat-assets.mjs'))fail('legacy Senku asset materializer must not return');

const retreatSpec=senku.animation_standard?.animations?.retreat_run;
const retreatFrames=retreatSpec?.frames||[];
if(retreatFrames.length!==6||retreatSpec.frame_ms!==90)fail('Senku retreat animation must remain six frames at 90 ms');
if(retreatSpec.events?.[0]?.frame!==5)fail('Senku bomb release must remain late enough for the retreat animation to read');
for(const rel of retreatFrames){
  if(!await exists(path.posix.join('assets/characters/senku',rel)))fail(`missing tracked Senku retreat frame: ${rel}`);
}

const meleeSpec=senku.animation_standard?.animations?.melee_attack;
const meleeFrames=meleeSpec?.frames||[];
if(meleeFrames.length!==6||meleeSpec.frame_ms!==100)fail('Senku melee animation must remain six dedicated frames at 100 ms');
if(meleeSpec.events?.[0]?.frame!==6)fail('Senku melee contact frame must remain frame 6');
for(const rel of meleeFrames){
  if(!await exists(path.posix.join('assets/characters/senku',rel)))fail(`missing tracked Senku melee frame: ${rel}`);
}
if(sm.melee_animation_kind!=='melee_attack')fail('Senku semantic melee kind must remain dedicated melee_attack art');
window.BlazingFrameRuntime={loadFrames:paths=>paths.map(src=>({src}))};
for(const requested of ['punch','kick','melee_attack']){
  const resolved=P.resolveFrames(senku,requested,{punch:[{src:'legacy-bomb-body'}]});
  if(resolved.length!==6||resolved.some(frame=>!frame.src.includes('/sprites/runtime/attack/melee/')))fail(`Senku ${requested} semantic melee must resolve only to dedicated Asset Inbox melee frames`);
}
const resolvedBomb=P.resolveFrames(senku,'bomb_throw',{punch:[{src:'legacy-bomb-body'}]});
if(resolvedBomb.length!==1||resolvedBomb[0].src!=='legacy-bomb-body')fail('Senku legacy bomb body fallback must stay separate from semantic melee art');

const explosiveMap=senkuMap.abilities?.explosive_bomb||{};
const primaryAnim=explosiveMap.presentation_animations?.primary_retreat;
const helperMelee=explosiveMap.presentation_animations?.helper_melee;
if(explosiveMap.animation_id!=='senku.animation.retreat_run'||primaryAnim!=='senku.animation.retreat_run'||helperMelee!=='senku.animation.melee_attack')fail('Senku runtime map must route primary retreat and helper melee separately');
if(explosiveMap.presentation_animations?.helper_throw)fail('Senku helper must not route through legacy bomb-throw body art');
const damageAction=(explosiveMap.gameplay_actions||[]).find(a=>a.action_id==='damage_target');
if(damageAction?.event!=='on_projectile_arrival')fail('Senku bomb damage must remain on projectile arrival');
const retreatResource=manifest.units?.senku?.animations?.retreat_run;
const meleeResource=manifest.units?.senku?.animations?.melee_attack;
if(retreatResource?.resource_id!=='senku.animation.retreat_run'||retreatResource?.required_runtime_frames!==6)fail('Senku retreat resource manifest entry is incomplete');
if(meleeResource?.resource_id!=='senku.animation.melee_attack'||meleeResource?.required_runtime_frames!==6)fail('Senku melee resource manifest entry is incomplete');

if(subzero.combat?.basic_rotation_deg!==0||subzero.combat?.jutsu_rotation_deg!==0)fail('Sub-Zero authored fallback rotation must remain 0 degrees');
if(subzero.combat?.basic_shape?.r!==92)fail('Sub-Zero close Basic range must remain 92 px');
if(subzero.abilities?.basic?.target_mode!=='single'||subzero.abilities?.basic?.single_target_selector!=='nearest_in_shape')fail('Sub-Zero Basic must focus the nearest close enemy');
if(subzero.abilities?.basic?.presentation?.runtime_driver!=='animateLunge'||subzero.abilities?.basic?.presentation?.animation_kind!=='punch')fail('Sub-Zero Basic must use canonical lunge/punch presentation');
const subzeroBasic=P.selectBasicPresentation(subzero,{x:0,y:0},{x:50,y:0},'kick');
if(subzeroBasic.runtimeDriver!=='animateLunge'||subzeroBasic.animationKind!=='punch')fail('Sub-Zero close Basic selection must not alternate into missing kick art');

if(subzero.combat?.jutsu_shape?.type!=='circle'||subzero.combat.jutsu_shape.r!==175)fail('Sub-Zero Freeze Blast must use the temporary generic 175 px medium-range circle');
const sj=subzero.abilities?.jutsu?.presentation||{};
if(sj.range_rotation_mode!=='medium_enemy_horizontal_facing')fail('Freeze Blast must use medium-range horizontal-only facing');
if(sj.target_focus_mode!=='preferred_distance_band'||sj.target_focus_min_px!==95||sj.target_focus_max_px!==175||sj.target_focus_preferred_px!==140||sj.target_focus_fallback_max_px!==175)fail('Freeze Blast medium-range focus band changed unexpectedly');
if(sj.target_lock_radius_pad_px!==8)fail('Freeze Blast target lock radius padding changed unexpectedly');
if(sj.projectile_origin_mode!=='forward_facing')fail('Freeze Blast projectile must originate from Sub-Zero forward facing');
const focusCandidates=[
  {id:'close-right',x:50,y:0,hp:10},
  {id:'medium-right',x:125,y:0,hp:10},
  {id:'medium-left',x:-160,y:0,hp:10},
  {id:'edge-right',x:190,y:0,hp:10}
];
const focus=P.resolveActionTarget(subzero,'jutsu',{x:0,y:0},focusCandidates);
if(focus?.id!=='medium-right')fail('Freeze Blast should prefer the best medium-range target');
const mediumRotation=P.resolveActionRotation(subzero,'jutsu',{x:0,y:0},focusCandidates,0);
if(!approx(mediumRotation,0))fail('Freeze Blast must face right for a selected right-side target');
const diagonalRight=P.resolveActionRotation(subzero,'jutsu',{x:0,y:0},[{id:'diag-right',x:120,y:-90,hp:10}],Math.PI);
if(!approx(diagonalRight,0))fail('Freeze Blast must stay horizontal when the selected target is diagonally right');
const diagonalLeft=P.resolveActionRotation(subzero,'jutsu',{x:0,y:0},[{id:'diag-left',x:-120,y:60,hp:10}],0);
if(!approx(diagonalLeft,Math.PI))fail('Freeze Blast must stay horizontal when the selected target is diagonally left');
const verticalFallback=P.resolveActionRotation(subzero,'jutsu',{x:0,y:0},[{id:'vertical',x:0,y:-140,hp:10}],0);
if(!approx(verticalFallback,0))fail('Freeze Blast must never rotate vertically');
const fallbackFocus=P.resolveActionTarget(subzero,'jutsu',{x:0,y:0},[{id:'close',x:45,y:0,hp:10},{id:'fallback',x:-170,y:0,hp:10}]);
if(fallbackFocus?.id!=='fallback')fail('Freeze Blast fallback should remain medium-range aware instead of snapping to the closest enemy');
if(subzero.abilities?.jutsu?.cost!==4||subzero.abilities?.jutsu?.damage_multiplier!==2.1)fail('Freeze Blast cost/damage changed unexpectedly');
const freeze=subzeroMap.abilities?.freeze_blast;
if(freeze?.projectile_presentation?.cast_duration_ms!==340||freeze?.projectile_presentation?.flight_duration_ms!==420||freeze?.projectile_presentation?.freeze_hold_ms!==520)fail('Freeze Blast timing changed unexpectedly');
const gaugeAction=(freeze.gameplay_actions||[]).find(a=>a.action_id==='reduce_target_gauge');
if(gaugeAction?.parameters?.amount!==35)fail('Freeze Blast gauge reduction must remain 35');

const shell=await read('index.html');
for(const marker of [
  'runtime/animation/attack-presentation.js',
  'runtime/movement/retreat-runtime.js',
  'const SENKU_RETREAT_RUN_FRAMES=',
  'function animateSenkuRetreatBomb(',
  'window.BlazingRetreatRuntime.computeRetreatPlan({',
  'pair.x=plan.destination.x;',
  "const wantsRetreat=basicPresentation.runtimeDriver==='animateSenkuRetreatBomb'",
  'const isPrimaryAttacker=attackIndex===1;',
  'basicPresentation.repositionScope',
  'releaseOrigin:()=>ensureAnimState().positions?.[unitName]||from',
  'window.BlazingAttackPresentation.resolveActionRotation(',
  'function bodyFacingRotation(',
  "mode==='forward_facing'",
  'function authoredAttackRotation('
])if(!shell.includes(marker))fail(`index.html missing Pass 4.1 marker: ${marker}`);
if(shell.includes("const runBasicAttack=(au.name==='Lebee')?animateLebeeStarBlast:(au.name==='Senku'?animateSenkuBomb:animateLunge);"))fail('legacy forced-Senku-bomb dispatcher returned');

const renderer=await read('runtime/rendering/battlefield-renderer.js');
for(const marker of ['function pearHalfWidth(',"s.type==='pear'",'ctx.lineTo(x,y)'])if(!renderer.includes(marker))fail(`battlefield renderer missing pear marker: ${marker}`);
const staticPass=await read('scripts/static-hitbox-postprocess.mjs');
for(const marker of [
  'combat.jutsu_rotation_deg',
  'combat.basic_rotation_deg',
  "if(s.type==='pear')",
  'Senku pear hit geometry',
  "basicMeta.melee_animation_kind||'melee_attack'",
  ': animateLunge;',
  'basicTarget=wantsRetreat?enemy:to;',
  'medium-range focus resolver',
  "resolveActionRotation(canonicalUnit(unitName),'jutsu',from,S.enemies||[],0)",
  'lockRotation(state,unitName,facing)'
])if(!staticPass.includes(marker))fail(`static gameplay compatibility pass missing ${marker}`);

console.log('Gameplay presentation smoke PASS: Senku directional/evasive presentation retained; Sub-Zero close Basic retained plus generic medium Freeze Blast range with horizontal-only body/projectile facing and unchanged combat semantics.');