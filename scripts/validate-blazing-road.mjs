import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile('runtime/modes/blazing-road-run.js','utf8');
const memory=new Map();
const localStorage={
  getItem:key=>memory.has(key)?memory.get(key):null,
  setItem:(key,value)=>memory.set(key,String(value)),
  removeItem:key=>memory.delete(key)
};
const context={window:{localStorage},console,Date,Math};
vm.createContext(context);
vm.runInContext(source,context,{filename:'blazing-road-run.js'});
const Road=context.window.BlazingRoadRun;
if(!Road)throw new Error('Blazing Road runtime did not register');

const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const fighters=[
  {unit_id:'senku',hp:1000,max_hp:1000},
  {unit_id:'lebee',hp:850,max_hp:850},
  {unit_id:'subzero',hp:900,max_hp:900}
];

let run=Road.createRun(fighters,{stage:1,runId:'road-test',startedAt:'2026-09-06T00:00:00.000Z'});
assert(run.stage===1&&run.status==='active','Road run should start active on stage 1');
assert(run.fighters.length===3,'Road run should retain the active team');

run=Road.recordBattleResult(run,[
  {unit_id:'senku',hp:410,max_hp:1000},
  {unit_id:'lebee',hp:0,max_hp:850},
  {unit_id:'subzero',hp:725,max_hp:900}
]);
assert(run.fighters.find(f=>f.unit_id==='senku')?.hp===410,'Senku HP did not persist');
assert(run.fighters.find(f=>f.unit_id==='lebee')?.defeated===true,'Defeated fighter state did not persist');
assert(Road.livingFighters(run).length===2,'Living fighter count is wrong after battle');
assert(Road.defeatedFighters(run).length===1,'Defeated fighter count is wrong after battle');

run=Road.advanceStage(run);
assert(run.stage===2,'Road stage did not advance');
const nextBattle=[
  {unit_id:'senku',hp:1000,max_hp:1000},
  {unit_id:'lebee',hp:850,max_hp:850},
  {unit_id:'subzero',hp:900,max_hp:900}
];
Road.applyRunToBattle(run,nextBattle);
assert(nextBattle[0].hp===410,'Carry-forward HP was not applied to next battle');
assert(nextBattle[1].hp===0&&nextBattle[1].bbRoadDefeated===true,'Defeated fighter was incorrectly revived');
assert(nextBattle[2].hp===725,'Survivor HP carry-forward is wrong');

assert(Road.saveRun(run)===true,'Road run failed to save');
const loaded=Road.loadRun();
assert(loaded?.run_id==='road-test'&&loaded.stage===2,'Road run failed to load');
assert(loaded.fighters.find(f=>f.unit_id==='senku')?.hp===410,'Loaded Road HP is wrong');
Road.clearRun();
assert(Road.loadRun()===null,'Road run failed to clear');

let failed=Road.recordBattleResult(run,[
  {unit_id:'senku',hp:0,max_hp:1000},
  {unit_id:'lebee',hp:0,max_hp:850},
  {unit_id:'subzero',hp:0,max_hp:900}
]);
assert(failed.status==='failed','Road run should fail when every fighter is defeated');
let blocked=false;
try{Road.advanceStage(failed)}catch{blocked=true}
assert(blocked,'Failed Road run was allowed to advance');

console.log('Blazing Road PASS: stage progression, persistent HP, defeats, carry-forward, failure state, and local persistence verified.');
