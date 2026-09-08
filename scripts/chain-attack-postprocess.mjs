import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

// A linked normal attack is a committed squad sequence for EACH resolved target.
// The legacy engine keeps one attackIndex cursor while runTarget() advances through
// multiple enemies. Without resetting that cursor, target one can consume the squad
// and later targets receive no linked attackers. Reset only the attacker cursor here;
// target selection, damage, animation drivers, and KO behavior stay unchanged.
const targetMarker='function runTarget(){';
const attackerMarker='function runAttacker(){';
const targetAt=html.indexOf(targetMarker);
const attackerAt=html.indexOf(attackerMarker,targetAt+targetMarker.length);
if(targetAt<0||attackerAt<0||attackerAt<=targetAt){
 throw new Error('Chain attack pass: runTarget/runAttacker sequence not found');
}

const targetHead=html.slice(targetAt,attackerAt);
const enemyRx=/(?:const|let)\s+enemy\s*=\s*targets\s*\[\s*targetIndex\+\+\s*\]\s*;?/;
const enemyMatch=enemyRx.exec(targetHead);
if(!enemyMatch){
 const compact=s=>s.replace(/\s+/g,' ').trim();
 const probes=['targetIndex','targets','enemy','attackIndex'].map(token=>{
  const idx=targetHead.indexOf(token);
  if(idx<0)return `${token}:missing`;
  return `${token}@${idx}: ${compact(targetHead.slice(Math.max(0,idx-220),Math.min(targetHead.length,idx+460)))}`;
 }).join(' || ');
 throw new Error(`Chain attack pass: per-target enemy assignment not found :: ${probes}`);
}

const afterEnemy=targetHead.slice(enemyMatch.index+enemyMatch[0].length);
if(!/\battackIndex\s*=\s*0\s*;/.test(afterEnemy)){
 const insertAt=targetAt+enemyMatch.index+enemyMatch[0].length;
 html=html.slice(0,insertAt)+'\n    attackIndex=0;'+html.slice(insertAt);
}

// Build-time regression guard: the reset must live after target selection and before
// runAttacker(), and the historical KO-abort guard must remain removed so every linked
// member still completes its committed animation sequence.
const verifyTargetAt=html.indexOf(targetMarker);
const verifyAttackerAt=html.indexOf(attackerMarker,verifyTargetAt+targetMarker.length);
const verifyHead=html.slice(verifyTargetAt,verifyAttackerAt);
const verifyEnemy=enemyRx.exec(verifyHead);
if(!verifyEnemy)throw new Error('Chain attack pass: verification lost enemy assignment');
const verifyAfterEnemy=verifyHead.slice(verifyEnemy.index+verifyEnemy[0].length);
if(!/^\s*attackIndex\s*=\s*0\s*;/.test(verifyAfterEnemy)){
 throw new Error('Chain attack pass: attacker cursor is not reset immediately per target');
}
const attackerWindow=html.slice(verifyAttackerAt,Math.min(html.length,verifyAttackerAt+9000));
if(!/attackIndex\+\+/.test(attackerWindow)||!/attackIndex\s*>=\s*attackers\.length/.test(attackerWindow)){
 throw new Error('Chain attack pass: linked attacker cursor loop changed unexpectedly');
}
if(/enemy\.hp\s*<=\s*0\s*\|\|\s*attackIndex\s*>=\s*attackers\.length/.test(attackerWindow)){
 throw new Error('Chain attack pass: KO-abort guard regressed and can truncate committed links');
}

await fs.writeFile(file,html);
console.log('Chain attack pass: every resolved target resets the linked attacker cursor; committed KO-safe squad sequencing preserved.');
