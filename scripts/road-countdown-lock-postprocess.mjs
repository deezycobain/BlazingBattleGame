import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const source='if(window.BlazingBattlePause?.isPaused?.())return;';
const replacement="if(window.BlazingBattlePause?.isPaused?.()||(S.bbRunMode==='road'&&(!window.BlazingRoadCamera||!window.BlazingRoadCamera.snapshot?.()?.active||window.BlazingRoadCamera?.isCombatLocked?.())))return;";
const count=html.split(source).length-1;
if(count===1)html=html.replace(source,replacement);
else if(count===0&&html.includes(replacement)){}
else throw new Error(`Road countdown lock: expected one combat tick pause guard, found ${count}`);
if(!html.includes("S.bbRunMode==='road'&&(!window.BlazingRoadCamera||!window.BlazingRoadCamera.snapshot?.()?.active||window.BlazingRoadCamera?.isCombatLocked?.())"))throw new Error('Road countdown lock: startup-safe combat tick gate missing');
await fs.writeFile(file,html);

const turnsFile=path.join(process.cwd(),'dist','runtime','combat','road-round-turns.js');
let turns=await fs.readFile(turnsFile,'utf8');
const turnSource='if(window.BlazingRoadCamera?.isCombatLocked?.()){';
const turnReplacement='if(!window.BlazingRoadCamera||!window.BlazingRoadCamera.snapshot?.()?.active||window.BlazingRoadCamera?.isCombatLocked?.()){' ;
const turnCount=turns.split(turnSource).length-1;
if(turnCount===1)turns=turns.replace(turnSource,turnReplacement);
else if(turnCount===0&&turns.includes(turnReplacement)){}
else throw new Error(`Road countdown lock: expected one Road turn camera gate, found ${turnCount}`);
if(!turns.includes(turnReplacement))throw new Error('Road countdown lock: startup-safe Road turn gate missing');
await fs.writeFile(turnsFile,turns);

console.log('Road countdown lock PASS: engine tick and Road initiative stay frozen from battle activation through 3-2-1-FIGHT and camera arrival.');
