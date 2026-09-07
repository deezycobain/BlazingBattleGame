import fs from 'node:fs/promises';
const html=await fs.readFile('index.html','utf8');
function topLevelFunction(name){
 const start=html.indexOf(`function ${name}(`);
 if(start<0){console.log(`MISSING ${name}`);return;}
 const next=html.indexOf('\nfunction ',start+12);
 const end=next<0?Math.min(html.length,start+12000):next;
 console.log(`\n===== EXACT ${name} =====\n${html.slice(start,end)}\n===== END ${name} =====\n`);
}
for(const name of ['teamSpawnOptions','setBattleMap','fresh','tick','cpuTurn','startBattle'])topLevelFunction(name);
