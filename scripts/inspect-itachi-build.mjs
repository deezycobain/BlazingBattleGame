import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
const html=await fs.readFile(file,'utf8');
const probes=[
  'const CHARACTER_ANIMATION_MAPS',
  'const ACTIVE_PLAYABLE_UNITS',
  "['crimson','subzero','lebee','senku','tyler','anubis']",
  'function unitIdleFrames(name)',
  'function unitAttackFrames(name,kind)',
  'function animateFreezeBlast(',
  'function animateLebeeStarBlast(',
  'function animateSenkuChemicalReaction(',
  "else if(f.kind==='senkuAllyHealProjectile')",
  "else if(f.kind==='senkuBombProjectile')",
  'if(useJutsu)',
  "u.name==='Sub-Zero'",
  'runBasicAttack=',
  'function finishAction('
];
for(const needle of probes){
  const at=html.indexOf(needle);
  console.log(`\n===== ITACHI BUILD PROBE: ${needle} @ ${at} =====`);
  if(at<0)continue;
  const start=Math.max(0,at-1200),end=Math.min(html.length,at+5200);
  console.log(html.slice(start,end));
}
console.log('\nItachi build inspection complete.');
