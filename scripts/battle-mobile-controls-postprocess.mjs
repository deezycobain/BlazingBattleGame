import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const SCRIPT_ID='bb-battle-mobile-controls-runtime';
html=html.replace(new RegExp(`<script\\b[^>]*id=["']${SCRIPT_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'');
html=html.replace(new RegExp(`<script\\b[^>]*id=["']${SCRIPT_ID}["'][^>]*/>`,'gi'),'');
const body=html.toLowerCase().lastIndexOf('</body>');
if(body<0)throw new Error('Battle mobile controls: closing body missing');
html=html.slice(0,body)+`<script id="${SCRIPT_ID}" src="runtime/ui/battle/battle-mobile-controls.js"></script>`+html.slice(body);
for(const marker of [SCRIPT_ID,'runtime/ui/battle/battle-mobile-controls.js','BlazingRoadCamera?.isCombatLocked?.()'])if(!html.includes(marker))throw new Error(`Battle mobile controls: missing ${marker}`);
if((html.match(new RegExp(`id=["']${SCRIPT_ID}["']`,'g'))||[]).length!==1)throw new Error('Battle mobile controls: runtime injection was not unique');
await fs.writeFile(file,html);
console.log('Battle mobile controls PASS: final phone HUD owner loads after Road countdown/camera locking.');
