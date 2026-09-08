import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

const normalQueueRx=/let queue=\[\],anyCombo=false;\s*targets\.forEach\(enemy=>\{\s*let members=comboMembers\(enemy,p\),attackers=\[p,\.\.\.members\.filter\(x=>x!==p\)\];\s*if\(attackers\.length>1\)anyCombo=true;\s*queue\.push\(\{enemy,attackers\}\)\s*\}\);\s*let chakraGain=1\+\(anyCombo\?1:0\);/;
const matches=[...html.matchAll(new RegExp(normalQueueRx.source,'g'))];
if(matches.length!==1)throw new Error(`Chain attack pass: expected one normal linked queue, found ${matches.length}`);

html=html.replace(normalQueueRx,`let linkedMembers=[];
 targets.forEach(enemy=>{
  comboMembers(enemy,p).forEach(member=>{
   if(member!==p&&!linkedMembers.includes(member))linkedMembers.push(member);
  });
 });
 let committedAttackers=[p,...linkedMembers];
 let anyCombo=committedAttackers.length>1;
 let queue=targets.map(enemy=>({enemy,attackers:[...committedAttackers]}));
 let chakraGain=1+(anyCombo?1:0);`);

// A Link is committed at action level. Once a helper is tied into this resolved
// multi-target Basic, that same squad attacks every target in the action. Jutsu helper
// selection remains untouched and may still be evaluated per target.
if(!/let linkedMembers=\[\];[\s\S]{0,700}let committedAttackers=\[p,\.\.\.linkedMembers\];[\s\S]{0,300}let queue=targets\.map\(enemy=>\(\{enemy,attackers:\[\.\.\.committedAttackers\]\}\)\);/.test(html)){
 throw new Error('Chain attack pass: committed multi-target squad was not installed');
}

const targetMarker='function runTarget(){';
const attackerMarker='function runAttacker(){';
const targetAt=html.indexOf(targetMarker);
const attackerAt=html.indexOf(attackerMarker,targetAt+targetMarker.length);
if(targetAt<0||attackerAt<0||attackerAt<=targetAt)throw new Error('Chain attack pass: runTarget/runAttacker sequence not found');
const targetHead=html.slice(targetAt,attackerAt);
if(!/let item=queue\[targetIndex\+\+\],enemy=item\.enemy,attackers=item\.attackers,attackIndex=0;/.test(targetHead.replace(/\s+/g,' '))){
 throw new Error('Chain attack pass: per-target committed squad cursor changed unexpectedly');
}
const attackerWindow=html.slice(attackerAt,Math.min(html.length,attackerAt+9000));
if(!/attackIndex\+\+/.test(attackerWindow)||!/attackIndex\s*>=\s*attackers\.length/.test(attackerWindow)){
 throw new Error('Chain attack pass: linked attacker cursor loop changed unexpectedly');
}
if(/enemy\.hp\s*<=\s*0\s*\|\|\s*attackIndex\s*>=\s*attackers\.length/.test(attackerWindow)){
 throw new Error('Chain attack pass: KO-abort guard regressed and can truncate committed links');
}

await fs.writeFile(file,html);
console.log('Chain attack pass: linked squad is committed once across every resolved Basic target; KO-safe full squad sequencing preserved.');
