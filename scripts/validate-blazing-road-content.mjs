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

console.log('Blazing Road content PASS: 10 stages, 5-map rotation, normalized 1-100 enemy stats, elite checkpoints, evade tuning, and final-stage clamp verified.');
