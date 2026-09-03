import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=process.cwd();
const read=rel=>fs.readFile(path.join(ROOT,rel),'utf8');
const fail=msg=>{throw new Error(`Sub-Zero facing validation failed: ${msg}`)};
const approx=(a,b,eps=1e-9)=>Math.abs(a-b)<=eps;

globalThis.window={};
vm.runInThisContext(await read('runtime/animation/attack-presentation.js'),{filename:'attack-presentation.js'});
const P=window.BlazingAttackPresentation;
if(!P)fail('attack presentation runtime did not initialize');
for(const fn of ['nearestHorizontalLanePoint','resolveActionTarget','resolveActionRotation','setPreviewRotation','previewFacing','clearPreviewFacing','lockFacing','lockRotation','lockedFacing','clearFacing']){
  if(typeof P[fn]!=='function')fail(`missing ${fn} helper`);
}

const anim={};
P.setPreviewRotation(anim,'Sub-Zero',Math.PI);
if(!approx(P.previewFacing(anim,'Sub-Zero'),Math.PI))fail('left preview direction was not stored');
if(P.lockedFacing(anim,'Sub-Zero')!==null)fail('preview direction must not create the committed attack lock');
P.setPreviewRotation(anim,'Sub-Zero',0);
if(!approx(P.previewFacing(anim,'Sub-Zero'),0))fail('preview direction must remain live and replaceable before release');
P.lockRotation(anim,'Sub-Zero',Math.PI);
if(!approx(P.lockedFacing(anim,'Sub-Zero'),Math.PI))fail('committed attack direction was not locked');
if(P.previewFacing(anim,'Sub-Zero')!==null)fail('committed attack lock must clear the preview channel');
P.clearFacing(anim,'Sub-Zero');
if(P.lockedFacing(anim,'Sub-Zero')!==null||P.previewFacing(anim,'Sub-Zero')!==null)fail('all facing state must clear after the action');

const subzero=JSON.parse(await read('assets/characters/subzero/data/unit.json'));
if(subzero?.abilities?.jutsu?.presentation?.projectile_hand_offset_y_px!==-24)fail('Freeze Blast hand offset must stay aligned with the visible hands');
if(subzero?.abilities?.jutsu?.presentation?.projectile_visual_scale!==0.78)fail('Freeze Blast visual scale changed');
if(subzero?.abilities?.jutsu?.presentation?.range_rotation_mode!=='nearest_enemy_horizontal_facing')fail('Freeze Blast is not configured for nearest-lane-enemy horizontal aiming');
if(subzero?.combat?.jutsu_shape?.w!==175||subzero?.combat?.jutsu_shape?.h!==64)fail('Freeze Blast gameplay range changed');
if(subzero?.abilities?.jutsu?.cost!==4||subzero?.abilities?.jutsu?.damage_multiplier!==2.1)fail('Freeze Blast gameplay cost/damage changed');

const origin={x:20,y:30};
const target={x:92,y:-24,hp:10};
if(!approx(P.resolveActionRotation(subzero,'jutsu',origin,[target],Math.PI),0))fail('Freeze Blast runtime must collapse a right-side target to straight right');
if(!approx(P.resolveActionRotation(subzero,'jutsu',origin,[{x:-40,y:66,hp:10}],0),Math.PI))fail('Freeze Blast runtime must collapse a left-side target to straight left');

const alignment=await read('scripts/subzero-freeze-alignment-postprocess.mjs');
const directPreviewStart=alignment.indexOf('const directPreviewState=`');
const directPreviewEnd=alignment.indexOf('const candidates=',directPreviewStart);
if(directPreviewStart<0||directPreviewEnd<=directPreviewStart)fail('direct Freeze Blast preview block is not identifiable');
const directPreviewBlock=alignment.slice(directPreviewStart,directPreviewEnd);
if(!directPreviewBlock.includes('resolveActionRotation(unit,action,origin,S.enemies||[],authored)'))fail('Freeze Blast preview is not resolved from the nearest horizontal-lane enemy');
if(!directPreviewBlock.includes('setPreviewRotation(S.anim,actor.name'))fail('Freeze Blast preview direction is not published');

const horizontalFacingStart=alignment.indexOf('const horizontalVectorFacing=`');
const horizontalFacingEnd=alignment.indexOf('const preciseFacing=`',horizontalFacingStart);
if(horizontalFacingStart<0||horizontalFacingEnd<=horizontalFacingStart)fail('horizontal committed-facing block is not identifiable');
const horizontalFacingBlock=alignment.slice(horizontalFacingStart,horizontalFacingEnd);
if(!horizontalFacingBlock.includes('const attackDx=Number(enemy?.x)-Number(from?.x)'))fail('committed cast is not derived from the resolved target side');
if(!horizontalFacingBlock.includes('attackDx<0?Math.PI:0'))fail('committed cast does not collapse its target to left/right');
if(!horizontalFacingBlock.includes('lockRotation(state,unitName,facing)'))fail('horizontal cast direction is not held for the complete attack');
if(!alignment.includes('ctx.translate(x,y+projectileHandOffsetY);ctx.rotate(angle);'))fail('Freeze Blast projectile is not held on one horizontal hand line');

// The migration script intentionally retains legacy source strings as replacement anchors so it
// can upgrade older dist outputs idempotently. Validate the generated replacement blocks, not the
// mere presence of those inert migration anchors in this build-time source file.
const polish=await read('scripts/combat-polish-postprocess.mjs');
if(!polish.includes('previewFacing(S.anim,name)'))fail('Sub-Zero sprite renderer does not consume preview facing');
if(!polish.includes('Number.isFinite(lockedJutsuFacing)?lockedJutsuFacing:previewJutsuFacing'))fail('committed facing must remain higher priority than preview facing');
if(!polish.includes('const dir=Number.isFinite(locked)?(Math.cos(locked)<0?-1:1)'))fail('Freeze Blast renderer does not consume the locked left/right side');
if(!polish.includes('const to={x:from.x+dir*travel,y:from.y};'))fail('Freeze Blast renderer is not constrained to horizontal travel');
if(!polish.includes('const y=from.y;'))fail('Freeze Blast projectile y-position must remain fixed');
if(!polish.includes('const angle=dir<0?Math.PI:0;'))fail('Freeze Blast projectile art must face only left/right');

console.log('Sub-Zero facing PASS: nearest lane-aligned enemy chooses the side; preview, committed cast, body facing, range geometry, and projectile travel remain strictly horizontal left/right while gameplay values and compact VFX tuning remain unchanged.');
