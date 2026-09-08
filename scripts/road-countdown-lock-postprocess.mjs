import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const source='if(window.BlazingBattlePause?.isPaused?.())return;';
const replacement='if(window.BlazingBattlePause?.isPaused?.()||window.BlazingRoadCamera?.isCombatLocked?.())return;';
const count=html.split(source).length-1;
if(count===1)html=html.replace(source,replacement);
else if(count===0&&html.includes(replacement)){}
else throw new Error(`Road countdown lock: expected one combat tick pause guard, found ${count}`);
if(!html.includes('BlazingRoadCamera?.isCombatLocked?.()'))throw new Error('Road countdown lock: combat tick gate missing');
await fs.writeFile(file,html);
console.log('Road countdown lock PASS: Road combat tick remains frozen through 3-2-1-FIGHT and camera arrival.');
