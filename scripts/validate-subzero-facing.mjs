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
for(const fn of ['setPreviewRotation','previewFacing','clearPreviewFacing','lockRotation','lockedFacing','clearFacing']){
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
if(subzero?.combat?.jutsu_shape?.w!==175||subzero?.combat?.jutsu_shape?.h!==64)fail('Freeze Blast gameplay range changed');
if(subzero?.abilities?.jutsu?.cost!==4||subzero?.abilities?.jutsu?.damage_multiplier!==2.1)fail('Freeze Blast gameplay cost/damage changed');

const alignment=await read('scripts/subzero-freeze-alignment-postprocess.mjs');
const directPreviewStart=alignment.indexOf('const directPreviewState=`');
const directPreviewEnd=alignment.indexOf('const candidates=',directPreviewStart);
if(directPreviewStart<0||directPreviewEnd<=directPreviewStart)fail('direct Freeze Blast preview block is not identifiable');
const directPreviewBlock=alignment.slice(directPreviewStart,directPreviewEnd);
if(!directPreviewBlock.includes('const attackRotation=Number(actor?.rotation)'))fail('Freeze Blast preview is not sourced from the live attack-lane rotation');
if(!directPreviewBlock.includes('Math.cos(laneRotation)<0?Math.PI:0'))fail('Freeze Blast preview does not convert the live lane to left/right facing');
if(!directPreviewBlock.includes('setPreviewRotation(S.anim,actor.name'))fail('Freeze Blast preview direction is not published');

const vectorFacingStart=alignment.indexOf('const vectorFacing=`');
const vectorFacingEnd=alignment.indexOf('const rosterFacingCount=',vectorFacingStart);
if(vectorFacingStart<0||vectorFacingEnd<=vectorFacingStart)fail('direct committed-facing block is not identifiable');
const vectorFacingBlock=alignment.slice(vectorFacingStart,vectorFacingEnd);
if(!vectorFacingBlock.includes('const attackDx=Number(enemy?.x)-Number(from?.x)'))fail('committed cast is not derived from attacker-to-resolved-target vector');
if(!vectorFacingBlock.includes('const facing=Number.isFinite(attackDx)&&attackDx<0?Math.PI:0'))fail('committed target vector is not converted directly to left/right facing');
if(vectorFacingBlock.includes('resolveActionRotation('))fail('active committed-facing block still uses assisted target-facing resolution');

// The migration script intentionally retains legacy source strings as replacement anchors so it
// can upgrade older dist outputs idempotently. Validate the generated replacement blocks, not the
// mere presence of those inert migration anchors in this build-time source file.
const polish=await read('scripts/combat-polish-postprocess.mjs');
if(!polish.includes('previewFacing(S.anim,name)'))fail('Sub-Zero sprite renderer does not consume preview facing');
if(!polish.includes('Number.isFinite(lockedJutsuFacing)?lockedJutsuFacing:previewJutsuFacing'))fail('committed facing must remain higher priority than preview facing');

console.log('Sub-Zero facing PASS: live attack lane controls preview; release locks the actual attacker-to-resolved-target vector; gameplay and Freeze Blast visual tuning remain unchanged.');
