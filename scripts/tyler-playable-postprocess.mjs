import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const replaceOne=(from,to,label)=>{
  const fromCount=html.split(from).length-1;
  const toCount=html.split(to).length-1;
  if(fromCount===1){html=html.replace(from,to);return;}
  if(fromCount===0&&toCount===1)return;
  throw new Error(`Tyler playable integration: expected one ${label}, found source=${fromCount}, target=${toCount}`);
};

replaceOne(
  "const DEFAULT_ACTIVE_TEAM=Object.freeze(['Senku','Lebee','Sub-Zero']);",
  "const DEFAULT_ACTIVE_TEAM=Object.freeze(['Tyler','Lebee','Sub-Zero']);",
  'default active team'
);
replaceOne(
  "const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v2';",
  "const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v3';",
  'team storage version'
);

if(!html.includes('"tyler"')||!html.includes('assets/characters/tyler/data/unit.json')&& !html.includes('"display_name":"Tyler"')){
  // Canonical unit sync serializes the unit object, not its source path; the display name marker is the normal build contract.
  if(!html.includes('"display_name":"Tyler"'))throw new Error('Tyler playable integration: canonical Tyler unit was not embedded into the production shell');
}

await fs.writeFile(file,html);
console.log('Tyler playable integration applied: Tyler is on the fresh default team; saved-team storage bumped to v3.');
