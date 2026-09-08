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

// Terrain collisions should guide a drag along a barrier instead of freezing the fighter.
const slideMap={movement:{allowed:[],blocked:[{type:'rect',x:100,y:80,w:40,h:80}]}};
const againstWall=C.constrainMovementPoint(slideMap,{x:160,y:150},{x:80,y:100},{padding:0,step:6});
if(!(againstWall.x<100&&againstWall.y>135))throw new Error(`Road drag did not slide along barrier edge: ${JSON.stringify(againstWall)}`);
const aroundCorner=C.constrainMovementPoint(slideMap,{x:160,y:190},againstWall,{padding:0,step:6});
if(!(aroundCorner.x>140&&aroundCorner.y>165))throw new Error(`Road drag could not steer around barrier corner: ${JSON.stringify({againstWall,aroundCorner})}`);

// Player positions use a feet anchor, not a full-body collision disk. These points are
// inside the authored Stage 1/2 lanes but the old 18px player halo rejected them as
// invisible walls. A small 6px tolerance keeps actual terrain collision without shrinking
// narrow walkable corridors away from the player.
const laneEdgeCases=[
 {name:'South Sac lower-left lane',map:C.mapForStage(1),point:{x:180,y:300}},
 {name:'Moon Statue upper-left lane',map:C.mapForStage(2),point:{x:180,y:240}}
];
for(const test of laneEdgeCases){
 if(!C.isWalkablePoint(test.map,test.point,{padding:6}))throw new Error(`${test.name} should remain walkable with foot-anchor clearance`);
 if(C.isWalkablePoint(test.map,test.point,{padding:18}))throw new Error(`${test.name} no longer demonstrates the old ghost-padding regression`);
}
const terrainIntegration=await fs.readFile('scripts/road-terrain-postprocess.mjs','utf8');
if(!terrainIntegration.includes('S.bbRoadContent?.map,legal,terrainFrom,{padding:6}'))throw new Error('Road player movement must use 6px foot-anchor terrain clearance');
if(!terrainIntegration.includes('S.bbRoadContent?.map,desiredEvade,{x:e.x,y:e.y},{padding:18}'))throw new Error('Road enemy evasion should retain conservative 18px obstacle clearance');

console.log('Blazing Road content PASS: 10 stages, 5-map rotation, normalized enemy stats, elite checkpoints, evade tuning, tight foot-anchor player clearance, edge-sliding terrain movement, and final-stage clamp verified.');
