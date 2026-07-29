import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const current=await fs.readFile('index.html','utf8');
const baseline=execFileSync('git',['show','refs/remotes/origin/pass41-solid:index.html'],{encoding:'utf8',maxBuffer:80*1024*1024});

function extractFunction(src,name){
  const needle=`function ${name}(`;
  const start=src.indexOf(needle);
  if(start<0)return null;
  const brace=src.indexOf('{',start);
  let depth=0,inS=false,inD=false,inT=false,esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(esc){esc=false;continue;}
    if(c==='\\\\'){esc=true;continue;}
    if(!inD&&!inT&&c==="'")inS=!inS;
    else if(!inS&&!inT&&c==='"')inD=!inD;
    else if(!inS&&!inD&&c==='`')inT=!inT;
    if(inS||inD||inT)continue;
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return src.slice(start,i+1);
  }
  return null;
}

function around(src,needle,before=1800,after=3200){
  const at=src.indexOf(needle);
  return at<0?null:src.slice(Math.max(0,at-before),Math.min(src.length,at+after));
}

function section(label,a,b){
  const same=a===b;
  return `===== ${label}: ${same?'SAME':'DIFFERENT'} =====\n--- SOLID BASELINE ---\n${b??'NOT FOUND'}\n--- CURRENT PASS 4 ---\n${a??'NOT FOUND'}\n`;
}

let out='PASS 4.1 CURRENT VS V0.7 SOLID BASELINE\n\n';
for(const name of ['unitAttackFrames','facingFlip','updateFacing','drawUnit','animateLunge','animateFreezeBlast','animateSenkuBomb']){
  out+=section(`function ${name}`,extractFunction(current,name),extractFunction(baseline,name))+'\n';
}
for(const [label,needle] of [
  ['character animation maps','CHARACTER_ANIMATION_MAPS'],
  ['basic dispatcher','const runBasicAttack='],
  ['player draw call','drawUnit(pos.x,pos.y'],
  ['jutsu range draw','drawShape(p,u'],
  ['Sub-Zero Jutsu routing',"u.name==='Sub-Zero'"]
])out+=section(label,around(current,needle),around(baseline,needle))+'\n';

await fs.mkdir('dev-tools',{recursive:true});
await fs.writeFile('dev-tools/pass41-baseline-compare.txt',out);
console.log(`Pass 4.1 baseline comparison wrote ${out.length} chars`);
