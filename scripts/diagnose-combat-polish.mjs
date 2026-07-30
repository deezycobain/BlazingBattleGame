import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
const html=await fs.readFile(file,'utf8');

const show=(label,needle,radius=900)=>{
  let start=0,count=0;
  while(count<6){
    const at=html.indexOf(needle,start);
    if(at<0)break;
    count++;
    const lo=Math.max(0,at-radius),hi=Math.min(html.length,at+needle.length+radius);
    console.log(`\n--- DIAG ${label} #${count} @ ${at} ---\n${html.slice(lo,hi)}\n--- END DIAG ${label} #${count} ---`);
    start=at+needle.length;
  }
  if(!count)console.log(`\n--- DIAG ${label}: no matches for ${JSON.stringify(needle)} ---`);
};

show('COMBO','combo',1300);
show('LINKED','linked',1000);
show('RESOLVE_PLAYER','function resolvePlayer',1800);
show('SENKU_EXPLOSION',"senkuExplosion",1300);
show('PREVIEW_HITS','previewHits(',900);
show('TARGET_STROKE','ctx.arc(e.x',900);
show('ENEMY_LOOP','S.enemies',1000);
