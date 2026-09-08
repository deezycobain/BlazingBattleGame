import fs from 'node:fs/promises';
import vm from 'node:vm';

const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const roadContentSource=await fs.readFile('runtime/modes/blazing-road-content.js','utf8');
const expectedMaps=[
  'assets/maps/blazing-road/stage-01-south-sac.webp',
  'assets/maps/blazing-road/stage-02-moon-statue-garden.webp',
  'assets/maps/blazing-road/stage-03-lantern-garden.webp',
  'assets/maps/blazing-road/stage-04-shinobi-overlook.webp',
  'assets/maps/blazing-road/stage-05-training-grounds.webp'
];
for(const path of expectedMaps){
  const bytes=await fs.readFile(path);
  assert(bytes.length>40000,`Road map asset is unexpectedly small: ${path} (${bytes.length} bytes)`);
  assert(bytes.subarray(0,4).toString('ascii')==='RIFF',`Road map is not RIFF/WebP: ${path}`);
  assert(bytes.subarray(8,12).toString('ascii')==='WEBP',`Road map is not WebP: ${path}`);
  assert(roadContentSource.includes(path),`Road content runtime does not reference map: ${path}`);
}
const contentContext={window:{},console,Math,Object};
vm.createContext(contentContext);
vm.runInContext(roadContentSource,contentContext,{filename:'blazing-road-content.js'});
const RoadContent=contentContext.window.BlazingRoadContent;
assert(RoadContent?.MAPS?.length===5,'Blazing Road should expose exactly five map slots');
assert(RoadContent.stageConfig(1).map.src===expectedMaps[0],'Stage 1 map route is wrong');
assert(RoadContent.stageConfig(5).map.src===expectedMaps[4],'Stage 5 map route is wrong');
assert(RoadContent.stageConfig(6).map.src===expectedMaps[0],'Stage 6 should begin the second five-map rotation');
assert(RoadContent.stageConfig(10).map.src===expectedMaps[4],'Stage 10 should end on the fifth map slot');

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

const fighters=[
  {unit_id:'senku',hp:1000,max_hp:1000,chakra:2,max_chakra:8},
  {unit_id:'lebee',hp:850,max_hp:850,chakra:3,max_chakra:8},
  {unit_id:'subzero',hp:900,max_hp:900,chakra:4,max_chakra:8}
];

let run=Road.createRun(fighters,{stage:1,runId:'road-test',startedAt:'2026-09-06T00:00:00.000Z'});
assert(run.stage===1&&run.status==='active','Road run should start active on stage 1');
assert(run.fighters.length===3,'Road run should retain the active team');
assert(run.fighters.find(f=>f.unit_id==='senku')?.chakra===2,'Starting Road chakra was not captured');

run=Road.recordBattleResult(run,[
  {unit_id:'senku',hp:410,max_hp:1000,chakra:6,maxChakra:8},
  {unit_id:'lebee',hp:0,max_hp:850,chakra:5,maxChakra:8},
  {unit_id:'subzero',hp:725,max_hp:900,chakra:7,maxChakra:8}
]);
assert(run.fighters.find(f=>f.unit_id==='senku')?.hp===410,'Senku HP did not persist');
assert(run.fighters.find(f=>f.unit_id==='senku')?.chakra===6,'Senku chakra did not persist');
assert(run.fighters.find(f=>f.unit_id==='lebee')?.defeated===true,'Defeated fighter state did not persist');
assert(Road.livingFighters(run).length===2,'Living fighter count is wrong after battle');
assert(Road.defeatedFighters(run).length===1,'Defeated fighter count is wrong after battle');

run=Road.advanceStage(run);
assert(run.stage===2,'Road stage did not advance');
const nextBattle=[
  {unit_id:'senku',hp:1000,max_hp:1000,chakra:0,maxChakra:8},
  {unit_id:'lebee',hp:850,max_hp:850,chakra:0,maxChakra:8},
  {unit_id:'subzero',hp:900,max_hp:900,chakra:0,maxChakra:8}
];
Road.applyRunToBattle(run,nextBattle);
assert(nextBattle[0].hp===410,'Carry-forward HP was not applied to next battle');
assert(nextBattle[0].chakra===6,'Carry-forward chakra was not applied to next battle');
assert(nextBattle[1].hp===0&&nextBattle[1].bbRoadDefeated===true,'Defeated fighter was incorrectly revived');
assert(nextBattle[1].chakra===5,'Defeated fighter chakra state did not remain serialized');
assert(nextBattle[2].hp===725,'Survivor HP carry-forward is wrong');
assert(nextBattle[2].chakra===7,'Survivor chakra carry-forward is wrong');

assert(Road.saveRun(run)===true,'Road run failed to save');
const loaded=Road.loadRun();
assert(loaded?.run_id==='road-test'&&loaded.stage===2,'Road run failed to load');
assert(loaded.fighters.find(f=>f.unit_id==='senku')?.hp===410,'Loaded Road HP is wrong');
assert(loaded.fighters.find(f=>f.unit_id==='senku')?.chakra===6,'Loaded Road chakra is wrong');

const legacy=JSON.parse(JSON.stringify(loaded));
for(const fighter of legacy.fighters){delete fighter.chakra;delete fighter.max_chakra;}
assert(Road.validateRun(legacy)===legacy,'Legacy HP-only Road save should remain valid');
const legacyBattle=[
  {unit_id:'senku',hp:1000,max_hp:1000,chakra:1,maxChakra:8},
  {unit_id:'lebee',hp:850,max_hp:850,chakra:1,maxChakra:8},
  {unit_id:'subzero',hp:900,max_hp:900,chakra:1,maxChakra:8}
];
Road.applyRunToBattle(legacy,legacyBattle);
assert(legacyBattle.every(unit=>unit.chakra===1),'Legacy HP-only Road save should keep normal fresh-battle chakra');

Road.clearRun();
assert(Road.loadRun()===null,'Road run failed to clear');

let failed=Road.recordBattleResult(run,[
  {unit_id:'senku',hp:0,max_hp:1000,chakra:6,maxChakra:8},
  {unit_id:'lebee',hp:0,max_hp:850,chakra:5,maxChakra:8},
  {unit_id:'subzero',hp:0,max_hp:900,chakra:7,maxChakra:8}
]);
assert(failed.status==='failed','Road run should fail when every fighter is defeated');
let blocked=false;
try{Road.advanceStage(failed)}catch{blocked=true}
assert(blocked,'Failed Road run was allowed to advance');

console.log('Blazing Road PASS: five WebP maps, 10-stage map rotation, persistent HP/chakra, defeats, carry-forward, legacy saves, failure state, and local persistence verified.');
