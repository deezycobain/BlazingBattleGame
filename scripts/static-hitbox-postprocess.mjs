import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

// Attack geometry is positional strategy, not auto-aim. Rectangles/cones keep
// their authored battlefield orientation. Senku is the exception only in VISUAL
// facing because his attack field is circular, so rotating him does not rotate
// or distort the actual hit area.
const facingRx=/function updateFacing\(\)\{[\s\S]*?\n\}\n\nfunction battleSpriteFor/;
if(!facingRx.test(html))throw new Error('Static hitbox pass: updateFacing() block not found');
const facingReplacement=`function updateFacing(){
  function fixedAttackRotation(actor,fallbackDeg){
    let deg=fallbackDeg;
    try{
      if(actor?.name){
        const combat=canonicalUnit(actor.name)?.combat||{};
        if(Number.isFinite(combat.basic_rotation_deg))deg=combat.basic_rotation_deg;
      }
    }catch(_){}
    return deg*Math.PI/180;
  }

  S.pairs.forEach(pair=>{
    let active=null;
    try{active=front(pair)}catch(_){}

    // Senku's bomb owns a circular range. Only the nearest enemy already inside
    // that circle is his target, and Senku visually faces that locked target.
    if(active?.name==='Senku'){
      let shape={type:'circle',r:140};
      try{shape=canonicalUnit('senku')?.combat?.basic_shape||shape}catch(_){}
      const rawCandidates=(S.enemies||[]).filter(e=>e.hp>0 && rawHits(pair,{shape,rotation:0},{x:e.x,y:e.y,r:e.r||19}));
      const nearest=rawCandidates.sort((a,b)=>d(pair,a)-d(pair,b))[0]||null;
      if(nearest){
        const angle=Math.atan2(nearest.y-pair.y,nearest.x-pair.x);
        pair.rotation=angle;
        pair.units.forEach(unit=>{unit.rotation=angle;});
        return;
      }
    }

    pair.units.forEach(unit=>{unit.rotation=fixedAttackRotation(unit,-90);});
  });

  S.enemies.forEach(e=>{e.rotation=fixedAttackRotation(e,90);});
}

function battleSpriteFor`;
html=html.replace(facingRx,facingReplacement);

// Make canonical single-target range semantics apply everywhere that calls hits(),
// including the white target indicators. The underlying geometry remains rawHits().
// This means Senku's circle can contain several enemies, but only the nearest one
// is considered targetable/highlighted. Lebee remains multi-target.
const hitsStart=html.indexOf('function hits(');
if(hitsStart<0)throw new Error('Single-target pass: hits() function not found');
const hitsBodyStart=hitsStart+'function hits('.length;
const nextFunction=html.indexOf('\nfunction ',hitsBodyStart);
if(nextFunction<0)throw new Error('Single-target pass: could not find end of hits() function');
html=html.slice(0,hitsStart)+html.slice(hitsStart,nextFunction).replace('function hits(','function rawHits(')+html.slice(nextFunction);
const wrapper=`
function hits(a,u,b){
  const base=rawHits(a,u,b);
  if(!base)return false;
  try{
    let actor=null;
    if(a?.units)actor=front(a);
    else if(a?.name)actor=a;
    const basic=actor?.name?canonicalUnit(actor.name)?.abilities?.basic:null;
    if(basic?.target_mode==='single' && basic?.single_target_selector==='nearest_in_shape' && u?.shape?.type==='circle' && a?.units){
      const candidates=(S.enemies||[]).filter(e=>e.hp>0 && rawHits(a,u,{x:e.x,y:e.y,r:e.r||19}));
      if(!candidates.length)return false;
      const nearest=candidates.sort((x,y)=>d(a,x)-d(a,y))[0];
      return Math.abs((b?.x??Infinity)-nearest.x)<0.01 && Math.abs((b?.y??Infinity)-nearest.y)<0.01;
    }
  }catch(_){}
  return true;
}
`;
html=html.slice(0,nextFunction)+wrapper+html.slice(nextFunction);

// Keep action resolution aligned with the same canonical single-target rule.
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
 ${indent} S.log=\`\${u.name} committed the move but caught no target.\`;return finishAction()
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

await fs.writeFile(file,html);
console.log('Gameplay presentation pass: Senku nearest-target lock/facing + single highlight; Lebee multi-target lane retained');