import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

const CONTENT_ID='bb-blazing-road-content-runtime';
const RUNTIME_ID='bb-blazing-road-runtime';
const BOOT_ID='bb-blazing-road-bootstrap';

function replaceUnique(rx,replacement,label){
  const hits=[...html.matchAll(rx)];
  if(hits.length!==1)throw new Error(`Blazing Road integration: expected one ${label}, found ${hits.length}`);
  html=html.replace(rx,replacement);
}
function replaceUniqueWithin(startNeedle,endNeedle,rx,replacement,label){
  const start=html.indexOf(startNeedle);
  if(start<0)throw new Error(`Blazing Road integration: missing ${label} start boundary`);
  if(html.indexOf(startNeedle,start+startNeedle.length)>=0)throw new Error(`Blazing Road integration: ${label} start boundary is not unique`);
  const end=html.indexOf(endNeedle,start+startNeedle.length);
  if(end<0)throw new Error(`Blazing Road integration: missing ${label} end boundary`);
  const segment=html.slice(start,end);
  const hits=[...segment.matchAll(rx)];
  if(hits.length!==1)throw new Error(`Blazing Road integration: expected one ${label} anchor in scoped function, found ${hits.length}`);
  html=html.slice(0,start)+segment.replace(rx,replacement)+html.slice(end);
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
 if(run?.status==='active')desc.textContent=`Stage ${run.stage} · Run in Progress`;
 else if(run?.status==='complete')desc.textContent='Road Complete · 10/10';
 else desc.textContent='Stage 1 · First Route';
}
function roadApplyStageContent(stage){
 const C=window.BlazingRoadContent;if(!C)return null;
 const cfg=C.stageConfig(stage),scale=cfg.scale;
 S.enemies=cfg.enemies.map((spec,index)=>{
  const e=makeEnemyFromData(spec.id,spec.name,spec.x,spec.y,spec.mark);
  const hp=Math.max(Math.round(e.maxHp*scale.hpMultiplier),scale.hpFloor);
  e.maxHp=hp;e.hp=hp;
  e.attack=Math.max(Math.round(e.attack*scale.attackMultiplier),scale.attackFloor);
  e.defense=Math.max(Math.round((e.defense||0)*scale.defenseMultiplier),scale.defenseFloor);
  e.speed=Math.max(1,Math.round(e.speed*scale.speedMultiplier));
  e.bbRoadStage=cfg.stage;e.bbRoadElite=cfg.elite;e.bbRoadAi={...cfg.ai};e.bbRoadIndex=index;
  return e;
 });
 S.bbRoadContent=cfg;
 return cfg;
}
function beginRoadBattle(){
 const R=window.BlazingRoadRun;if(!R)return null;
 const fighters=roadBattleFighters(S);if(!fighters.length)return null;
 let run=R.loadRun();
 if(!run||run.status!=='active'||!roadSameTeam(run,fighters)){
  R.clearRun();
  run=R.createRun(fighters,{stage:1});
 }
 const cfg=roadApplyStageContent(run.stage);
 R.applyRunToBattle(run,fighters);
 R.saveRun(run);
 S.bbRoadRun=run;
 S.bbRoadStage=run.stage;
 S.log=`BLAZING ROAD — Stage ${run.stage}${cfg?.name?` · ${cfg.name}`:''}. Surviving HP carries forward.`;
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
 if(run.status==='active'){
  const finalStage=window.BlazingRoadContent?.isFinalStage?.(run.stage)||run.stage>=10;
  run=finalStage?R.completeRun(run):R.advanceStage(run);
 }
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
  /function teamSpawnOptions\(name\)\{[\s\S]*?(?=\nfunction\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\()/g,
  `function teamSpawnOptions(name){\n // Real combat testing uses each unit's normal starting chakra.\n return {};\n}\n`,
  'development chakra shortcut'
);

replaceUnique(
  /function setBattleMap\(kind\)\{[\s\S]*?\n\}\nsetBattleMap\('level'\);/g,
  `function setBattleMap(kind,stage=1){\n const isBoss=kind==='boss';\n const fallback=isBoss?window.BLAZING_ASSETS.maps.anubisBoss:window.BLAZING_ASSETS.maps.level1;\n const roadMap=kind==='road'?window.BlazingRoadContent?.mapForStage?.(stage):null;\n const requested=roadMap?.src||fallback;\n const img=isBoss?ANUBIS_PORTRAIT_MAP:LEVEL1_PORTRAIT_MAP;\n const applySource=src=>{cvs.style.backgroundImage=\`url("\${src}")\`;if(img.src!==src)img.src=src;if(typeof img.decode==='function')img.decode().catch(()=>{});};\n img.onerror=requested!==fallback?()=>{img.onerror=null;applySource(fallback);window.BlazingRoadMapAudit={requested,resolved:fallback,fallback:true,stage};}:null;\n applySource(requested);\n window.BlazingRoadMapAudit={requested,resolved:requested,fallback:false,stage};\n return requested;\n}\nsetBattleMap('level');`,
  'stage-aware battle map function'
);

replaceUniqueWithin(
  'function startBattle(kind){',
  "level1Btn.addEventListener('click',()=>startBattle('level'));",
  /S=boss\?freshBoss\(\):fresh\(\);\s*S\._chargeSince=performance\.now\(\);/g,
  `S=boss?freshBoss():fresh();\n   S.bbRunMode=boss?'castle':'road';\n   if(!boss)beginRoadBattle();\n   S._chargeSince=performance.now();`,
  'fresh battle state'
);

replaceUniqueWithin(
  'function startBattle(kind){',
  "level1Btn.addEventListener('click',()=>startBattle('level'));",
  /setBattleMap\(boss\?'boss':'level'\);/g,
  `S.bbRoadMapSource=setBattleMap(boss?'boss':'road',S.bbRoadStage||1);`,
  'Road stage map selection'
);

replaceUniqueWithin(
  'function startVictorySequence(){',
  'function checkVictoryKillshot(){',
  /function startVictorySequence\(\)\{\s*if\(S\.victoryFX\)return;\s*S\.victoryFX=\{/g,
  `function startVictorySequence(){\n if(S.victoryFX)return;\n const roadBeforeStage=S.bbRunMode==='road'?(S.bbRoadStage||S.bbRoadRun?.stage||1):null;\n const roadRun=recordRoadVictory();\n S.victoryFX={`,
  'victory sequence setup'
);

replaceUniqueWithin(
  'function startVictorySequence(){',
  'function checkVictoryKillshot(){',
  /S\.phase='resolve';\s*S\.log='Victory — all enemies defeated\.';/g,
  `S.phase='resolve';\n if(S.bbRunMode==='road'&&roadRun?.status==='complete'){\n  S.log=\`BLAZING ROAD COMPLETE — Stage \${roadBeforeStage} cleared.\`;\n }else if(S.bbRunMode==='road'&&roadRun?.status==='active'){\n  S.log=\`Victory — Road Stage \${roadBeforeStage} cleared. Survivors carry into Stage \${roadRun.stage}.\`;\n }else{\n  S.log='Victory — all enemies defeated.';\n }`,
  'victory log'
);

replaceUniqueWithin(
  'function tick(){',
  'setInterval(tick,30);',
  /\/\/ v0\.5\.11 hard rescue:[\s\S]*?if\(rescuePair\)\{rescuePair\.gauge=100;max=\{kind:'pair',ref:rescuePair,g:100\};S\.log='Turn system recovered — player control restored\.';\}\s*\}/g,
  `// Neutral deadlock safety only. Normal turns are determined entirely by unit Speed.\n if(!S._chargeSince)S._chargeSince=performance.now();\n if(!max && performance.now()-S._chargeSince>15000){\n  const contenders=[\n   ...alivePairs().map(p=>({kind:'pair',ref:p,g:p.gauge})),\n   ...S.enemies.filter(e=>e.hp>0).map(e=>({kind:'enemy',ref:e,g:e.gauge}))\n  ].sort((a,b)=>b.g-a.g);\n  const rescue=contenders[0];\n  if(rescue){rescue.ref.gauge=100;max={...rescue,g:100};S.log='Turn meter safety recovered the highest-gauge unit.';}\n }`,
  'neutral speed deadlock safety'
);

replaceUniqueWithin(
  'function cpuTurn(){',
  'function cpuAttack(',
  /\s*\/\/ Evaluate several approach angles instead of always taking the same straight-line slot\./g,
  `\n // Road enemies may disengage when wounded or under immediate pressure.\n const roadAi=e.bbRoadAi||null;\n if(roadAi&&!e.boss){\n  const nearest=[...candidates].sort((a,b)=>d(e,a)-d(e,b))[0];\n  const hpRatio=e.maxHp>0?e.hp/e.maxHp:1;\n  const pressured=nearest&&d(e,nearest)<roadAi.dangerDistance;\n  const evadeChance=Math.min(.82,(hpRatio<roadAi.lowHpThreshold?roadAi.evadeLowHp:0)+(pressured?roadAi.evadeBase:0));\n  if(nearest&&Math.random()<evadeChance){\n   let dx=e.x-nearest.x,dy=e.y-nearest.y,len=Math.hypot(dx,dy)||1;\n   const side=(Math.random()-.5)*.55,ux=dx/len,uy=dy/len;\n   const desiredEvade=clampToBattlefield({\n    x:e.x+(ux-uy*side)*roadAi.evadeDistance,\n    y:e.y+(uy+ux*side)*roadAi.evadeDistance\n   });\n   const evadeFrom={x:e.x,y:e.y},evadeStart=performance.now(),evadeDur=390;\n   e.gauge=0;S.anim={positions:{}};S.log=\`\${e.name} reads the field and evades.\`;\n   function evadeMove(now){\n    const t=Math.min(1,(now-evadeStart)/evadeDur),q=t*t*(3-2*t);\n    S.anim.positions[e.name]={x:evadeFrom.x+(desiredEvade.x-evadeFrom.x)*q,y:evadeFrom.y+(desiredEvade.y-evadeFrom.y)*q};\n    if(t<1)return requestAnimationFrame(evadeMove);\n    e.x=desiredEvade.x;e.y=desiredEvade.y;resolveEnemyOverlap(e);delete S.anim.positions[e.name];\n    S.log=\`\${e.name} repositioned out of danger.\`;finishAction();\n   }\n   requestAnimationFrame(evadeMove);return;\n  }\n }\n\n // Evaluate several approach angles instead of always taking the same straight-line slot.`,
  'Road attack-or-evade decision'
);

replaceUnique(
  /if\(performance\.now\(\)-S\._chargeSince>5000\)\{[\s\S]*?S\.log='Turn meter fallback restored player control\.';updateUI\(\);\}\s*\}/g,
  `if(false&&performance.now()-S._chargeSince>5000){\n   // Legacy player-forcing rescue disabled. tick() owns neutral deadlock recovery.\n  }`,
  'player-forcing global charge watchdog'
);

for(const id of [CONTENT_ID,RUNTIME_ID,BOOT_ID]){
 html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'');
 html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*/>`,'gi'),'');
}
const bodyAt=html.toLowerCase().lastIndexOf('</body>');
if(bodyAt<0)throw new Error('Blazing Road integration: closing body missing');
const tags=`<script id="${CONTENT_ID}" src="runtime/modes/blazing-road-content.js"></script><script id="${RUNTIME_ID}" src="runtime/modes/blazing-road-run.js"></script><script id="${BOOT_ID}">setTimeout(()=>{try{window.roadSyncCard?.(window.BlazingRoadRun?.loadRun?.())}catch(error){console.warn('Blazing Road card sync failed',error)}},0);<\/script>`;
html=html.slice(0,bodyAt)+tags+html.slice(bodyAt);

for(const marker of [
  `id="${CONTENT_ID}"`,
  `id="${RUNTIME_ID}"`,
  `id="${BOOT_ID}"`,
  "S.bbRunMode=boss?'castle':'road'",
  'roadApplyStageContent(run.stage)',
  "setBattleMap(boss?'boss':'road',S.bbRoadStage||1)",
  'function recordRoadVictory()',
  'R.applyRunToBattle(run,fighters)',
  'R.recordBattleResult(run,fighters)',
  'R.completeRun(run)',
  'Turn meter safety recovered the highest-gauge unit.',
  'reads the field and evades',
  'Real combat testing uses each unit',
  'BLAZING ROAD COMPLETE'
]){
  if(!html.includes(marker))throw new Error(`Blazing Road integration: built shell missing ${marker}`);
}
if(html.includes('Turn meter fallback restored player control.'))throw new Error('Blazing Road integration: player-forcing 5s turn fallback survived');
if(html.includes('Turn system recovered — player control restored.'))throw new Error('Blazing Road integration: player-forcing 3.8s turn fallback survived');

await fs.writeFile(file,html);
console.log('Blazing Road integration PASS: ten-stage encounters, stage maps, real Speed turns, attack/evade AI, persistent HP, and Stage 10 completion wired.');
