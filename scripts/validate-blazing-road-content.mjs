import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile('runtime/modes/blazing-road-content.js','utf8');
const sandbox={window:{}};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'blazing-road-content.js'});
const C=sandbox.window.BlazingRoadContent;
if(!C)throw new Error('Blazing Road content runtime did not register');
if(C.MAX_STAGE!==10)throw new Error(`Expected 10 Road stages, got ${C.MAX_STAGE}`);
if(!Array.isArray(C.MAPS)||C.MAPS.length!==5)throw new Error(`Expected 5 Road maps, got ${C.MAPS?.length}`);

const stages=Array.from({length:10},(_,i)=>C.stageConfig(i+1));
for(const [i,cfg] of stages.entries()){
 const stage=i+1;
 if(cfg.stage!==stage)throw new Error(`Stage ${stage} normalized incorrectly`);
 if(!cfg.name||!cfg.map?.src)throw new Error(`Stage ${stage} missing name/map`);
 if(!Array.isArray(cfg.enemies)||cfg.enemies.length<3)throw new Error(`Stage ${stage} needs at least 3 enemies`);
 if(cfg.scale.hpMultiplier<1||cfg.scale.attackMultiplier<1||cfg.scale.speedMultiplier<1)throw new Error(`Stage ${stage} scale regressed below canonical stats`);
 if(cfg.ai.evadeBase<0||cfg.ai.evadeBase>.4||cfg.ai.evadeLowHp<0||cfg.ai.evadeLowHp>.8)throw new Error(`Stage ${stage} evade tuning out of bounds`);
 if(stage>1){
  const prior=stages[i-1];
  if(cfg.scale.hpMultiplier<prior.scale.hpMultiplier)throw new Error(`HP scaling fell at Stage ${stage}`);
  if(cfg.scale.attackMultiplier<prior.scale.attackMultiplier)throw new Error(`ATK scaling fell at Stage ${stage}`);
 }
}
if(!stages[4].elite||!stages[9].elite)throw new Error('Stages 5 and 10 must be elite encounters');
if(stages.filter(s=>s.elite).length!==2)throw new Error('Only Stages 5 and 10 should be elite in Road v1');
for(let i=0;i<5;i++){
 if(stages[i].map.key!==stages[i+5].map.key)throw new Error(`Second route should reuse map slot ${i+1}`);
}
if(!C.isFinalStage(10)||!C.isFinalStage(99)||C.isFinalStage(9))throw new Error('Final-stage detection is incorrect');
if(C.stageConfig(11).stage!==10)throw new Error('Road content must clamp beyond Stage 10');

console.log('Blazing Road content PASS: 10 stages, 5-map rotation, elite checkpoints, monotonic enemy scaling, evade tuning, and final-stage clamp verified.');
