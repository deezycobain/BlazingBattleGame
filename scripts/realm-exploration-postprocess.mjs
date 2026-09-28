import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const SCRIPT_ID='bb-realm-exploration-runtime';
const CONFIG_ID='bb-realm-exploration-config';

// Keep this compatible with Road's persisted-save recovery wrapper.  This pass
// runs after the Road pass and needs to own the same startup block.
const battleAnchor=/S=boss\?freshBoss\(\):fresh\(\);\n   S\.bbRunMode=boss\?'castle':'road';\n   if\(!boss\)\{[\s\S]*?\n   \}\n   S\._chargeSince=performance\.now\(\);/g;

const battleReplacement=`S=boss?freshBoss():fresh();
   const bbRealmEncounter=!boss?window.BlazingRealmExplorer?.consumePendingEncounter?.():null;
   S.bbRunMode=boss?'castle':bbRealmEncounter?'exploration':'road';
   if(bbRealmEncounter)window.BlazingRealmExplorer?.applyEncounterToBattle?.(S,bbRealmEncounter);
   else if(!boss){
    try{beginRoadBattle()}catch(error){
     console.warn('[Blazing Battle] Road entry recovery: rebuilding saved run.',error);
     try{window.BlazingRoadRun?.clearRun?.()}catch(_){ }
     try{beginRoadBattle()}catch(recoveryError){
      console.error('[Blazing Battle] Road entry recovery failed; continuing with a fresh Stage 1 battle.',recoveryError);
      S.bbRoadRun=null;S.bbRoadStage=1;S.log='BLAZING ROAD — Stage 1. Saved run was reset for compatibility.';
     }
    }
   }
   S._chargeSince=performance.now();`;

const battleHits=[...html.matchAll(battleAnchor)].length;
if(battleHits!==1)throw new Error(`Realm exploration integration: expected one battle entry anchor, found ${battleHits}`);
html=html.replace(battleAnchor,battleReplacement);

const victoryAnchor=` const roadRun=recordRoadVictory();
 const victoryMode=S.bbRunMode==='road'?'road':S.bbRunMode==='castle'?'castle':null;`;
const victoryReplacement=` const roadRun=recordRoadVictory();
 if(S.bbRunMode==='exploration')window.BlazingRealmExplorer?.recordBattleVictory?.(S.bbRealmEncounter);
 const victoryMode=S.bbRunMode==='road'?'road':S.bbRunMode==='castle'?'castle':null;`;
const victoryHits=html.split(victoryAnchor).length-1;
if(victoryHits!==1)throw new Error(`Realm exploration integration: expected one victory anchor, found ${victoryHits}`);
html=html.replace(victoryAnchor,victoryReplacement);

html=html
  .replace(new RegExp(`<script\\b[^>]*id=["']${SCRIPT_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${SCRIPT_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${CONFIG_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${CONFIG_ID}["'][^>]*/>`,'gi'),'');

const body=html.toLowerCase().lastIndexOf('</body>');
if(body<0)throw new Error('Realm exploration integration: closing body missing');
html=html.slice(0,body)+`<script id="${CONFIG_ID}" src="runtime/modes/realm-exploration-config.js"></script><script id="${SCRIPT_ID}" src="runtime/modes/realm-exploration.js"></script>`+html.slice(body);

for(const marker of [
  SCRIPT_ID,
  CONFIG_ID,
  'realm-exploration-config.js',
  'bbRealmEncounter',
  "S.bbRunMode=boss?'castle':bbRealmEncounter?'exploration':'road'",
  'consumePendingEncounter',
  'applyEncounterToBattle',
  "S.bbRunMode==='exploration'",
  'recordBattleVictory'
]){
  if(!html.includes(marker))throw new Error(`Realm exploration integration: built shell missing ${marker}`);
}

await fs.writeFile(file,html);
console.log('Realm exploration integration PASS: World Nexus runtime injected and exploration encounters isolated from Blazing Road progression.');
