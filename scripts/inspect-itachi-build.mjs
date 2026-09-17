import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
const html=await fs.readFile(file,'utf8');
const probes=[
  'function unitIdleFrames(name)',
  'function unitAttackFrames(name,kind)',
  'function animateFreezeBlast(',
  'function animateLebeeStarBlast(',
  'function animateSenkuChemicalReaction(',
  'const useJutsu=',
  'if(useJutsu)',
  "u.name==='Sub-Zero'",
  'isAllySupportJutsu(',
  'runBasicAttack=',
  'function finishAction('
];
for(const needle of probes){
  const at=html.indexOf(needle);
  console.log(`\n===== ITACHI BUILD PROBE: ${needle} @ ${at} =====`);
  if(at<0)continue;
  const start=Math.max(0,at-900),end=Math.min(html.length,at+3600);
  console.log(html.slice(start,end));
}
console.log('\nItachi build inspection complete.');
