import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

function replaceUnique(rx,replacement,label){
 const flags=rx.flags.includes('g')?rx.flags:rx.flags+'g';
 const hits=[...html.matchAll(new RegExp(rx.source,flags))].length;
 if(hits!==1)throw new Error(`Unit progression: expected one ${label}, found ${hits}`);
 html=html.replace(rx,replacement);
}
function replaceLiteralUnique(needle,replacement,label){
 const hits=html.split(needle).length-1;
 if(hits!==1)throw new Error(`Unit progression: expected one ${label}, found ${hits}`);
 html=html.replace(needle,replacement);
}

for(const id of ['bb-unit-progression-runtime','bb-progression-economy-style','bb-progression-economy-bridge']){
 html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'').replace(new RegExp(`<link\\b[^>]*id=["']${id}["'][^>]*>`,'gi'),'');
}

replaceUnique(/function applyCombatBonuses\(\)\{[\s\S]*?\n\}\n(?=function applyPull)/,`function applyCombatBonuses(){
 if(typeof BATTLE_ROSTER==='undefined')return;
 const P=window.BlazingUnitProgression;
 for(const name of FIGHTERS){
  const base=BASE_RUNTIME[name],target=BATTLE_ROSTER[name];if(!base||!target)continue;
  const u=unit(name),progress=P?.unit?.(name)||{level:1,awakening:0},growth=P?.statMultipliers?.(progress)||{hp:1,attack:1,defense:1,speed:1},roll=u.roll||{};
  const hpMultiplier=growth.hp+(roll.hp||0)*.025;
  const attackMultiplier=growth.attack+(roll.attack||0)*.025;
  const defenseMultiplier=growth.defense+(roll.defense||0)*.03;
  const speedMultiplier=growth.speed+(roll.speed||0)*.015;
  target.maxHp=Math.round(base.maxHp*hpMultiplier);target.hp=target.maxHp;
  target.attack=Math.round(base.attack*attackMultiplier);
  target.defense=Math.round(base.defense*defenseMultiplier);
  target.speed=Math.round(base.speed*speedMultiplier);
  target.jutsuDamage=Math.round(base.jutsuDamage*(target.attack/base.attack));
 }
}
`,'combat bonus function');

replaceUnique(/function applyPull\(pull\)\{[\s\S]*?\n\}\n(?=function pipHtml)/,`function applyPull(pull){
 state.totalPulls++;
 const added=window.BlazingUnitProgression?.addDuplicate?.(pull.name,1),progress=added?.unit||window.BlazingUnitProgression?.unit?.(pull.name)||{awakening:0,copies:0,shiny:false};
 pull.progress=\`COPY +1 • \${progress.copies} OWNED\`;pull.isNew=false;pull.shinyUnlock=false;pull.resonance=progress.awakening;pull.shards=progress.copies;save();return pull;
}
`,'duplicate application function');

