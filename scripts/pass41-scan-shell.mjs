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

function neighborhood(label,needle,radius=2200){
  const hits=[];let from=0;
  while(true){const at=html.indexOf(needle,from);if(at<0)break;hits.push(at);from=at+needle.length;}
  let out=`===== ${label}: ${needle} (${hits.length} hits) =====\n`;
  for(const at of hits.slice(0,12))out+=`--- @ ${at} ---\n${html.slice(Math.max(0,at-radius),Math.min(html.length,at+radius))}\n`;
  return out;
}

const declared=[...html.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]);
const interestingNames=declared.filter(n=>/(lunge|combo|chain|attack|basic|facing|freeze|senku|target|unit|sprite|shape)/i.test(n));

let report='PASS 4.1 GAMEPLAY STABILIZATION AUDIT\n\n';
report+=`Interesting function declarations (${interestingNames.length}):\n${interestingNames.join('\n')}\n\n`;
for(const name of [
  'unitAttackFrames','attackProxy','drawUnit','animateLunge','animateSenkuBomb','animateFreezeBlast',
  'updateFacing','facingFlip','normalShape','jutsuShape','hits'
])report+=extractFunction(name)+'\n';
for(const name of interestingNames.filter(n=>/(combo|chain)/i.test(n)))report+=extractFunction(name)+'\n';
for(const [label,needle] of [
  ['attack pose reads','attackPose'],
  ['attack sprite reads','ATTACK_SPRITES'],
  ['animateLunge calls','animateLunge('],
  ['combo state','combo'],
  ['Sub-Zero references','Sub-Zero'],
  ['Senku references','Senku'],
  ['facing flip calls','facingFlip('],
  ['shape selection','jutsuShape('],
  ['draw shape calls','drawShape(']
])report+=neighborhood(label,needle)+'\n';

await fs.mkdir('dev-tools',{recursive:true});
await fs.writeFile('dev-tools/pass41-gameplay-audit.txt',report);
console.log(`Pass 4.1 audit wrote ${report.length} chars`);
