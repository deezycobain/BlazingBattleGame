import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

// Authored fallback rotation remains separate from target-relative rotation requested by
// canonical ability presentation metadata. Pass 4.1 uses target-relative modes for
// directional abilities such as Sub-Zero Freeze Blast and Senku's pear-shaped basic.
// IMPORTANT: battle pairs also contain empty reserve placeholders and some stages
// contain non-canonical enemies. Never let a presentation lookup throw during render.
const facingRx=/function updateFacing\(\)\{[\s\S]*?\n\}\n\nfunction battleSpriteFor/;
if(!facingRx.test(html))throw new Error('Static hitbox pass: updateFacing() block not found');
const facingReplacement=`function updateFacing(){
  // Moving a unit resets only the authored fallback rotation. attackProxy() may then
  // apply canonical target-relative rotation for abilities that explicitly request it.
  function authoredAttackRotation(actor,basicFallbackDeg,jutsuFallbackDeg=basicFallbackDeg){
    let deg=S.action==='jutsu'?jutsuFallbackDeg:basicFallbackDeg;
    try{
      if(actor?.name){
        const combat=canonicalUnit(actor.name)?.combat||{};
        if(S.action==='jutsu'&&Number.isFinite(combat.jutsu_rotation_deg))deg=combat.jutsu_rotation_deg;
        else if(Number.isFinite(combat.basic_rotation_deg))deg=combat.basic_rotation_deg;
      }
    }catch(_){
      // Empty reserve slots and stage-only enemies intentionally use the fallback.
    }
    return deg*Math.PI/180;
  }
  S.pairs.forEach(pair=>{
    (pair.units||[]).forEach(u=>{if(u)u.rotation=authoredAttackRotation(u,-90,-90);});
  });
  (S.enemies||[]).forEach(e=>{if(e)e.rotation=authoredAttackRotation(e,90,90);});
}

function battleSpriteFor`;
html=html.replace(facingRx,facingReplacement);

// Freeze Blast is a forward-only horizontal shot. Canonical rotation now chooses its
// horizontal side from the action-aware medium-range focus resolver, and the same locked
// rotation drives cast-body facing plus projectile origin.
const freezeFacingOld="const facing=window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);";
const freezeFacingLegacy="const facing=window.BlazingAttackPresentation.resolveActionRotation(canonicalUnit(unitName),'jutsu',from,[enemy],0);\n   window.BlazingAttackPresentation.lockRotation(state,unitName,facing);";
const freezeFacingNew=`const facing=window.BlazingAttackPresentation.resolveActionRotation(canonicalUnit(unitName),'jutsu',from,S.enemies||[],0);
   window.BlazingAttackPresentation.lockRotation(state,unitName,facing);`;
if(html.includes(freezeFacingOld))html=html.replace(freezeFacingOld,freezeFacingNew);
else if(html.includes(freezeFacingLegacy))html=html.replace(freezeFacingLegacy,freezeFacingNew);
else if(!html.includes("resolveActionRotation(canonicalUnit(unitName),'jutsu',from,S.enemies||[],0)"))throw new Error('Freeze Blast medium-focus facing pass: animation anchor not found');

// Senku's basic range is a real directional pear shape, not a cosmetic overlay.
// Keep the mechanical hit test mathematically aligned with BattlefieldRenderer.drawShape().
if(!html.includes("if(s.type==='pear')")){
  const pearAnchor=" if(s.type==='circle')return d(p,e)<=s.r+er;";
  if(!html.includes(pearAnchor))throw new Error('Pear hitbox pass: circle geometry anchor not found');
  const pearHit=`${pearAnchor}
 if(s.type==='pear'){
  const rear=Number(s.rear??48),reach=Number(s.reach??140),width=Number(s.width??102);
  const curve=Number(s.curve??.72),stem=Number(s.stem??.52),bulge=Number(s.bulge??.72);
  if(q.x<-rear-er||q.x>reach+er)return false;
  const x=clamp(q.x,-rear,reach),span=rear+reach,t=span>0?(x+rear)/span:0;
  const half=(t>0&&t<1&&width>0)?width*Math.pow(Math.max(0,Math.sin(Math.PI*t)),curve)*(stem+bulge*t):0;
  return Math.abs(q.y)<=half+er;
 }`;
  html=html.replace(pearAnchor,pearHit);
}