replaceUnique(/function renderForge\(message=''\)\{[\s\S]*?\n\}\n(?=function toggleLock)/,`function renderForge(message=''){
 const u=unit(),P=window.BlazingUnitProgression,progress=P?.unit?.(selected)||{level:1,awakening:0,copies:0,shiny:false};
 if(progress.shiny&&!u.roll){u.roll=rollStats();u.locks=[];save()}
 const maxed=!!progress.shiny,cap=P?.capForAwakening?.(progress.awakening)||10,nextCost=P?.nextAwakeningCost?.(progress)||0;
 document.getElementById('forgeRoster').innerHTML=FIGHTERS.map(name=>{const x=P?.unit?.(name)||{level:1,awakening:0,copies:0,shiny:false};return \`<button class="forgeFighter \${name===selected?'active':''} \${x.shiny?'maxed':''}" data-fighter="\${name}">\${name}<small>\${x.shiny?'SHINY • ':''}LV.\${x.level} • A\${x.awakening}/5 • \${x.copies} COP\${x.copies===1?'Y':'IES'}</small></button>\`}).join('');
 const card=document.getElementById('forgeCard'),cutout=progress.shiny?SHINY_CUTOUT[selected]:null;syncForgeArtwork(card,selected,progress.shiny,art(selected),cutout);
 document.getElementById('forgeName').textContent=selected.toUpperCase();const rank=document.getElementById('forgeRank');rank.textContent=maxed?'SHINY AWAKENED • LV.50':\`LV.\${progress.level} • AWAKENING \${progress.awakening} / 5\`;rank.classList.toggle('shinyText',maxed);document.getElementById('forgePips').innerHTML=pipHtml({resonance:progress.awakening,shiny:progress.shiny});document.getElementById('forgeShardCount').textContent=String(window.BlazingEconomy?.balance?.()??0);
 document.getElementById('forgeCurrent').innerHTML=statsHtml(u.roll,u.locks);document.getElementById('forgeBuildName').textContent=maxed?buildName(u.roll):(progress.level>=cap?\`AWAKENING \${progress.awakening+1} READY • \${nextCost} DUPLICATE\${nextCost===1?'':'S'} REQUIRED\`:\`LEVEL \${progress.level} / \${cap} • \${progress.copies} DUPLICATE\${progress.copies===1?'':'S'} BANKED\`);
 const box=document.getElementById('forgeCandidate');box.classList.toggle('active',!!candidate);document.getElementById('forgeCandidateStats').innerHTML=candidate?statsHtml(candidate,[],true):'';document.getElementById('forgeCandidateName').textContent=candidate?buildName(candidate):'';
 const rerollCost=150+u.locks.length*125,reroll=document.getElementById('forgeReroll');reroll.disabled=!maxed||!!candidate;reroll.textContent=maxed?\`REROLL • \${rerollCost} ◈\`:'SHINY REQUIRED';document.getElementById('forgeKeep').style.display=candidate?'block':'none';document.getElementById('forgeAccept').style.display=candidate?'block':'none';document.getElementById('forgeStatus').textContent=message;
 window.BlazingProgressionEconomyUI?.renderLevelPanel?.(message);
}
`,'Forge rendering function');

