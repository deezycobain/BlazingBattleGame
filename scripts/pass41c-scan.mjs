import fs from 'node:fs/promises';

const html=await fs.readFile('index.html','utf8');
const anchors=[
  'const SENKU_CHEM_CAST_FRAMES',
  'const CHARACTER_ANIMATION_MAPS',
  'function unitAttackFrames',
  'function drawUnit',
  'function attackProxy',
  'function animateSenkuBomb',
  'function animateLunge',
  'selectBasicPresentation(canonicalUnit(au.name)',
  "basicPresentation.runtimeDriver==='animateSenkuBomb'?animateSenkuBomb:animateLunge",
  'function bodyFacingRotation',
  'function updateFacing',
  'function clampToBattlefield',
  'const BATTLE_BOUNDS'
];
for(const anchor of anchors){
  const at=html.indexOf(anchor);
  console.log(`\n===== ${anchor} @ ${at} =====`);
  if(at<0)continue;
  const start=Math.max(0,at-700);
  const end=Math.min(html.length,at+6500);
  console.log(html.slice(start,end));
}
