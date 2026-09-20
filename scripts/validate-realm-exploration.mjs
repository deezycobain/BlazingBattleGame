import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const runtime=await fs.readFile(path.join(root,'runtime','modes','realm-exploration.js'),'utf8');
const post=await fs.readFile(path.join(root,'scripts','realm-exploration-postprocess.mjs'),'utf8');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
function need(text,marker,label){if(!text.includes(marker))throw new Error('Realm Run validation: '+label+' missing '+marker);}
for(const marker of ["const STORAGE_KEY='bb_realm_run_v1'","const COURSE_LENGTH=3200","id:'shinobi'","id:'frozen'","id:'ashen'","id:'supply_cache'","id:'rift_shrine'","id:'rogue_patrol'","id:'village_gate'",'function renderNexus()','function renderRun()','function setAutoRun(value)','function laneShift(delta)','function jump()','function dash()','function applyEncounterToBattle(state,encounter)','function recordBattleVictory(encounter)','window.BlazingRealmExplorer=Object.freeze'])need(runtime,marker,'runtime');
for(const marker of ["S.bbRunMode=boss?'castle':bbRealmEncounter?'exploration':'road'",'consumePendingEncounter','applyEncounterToBattle',"S.bbRunMode==='exploration'",'recordBattleVictory','realm-exploration.js'])need(post,marker,'postprocess');
need(String(pkg.scripts?.validate||''),'validate-realm-exploration.mjs','package validate');
need(String(pkg.scripts?.build||''),'realm-exploration-postprocess.mjs','package build');
need(String(pkg.scripts?.['smoke:realm']||''),'realm-exploration-browser-smoke.mjs','package Realm smoke');
console.log('Realm Run validation PASS: side-scrolling traversal, route lanes, jump/dash, pickups, patrol handoff, and return state are present.');
