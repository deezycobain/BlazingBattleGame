import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile('runtime/modes/blazing-road-content.js','utf8');
const sandbox={window:{}};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'blazing-road-content.js'});
const C=sandbox.window.BlazingRoadContent;
if(!C)throw new Error('Blazing Road content runtime did not register');
if(C.MAX_STAGE!==10)throw new Error(`Expected 10 Road stages, got ${C.MAX_STAGE}`);
if(C.STAT_MAX!==100)throw new Error(`Expected Road stat ceiling 100, got ${C.STAT_MAX}`);
if(C.PLAYER_FOOT_PADDING!==4)throw new Error(`Playable Road fighters must share the 4px feet-anchor footprint, got ${C.PLAYER_FOOT_PADDING}`);
if(C.ENEMY_TERRAIN_PADDING!==18)throw new Error(`Road enemy terrain clearance changed unexpectedly: ${C.ENEMY_TERRAIN_PADDING}`);
if(!C.PLAYABLE_FLOOR||C.PLAYABLE_FLOOR.w<400||C.PLAYABLE_FLOOR.h<440)throw new Error(`Road playable floor is too small: ${JSON.stringify(C.PLAYABLE_FLOOR)}`);
if(!Array.isArray(C.MAPS)||C.MAPS.length!==5)throw new Error(`Expected 5 Road maps, got ${C.MAPS?.length}`);
for(const [id,stats] of Object.entries(C.BASE_ENEMY_STATS||{})){
 for(const stat of ['hp','attack','defense','speed']){
  const value=Number(stats?.[stat]);
  if(!Number.isInteger(value)||value<1||value>C.STAT_MAX)throw new Error(`${id}.${stat} must be an integer from 1-${C.STAT_MAX}, got ${value}`);
 }
}

const stages=Array.from({length:10},(_,i)=>C.stageConfig(i+1));
for(const [i,cfg] of stages.entries()){
 const stage=i+1;
 if(cfg.stage!==stage)throw new Error(`Stage ${stage} normalized incorrectly`);
 if(cfg.statMax!==100)throw new Error(`Stage ${stage} did not publish the 100-point stat ceiling`);
 if(!cfg.name||!cfg.map?.src)throw new Error(`Stage ${stage} missing name/map`);
 if(!Array.isArray(cfg.enemies)||cfg.enemies.length<3)throw new Error(`Stage ${stage} needs at least 3 enemies`);
 for(const enemy of cfg.enemies){
  for(const stat of ['hp','attack','defense','speed']){
   const value=Number(enemy.stats?.[stat]);
   if(!Number.isInteger(value)||value<1||value>100)throw new Error(`Stage ${stage} ${enemy.id}.${stat} escaped the 1-100 scale: ${value}`);
  }
 }
 if(cfg.ai.evadeBase<0||cfg.ai.evadeBase>.4||cfg.ai.evadeLowHp<0||cfg.ai.evadeLowHp>.8)throw new Error(`Stage ${stage} evade tuning out of bounds`);
}

const first=stages[0],final=stages[9];
for(const id of Object.keys(C.BASE_ENEMY_STATS)){
 const a=first.enemies.find(enemy=>enemy.id===id)?.stats;
 const b=final.enemies.find(enemy=>enemy.id===id)?.stats;
 if(!a||!b)throw new Error(`Stage 1 and Stage 10 must both expose ${id} for curve validation`);
 for(const stat of ['hp','attack','defense','speed'])if(b[stat]<=a[stat])throw new Error(`${id}.${stat} must rise from Stage 1 to Stage 10`);
}
if(!stages[4].elite||!stages[9].elite)throw new Error('Stages 5 and 10 must be elite encounters');
if(stages.filter(s=>s.elite).length!==2)throw new Error('Only Stages 5 and 10 should be elite in Road v1');
for(let i=0;i<5;i++){
 if(stages[i].map.key!==stages[i+5].map.key)throw new Error(`Second route should reuse map slot ${i+1}`);
}
if(!C.isFinalStage(10)||!C.isFinalStage(99)||C.isFinalStage(9))throw new Error('Final-stage detection is incorrect');
if(C.stageConfig(11).stage!==10)throw new Error('Road content must clamp beyond Stage 10');

