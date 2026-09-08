import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
const html=await fs.readFile(file,'utf8');

const targetMarker='function runTarget(){';
const attackerMarker='function runAttacker(){';
const targetAt=html.indexOf(targetMarker);
const attackerAt=html.indexOf(attackerMarker,targetAt+targetMarker.length);
if(targetAt<0||attackerAt<0||attackerAt<=targetAt){
 throw new Error('Chain attack probe: runTarget/runAttacker sequence not found');
}

// Current engine already resets attackIndex=0 for every queued target. The unresolved
// multi-enemy symptom therefore lives upstream, where each queue item receives its
// attackers array. Probe that construction compactly without dumping the monolithic shell.
const targetHead=html.slice(targetAt,attackerAt).replace(/\s+/g,' ').trim();
if(!/queue\s*\[\s*targetIndex\+\+\s*\]/.test(targetHead)||
   !/enemy\s*=\s*item\.enemy/.test(targetHead)||
   !/attackers\s*=\s*item\.attackers/.test(targetHead)||
   !/attackIndex\s*=\s*0/.test(targetHead)){
 throw new Error(`Chain attack probe: current per-target cursor shape changed :: ${targetHead.slice(0,900)}`);
}

const windowStart=Math.max(0,targetAt-10000);
const before=html.slice(windowStart,targetAt);
const compact=s=>s.replace(/\s+/g,' ').trim();
const hits=[];
for(const token of ['queue','attackers','combo','targets']){
 let from=0;
 while(true){
  const idx=before.indexOf(token,from);
  if(idx<0)break;
  hits.push({token,idx});
  from=idx+token.length;
 }
}
hits.sort((a,b)=>a.idx-b.idx);
const selected=hits.slice(-10).map(({token,idx})=>{
 const start=Math.max(0,idx-320),end=Math.min(before.length,idx+620);
 return `${token}@${idx}: ${compact(before.slice(start,end))}`;
}).join(' || ');

throw new Error(`Chain attack queue probe :: ${selected||'no queue/attackers/combo/targets tokens found before runTarget'}`);
