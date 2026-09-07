import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const STYLE_ID='bb-battle-pause-style',SCRIPT_ID='bb-battle-pause-runtime';

html=html.replace(new RegExp(`<link\\b[^>]*id=["']${STYLE_ID}["'][^>]*>`,'gi'),'');
html=html.replace(new RegExp(`<script\\b[^>]*id=["']${SCRIPT_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'');
html=html.replace(new RegExp(`<script\\b[^>]*id=["']${SCRIPT_ID}["'][^>]*/>`,'gi'),'');

const tickStart=html.indexOf('function tick(){');
if(tickStart<0)throw new Error('Battle pause: combat tick start missing');
const tickEnd=html.indexOf('setInterval(tick,30);',tickStart);
if(tickEnd<0)throw new Error('Battle pause: combat tick interval boundary missing');
let tickSegment=html.slice(tickStart,tickEnd);
if(!tickSegment.includes('BlazingBattlePause?.isPaused')){
 const hits=tickSegment.split('function tick(){').length-1;
 if(hits!==1)throw new Error(`Battle pause: expected one scoped combat tick, found ${hits}`);
 tickSegment=tickSegment.replace('function tick(){','function tick(){\n if(window.BlazingBattlePause?.isPaused?.())return;');
 html=html.slice(0,tickStart)+tickSegment+html.slice(tickEnd);
}

const head=html.toLowerCase().lastIndexOf('</head>');
if(head<0)throw new Error('Battle pause: head missing');
html=html.slice(0,head)+`<link id="${STYLE_ID}" rel="stylesheet" href="runtime/ui/battle/battle-pause.css">`+html.slice(head);
const body=html.toLowerCase().lastIndexOf('</body>');
if(body<0)throw new Error('Battle pause: body missing');
html=html.slice(0,body)+`<script id="${SCRIPT_ID}" src="runtime/ui/battle/battle-pause.js"></script>`+html.slice(body);

for(const marker of [STYLE_ID,SCRIPT_ID,'BlazingBattlePause?.isPaused?.()','runtime/ui/battle/battle-pause.css','runtime/ui/battle/battle-pause.js'])if(!html.includes(marker))throw new Error(`Battle pause: missing ${marker}`);
await fs.writeFile(file,html);
console.log('Battle pause PASS: themed Pause/Resume/Exit controls injected and combat tick freezes while paused.');
