import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const file=path.join(ROOT,'dist','index.html');
let html=await fs.readFile(file,'utf8');
const branch=process.env.WORKERS_CI_BRANCH||process.env.BB_BRANCH||'local';
const commit=process.env.WORKERS_CI_COMMIT_SHA||'local';
const isProduction=branch==='main';

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
  console.log('Production build: no dev combat overrides applied');
}

await fs.writeFile(file,html);
console.log(`Build metadata embedded: branch=${branch} commit=${commit.slice(0,12)}`);