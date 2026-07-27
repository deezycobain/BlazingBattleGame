import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

const facingRx=/function updateFacing\(\)\{.*?\n\}/s;
if(!facingRx.test(html))throw new Error('Static hitbox pass: updateFacing() not found');

const replacement=`function updateFacing(){
 // Attack fields are fixed positional geometry, not auto-aim.
 // Player shapes always project toward the enemy side of the battlefield;
 // enemy shapes always project toward the player side.
 const PLAYER_ATTACK_ROTATION=-Math.PI/2;
 const ENEMY_ATTACK_ROTATION=Math.PI/2;
 S.pairs.forEach(pair=>{
   pair.units.forEach(u=>{u.rotation=PLAYER_ATTACK_ROTATION;});
 });
 S.enemies.forEach(e=>{e.rotation=ENEMY_ATTACK_ROTATION;});
}`;

html=html.replace(facingRx,replacement);
await fs.writeFile(file,html);
console.log('Static hitbox pass: removed nearest-target rotation/snapping');
