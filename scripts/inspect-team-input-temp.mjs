import fs from 'node:fs/promises';

const html=await fs.readFile('index.html','utf8');
const markers=[
  'const owned=',
  'let owned=',
  'owned={',
  'const cvs=',
  'let cvs=',
  'cvs=document',
  '<canvas',
  'touch-action',
  'pointer-events',
  'ACTIVE_PLAYABLE_UNITS',
  "['crimson','subzero','lebee','senku','anubis']"
];
for(const marker of markers){
  let at=html.indexOf(marker);
  console.log(`\n===== MARKER ${marker} @ ${at} =====`);
  if(at<0)continue;
  const start=Math.max(0,at-2200),end=Math.min(html.length,at+5200);
  console.log(html.slice(start,end));
}
