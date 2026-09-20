import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const runtime=await fs.readFile(path.join(root,'runtime','modes','realm-exploration.js'),'utf8');
const post=await fs.readFile(path.join(root,'scripts','realm-exploration-postprocess.mjs'),'utf8');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));

function requireMarker(text,marker,label){
  if(!text.includes(marker))throw new Error(`Realm exploration validation: ${label} missing ${marker}`);
}

for(const marker of [
  "const STORAGE_KEY='bb_realm_exploration_v1'",
  "id:'shinobi'",
  "id:'frozen'",
  "id:'ashen'",
  "id:'rift_shrine'",
  "id:'supply_cache'",
  "id:'rogue_patrol'",
  "id:'north_gate'",
  'function renderNexus()',
  'function renderExplore()',
  'function moveTo(x,y)',
  'function applyEncounterToBattle(state,encounter)',
  'function recordBattleVictory(encounter)',
  'window.BlazingRealmExplorer=Object.freeze'
])requireMarker(runtime,marker,'runtime');

for(const marker of [
  "S.bbRunMode=boss?'castle':bbRealmEncounter?'exploration':'road'",
  'consumePendingEncounter',
  'applyEncounterToBattle',
  "S.bbRunMode==='exploration'",
  'recordBattleVictory',
  'realm-exploration.js'
])requireMarker(post,marker,'postprocess');

const validate=String(pkg.scripts?.validate||'');
const build=String(pkg.scripts?.build||'');
requireMarker(validate,'validate-realm-exploration.mjs','package validate');
requireMarker(build,'realm-exploration-postprocess.mjs','package build');

const officialAt=build.indexOf('official-dev-shell-postprocess.mjs');
const realmAt=build.indexOf('realm-exploration-postprocess.mjs');
if(officialAt<0||realmAt<0||realmAt<officialAt)throw new Error('Realm exploration validation: realm postprocess must run after official dev shell integration');

console.log('Realm exploration validation PASS: Nexus, persistent exploration, interaction POIs, isolated battle handoff, and return-state hooks are present.');
