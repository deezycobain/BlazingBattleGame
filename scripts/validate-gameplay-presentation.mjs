import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=process.cwd();
const fail=msg=>{throw new Error(`Gameplay presentation validation failed: ${msg}`)};
const read=rel=>fs.readFile(path.join(ROOT,rel),'utf8');
const readJson=async rel=>JSON.parse(await read(rel));
const exists=async rel=>{try{await fs.access(path.join(ROOT,rel));return true}catch{return false}};
const approx=(a,b,eps=1e-9)=>Math.abs(a-b)<=eps;

// Load pure browser-IIFE presentation/movement helpers in a minimal global.
globalThis.window={};
vm.runInThisContext(await read('runtime/animation/attack-presentation.js'),{filename:'attack-presentation.js'});
vm.runInThisContext(await read('runtime/movement/retreat-runtime.js'),{filename:'retreat-runtime.js'});
const P=window.BlazingAttackPresentation;
const R=window.BlazingRetreatRuntime;
if(!P)fail('BlazingAttackPresentation did not initialize');
if(!R)fail('BlazingRetreatRuntime did not initialize');

// Exact-target facing remains separate from mechanical hitbox rotation.
if(!approx(P.rotationToward({x:0,y:0},{x:10,y:0}),0))fail('rotationToward must face right target at 0 radians');
if(!approx(P.rotationToward({x:0,y:0},{x:0,y:-10}),-Math.PI/2))fail('rotationToward must preserve exact target direction');
const anim={};
P.lockFacing(anim,'Sub-Zero',{x:10,y:20},{x:-10,y:20});
if(!approx(P.lockedFacing(anim,'Sub-Zero'),Math.PI))fail('locked attack facing must point at the resolved target');
P.clearFacing(anim,'Sub-Zero');
if(P.lockedFacing(anim,'Sub-Zero')!==null)fail('attack-facing lock must clear after the action');

// Missing optional melee kinds still fall back to real canonical basic art.
const punchFrame={id:'punch'};
const kickFrame={id:'kick'};
if(P.resolveFrameKind('kick',{punch:[punchFrame],kick:[]})!=='punch')fail('missing kick frames must fall back to punch frames');
if(P.resolveFrameKind('kick',{punch:[punchFrame],kick:[kickFrame]})!=='kick')fail('existing kick frames must remain selectable');
if(P.resolveFrameKind('freeze',{punch:[punchFrame],freeze:[]})!=='freeze')fail('special/Jutsu kinds must not silently fall back to melee art');

// Bounded retreat math is deterministic under an injected RNG and always moves away.
if(!approx(R.randomDistance(48,88,()=>0),48)||!approx(R.randomDistance(48,88,()=>1),88))fail('retreat RNG endpoints must remain 48-88 px');
const bounds={left:24,right:616,top:70,bottom:318};
const leftPlan=R.computeRetreatPlan({from:{x:100,y:100},threat:{x:120,y:100},minDistance:48,maxDistance:88,bounds,rng:()=>0.5});
if(!approx(leftPlan.requestedDistance,68)||leftPlan.destination.x>=100||!approx(leftPlan.destination.y,100))fail('retreat must move directly away from a right-side threat');
if(Math.hypot(leftPlan.destination.x-120,leftPlan.destination.y-100)<=20)fail('retreat must increase separation from the threat');
const clamped=R.computeRetreatPlan({from:{x:30,y:80},threat:{x:80,y:120},minDistance:88,maxDistance:88,bounds,rng:()=>1});
if(clamped.destination.x<bounds.left||clamped.destination.y<bounds.top||clamped.destination.x>bounds.right||clamped.destination.y>bounds.bottom)fail('retreat destination must clamp inside battlefield bounds');
const overlap=R.computeRetreatPlan({from:{x:100,y:100},threat:{x:100,y:100},minDistance:48,maxDistance:88,bounds,rng:()=>0});
if(!Number.isFinite(overlap.destination.x)||!Number.isFinite(overlap.destination.y))fail('overlap retreat fallback must remain finite');
const p0=R.interpolate({x:10,y:20},{x:60,y:80},0),p1=R.interpolate({x:10,y:20},{x:60,y:80},1);
if(!approx(p0.x,10)||!approx(p0.y,20)||!approx(p1.x,60)||!approx(p1.y,80))fail('retreat interpolation endpoints changed');

const senku=await readJson('assets/characters/senku/data/unit.json');
const senkuMap=await readJson('assets/characters/senku/data/runtime-map.json');
const manifest=await readJson('runtime/registry/asset-manifest.json');
const subzero=await readJson('assets/characters/subzero/data/unit.json');
const subzeroMap=await readJson('assets/characters/subzero/data/runtime-map.json');

// Senku's basic is now one directional pear-range bomb-retreat contract at every valid distance.
const sm=senku.abilities?.basic?.presentation||{};
const pear=senku.combat?.basic_shape||{};
if(pear.type!=='pear'||pear.rear!==48||pear.reach!==140||pear.width!==102)fail('Senku basic must use the approved directional pear geometry');
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
if(sm.close_retreat_min_px!==48||sm.close_retreat_max_px!==88||sm.close_retreat_duration_ms!==540||sm.close_retreat_frame_ms!==90||!approx(sm.close_bomb_release_ratio,.68))fail('Senku retreat distance/timing/release contract changed');
if(senku.abilities?.basic?.damage_multiplier!==1||senku.abilities?.basic?.target_mode!=='single'||senku.abilities?.basic?.single_target_selector!=='nearest_in_shape')fail('Senku retreat change must retain basic damage/targeting semantics');

