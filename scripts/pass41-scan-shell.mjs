import fs from 'node:fs/promises';

const html=await fs.readFile('index.html','utf8');

function extractFunction(name){
  const needle=`function ${name}(`;
  const start=html.indexOf(needle);
  if(start<0)return `===== ${name} =====\nNOT FOUND\n`;
  const brace=html.indexOf('{',start);
  let depth=0,inS=false,inD=false,inT=false,esc=false;
  for(let i=brace;i<html.length;i++){
    const c=html[i];
    if(esc){esc=false;continue;}
    if(c==='\\\\'){esc=true;continue;}
    if(!inD&&!inT&&c==="'")inS=!inS;
    else if(!inS&&!inT&&c==='"')inD=!inD;
    else if(!inS&&!inD&&c==='`')inT=!inT;
    if(inS||inD||inT)continue;
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return `===== ${name} @ ${start} =====\n${html.slice(start,i+1)}\n`;
  }
  return `===== ${name} @ ${start} =====\nUNTERMINATED\n`;
}

function neighborhood(label,needle,before=1800,after=3200){
  const at=html.indexOf(needle);
  if(at<0)return `===== ${label} =====\nNOT FOUND: ${needle}\n`;
  return `===== ${label} @ ${at} =====\n${html.slice(Math.max(0,at-before),Math.min(html.length,at+after))}\n`;
}

let report='PASS 4.1 ANIMATION / FACING CONTRACT AUDIT\n\n';
for(const name of [
  'unitAnimationMap','unitAttackFrames','attackShape','normalShape','jutsuShape','hits',
  'facingFlip','updateFacing','drawUnit','animateLunge','animateFreezeBlast','animateSenkuBomb'
])report+=extractFunction(name)+'\n';

for(const [label,needle,before,after] of [
  ['character animation map construction','CHARACTER_ANIMATION_MAPS',2200,5200],
  ['player drawUnit call','drawUnit(pos.x,pos.y',2600,4200],
  ['basic dispatcher','const runBasicAttack=',2400,4200],
  ['jutsu dispatcher','const runActiveJutsu=',2400,3800],
  ['attack pose assignment','anim.attackPose[unitName]',1000,1800],
  ['Sub-Zero freeze shape path',"u.name==='Sub-Zero'",2200,3800]
])report+=neighborhood(label,needle,before,after)+'\n';

await fs.mkdir('dev-tools',{recursive:true});
await fs.writeFile('dev-tools/pass41-animation-contract.txt',report);
console.log(`Pass 4.1 contract audit wrote ${report.length} chars`);