replaceUnique(/function reroll\(\)\{[\s\S]*?(?=\nfunction acceptRoll)/,`function reroll(){
 const u=unit(),progress=window.BlazingUnitProgression?.unit?.(selected);if(!progress?.shiny)return renderForge('Reach Lv.50 and complete the final Shiny Awakening first.');
 const cost=150+u.locks.length*125,spent=window.BlazingEconomy?.spend?.(cost,\`FORGE_REROLL_\${selected}\`);if(!spent?.ok)return renderForge(\`Need \${cost} Battle Marks for this reroll.\`);
 candidate=rollStats(u.locks,u.roll);save();renderForge(\`New destiny roll ready. \${cost} Battle Marks spent.\`)
}`,'Forge reroll function');

replaceUnique(/function resetDevProgression\(\)\{[\s\S]*?(?=\nfunction refreshInventoryBadges)/,`function resetDevProgression(){if(!confirm('Reset unit levels, XP, duplicate copies, Awakenings, Shiny unlocks, and stat rolls?'))return;state=fresh();window.BlazingUnitProgression?.reset?.();candidate=null;save();renderForge('Developer unit progression reset.')}`,'progression reset function');

replaceUnique(/function refreshInventoryBadges\(\)\{[\s\S]*?(?=\nfunction activateSummons)/,`function refreshInventoryBadges(){document.querySelectorAll('.unitTile[data-unit]').forEach(tile=>{const name=tile.dataset.unit;if(!FIGHTERS.includes(name))return;let badge=tile.querySelector('.bb-resonance-badge');if(!badge){badge=document.createElement('span');badge.className='bb-resonance-badge';tile.appendChild(badge)}const x=window.BlazingUnitProgression?.unit?.(name)||{level:1,awakening:0,shiny:false};badge.textContent=x.shiny?'SHINY • 50':\`LV.\${x.level} • A\${x.awakening}\`;badge.classList.toggle('maxed',x.shiny)})}`,'inventory progression badge function');

replaceLiteralUnique('<small>REROLL SHARDS</small><span id="forgeShardCount">0</span> ✦','<small>BATTLE MARKS</small><span id="forgeShardCount">0</span> ◈','Forge resource label');
replaceLiteralUnique('Every Resonance rank adds a small core combat boost. Reach R5 to unlock Shiny status and a randomized 12-point build. Lock up to two stats before rerolling; you always choose whether to keep or replace your build.','Levels and Awakenings add small automatic combat growth. Reach Lv.50 and complete the final Shiny Awakening to unlock a randomized 12-point destiny build. Lock up to two stats before rerolling with Battle Marks.','Forge help copy');
replaceLiteralUnique('Changes apply to the next battle. Extra R5 copies become reroll shards. Summon currency is unlimited in development.','Changes apply to the next battle. Duplicates are banked for Awakening gates. Stat rerolls spend Battle Marks. Summon pulls remain unlimited in development.','Forge development note');
replaceLiteralUnique('DEV CORE BANNER • UNLIMITED EMBERS • DUPES BUILD RESONANCE','DEV CORE BANNER • FREE TEST PULLS • DUPLICATES BANKED','Summon development badge');

const progressionScript='<script id="bb-progression-runtime">';
const scriptHits=html.split(progressionScript).length-1;
if(scriptHits!==1)throw new Error(`Unit progression: expected progression script anchor once, found ${scriptHits}`);
html=html.replace(progressionScript,'<script id="bb-unit-progression-runtime" src="runtime/progression/unit-progression.js"></script>'+progressionScript);

const rewardAnchor=` S.bbVictoryReward=victoryMode&&window.BlazingEconomy?window.BlazingEconomy.awardVictory({mode:victoryMode,stage:victoryStage,boss:victoryBoss}):null;\n S.victoryFX={`;
const rewardHits=html.split(rewardAnchor).length-1;
if(rewardHits!==1)throw new Error(`Unit progression: expected victory reward anchor once, found ${rewardHits}`);
html=html.replace(rewardAnchor,` S.bbVictoryReward=victoryMode&&window.BlazingEconomy?window.BlazingEconomy.awardVictory({mode:victoryMode,stage:victoryStage,boss:victoryBoss}):null;\n const victoryNames=(Array.isArray(S.pairs)?S.pairs:[]).flatMap(pair=>Array.isArray(pair?.units)?pair.units:[]).filter(unit=>unit&&unit.name&&unit.name!=='—'&&Number(unit.maxHp)>0).map(unit=>unit.name);\n S.bbVictoryXp=victoryMode&&window.BlazingUnitProgression?window.BlazingUnitProgression.awardBattleXp({mode:victoryMode,stage:victoryStage,boss:victoryBoss,names:victoryNames}):null;\n S.victoryFX={`);

const head=html.toLowerCase().lastIndexOf('</head>');if(head<0)throw new Error('Unit progression: head missing');
html=html.slice(0,head)+'<link id="bb-progression-economy-style" rel="stylesheet" href="runtime/ui/progression/progression-economy.css">'+html.slice(head);
const body=html.toLowerCase().lastIndexOf('</body>');if(body<0)throw new Error('Unit progression: body missing');
html=html.slice(0,body)+'<script id="bb-progression-economy-bridge" src="runtime/ui/progression/progression-economy-bridge.js"></script>'+html.slice(body);

for(const marker of ['bb-unit-progression-runtime','runtime/progression/unit-progression.js','COPY +1','S.bbVictoryXp','awardBattleXp','REROLL •','FORGE_REROLL_','BATTLE MARKS</small>','FREE TEST PULLS • DUPLICATES BANKED','bb-progression-economy-style','bb-progression-economy-bridge'])if(!html.includes(marker))throw new Error(`Unit progression: missing ${marker}`);
await fs.writeFile(file,html);
console.log('Unit progression PASS: Lv1-50 XP bands, duplicate-gated Awakenings, Battle Mark leveling/rerolls, and Ember exchange wired.');
