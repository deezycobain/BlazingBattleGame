import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

// 1) Attack geometry is positional strategy, not auto-aim.
const facingRx=/function updateFacing\(\)\{[\s\S]*?\n\}\n\nfunction battleSpriteFor/;
if(!facingRx.test(html))throw new Error('Static hitbox pass: updateFacing() block not found');
const facingReplacement=`function updateFacing(){
 // Attack fields are fixed positional geometry, not auto-aim.
 // Moving a unit changes only the shape origin; proximity never changes angle.
 const PLAYER_ATTACK_ROTATION=-Math.PI/2;
 const ENEMY_ATTACK_ROTATION=Math.PI/2;
 S.pairs.forEach(pair=>{
   pair.units.forEach(u=>{u.rotation=PLAYER_ATTACK_ROTATION;});
 });
 S.enemies.forEach(e=>{e.rotation=ENEMY_ATTACK_ROTATION;});
}

function battleSpriteFor`;
html=html.replace(facingRx,facingReplacement);

// 2) Preserve the approved Senku basic-bomb size curve in the same robust pass.
const bombRx=/else if\(f\.kind==='senkuBombProjectile'\)\{[\s\S]*?\n    \}else if\(f\.kind==='senkuExplosion'\)\{/;
if(!bombRx.test(html))throw new Error('Presentation pass: Senku bomb renderer block not found');
const bombReplacement=`else if(f.kind==='senkuBombProjectile'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1);
      const e=t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
      const arc=f.arcHeight||86;
      const x=f.from.x+(f.to.x-f.from.x)*e;
      const baseY=f.from.y+(f.to.y-f.from.y)*e;
      const y=baseY-4*arc*t*(1-t);
      const dx=f.to.x-f.from.x;
      const dy=(f.to.y-f.from.y)-4*arc*(1-2*t);
      const angle=Math.atan2(dy,dx);
      const idx=Math.min(SENKU_BOMB_FRAMES.length-1,Math.floor(t*SENKU_BOMB_FRAMES.length));
      const img=SENKU_BOMB_FRAMES[idx];
      if(img?.complete&&img.naturalWidth>0){
        const meta=canonicalUnit('senku')?.abilities?.basic?.presentation||{};
        const startH=meta.projectile_start_height_px||56;
        const endH=meta.projectile_end_height_px||44;
        const shrink=t*t*(3-2*t);
        const h=startH+(endH-startH)*shrink;
        const ratio=img.naturalWidth/img.naturalHeight,w=h*ratio;
        ctx.translate(x,y);
        ctx.rotate(angle);
        ctx.shadowColor='#ff9a32';
        ctx.shadowBlur=8;
        ctx.drawImage(img,-w/2,-h/2,w,h);
      }
    }else if(f.kind==='senkuExplosion'){`;
html=html.replace(bombRx,bombReplacement);

await fs.writeFile(file,html);
console.log('Gameplay presentation pass: static attack hitboxes + approved Senku bomb scale applied');
