import fs from 'node:fs/promises';

const html=await fs.readFile('index.html','utf8');
const markers=[
  'DEFAULT_ACTIVE_TEAM',
  'TEAM_STORAGE_KEY',
  'saveTeamBtn',
  'teamGrid',
  'function renderTeam',
  'function loadActiveTeam',
  'function saveActiveTeam',
  "addEventListener('touchstart'",
  'addEventListener("touchstart"',
  "addEventListener('touchmove'",
  'addEventListener("touchmove"',
  'getBoundingClientRect()',
  'const canvas=',
  'querySelector(\'canvas\')'
];
for(const marker of markers){
  let at=html.indexOf(marker);
  console.log(`\n===== MARKER ${marker} @ ${at} =====`);
  if(at<0)continue;
  const start=Math.max(0,at-1800),end=Math.min(html.length,at+3600);
  console.log(html.slice(start,end));
}
