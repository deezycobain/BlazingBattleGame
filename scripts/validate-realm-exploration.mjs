import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const runtime=await fs.readFile(path.join(root,'runtime','modes','realm-exploration.js'),'utf8');
const config=await fs.readFile(path.join(root,'runtime','modes','realm-exploration-config.js'),'utf8');
const post=await fs.readFile(path.join(root,'scripts','realm-exploration-postprocess.mjs'),'utf8');
const results=await fs.readFile(path.join(root,'runtime','ui','battle','match-results.js'),'utf8');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
function need(text,marker,label){if(!text.includes(marker))throw new Error('Realm Run validation: '+label+' missing '+marker);}
for(const marker of ["const STORAGE_KEY='bb_realm_run_v1'",'const CONFIG=window.BlazingJourneyConfig','function renderNexus()','function renderRun()','function renderWorldSegments()','function grantResource(state,reward)','function completeRoute(evt)','function replayRoute()','function setAutoRun(value)','function laneShift(delta)','function jump()','function dash()','function applyEncounterToBattle(state,encounter)','function recordBattleVictory(encounter)','function recordBattleDefeat(encounter)','function resumeAfterBattle(result,encounter)','window.BlazingRealmExplorer=Object.freeze'])need(runtime,marker,'runtime');
for(const marker of ['window.BlazingJourneyConfig=freeze','id:\'forest_approach\'','courseLength:3200','id:\'shinobi\'','id:\'frozen\'','id:\'ashen\'','id:\'scout_perch\'','id:\'supply_cache\'','id:\'hidden_scroll\'','id:\'rift_shrine\'','id:\'rogue_patrol\'','id:\'village_gate\'','resource:\'rift_spark\'','resource:\'shinobi_seal\''])need(config,marker,'route config');
for(const marker of ["S.bbRunMode=boss?'castle':bbRealmEncounter?'exploration':'road'",'consumePendingEncounter','applyEncounterToBattle',"S.bbRunMode==='exploration'",'recordBattleVictory','realm-exploration-config.js','realm-exploration.js'])need(post,marker,'postprocess');
for(const marker of ['function returnJourney(s,kind)','resumeAfterBattle','SHINOBI JOURNEY','CONTINUE JOURNEY','RETURN TO ROUTE'])need(results,marker,'match results');
need(String(pkg.scripts?.validate||''),'validate-realm-exploration.mjs','package validate');
need(String(pkg.scripts?.build||''),'realm-exploration-postprocess.mjs','package build');
need(String(pkg.scripts?.['smoke:realm']||''),'realm-exploration-browser-smoke.mjs','package Realm smoke');
console.log('Journey validation PASS: configured route segments, responsive traversal, reusable resources/interactables, completion/replay, patrol handoff, and battle return state are present.');
