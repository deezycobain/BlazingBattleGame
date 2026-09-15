import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

function replaceUnique(source,replacement,label){
  const count=html.split(source).length-1;
  if(count===1)html=html.replace(source,replacement);
  else if(count===0&&html.includes(replacement))return;
  else throw new Error(`Road terrain integration: expected one ${label}, found ${count}`);
}

const playerSource=` const grab=S.dragGrabOffset||{x:0,y:0};
 let legal=clampToBattlefield({x:pt.x+grab.x,y:pt.y+grab.y});`;
const playerReplacement=` const grab=S.dragGrabOffset||{x:0,y:0};
 let legal=S.bbRunMode==='road'
  ? {x:clamp(pt.x+grab.x,0,W),y:clamp(pt.y+grab.y,0,H)}
  : clampToBattlefield({x:pt.x+grab.x,y:pt.y+grab.y});
 if(S.bbRunMode==='road'&&window.BlazingRoadContent?.constrainMovementPoint){
  const terrainFrom=S.bbTerrainDragOrigin===S.dragOrigin&&S.bbTerrainLastLegal
   ? S.bbTerrainLastLegal
   : {x:p.x,y:p.y};
  // Road map geometry owns the actual playable floor. The legacy generic battlefield
  // clamp is intentionally bypassed here so deep foreground maps can use their full art.
  const footPadding=window.BlazingRoadContent.PLAYER_FOOT_PADDING||4;
  legal=window.BlazingRoadContent.constrainMovementPoint(S.bbRoadContent?.map,legal,terrainFrom,{padding:footPadding});
  S.bbTerrainDragOrigin=S.dragOrigin;
  S.bbTerrainLastLegal={x:legal.x,y:legal.y};
 }`;
replaceUnique(playerSource,playerReplacement,'player Road movement anchor');

const evadeSource=`   const desiredEvade=clampToBattlefield({
    x:e.x+(ux-uy*side)*roadAi.evadeDistance,
    y:e.y+(uy+ux*side)*roadAi.evadeDistance
   });`;
const evadeReplacement=`   let desiredEvade={
    x:clamp(e.x+(ux-uy*side)*roadAi.evadeDistance,0,W),
    y:clamp(e.y+(uy+ux*side)*roadAi.evadeDistance,0,H)
   };
   if(window.BlazingRoadContent?.constrainMovementPoint){
    const enemyPadding=Math.max(28,window.BlazingRoadContent.ENEMY_TERRAIN_PADDING||18);
    desiredEvade=window.BlazingRoadContent.constrainMovementPoint(S.bbRoadContent?.map,desiredEvade,{x:e.x,y:e.y},{padding:enemyPadding});
   }`;
replaceUnique(evadeSource,evadeReplacement,'enemy Road evade movement anchor');

for(const marker of [
  "window.BlazingRoadContent?.constrainMovementPoint",
  "S.bbTerrainDragOrigin===S.dragOrigin",
  "S.bbTerrainLastLegal={x:legal.x,y:legal.y}",
  "S.bbRunMode==='road'",
  "const footPadding=window.BlazingRoadContent.PLAYER_FOOT_PADDING||4",
  "Math.max(28,window.BlazingRoadContent.ENEMY_TERRAIN_PADDING||18)"
]){
  if(!html.includes(marker))throw new Error(`Road terrain integration: built shell missing ${marker}`);
}

await fs.writeFile(file,html);
console.log('Road terrain integration PASS: Road map geometry owns full-depth player movement and enemies retain a wider terrain-safe clearance.');
