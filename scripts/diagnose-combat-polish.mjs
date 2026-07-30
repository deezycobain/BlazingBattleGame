import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
const html=await fs.readFile(file,'utf8');

const show=(label,needle,radius=900,max=10)=>{
  let start=0,count=0;
  while(count<max){
    const at=html.indexOf(needle,start);
    if(at<0)break;
    count++;
    const lo=Math.max(0,at-radius),hi=Math.min(html.length,at+needle.length+radius);
    console.log(`\n--- DIAG ${label} #${count} @ ${at} ---\n${html.slice(lo,hi)}\n--- END DIAG ${label} #${count} ---`);
    start=at+needle.length;
  }
  if(!count)console.log(`\n--- DIAG ${label}: no matches for ${JSON.stringify(needle)} ---`);
};

console.log('Combat polish diagnostic pass v3');
show('COMBO_MEMBERS_FN','function comboMembers',1800,4);
show('COMBO_MEMBERS_CALL','comboMembers(',1500,12);
show('ATTACK_INDEX','attackIndex',1700,12);
show('RUN_BASIC','runBasicAttack',1700,12);
show('HELPER','helper',1500,12);
show('LINKED_ATTACK','linkedAttack',1700,12);
show('RESOLVE_PLAYER','function resolvePlayer',5000,2);
show('SENKU_EXPLOSION',"senkuExplosion",1800,4);
show('TARGET_FEEDBACK','// Target feedback is part of the enemy',1800,4);
