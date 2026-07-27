import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

// Attack geometry is positional strategy, not auto-aim.
// IMPORTANT: battle pairs also contain empty reserve placeholders and some stages
// contain non-canonical enemies. Never let a presentation lookup throw during render.
const facingRx=/function updateFacing\(\)\{[\s\S]*?\n\}\n\nfunction battleSpriteFor/;
if(!facingRx.test(html))throw new Error('Static hitbox pass: updateFacing() block not found');
const facingReplacement=`function updateFacing(){
  // Moving a unit changes only the authored attack-shape origin.
  // Proximity never rotates or snaps the attack field toward a target.
  function fixedAttackRotation(actor,fallbackDeg){
    let deg=fallbackDeg;
    try{
      if(actor?.name){
        const combat=canonicalUnit(actor.name)?.combat||{};
        if(Number.isFinite(combat.basic_rotation_deg))deg=combat.basic_rotation_deg;
      }
    }catch(_){
      // Empty reserve slots and stage-only enemies intentionally use the fallback.
    }
    return deg*Math.PI/180;
  }
  S.pairs.forEach(pair=>{
    pair.units.forEach(u=>{u.rotation=fixedAttackRotation(u,-90);});
  });
  S.enemies.forEach(e=>{e.rotation=fixedAttackRotation(e,90);});
}

function battleSpriteFor`;
html=html.replace(facingRx,facingReplacement);

// Senku's basic is a circular POSITIONING FIELD but a SINGLE-TARGET projectile.
// If more than one enemy stands inside the circle, pick the closest enemy inside
// that already-valid field. The field itself never rotates/snaps to that target.
const targetAnchor=" if(!targets.length){\n   S.log=`${u.name} committed the move but caught no target.`;return finishAction()\n  }";
if(!html.includes(targetAnchor))throw new Error('Single-target pass: player target-resolution anchor not found');
const targetReplacement=` if(!useJutsu){
   let basicAbility={};
   try{basicAbility=canonicalUnit(u.name)?.abilities?.basic||{}}catch(_){}
   if(basicAbility.target_mode==='single' && targets.length>1){
    targets=[...targets].sort((a,b)=>d(p,a)-d(p,b)).slice(0,1);
   }
  }

  if(!targets.length){
   S.log=\`${'${u.name}'} committed the move but caught no target.\`;return finishAction()
  }`;
html=html.replace(targetAnchor,targetReplacement);

// Preserve the currently-approved Senku bomb size without depending on the
// entire legacy renderer block. Only replace the height calculation inside the
// bomb projectile section, and leave the arc/timing/render routing untouched.
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

// Projectile cleanup must happen even if the action token is retired while a
// bomb is in flight. Previously the token guard ran first, leaving a late/second
// bomb floater permanently on screen after a multi-target sequence.
const bombFnStart=html.indexOf('function animateSenkuBomb(');
const bombFnEnd=html.indexOf('function setMeteorFullscreenFlash',bombFnStart);
if(bombFnStart<0||bombFnEnd<0)throw new Error('Senku bomb cleanup pass: function bounds not found');
let bombFn=html.slice(bombFnStart,bombFnEnd);
const unsafeCleanup=`setTimeout(()=>{
      if(!actionTokenAlive(token))return;

      S.floaters=S.floaters.filter(x=>x!==projectile);
      const targetGroundY=`;
const safeCleanup=`setTimeout(()=>{
      // Always remove the projectile first; action cancellation must never strand VFX.
      S.floaters=S.floaters.filter(x=>x!==projectile);
      if(!actionTokenAlive(token))return;

      const targetGroundY=`;
if(!bombFn.includes(unsafeCleanup) && !bombFn.includes('action cancellation must never strand VFX')){
  throw new Error('Senku bomb cleanup pass: projectile cleanup anchor not found');
}
if(bombFn.includes(unsafeCleanup)){
  bombFn=bombFn.replace(unsafeCleanup,safeCleanup);
  html=html.slice(0,bombFnStart)+bombFn+html.slice(bombFnEnd);
}

await fs.writeFile(file,html);
console.log('Gameplay presentation pass: static hitboxes + Senku single-target bomb + safe projectile cleanup applied');
