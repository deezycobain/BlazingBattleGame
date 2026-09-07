import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const STYLE_ID='bb-official-dev-shell-style';
const ECONOMY_ID='bb-battle-economy-runtime';
const RESULTS_ID='bb-match-results-runtime';

html=html
  .replace(new RegExp(`<link\\b[^>]*id=["']${STYLE_ID}["'][^>]*>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${ECONOMY_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${RESULTS_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'');

const anchor=` const roadRun=recordRoadVictory();\n S.victoryFX={`;
const replacement=` const roadRun=recordRoadVictory();\n const victoryMode=S.bbRunMode==='road'?'road':S.bbRunMode==='castle'?'castle':null;\n const victoryStage=victoryMode==='road'?Math.max(1,Number(roadBeforeStage)||1):1;\n const victoryBoss=victoryMode==='castle'?Math.max(1,Number(S.bbCastleBoss||S.bbBossStage)||1):1;\n S.bbVictoryStage=victoryStage;\n S.bbVictoryBoss=victoryBoss;\n S.bbVictoryReward=victoryMode&&window.BlazingEconomy?window.BlazingEconomy.awardVictory({mode:victoryMode,stage:victoryStage,boss:victoryBoss}):null;\n S.victoryFX={`;
const hits=html.split(anchor).length-1;
if(hits!==1)throw new Error(`Official dev shell: expected one victory anchor, found ${hits}`);
html=html.replace(anchor,replacement);

const head=html.toLowerCase().lastIndexOf('</head>');
if(head<0)throw new Error('Official dev shell: closing head missing');
html=html.slice(0,head)+`<link id="${STYLE_ID}" rel="stylesheet" href="runtime/ui/home/home-official-dev.css">`+html.slice(head);
const body=html.toLowerCase().lastIndexOf('</body>');
if(body<0)throw new Error('Official dev shell: closing body missing');
html=html.slice(0,body)+`<script id="${ECONOMY_ID}" src="runtime/modes/battle-economy.js"></script><script id="${RESULTS_ID}" src="runtime/ui/battle/match-results.js"></script>`+html.slice(body);

for(const marker of [STYLE_ID,ECONOMY_ID,RESULTS_ID,'S.bbVictoryReward','BlazingEconomy.awardVictory'])if(!html.includes(marker))throw new Error(`Official dev shell: missing ${marker}`);
await fs.writeFile(file,html);
console.log('Official dev shell PASS: polished Home skin, Battle Marks rewards, and post-match return controls integrated.');
