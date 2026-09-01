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
  "['crimson','subzero','lebee','senku','anubis']",
  "['crimson','subzero','lebee','senku','tyler','anubis']",
  'battle roster registry'
);

replaceOne(
  "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku']);",
  "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku','Tyler']);",
  'team editor playable roster'
);

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

replaceOne(
  "function fighterDisplayName(name){return owned[name]?.name||name.toUpperCase()}\nfunction fighterTeamImage(name){return owned[name]?.card||''}",
  `function fighterDisplayName(name){
 if(name==='Tyler')return UNIT_DATA?.tyler?.display_name||'Tyler';
 return owned[name]?.name||name.toUpperCase();
}
function fighterTeamImage(name){
 if(name==='Tyler'){
  const rel=UNIT_DATA?.tyler?.assets?.card||UNIT_DATA?.tyler?.assets?.art||'cards/current_collection_card.png';
  return /^assets\\//.test(rel)?rel:'assets/characters/tyler/'+rel;
 }
 return owned[name]?.card||'';
}`,
  'Tyler team editor metadata'
);

replaceOne(
  `function unitIdleFrames(name){
  return CHARACTER_ANIMATION_MAPS[name]?.idle||[];
}`,
  `function unitIdleFrames(name){
  if(name==='Tyler'){
    try{
      const frames=window.BlazingAttackPresentation.canonicalAnimationFrames(canonicalUnit(name),'idle');
      if(frames?.length)return frames;
    }catch(_){}
  }
  return CHARACTER_ANIMATION_MAPS[name]?.idle||[];
}`,
  'Tyler canonical idle routing'
);

for(const marker of [
  "['crimson','subzero','lebee','senku','tyler','anubis']",
  "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku','Tyler']);",
  "const DEFAULT_ACTIVE_TEAM=Object.freeze(['Tyler','Lebee','Sub-Zero']);",
  "const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v3';",
  "canonicalAnimationFrames(canonicalUnit(name),'idle')",
  'assets/characters/tyler/'
])if(!html.includes(marker))throw new Error(`Tyler playable integration: final marker missing: ${marker}`);

await fs.writeFile(file,html);
console.log('Tyler playable integration applied: battle roster + team editor + canonical Tyler visuals + default team enabled.');
