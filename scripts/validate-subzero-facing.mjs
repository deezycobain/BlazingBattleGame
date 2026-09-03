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
for(const fn of ['resolveActionTarget','resolveActionRotation','setPreviewRotation','previewFacing','clearPreviewFacing','lockFacing','lockRotation','lockedFacing','clearFacing']){
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
if(subzero?.abilities?.jutsu?.presentation?.projectile_hand_offset_y_px!==-38)fail('Freeze Blast hand offset changed');
if(subzero?.abilities?.jutsu?.presentation?.projectile_visual_scale!==0.78)fail('Freeze Blast visual scale changed');
if(subzero?.abilities?.jutsu?.presentation?.range_rotation_mode!=='nearest_enemy_facing')fail('Freeze Blast is not configured for nearest-live-enemy directional aiming');
if(subzero?.combat?.jutsu_shape?.w!==175||subzero?.combat?.jutsu_shape?.h!==64)fail('Freeze Blast gameplay range changed');
if(subzero?.abilities?.jutsu?.cost!==4||subzero?.abilities?.jutsu?.damage_multiplier!==2.1)fail('Freeze Blast gameplay cost/damage changed');

const origin={x:20,y:30};
const target={x:92,y:-24,hp:10};
const expected=Math.atan2(target.y-origin.y,target.x-origin.x);
if(!approx(P.resolveActionRotation(subzero,'jutsu',origin,[target],0),expected))fail('Freeze Blast runtime does not preserve the exact target vector');

const alignment=await read('scripts/subzero-freeze-alignment-postprocess.mjs');
const directPreviewStart=alignment.indexOf('const directPreviewState=`');
const directPreviewEnd=alignment.indexOf('const candidates=',directPreviewStart);
if(directPreviewStart<0||directPreviewEnd<=directPreviewStart)fail('direct Freeze Blast preview block is not identifiable');
const directPreviewBlock=alignment.slice(directPreviewStart,directPreviewEnd);
if(!directPreviewBlock.includes('resolveActionRotation(unit,action,origin,S.enemies||[],authored)'))fail('Freeze Blast preview is not resolved from the nearest live enemy');
if(!directPreviewBlock.includes('setPreviewRotation(S.anim,actor.name'))fail('Freeze Blast preview direction is not published');
if(directPreviewBlock.includes('Math.cos('))fail('Freeze Blast preview still collapses directional aim to left/right');

const preciseFacingStart=alignment.indexOf('const preciseFacing=`');
const preciseFacingEnd=alignment.indexOf('const rosterFacingCount=',preciseFacingStart);
if(preciseFacingStart<0||preciseFacingEnd<=preciseFacingStart)fail('precise committed-facing block is not identifiable');
const preciseFacingBlock=alignment.slice(preciseFacingStart,preciseFacingEnd);
if(!preciseFacingBlock.includes('lockFacing(state,unitName,from,enemy)'))fail('committed cast is not locked to the exact resolved target vector');
if(preciseFacingBlock.includes('Math.PI:0'))fail('committed cast still collapses target direction to left/right');
if(!alignment.includes('projectileHandOffsetY*(1-ease)'))fail('Freeze Blast hand lift must converge onto the resolved target at impact');
if(!alignment.includes('visualAngle=Math.atan2('))fail('Freeze Blast projectile art is not rotated along its target-reaching path');

// The migration script intentionally retains legacy source strings as replacement anchors so it
// can upgrade older dist outputs idempotently. Validate the generated replacement blocks, not the
// mere presence of those inert migration anchors in this build-time source file.
const polish=await read('scripts/combat-polish-postprocess.mjs');
if(!polish.includes('previewFacing(S.anim,name)'))fail('Sub-Zero sprite renderer does not consume preview facing');
if(!polish.includes('Number.isFinite(lockedJutsuFacing)?lockedJutsuFacing:previewJutsuFacing'))fail('committed facing must remain higher priority than preview facing');
if(!polish.includes('const dx=rawTo.x-from.x,dy=rawTo.y-from.y;'))fail('Freeze Blast renderer does not preserve vertical projectile travel');
if(!polish.includes('Math.atan2(dy,dx)'))fail('Freeze Blast renderer does not rotate the projectile toward its target');

console.log('Sub-Zero facing PASS: nearest-live-enemy aim controls the directional lane preview; release locks the exact resolved target vector; projectile travel reaches that target while gameplay values and compact VFX tuning remain unchanged.');
