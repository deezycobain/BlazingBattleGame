import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

// Attack geometry is positional strategy, not auto-aim. Mechanical shape rotation is
// deliberately separate from character-body facing, which Pass 4.1 resolves against
// the visual/resolved attack target in the source shell.
// IMPORTANT: battle pairs also contain empty reserve placeholders and some stages
// contain non-canonical enemies. Never let a presentation lookup throw during render.
const facingRx=/function updateFacing\(\)\{[\s\S]*?\n\}\n\nfunction battleSpriteFor/;
if(!facingRx.test(html))throw new Error('Static hitbox pass: updateFacing() block not found');
const facingReplacement=`function updateFacing(){
  // Moving a unit changes only the authored attack-shape origin.
  // Proximity never rotates or snaps the mechanical attack field toward a target.
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
console.log(`Gameplay presentation pass: authored action-specific hitbox rotations + decoupled body facing + UI-only nearest-target highlight (${visualHitIndices.length} visual hits calls) + canonical single-target resolution + Senku bomb size/impact metadata applied`);
