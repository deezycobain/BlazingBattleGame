import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

const RUNTIME_ID='bb-blazing-road-runtime';
const BOOT_ID='bb-blazing-road-bootstrap';

function replaceUnique(rx,replacement,label){
  const hits=[...html.matchAll(rx)];
  if(hits.length!==1)throw new Error(`Blazing Road integration: expected one ${label}, found ${hits.length}`);
  html=html.replace(rx,replacement);
}

const helpers=`
function roadBattleFighters(state=S){
 const pairs=Array.isArray(state?.pairs)?state.pairs:[];
 return pairs.flatMap(pair=>Array.isArray(pair?.units)?pair.units:[]).filter(unit=>unit&&unit.name&&unit.name!=='—'&&Number(unit.maxHp)>0);
}
function roadSameTeam(run,fighters){
 const R=window.BlazingRoadRun;if(!R||!run)return false;
 const current=fighters.map(unit=>R.stateUnitId(unit)).filter(Boolean).sort();
 const saved=(run.fighters||[]).map(f=>f.unit_id).filter(Boolean).sort();
 return current.length===saved.length&&current.every((id,i)=>id===saved[i]);
}
function roadSyncCard(run){
 const card=document.querySelector('[data-bb-home-action="road"]');
 const desc=card?.querySelector('.bb-mode-desc');
 if(!desc)return;
 desc.textContent=run&&run.status==='active'?\`Stage \${run.stage} · Run in Progress\`:'Stage 1 · First Route';
}
function beginRoadBattle(){
 const R=window.BlazingRoadRun;if(!R)return null;
 const fighters=roadBattleFighters(S);if(!fighters.length)return null;
 let run=R.loadRun();
 if(!run||run.status!=='active'||!roadSameTeam(run,fighters)){
  R.clearRun();
  run=R.createRun(fighters,{stage:1});
 }
 R.applyRunToBattle(run,fighters);
 R.saveRun(run);
 S.bbRoadRun=run;
 S.bbRoadStage=run.stage;
 S.log=\`BLAZING ROAD — Stage \${run.stage}. Surviving HP carries forward.\`;
 roadSyncCard(run);
 return run;
}
function recordRoadVictory(){
 if(S.bbRunMode!=='road'||S.bbRoadVictoryRecorded)return S.bbRoadRun||null;
 const R=window.BlazingRoadRun;if(!R)return null;
 const fighters=roadBattleFighters(S);if(!fighters.length)return null;
 let run=S.bbRoadRun||R.loadRun();if(!run)return null;
 S.bbRoadVictoryRecorded=true;
 run=R.recordBattleResult(run,fighters);
 if(run.status==='active')run=R.advanceStage(run);
 R.saveRun(run);
 S.bbRoadRun=run;
 S.bbRoadStage=run.stage;
 roadSyncCard(run);
 return run;
}
`;

replaceUnique(
  /let menuTransitioning=false;\s*function startBattle\(kind\)\{/g,
  `${helpers}\nlet menuTransitioning=false;\nfunction startBattle(kind){`,
  'menu battle entry anchor'
);

replaceUnique(
  /S=boss\?freshBoss\(\):fresh\(\);\s*S\._chargeSince=performance\.now\(\);/g,
  `S=boss?freshBoss():fresh();\n   S.bbRunMode=boss?'castle':'road';\n   if(!boss)beginRoadBattle();\n   S._chargeSince=performance.now();`,
  'fresh battle state anchor'
);

replaceUnique(
  /function startVictorySequence\(\)\{\s*if\(S\.victoryFX\)return;\s*S\.victoryFX=\{/g,
  `function startVictorySequence(){\n if(S.victoryFX)return;\n const roadBeforeStage=S.bbRunMode==='road'?(S.bbRoadStage||S.bbRoadRun?.stage||1):null;\n const roadRun=recordRoadVictory();\n S.victoryFX={`,
  'victory sequence anchor'
);

replaceUnique(
  /S\.phase='resolve';\s*S\.log='Victory — all enemies defeated\.';/g,
  `S.phase='resolve';\n if(S.bbRunMode==='road'&&roadRun?.status==='active'){\n  S.log=\`Victory — Road Stage \${roadBeforeStage} cleared. Survivors carry into Stage \${roadRun.stage}.\`;\n }else{\n  S.log='Victory — all enemies defeated.';\n }`,
  'victory log anchor'
);

html=html.replace(new RegExp(`<script\\b[^>]*id=["']${RUNTIME_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'');
html=html.replace(new RegExp(`<script\\b[^>]*id=["']${BOOT_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'');
const bodyAt=html.toLowerCase().lastIndexOf('</body>');
if(bodyAt<0)throw new Error('Blazing Road integration: closing body missing');
const tags=`<script id="${RUNTIME_ID}" src="runtime/modes/blazing-road-run.js"></script><script id="${BOOT_ID}">setTimeout(()=>{try{window.roadSyncCard?.(window.BlazingRoadRun?.loadRun?.())}catch(error){console.warn('Blazing Road card sync failed',error)}},0);<\/script>`;
html=html.slice(0,bodyAt)+tags+html.slice(bodyAt);

for(const marker of [
  `id="${RUNTIME_ID}"`,
  `id="${BOOT_ID}"`,
  "S.bbRunMode=boss?'castle':'road'",
  'if(!boss)beginRoadBattle()',
  'function recordRoadVictory()',
  'R.applyRunToBattle(run,fighters)',
  'R.recordBattleResult(run,fighters)',
  'R.advanceStage(run)',
  'Survivors carry into Stage'
]){
  if(!html.includes(marker))throw new Error(`Blazing Road integration: built shell missing ${marker}`);
}

await fs.writeFile(file,html);
console.log('Blazing Road integration PASS: Level 1 resumes persistent HP, victory snapshots survivors, and next-stage state is saved without affecting Phantom Castle.');
