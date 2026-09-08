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

// Every Road map starts from one broad battlefield floor. Map-specific scenery may remove
// portions of it, but it must not collapse the fight into a narrow corridor again.
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
 if(!Array.isArray(map.movement?.allowed)||map.movement.allowed.length!==1)throw new Error(`${map.key} must publish one broad playable-floor boundary`);
 const p=map.presentation||{};
 if(Number(p.introScale)!==1)throw new Error(`${map.key} must begin/outro at full-map scale 1`);
 if(!(Number(p.combatScale)>1&&Number(p.combatScale)<=1.16))throw new Error(`${map.key} combat zoom must stay modest: ${p.combatScale}`);
 if(!p.position||Number(p.transitionMs)<300||Number(p.transitionMs)>900)throw new Error(`${map.key} camera presentation is incomplete`);
 const coverage=walkableCoverage(map);
 if(coverage<0.60)throw new Error(`${map.key} only leaves ${(coverage*100).toFixed(1)}% of the authored battlefield floor walkable`);
}

// Stage 1/2 used to double-restrict the floor with skinny allowed funnels plus broad side
// blockers. These representative left/right positions must now be fluidly reachable.
for(const [stage,points] of [
 [1,[{x:90,y:300},{x:240,y:300},{x:390,y:300}]],
 [2,[{x:92,y:300},{x:240,y:300},{x:388,y:300}]]
]){
 const map=C.mapForStage(stage);
 for(const point of points)if(!C.isWalkablePoint(map,point,{padding:C.PLAYER_FOOT_PADDING}))throw new Error(`Stage ${stage} broad floor unexpectedly blocks ${JSON.stringify(point)}`);
}

// Terrain collisions should guide a drag along a barrier instead of freezing the fighter.
const slideMap={movement:{allowed:[],blocked:[{type:'rect',x:100,y:80,w:40,h:80}]}};
const againstWall=C.constrainMovementPoint(slideMap,{x:160,y:150},{x:80,y:100},{padding:0,step:6});
if(!(againstWall.x<100&&againstWall.y>135))throw new Error(`Road drag did not slide along barrier edge: ${JSON.stringify(againstWall)}`);
const aroundCorner=C.constrainMovementPoint(slideMap,{x:160,y:190},againstWall,{padding:0,step:6});
if(!(aroundCorner.x>140&&aroundCorner.y>165))throw new Error(`Road drag could not steer around barrier corner: ${JSON.stringify({againstWall,aroundCorner})}`);

const terrainIntegration=await fs.readFile('scripts/road-terrain-postprocess.mjs','utf8');
if(!terrainIntegration.includes('PLAYER_FOOT_PADDING||4'))throw new Error('Road player movement must consume the roster-independent feet-anchor constant');
if(!terrainIntegration.includes('ENEMY_TERRAIN_PADDING||18'))throw new Error('Road enemy movement must consume its independent terrain-clearance constant');
if(/pickPlayerHit|pickEnemyHit|BODY_HITBOX/.test(terrainIntegration))throw new Error('Road terrain integration must not depend on combat targeting/body hitboxes');
const cameraRuntime=await fs.readFile('runtime/modes/blazing-road-camera.js','utf8');
if(!cameraRuntime.includes("mode='intro'")||!cameraRuntime.includes("mode='combat'")||!cameraRuntime.includes("mode='outro'"))throw new Error('Road camera must support intro, combat, and outro framing states');
if(!cameraRuntime.includes("'scale' in canvas.style"))throw new Error('Road camera must use browser-native visual scaling without mutating world coordinates');
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
if(!pkg.scripts?.build?.includes('road-camera-postprocess.mjs'))throw new Error('Road camera postprocess is not wired into the build');

console.log('Blazing Road content PASS: broad five-map playable floors, universal feet-anchor movement, authored blockers, edge sliding, intro/combat/outro camera framing, normalized enemies, and final-stage clamp verified.');