// UI-only target filtering. Never wrap or replace global hits(): the geometry helper
// recursively calls itself for compound shapes, and altering that path can take down
// the renderer. previewHits() calls the untouched geometry helper and only narrows the
// VISUAL enemy marker for canonical nearest-in-shape single-target basics such as Senku.
const previewHelper=`function previewHits(a,u,b){
  const base=hits(a,u,b);
  if(!base)return false;
  try{
    const actor=a?.units?front(a):(a?.name?a:null);
    const basic=actor?.name?canonicalUnit(actor.name)?.abilities?.basic:null;
    if(basic?.target_mode==='single' && basic?.single_target_selector==='nearest_in_shape' && a?.units){
      const candidates=(S.enemies||[]).filter(e=>e&&e.hp>0&&hits(a,u,{x:e.x,y:e.y,r:e.r||19}));
      if(!candidates.length)return false;
      const nearest=[...candidates].sort((x,y)=>d(a,x)-d(a,y))[0];
      return b===nearest || (Math.abs((b?.x??Infinity)-nearest.x)<0.01 && Math.abs((b?.y??Infinity)-nearest.y)<0.01);
    }
  }catch(_){ }
  return true;
}

`;
const facingAnchor='function updateFacing(){';
const facingAt=html.indexOf(facingAnchor);
if(facingAt<0)throw new Error('Highlight pass: updateFacing insertion anchor not found');
html=html.slice(0,facingAt)+previewHelper+html.slice(facingAt);

