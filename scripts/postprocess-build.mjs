import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const file=path.join(ROOT,'dist','index.html');
let html=await fs.readFile(file,'utf8');
const branch=process.env.WORKERS_CI_BRANCH||process.env.BB_BRANCH||'local';
const commit=process.env.WORKERS_CI_COMMIT_SHA||'local';
const isProduction=branch==='main';
const readJson=async p=>JSON.parse(await fs.readFile(path.join(ROOT,p),'utf8'));
const replaceRequired=(oldText,newText,label)=>{
  if(!html.includes(oldText))throw new Error(`Postprocess anchor missing: ${label}`);
  html=html.replace(oldText,newText);
};

// Every indexed character file becomes authoritative in the deployed runtime.
const unitIndex=await readJson('runtime/registry/unit-index.json');
const unitTag=/(<script id="blazing-unit-data">window\.BLAZING_UNIT_DATA=)(\{.*?\})(;<\/script>)/s;
const match=html.match(unitTag);
if(!match)throw new Error('Postprocess: embedded unit data tag missing');
const embedded=JSON.parse(match[2]);
for(const entry of unitIndex.units||[]){
  const unit=await readJson(entry.path);
  if(unit.id!==entry.id)throw new Error(`Postprocess: unit id mismatch for ${entry.path}`);
  embedded[entry.id]=unit;
}
html=html.replace(unitTag,(_,a,_json,c)=>a+JSON.stringify(embedded)+c);
console.log(`Canonical unit sync applied: ${(unitIndex.units||[]).map(x=>x.id).join(', ')}`);

// v0.7 base-team contract. Senku is the canonical lead fighter for a fresh install.
replaceRequired(
  "const DEFAULT_ACTIVE_TEAM=Object.freeze(['Crimson','Lebee','Sub-Zero']);",
  "const DEFAULT_ACTIVE_TEAM=Object.freeze(['Senku','Lebee','Sub-Zero']);",
  'default active team'
);
// Bump the pre-release storage key once so browsers carrying the historical
// Crimson-first default do not keep overriding the new canonical base team.
replaceRequired(
  "const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v1';",
  "const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v2';",
  'active team storage version'
);

// Mobile team-editor feedback belongs above the action button so the browser
// chrome/safe-area cannot hide the confirmation below the fold.
replaceRequired(
  '<div class="teamActions">\n      <button id="saveTeamBtn" class="saveTeamBtn">SAVE ACTIVE TEAM</button>\n      <div id="teamSaved" class="teamSaved" aria-live="polite"></div>\n    </div>',
  '<div class="teamActions">\n      <div id="teamSaved" class="teamSaved" aria-live="polite"></div>\n      <button id="saveTeamBtn" class="saveTeamBtn">SAVE ACTIVE TEAM</button>\n    </div>',
  'team save confirmation placement'
);
const teamUiStyle=`<style id="bb-team-mobile-fit">
#teamScreen .teamActions{display:flex;flex-direction:column;gap:8px;padding-bottom:max(12px,env(safe-area-inset-bottom));}
#teamScreen #teamSaved{order:0;min-height:20px;margin:0;text-align:center;line-height:1.3;font-size:11px;font-weight:800;color:#85f0a5;}
#teamScreen #saveTeamBtn{order:1;flex:0 0 auto;}
@media(max-width:700px){#teamScreen .teamBody{padding-bottom:calc(18px + env(safe-area-inset-bottom));}#teamScreen .teamActions{position:relative;z-index:2;}}
</style>`;
html=html.replace(/<\/head>/i,`${teamUiStyle}</head>`);
console.log('Base team updated to Senku/Lebee/Sub-Zero; team-save feedback moved above button');

const meta=`<script>window.BB_BUILD_META=Object.freeze({branch:${JSON.stringify(branch)},commit:${JSON.stringify(commit)},environment:${JSON.stringify(isProduction?'production':'preview')},canonicalRuntime:true});<\/script>`;
html=html.replace(/<head([^>]*)>/i,`<head$1>${meta}`);

if(!isProduction){
  const spawnRx=/function teamSpawnOptions\(name\)\{.*?\n\}/s;
  if(!spawnRx.test(html))throw new Error('Dev postprocess: teamSpawnOptions anchor missing');
  html=html.replace(spawnRx,"function teamSpawnOptions(name){\n // Preview/dev only: all playable units start at max chakra.\n return {startingChakra:'full'};\n}");

  const speedAnchor="mark:d.combat.mark,speed:d.stats.speed,attack:d.stats.attack,defense:d.stats.defense,";
  if(!html.includes(speedAnchor))throw new Error('Dev postprocess: runtime speed anchor missing');
  html=html.replace(speedAnchor,"mark:d.combat.mark,speed:(d.role==='playable'?200:(d.role==='boss'?50:d.stats.speed)),attack:d.stats.attack,defense:d.stats.defense,");

  const bossAnchor="speed:canonicalUnit('anubis').stats.speed,attack:canonicalUnit('anubis').stats.attack";
  if(html.includes(bossAnchor))html=html.replace(bossAnchor,"speed:50,attack:canonicalUnit('anubis').stats.attack");

  const devConfig=`<script>window.BB_DEV_CONFIG=Object.freeze({enabled:true,startPlayableAtMaxChakra:true,playerSpeed:200,bossSpeed:50});<\/script>`;
  html=html.replace(/<head([^>]*)>/i,`<head$1>${devConfig}`);
  console.log(`Preview overrides applied for ${branch}: playable chakra=max, player speed=200, boss speed=50`);
}else{
  console.log('Production build: canonical unit starts/speeds only; no dev combat overrides');
}

await fs.writeFile(file,html);
console.log(`Build metadata embedded: branch=${branch} commit=${commit.slice(0,12)}`);
