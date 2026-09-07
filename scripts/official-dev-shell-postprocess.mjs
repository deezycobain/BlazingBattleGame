import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const STYLE_ID='bb-official-dev-shell-style';
const ECONOMY_ID='bb-battle-economy-runtime';
const RESULTS_ID='bb-match-results-runtime';
const HOME_COMPAT_ID='bb-approved-home-compat-runtime';
const HOME_LIVE_ID='bb-home-live-polish-runtime';
const HOME_V8_ID='bb-home-v8-runtime';
const HOME_V9_ID='bb-home-v9-runtime';
const HOME_V9_LIFECYCLE_ID='bb-home-v9-lifecycle-runtime';

html=html
  .replace(new RegExp(`<link\\b[^>]*id=["']${STYLE_ID}["'][^>]*>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${ECONOMY_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${RESULTS_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_COMPAT_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_COMPAT_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_LIVE_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_LIVE_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_V8_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_V8_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_V9_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_V9_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_V9_LIFECYCLE_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_V9_LIFECYCLE_ID}["'][^>]*/>`,'gi'),'');

const anchor=` const roadRun=recordRoadVictory();\n S.victoryFX={`;
const replacement=` const roadRun=recordRoadVictory();\n const victoryMode=S.bbRunMode==='road'?'road':S.bbRunMode==='castle'?'castle':null;\n const victoryStage=victoryMode==='road'?Math.max(1,Number(roadBeforeStage)||1):1;\n const victoryBoss=victoryMode==='castle'?Math.max(1,Number(S.bbCastleBoss||S.bbBossStage)||1):1;\n S.bbVictoryStage=victoryStage;\n S.bbVictoryBoss=victoryBoss;\n S.bbVictoryReward=victoryMode&&window.BlazingEconomy?window.BlazingEconomy.awardVictory({mode:victoryMode,stage:victoryStage,boss:victoryBoss}):null;\n S.victoryFX={`;
const hits=html.split(anchor).length-1;
if(hits!==1)throw new Error(`Official dev shell: expected one victory anchor, found ${hits}`);
html=html.replace(anchor,replacement);

const v8File=path.join(process.cwd(),'dist','runtime','ui','home','home-v8-runtime.js');
let v8=await fs.readFile(v8File,'utf8');
const v8LayoutAnchor="shell.dataset.bbHomeLayout='v8-mockup';";
const v8LayoutHits=v8.split(v8LayoutAnchor).length-1;
if(v8LayoutHits!==1)throw new Error(`Official dev shell: expected one Home v8 layout assignment, found ${v8LayoutHits}`);
v8=v8.replace(v8LayoutAnchor,"if(!shell.classList.contains('bb-home-v9')&&shell.dataset.bbHomeLayout!=='v9-polish')shell.dataset.bbHomeLayout='v8-mockup';");
await fs.writeFile(v8File,v8);

const head=html.toLowerCase().lastIndexOf('</head>');
if(head<0)throw new Error('Official dev shell: closing head missing');
html=html.slice(0,head)+`<link id="${STYLE_ID}" rel="stylesheet" href="runtime/ui/home/home-official-dev.css">`+html.slice(head);
const body=html.toLowerCase().lastIndexOf('</body>');
if(body<0)throw new Error('Official dev shell: closing body missing');
html=html.slice(0,body)+`<script id="${ECONOMY_ID}" src="runtime/modes/battle-economy.js"></script><script id="${RESULTS_ID}" src="runtime/ui/battle/match-results.js"></script><script id="${HOME_COMPAT_ID}" src="runtime/ui/home/home-approved-compat.js"></script><script id="${HOME_LIVE_ID}" src="runtime/ui/home/home-live-polish.js"></script><script id="${HOME_V8_ID}" src="runtime/ui/home/home-v8-runtime.js"></script><script id="${HOME_V9_ID}" src="runtime/ui/home/home-v9-runtime.js"></script><script id="${HOME_V9_LIFECYCLE_ID}" src="runtime/ui/home/home-v9-lifecycle.js"></script>`+html.slice(body);

for(const marker of [STYLE_ID,ECONOMY_ID,RESULTS_ID,HOME_COMPAT_ID,HOME_LIVE_ID,HOME_V8_ID,HOME_V9_ID,HOME_V9_LIFECYCLE_ID,'S.bbVictoryReward','BlazingEconomy.awardVictory','home-approved-compat.js','home-live-polish.js','home-v8-runtime.js','home-v9-runtime.js','home-v9-lifecycle.js'])if(!html.includes(marker))throw new Error(`Official dev shell: missing ${marker}`);
await fs.writeFile(file,html);
console.log('Official dev shell PASS: Home v9 owns final layout state; v8 compatibility, live currencies, profile, parallax, and post-match return controls integrated.');
