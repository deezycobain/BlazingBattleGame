import fs from 'node:fs/promises';
import vm from 'node:vm';

const STAT_NAMES=['hp','attack','defense','speed'];
const MIN=1,MAX=100;
const unitIndex=JSON.parse(await fs.readFile('runtime/registry/unit-index.json','utf8'));
const roster={};
for(const entry of unitIndex.units||[]){
 const unit=JSON.parse(await fs.readFile(entry.path,'utf8'));
 roster[entry.id]=unit.stats;
 for(const stat of STAT_NAMES){
  const value=Number(unit.stats?.[stat]);
  if(!Number.isInteger(value)||value<MIN||value>MAX)throw new Error(`${entry.id}.${stat} must be an integer from ${MIN}-${MAX}, got ${value}`);
 }
}
const required={
 senku:{hp:82,attack:31,defense:36,speed:70},
 crimson:{hp:72,attack:42,defense:26,speed:76},
 subzero:{hp:78,attack:34,defense:42,speed:62},
 lebee:{hp:68,attack:38,defense:24,speed:66},
 tyler:{hp:88,attack:36,defense:48,speed:64},
 anubis:{hp:100,attack:40,defense:70,speed:46}
};
for(const [id,expected] of Object.entries(required))for(const stat of STAT_NAMES){
 if(Number(roster[id]?.[stat])!==expected[stat])throw new Error(`${id}.${stat} balance drifted: expected ${expected[stat]}, got ${roster[id]?.[stat]}`);
}

const roadSource=await fs.readFile('runtime/modes/blazing-road-content.js','utf8');
const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(roadSource,sandbox);
const road=sandbox.window.BlazingRoadContent;
if(road?.STAT_MAX!==MAX)throw new Error(`Road stat ceiling must be ${MAX}`);
for(let stage=1;stage<=road.MAX_STAGE;stage++)for(const enemy of road.stageConfig(stage).enemies)for(const stat of STAT_NAMES){
 const value=Number(enemy.stats?.[stat]);
 if(!Number.isInteger(value)||value<MIN||value>MAX)throw new Error(`Road Stage ${stage} ${enemy.id}.${stat} escaped ${MIN}-${MAX}: ${value}`);
}

console.log('Stat scale PASS: HP, Attack, Defense, and Speed use the canonical 1-100 scale across all six units and all ten Road stages.');