// Every Road map publishes one primary playable boundary. Stage 1/2 trace the visible
// perspective floor directly; later maps retain the broad floor plus authored prop blockers.
function walkableCoverage(map){
 const floor=C.PLAYABLE_FLOOR;
 let total=0,walkable=0;
 for(let y=floor.y+8;y<=floor.y+floor.h-8;y+=12){
  for(let x=floor.x+8;x<=floor.x+floor.w-8;x+=12){
   total++;
   if(C.isWalkablePoint(map,{x,y},{padding:C.PLAYER_FOOT_PADDING}))walkable++;
  }
 }
 return total?walkable/total:0;
}
for(const map of C.MAPS){
 if(!Array.isArray(map.movement?.allowed)||map.movement.allowed.length!==1)throw new Error(`${map.key} must publish one primary playable boundary`);
 const p=map.presentation||{};
 if(Number(p.introScale)!==1)throw new Error(`${map.key} must begin/outro at full-map scale 1`);
 if(!(Number(p.combatScale)>1&&Number(p.combatScale)<=1.18))throw new Error(`${map.key} combat zoom must stay modest: ${p.combatScale}`);
 if(!p.position||Number(p.transitionMs)<300||Number(p.transitionMs)>900)throw new Error(`${map.key} camera presentation is incomplete`);
 const coverage=walkableCoverage(map);
 if(coverage<0.60)throw new Error(`${map.key} only leaves ${(coverage*100).toFixed(1)}% of the authored battlefield floor walkable`);
}
for(const stage of [1,2]){
 const shape=C.mapForStage(stage).movement.allowed[0];
 if(shape?.type!=='polygon'||!Array.isArray(shape.points)||shape.points.length<10)throw new Error(`Stage ${stage} must trace its visible floor with an explicit playable polygon`);
}

// Stage 1/2 used to double-restrict the floor with broad side blockers. Preserve the
// central lanes and expose the visibly open foreground near both lower corners.
for(const [stage,points] of [
 [1,[{x:90,y:300},{x:240,y:300},{x:390,y:300},{x:40,y:530},{x:440,y:530}]],
 [2,[{x:92,y:300},{x:240,y:300},{x:388,y:300},{x:40,y:530},{x:440,y:530}]]
]){
 const map=C.mapForStage(stage);
 for(const point of points)if(!C.isWalkablePoint(map,point,{padding:C.PLAYER_FOOT_PADDING}))throw new Error(`Stage ${stage} playable floor unexpectedly blocks ${JSON.stringify(point)}`);
}

// Terrain collisions should project the remaining drag along the real edge, not fall back
// to cardinal X/Y guesses. A drag can also round a rectangle corner in one continuous input.
const slideMap={movement:{allowed:[],blocked:[{type:'rect',x:100,y:80,w:40,h:80}]}};
const againstWall=C.constrainMovementPoint(slideMap,{x:160,y:150},{x:80,y:100},{padding:0,step:6});
if(!(againstWall.x<100.1&&againstWall.y>145))throw new Error(`Road drag did not slide along barrier edge: ${JSON.stringify(againstWall)}`);
const aroundCorner=C.constrainMovementPoint(slideMap,{x:160,y:190},againstWall,{padding:0,step:6});
if(!(aroundCorner.x>150&&aroundCorner.y>180))throw new Error(`Road drag could not round barrier corner: ${JSON.stringify({againstWall,aroundCorner})}`);

