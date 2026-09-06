import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
const html=await fs.readFile(file,'utf8');

function compact(text){return text.replace(/\s+/g,' ').trim();}
function probe(label,needle,{limit=5,radius=420}={}){
  const hits=[];
  let at=0;
  while(hits.length<limit){
    const found=html.indexOf(needle,at);
    if(found<0)break;
    hits.push(found);
    at=found+needle.length;
  }
  console.log(`ROAD_PROBE ${label}: ${hits.length} hit(s) for ${JSON.stringify(needle)}`);
  for(let i=0;i<hits.length;i++){
    const pos=hits[i];
    console.log(`ROAD_PROBE ${label}#${i+1}@${pos}: ${compact(html.slice(Math.max(0,pos-radius),Math.min(html.length,pos+needle.length+radius)))}`);
  }
}

probe('LEVEL_BUTTON','level1Btn',{limit:8,radius:340});
probe('VICTORY_FN','function checkVictoryKillshot',{limit:3,radius:650});
probe('VICTORY_CALL','checkVictoryKillshot()',{limit:8,radius:300});
probe('PLAYERS_ASSIGN','S.players=',{limit:8,radius:420});
probe('PHASE_VICTORY',"S.phase='victory'",{limit:5,radius:420});
probe('PHASE_MENU',"S.phase='menu'",{limit:5,radius:420});
probe('START_BATTLE','function startBattle',{limit:5,radius:620});
probe('START_LEVEL','function startLevel',{limit:5,radius:620});
probe('RESET_BATTLE','function resetBattle',{limit:5,radius:620});
probe('VICTORY_OVERLAY','victoryOverlay',{limit:5,radius:420});

console.log('ROAD_PROBE complete');
