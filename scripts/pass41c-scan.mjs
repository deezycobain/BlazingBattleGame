import fs from 'node:fs/promises';

const html=await fs.readFile('index.html','utf8');
const anchors=[
  'function unitAttackFrames',
  'function attackProxy',
  'function animateSenkuBomb',
  'function animateLunge',
  'selectBasicPresentation(canonicalUnit(au.name)',
  "basicPresentation.runtimeDriver==='animateSenkuBomb'?animateSenkuBomb:animateLunge",
  'function bodyFacingRotation',
  'function updateFacing',
  'function clamp(',
  'const W=',
  'const H='
];
for(const anchor of anchors){
  const at=html.indexOf(anchor);
  console.log(`\n===== ${anchor} @ ${at} =====`);
  if(at<0)continue;
  const start=Math.max(0,at-500);
  const end=Math.min(html.length,at+5000);
  console.log(html.slice(start,end));
}