// Reproduce the old diagonal-wall failure: both cardinal probes can be blocked while a
// legal tangent path exists. Consecutive simulated pointer samples must keep moving.
const slopedMap={movement:{
 allowed:[{type:'rect',x:0,y:0,w:300,h:300}],
 blocked:[{type:'polygon',points:[{x:120,y:40},{x:160,y:40},{x:220,y:220},{x:180,y:220}]}]
}};
let slopedPosition={x:80,y:80},slopedStalls=0,maxSlopedStalls=0;
for(let i=0;i<20;i++){
 const raw={x:180+i*2,y:90+i*7};
 const next=C.constrainMovementPoint(slopedMap,raw,slopedPosition,{padding:0,step:6});
 if(!Number.isFinite(next?.x)||!Number.isFinite(next?.y)||!C.isWalkablePoint(slopedMap,next,{padding:0}))throw new Error(`Sloped-edge drag escaped terrain at sample ${i}: ${JSON.stringify(next)}`);
 const moved=Math.hypot(next.x-slopedPosition.x,next.y-slopedPosition.y)>.1;
 slopedStalls=moved?0:slopedStalls+1;
 maxSlopedStalls=Math.max(maxSlopedStalls,slopedStalls);
 slopedPosition=next;
}
if(maxSlopedStalls>1)throw new Error(`Sloped-edge drag froze for ${maxSlopedStalls} consecutive samples`);

// Scrape both real Stage 1/2 side boundaries from foreground toward the vanishing point.
// The constrained fighter must stay legal, keep progressing, and remain close to the finger.
for(const stage of [1,2]){
 const map=C.mapForStage(stage);
 for(const side of ['left','right']){
  let position={x:side==='left'?100:380,y:520};
  let previousY=position.y,stalls=0;
  for(let rawY=500;rawY>=180;rawY-=20){
   const raw={x:side==='left'?10:470,y:rawY};
   const next=C.constrainMovementPoint(map,raw,position,{padding:C.PLAYER_FOOT_PADDING,step:6});
   if(!Number.isFinite(next?.x)||!Number.isFinite(next?.y)||!C.isWalkablePoint(map,next,{padding:C.PLAYER_FOOT_PADDING}))throw new Error(`Stage ${stage} ${side} boundary scrape produced illegal position: ${JSON.stringify(next)}`);
   if(next.y>previousY+2)throw new Error(`Stage ${stage} ${side} boundary scrape regressed: ${JSON.stringify({previousY,next,raw})}`);
   const moved=Math.hypot(next.x-position.x,next.y-position.y)>.5;
   stalls=moved?0:stalls+1;
   if(stalls>1)throw new Error(`Stage ${stage} ${side} boundary scrape stuck for ${stalls} samples`);
   if(Math.abs(next.y-rawY)>32)throw new Error(`Stage ${stage} ${side} boundary scrape lagged too far behind pointer: ${JSON.stringify({raw,next})}`);
   position=next;
   previousY=next.y;
  }
 }
}

const movementSource=String(C.constrainMovementPoint);
if(/stepX|stepY|slides=\[/.test(movementSource))throw new Error('Legacy cardinal-axis terrain slide logic survived');

const terrainIntegration=await fs.readFile('scripts/road-terrain-postprocess.mjs','utf8');
if(!terrainIntegration.includes('PLAYER_FOOT_PADDING||4'))throw new Error('Road player movement must consume the roster-independent feet-anchor constant');
if(!terrainIntegration.includes('ENEMY_TERRAIN_PADDING||18'))throw new Error('Road enemy movement must consume its independent terrain-clearance constant');
if(/pickPlayerHit|pickEnemyHit|BODY_HITBOX/.test(terrainIntegration))throw new Error('Road terrain integration must not depend on combat targeting/body hitboxes');
const cameraRuntime=await fs.readFile('runtime/modes/blazing-road-camera.js','utf8');
if(!cameraRuntime.includes("mode='intro'")||!cameraRuntime.includes("mode='combat'")||!cameraRuntime.includes("mode='outro'"))throw new Error('Road camera must support intro, combat, and outro framing states');
if(!cameraRuntime.includes("'scale' in canvas.style"))throw new Error('Road camera must use browser-native visual scaling without mutating world coordinates');
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
if(!pkg.scripts?.build?.includes('road-camera-postprocess.mjs'))throw new Error('Road camera postprocess is not wired into the build');

console.log('Blazing Road content PASS: art-traced Stage 1/2 floors, tangent-projected edge sliding, continuous boundary scrapes, universal feet-anchor movement, camera framing, normalized enemies, and final-stage clamp verified.');