// Swap hits() -> previewHits() only inside renderer functions that both draw to ctx
// and inspect S.enemies. Gameplay resolution and the geometry engine stay untouched.
const hitCallRx=/\bhits\(/g;
const visualHitIndices=[];
let hitMatch;
while((hitMatch=hitCallRx.exec(html))){
  const idx=hitMatch.index;
  if(html.slice(Math.max(0,idx-9),idx)==='function ')continue;
  const fnStart=html.lastIndexOf('\nfunction ',idx);
  const nextFn=html.indexOf('\nfunction ',idx+5);
  if(fnStart<0)continue;
  const fnEnd=nextFn<0?html.length:nextFn;
  const fnBody=html.slice(fnStart,fnEnd);
  if(fnBody.includes('ctx.') && fnBody.includes('S.enemies'))visualHitIndices.push(idx);
}
if(!visualHitIndices.length)throw new Error('Highlight pass: no renderer-local hits() calls found');
for(let i=visualHitIndices.length-1;i>=0;i--){
  const idx=visualHitIndices[i];
  html=html.slice(0,idx)+'previewHits('+html.slice(idx+'hits('.length);
}

// A basic attack may own a static multi-unit RANGE SHAPE while still resolving
// only one actual target. This is driven by canonical ability data so future
// single-target units can reuse the same behavior WITHOUT modifying global hits().
const targetRx=/(\n\s*)if\(!targets\.length\)\{\s*\n\s*S\.log=`\$\{u\.name\} committed the move but caught no target\.`;return finishAction\(\)\s*\n\s*\}/;
if(!targetRx.test(html))throw new Error('Single-target pass: player target-resolution anchor not found');
html=html.replace(targetRx,(_match,indent)=>`${indent}if(!useJutsu){
 ${indent} let basicAbility={};
 ${indent} try{basicAbility=canonicalUnit(u.name)?.abilities?.basic||{}}catch(_){}
 ${indent} if(basicAbility.target_mode==='single' && targets.length>1){
 ${indent}  targets=[...targets].sort((a,b)=>d(p,a)-d(p,b)).slice(0,1);
 ${indent} }
 ${indent}}
 ${indent}if(!targets.length){
 ${indent} S.log=\`${'${u.name}'} committed the move but caught no target.\`;return finishAction()
 ${indent}}`);

// Senku's primary attacker keeps the bomb-retreat driver. A linked/helper Senku must
// instead use the dedicated Asset Inbox melee body animation through the shared lunge
// driver. This prevents old bomb-holding body frames from appearing in melee/combo play.
const helperKindRx=/const effectiveAnimationKind=\(basicPresentation\.runtimeDriver==='animateSenkuRetreatBomb'&&!wantsRetreat\)\s*\?\s*\(basicMeta\.far_animation_kind\|\|requestedBasicKind\)\s*:\s*basicPresentation\.animationKind;/;
const helperKindReplacement=`const effectiveAnimationKind=(basicPresentation.runtimeDriver==='animateSenkuRetreatBomb'&&!wantsRetreat)
      ? (basicMeta.melee_animation_kind||'melee_attack')
      : basicPresentation.animationKind;`;
if(helperKindRx.test(html))html=html.replace(helperKindRx,helperKindReplacement);
else if(!html.includes("basicMeta.melee_animation_kind||'melee_attack'"))throw new Error('Senku helper melee pass: animation-kind anchor not found');

const helperDriverRx=/\}else if\(au\.name==='Senku'\)\{\s*runBasicAttack=wantsRetreat\s*\?\s*\(unitName,startPos,target,onHit,onFinish,kind\)=>animateSenkuRetreatBomb\(unitName,ap,startPos,target,onHit,onFinish,kind\)\s*:\s*animateSenkuBomb;\s*basicTarget=enemy;\s*\}else\{/;
const helperDriverReplacement=`}else if(au.name==='Senku'){
      runBasicAttack=wantsRetreat
        ? (unitName,startPos,target,onHit,onFinish,kind)=>animateSenkuRetreatBomb(unitName,ap,startPos,target,onHit,onFinish,kind)
        : animateLunge;
      basicTarget=wantsRetreat?enemy:to;
    }else{`;
if(helperDriverRx.test(html))html=html.replace(helperDriverRx,helperDriverReplacement);
else if(!html.includes('basicTarget=wantsRetreat?enemy:to;'))throw new Error('Senku helper melee pass: driver anchor not found');

// Preserve the approved Senku bomb visual size curve.
const bombStart=html.indexOf("else if(f.kind==='senkuBombProjectile'){");
if(bombStart<0)throw new Error('Presentation pass: Senku bomb projectile section not found');
const oldSize='const h=30,ratio=img.naturalWidth/img.naturalHeight,w=h*ratio;';
const sizeAt=html.indexOf(oldSize,bombStart);
if(sizeAt>=0 && sizeAt-bombStart<5000){
  const newSize=`const meta=canonicalUnit('senku')?.abilities?.basic?.presentation||{};
        const startH=meta.projectile_start_height_px||56;
        const endH=meta.projectile_end_height_px||44;
        const shrink=t*t*(3-2*t);
        const h=startH+(endH-startH)*shrink;
        const ratio=img.naturalWidth/img.naturalHeight,w=h*ratio;`;
  html=html.slice(0,sizeAt)+newSize+html.slice(sizeAt+oldSize.length);
}else if(!html.slice(bombStart,bombStart+5000).includes('projectile_start_height_px')){
  throw new Error('Presentation pass: Senku bomb size anchor not found or already changed unexpectedly');
}

// Keep the impact floater alive for the same canonical duration used to finish the attack.
const animateBombStart=html.indexOf('function animateSenkuBomb(');
if(animateBombStart<0)throw new Error('Presentation pass: animateSenkuBomb() not found');
const hardcodedBlast='duration:360,';
const hardcodedBlastAt=html.indexOf(hardcodedBlast,animateBombStart);
if(hardcodedBlastAt>=0 && hardcodedBlastAt-animateBombStart<5000){
  html=html.slice(0,hardcodedBlastAt)+'duration:blastDuration,'+html.slice(hardcodedBlastAt+hardcodedBlast.length);
}else if(!html.slice(animateBombStart,animateBombStart+5000).includes('duration:blastDuration,')){
  throw new Error('Presentation pass: Senku impact duration anchor not found');
}

// The production static impact remains a normal asset, but its timing/size/anchor now
// comes from canonical Senku presentation metadata instead of hardcoded renderer values.
const explosionStart=html.indexOf("else if(f.kind==='senkuExplosion'){");
if(explosionStart<0)throw new Error('Presentation pass: Senku explosion renderer not found');
const explosionEnd=html.indexOf("}else if(f.kind==='lebeeMeteor'){",explosionStart);
if(explosionEnd<0)throw new Error('Presentation pass: Senku explosion renderer end not found');
let explosionBlock=html.slice(explosionStart,explosionEnd);
if(!explosionBlock.includes("const meta=canonicalUnit('senku')?.abilities?.basic?.presentation||{};")){
  explosionBlock=explosionBlock.replace(
    'const img=SENKU_BASIC_STATIC_EXPLOSION;',
    "const img=SENKU_BASIC_STATIC_EXPLOSION;\n      const meta=canonicalUnit('senku')?.abilities?.basic?.presentation||{};"
  );
}
explosionBlock=explosionBlock.replace('const hold=.30;','const hold=meta.impact_hold_ratio??.30;');
explosionBlock=explosionBlock.replace('const pop=Math.min(1,t/.12);','const pop=Math.min(1,t/(meta.impact_pop_ratio||.12));');
explosionBlock=explosionBlock.replace('const baseH=58;','const baseH=meta.impact_height_px||58;');
explosionBlock=explosionBlock.replace('const anchorX=.50;','const anchorX=meta.impact_anchor?.x??.50;');
explosionBlock=explosionBlock.replace('const anchorY=.96;','const anchorY=meta.impact_anchor?.y??.96;');
explosionBlock=explosionBlock.replace('const yNudge=3;','const yNudge=meta.impact_anchor?.ground_offset_y_px??3;');
if(!explosionBlock.includes('impact_hold_ratio')||!explosionBlock.includes('impact_height_px'))throw new Error('Presentation pass: Senku explosion metadata patch failed');
html=html.slice(0,explosionStart)+explosionBlock+html.slice(explosionEnd);

await fs.writeFile(file,html);
console.log(`Gameplay presentation pass: authored/action-relative rotations + medium-range horizontal Freeze Blast focus/facing/origin + Senku pear hit geometry + UI-only nearest-target highlight (${visualHitIndices.length} visual hits calls) + canonical single-target resolution + Senku dedicated helper melee + Senku bomb size/impact metadata applied`);