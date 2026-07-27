import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const file=path.join(ROOT,'dist','index.html');
let html=await fs.readFile(file,'utf8');
const branch=process.env.WORKERS_CI_BRANCH||process.env.BB_BRANCH||'local';
const commit=process.env.WORKERS_CI_COMMIT_SHA||'local';
const isProduction=branch==='main';
const readJson=async p=>JSON.parse(await fs.readFile(path.join(ROOT,p),'utf8'));

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