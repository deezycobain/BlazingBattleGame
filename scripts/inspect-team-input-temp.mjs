import fs from 'node:fs/promises';

const html=await fs.readFile('index.html','utf8');
const markers=[
  'IDLE_SPRITES[name]',
  'IDLE_SPRITES[',
  'SPRITES[name]',
  'CHARACTER_ANIMATION_MAPS',
  'function drawUnit',
  'function unitSprite',
  'function bodySprite',
  'function getSprite',
  'function fighterTeamImage',
  'setActiveTeam(teamDraft)'
];
for(const marker of markers){
  let at=html.indexOf(marker);
  console.log(`\n===== MARKER ${marker} @ ${at} =====`);
  if(at<0)continue;
  const start=Math.max(0,at-2600),end=Math.min(html.length,at+6500);
  console.log(html.slice(start,end));
}
