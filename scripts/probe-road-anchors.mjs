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

probe('FRESH_FN','function fresh()',{limit:3,radius:1800});
probe('FRESH_BOSS_FN','function freshBoss()',{limit:3,radius:1400});
probe('ALIVE_PLAYERS','function alivePlayers',{limit:5,radius:900});
probe('FRONT_FN','function front(',{limit:5,radius:900});
probe('SAVED_TEAM','function savedTeamNames',{limit:5,radius:1100});
probe('SAVED_TEAM_CALL','savedTeamNames()',{limit:8,radius:700});
probe('PLAYERS_KEY','players:',{limit:12,radius:650});
probe('UNITS_KEY','units:',{limit:12,radius:650});
probe('TEAM_KEY','team:',{limit:12,radius:650});
probe('PARTY_KEY','party:',{limit:12,radius:650});
probe('FIGHTERS_KEY','fighters:',{limit:12,radius:650});
probe('S_PLAYERS','S.players',{limit:12,radius:650});
probe('S_UNITS','S.units',{limit:12,radius:650});
probe('S_TEAM','S.team',{limit:12,radius:650});
probe('START_BATTLE','function startBattle',{limit:3,radius:1900});
probe('VICTORY_SEQUENCE','function startVictorySequence',{limit:3,radius:1200});
probe('LEVEL_CLICK','level1Btn.addEventListener',{limit:5,radius:900});

console.log('ROAD_PROBE complete');
