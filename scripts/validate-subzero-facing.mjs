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
if(!approx(P.lockedFacing(anim,'Sub-Zero'),Math.PI))fail('committed resolved-target direction was not locked');
if(P.previewFacing(anim,'Sub-Zero')!==null)fail('committed attack lock must clear the preview channel');
P.clearFacing(anim,'Sub-Zero');
if(P.lockedFacing(anim,'Sub-Zero')!==null||P.previewFacing(anim,'Sub-Zero')!==null)fail('all facing state must clear after the action');

const subzero=JSON.parse(await read('assets/characters/subzero/data/unit.json'));
if(subzero?.abilities?.jutsu?.presentation?.projectile_hand_offset_y_px!==-38)fail('Freeze Blast hand offset changed');
if(subzero?.abilities?.jutsu?.presentation?.projectile_visual_scale!==0.78)fail('Freeze Blast visual scale changed');
if(subzero?.combat?.jutsu_shape?.w!==175||subzero?.combat?.jutsu_shape?.h!==64)fail('Freeze Blast gameplay range changed');
if(subzero?.abilities?.jutsu?.cost!==4||subzero?.abilities?.jutsu?.damage_multiplier!==2.1)fail('Freeze Blast gameplay cost/damage changed');

const alignment=await read('scripts/subzero-freeze-alignment-postprocess.mjs');
if(!alignment.includes('setPreviewRotation(S.anim,actor.name,previewDirection)'))fail('final Freeze Blast alignment pass does not publish live preview facing');
const activePreviewStart=alignment.indexOf('const previewState=`');
const activePreviewEnd=alignment.indexOf('const previousPreviewState=`',activePreviewStart);
if(activePreviewStart<0||activePreviewEnd<=activePreviewStart)fail('active Freeze Blast preview migration block is not identifiable');
const activePreviewBlock=alignment.slice(activePreviewStart,activePreviewEnd);
if(!activePreviewBlock.includes('const liveAim=Number(actor?.rotation)'))fail('Freeze Blast preview facing is not sourced from the live lane rotation');
if(!activePreviewBlock.includes('const previewSource=Number.isFinite(liveAim)?liveAim:authored'))fail('Freeze Blast preview facing does not safely fall back when live aim is unavailable');
if(activePreviewBlock.includes('const previewDirection=Math.cos(authored)<0?Math.PI:0;'))fail('active Freeze Blast preview facing still uses stale authored rotation directly');
if(!alignment.includes("resolveActionRotation(canonicalUnit(unitName),'jutsu',from,[enemy],0)"))fail('committed cast does not lock to the actual resolved enemy');
const polish=await read('scripts/combat-polish-postprocess.mjs');
if(!polish.includes('previewFacing(S.anim,name)'))fail('Sub-Zero sprite renderer does not consume preview facing');
if(!polish.includes('Number.isFinite(lockedJutsuFacing)?lockedJutsuFacing:previewJutsuFacing'))fail('committed facing must remain higher priority than preview facing');

console.log('Sub-Zero facing PASS: preview follows live lane rotation without becoming sticky; committed resolved-target lock supersedes preview; gameplay and Freeze Blast visual tuning remain unchanged.');