// The user-supplied sheet is preserved in Senku's source archive and materializes to six real runtime images before validation/build.
if(!await exists('assets/characters/senku/sprites/source/retreat_run/retreat_run_assets.tar.gz'))fail('Senku retreat source archive is missing');
const retreatFrames=senku.animation_standard?.animations?.retreat_run?.frames||[];
if(retreatFrames.length!==6||senku.animation_standard.animations.retreat_run.frame_ms!==90)fail('Senku retreat animation must remain six frames at 90 ms');
if(senku.animation_standard.animations.retreat_run.events?.[0]?.frame!==5)fail('Senku bomb release must remain late enough for the retreat animation to read');
for(const rel of retreatFrames){
  if(!await exists(path.posix.join('assets/characters/senku',rel)))fail(`missing materialized Senku retreat frame: ${rel}`);
}
if(!await exists('assets/characters/senku/sprites/source/retreat_run/source_sheet.jpg'))fail('materialized Senku retreat source sheet is missing');
const primaryAnim=senkuMap.abilities?.explosive_bomb?.presentation_animations?.primary_retreat;
const helperAnim=senkuMap.abilities?.explosive_bomb?.presentation_animations?.helper_throw;
if(primaryAnim!=='senku.animation.retreat_run'||helperAnim!=='senku.animation.basic_attack')fail('Senku runtime map must separate primary retreat art from helper throw art');
const damageAction=(senkuMap.abilities?.explosive_bomb?.gameplay_actions||[]).find(a=>a.action_id==='damage_target');
if(damageAction?.event!=='on_projectile_arrival')fail('Senku bomb damage must remain on projectile arrival');
const retreatResource=manifest.units?.senku?.animations?.retreat_run;
if(retreatResource?.resource_id!=='senku.animation.retreat_run'||retreatResource?.required_runtime_frames!==6)fail('Senku retreat resource manifest entry is incomplete');

// Sub-Zero Freeze Blast remains forward-facing toward nearest live enemy with unchanged combat geometry.
if(subzero.combat?.basic_rotation_deg!==0||subzero.combat?.jutsu_rotation_deg!==0)fail('Sub-Zero authored fallback rotation must remain 0 degrees');
if(subzero.combat?.jutsu_shape?.type!=='cone'||subzero.combat.jutsu_shape.r!==205||subzero.combat.jutsu_shape.a!==1.05)fail('Sub-Zero Freeze Blast cone geometry changed unexpectedly');
if(subzero.abilities?.jutsu?.presentation?.range_rotation_mode!=='nearest_enemy_facing')fail('Freeze Blast must use nearest-enemy forward-facing range rotation');
if(subzero.abilities?.jutsu?.presentation?.projectile_origin_mode!=='forward_facing')fail('Freeze Blast projectile must originate from Sub-Zero forward facing');
const leftRotation=P.resolveActionRotation(subzero,'jutsu',{x:0,y:0},[{x:-30,y:0,hp:10}],0);
const upRotation=P.resolveActionRotation(subzero,'jutsu',{x:0,y:0},[{x:0,y:-30,hp:10}],0);
if(!approx(leftRotation,Math.PI)||!approx(upRotation,-Math.PI/2))fail('Freeze Blast range rotation must follow enemy direction rather than screen-fixed angle');
if(subzero.abilities?.basic?.presentation?.runtime_driver!=='animateLunge'||subzero.abilities?.basic?.presentation?.animation_kind!=='punch')fail('Sub-Zero basic must use canonical lunge/punch presentation');
const subzeroBasic=P.selectBasicPresentation(subzero,{x:0,y:0},{x:50,y:0},'kick');
if(subzeroBasic.runtimeDriver!=='animateLunge'||subzeroBasic.animationKind!=='punch')fail('Sub-Zero helper/basic selection must not alternate into missing kick art');
if(subzero.abilities?.jutsu?.cost!==4||subzero.abilities?.jutsu?.damage_multiplier!==2.1)fail('Freeze Blast cost/damage changed unexpectedly');
const freeze=subzeroMap.abilities?.freeze_blast;
if(freeze?.projectile_presentation?.cast_duration_ms!==340||freeze?.projectile_presentation?.flight_duration_ms!==420||freeze?.projectile_presentation?.freeze_hold_ms!==520)fail('Freeze Blast timing changed unexpectedly');
const gaugeAction=(freeze.gameplay_actions||[]).find(a=>a.action_id==='reduce_target_gauge');
if(gaugeAction?.parameters?.amount!==35)fail('Freeze Blast gauge reduction must remain 35');

// Shell integration: target resolution, bomb impact and turn/combo completion remain existing orchestration seams.
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
  "basicMeta.far_animation_kind||requestedBasicKind",
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
for(const marker of ['combat.jutsu_rotation_deg','combat.basic_rotation_deg',"if(s.type==='pear')",'Senku pear hit geometry'])if(!staticPass.includes(marker))fail(`static hitbox compatibility pass missing ${marker}`);

console.log('Gameplay presentation smoke PASS: Senku directional pear range, all-distance six-frame evasive bomb retreat with bounded 48-88px persistent primary reposition, delayed toss, dynamic forward Freeze Blast, Sub-Zero punch facing, and unchanged bomb/freeze combat semantics verified.');
