import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const file=path.join(ROOT,'dist','index.html');
const html=await fs.readFile(file,'utf8');
const outDir=path.join(ROOT,'dist','_debug');
await fs.mkdir(outDir,{recursive:true});

const needles=[
  'Link Attack',
  'comboMembers(',
  'attackPose',
  'ATTACK_SPRITES',
  'unitAttackFrames',
  'function animateLunge',
  'animateSenkuBomb',
  'runBasicAttack',
  'runHelper',
  'finishAction()',
  'targets='
];

const chunks=[];
for(const needle of needles){
  let from=0,count=0;
  while(count<16){
    const i=html.indexOf(needle,from);
    if(i<0)break;
    const start=Math.max(0,i-1800);
    const end=Math.min(html.length,i+4200);
    chunks.push(`\n===== ${needle} @ ${i} =====\n${html.slice(start,end)}\n`);
    from=i+needle.length;
    count++;
  }
}

await fs.writeFile(path.join(outDir,'runtime-extract.txt'),chunks.join('\n'),'utf8');
console.log(`Legacy runtime inspection emitted ${chunks.length} context blocks`);
