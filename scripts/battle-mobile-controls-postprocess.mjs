import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const SCRIPT_ID='bb-battle-mobile-controls-runtime';
const REFINE_ID='bb-blazing-road-battle-refinements';
const TURN_ID='bb-road-round-turns-runtime';
const LOOP_ID='bb-combat-loop-runtime';
const DOCK_ID='bb-battle-dock-runtime';
const COUNTDOWN_ID='bb-road-countdown-polish';
for(const id of [SCRIPT_ID,REFINE_ID,TURN_ID,LOOP_ID,DOCK_ID,COUNTDOWN_ID]){
 html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'');
 html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*/>`,'gi'),'');
}
const body=html.toLowerCase().lastIndexOf('</body>');
if(body<0)throw new Error('Battle mobile controls: closing body missing');
const runtime=`<script id="${SCRIPT_ID}" src="runtime/ui/battle/battle-mobile-controls.js"></script><script id="${REFINE_ID}" src="runtime/modes/blazing-road-battle-refinements.js"></script><script id="${TURN_ID}" src="runtime/combat/road-round-turns.js"></script><script id="${LOOP_ID}" src="runtime/combat/combat-loop-runtime.js"></script><link rel="stylesheet" href="runtime/ui/battle/battle-dock.css"><script id="${DOCK_ID}" src="runtime/ui/battle/battle-dock.js"></script><script id="${COUNTDOWN_ID}" src="runtime/modes/blazing-road-countdown-polish.js"></script>`;
html=html.slice(0,body)+runtime+html.slice(body);
const resources='hp:u.hp,maxHp:u.maxHp,chakra:u.chakra,maxChakra:u.maxChakra';
if(!html.includes(resources))throw new Error('Battle dock: resource renderer owner missing');
html=html.replace(resources,resources+",showHealth:S.bbRunMode!=='road'");
for(const marker of [SCRIPT_ID,REFINE_ID,TURN_ID,LOOP_ID,DOCK_ID,COUNTDOWN_ID,'runtime/ui/battle/battle-mobile-controls.js','runtime/modes/blazing-road-battle-refinements.js','runtime/combat/road-round-turns.js','runtime/combat/combat-loop-runtime.js','runtime/ui/battle/battle-dock.js','runtime/modes/blazing-road-countdown-polish.js','BlazingRoadCamera?.isCombatLocked?.()'])if(!html.includes(marker))throw new Error(`Battle mobile controls: missing ${marker}`);
for(const id of [SCRIPT_ID,REFINE_ID,TURN_ID,LOOP_ID,DOCK_ID,COUNTDOWN_ID])if((html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length!==1)throw new Error(`Battle mobile controls: ${id} injection was not unique`);
await fs.writeFile(file,html);
console.log('Battle mobile controls PASS: fixed Road dock + shared HP + round initiative + portrait jutsu + full-viewport countdown polish + canonical combat loop.');
