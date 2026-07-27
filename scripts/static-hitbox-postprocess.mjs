import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

// Attack geometry is positional strategy, not auto-aim.
const facingRx=/function updateFacing\(\)\{[\s\S]*?\n\}\n\nfunction battleSpriteFor/;
if(!facingRx.test(html))throw new Error('Static hitbox pass: updateFacing() block not found');
const facingReplacement=`function updateFacing(){
 // Moving a unit changes only the authored attack-shape origin.
 // Proximity never rotates or snaps the attack field toward a target.
 S.pairs.forEach(pair=>{
   pair.units.forEach(u=>{
     const combat=canonicalUnit(u.name)?.combat||{};
     const deg=Number.isFinite(combat.basic_rotation_deg)?combat.basic_rotation_deg:-90;
     u.rotation=deg*Math.PI/180;
   });
 });
 S.enemies.forEach(e=>{
   const combat=canonicalUnit(e.name)?.combat||{};
   const deg=Number.isFinite(combat.basic_rotation_deg)?combat.basic_rotation_deg:90;
   e.rotation=deg*Math.PI/180;
 });
}

function battleSpriteFor`;
html=html.replace(facingRx,facingReplacement);

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

await fs.writeFile(file,html);
console.log('Gameplay presentation pass: static per-unit attack orientations + Senku bomb size curve applied');