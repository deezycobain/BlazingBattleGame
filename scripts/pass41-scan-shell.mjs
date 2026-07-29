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

function allNeighborhoods(label,needle,before=1000,after=1800,max=12){
  let out=`===== ${label}: ${needle} =====\n`,from=0,count=0;
  while(count<max){
    const at=html.indexOf(needle,from);if(at<0)break;
    out+=`--- HIT ${count+1} @ ${at} ---\n${html.slice(Math.max(0,at-before),Math.min(html.length,at+after))}\n`;
    from=at+needle.length;count++;
  }
  return out+`TOTAL SHOWN: ${count}\n`;
}

let report='PASS 4.1 ANIMATION / FACING CONTRACT AUDIT\n\n';
for(const name of [
  'unitAnimationMap','unitAttackFrames','hits','facingFlip','updateFacing','drawUnit',
  'animateLunge','animateFreezeBlast','animateSenkuBomb'
])report+=extractFunction(name)+'\n';

for(const [label,needle,before,after] of [
  ['ATTACK_SPRITES construction','const ATTACK_SPRITES',1400,6500],
  ['character animation map construction','CHARACTER_ANIMATION_MAPS',2200,5200],
  ['basic dispatcher','const runBasicAttack=',2400,4200],
  ['jutsu dispatcher','const runActiveJutsu=',2400,3800],
  ['canonical runtime shape mapping','jutsuShape:d.combat.jutsu_shape',2200,3200]
])report+=neighborhood(label,needle,before,after)+'\n';

report+=allNeighborhoods('drawUnit call sites','drawUnit(',1200,2200,10)+'\n';
report+=allNeighborhoods('facingFlip call sites','facingFlip(',1200,2200,10)+'\n';
report+=allNeighborhoods('drawShape call sites','drawShape(',1000,1800,10)+'\n';

await fs.mkdir('dev-tools',{recursive:true});
await fs.writeFile('dev-tools/pass41-animation-contract.txt',report);
console.log(`Pass 4.1 contract audit wrote ${report.length} chars`);
