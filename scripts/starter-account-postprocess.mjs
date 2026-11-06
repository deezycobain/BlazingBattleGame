import fs from 'node:fs/promises';
import path from 'node:path';
const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const one=(from,to,label)=>{
 const count=html.split(from).length-1;
 if(count!==1)throw new Error('Starter account: expected one '+label+', found '+count);
 html=html.replace(from,to);
};
const oneRx=(rx,to,label)=>{
 const matches=html.match(new RegExp(rx.source,rx.flags.includes('g')?rx.flags:rx.flags+'g'))||[];
 if(matches.length!==1)throw new Error('Starter account: expected one '+label+', found '+matches.length);
 html=html.replace(rx,to);
};
oneRx(/const DEFAULT_ACTIVE_TEAM=Object\.freeze\(\[[^\]]+\]\);/,
 "const DEFAULT_ACTIVE_TEAM=Object.freeze(window.BlazingCollection?.testMode?['Itachi',null,'Obito',null,'Scorpion',null]:['Tyler',null,'Sub-Zero',null,'Senku',null]);",
 'starter team');
// Keep QA team edits separate from the real account, including existing team saves.
one("const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v6';",
 "const TEAM_STORAGE_KEY=window.BlazingCollection?.testMode?'blazingBattle.animationTestTeam.v1':'blazingBattle.activeTeam.v6';",
 'isolated animation test team storage');
oneRx(/function validActiveTeam\(team\)\{[\s\S]*?\n\}/,
 ["function validActiveTeam(team){",
  " if(!Array.isArray(team)||team.length!==6)return false;",
  " const names=team.filter(name=>typeof name==='string'&&name.length>0);",
  " return names.length>=3 && new Set(names).size===names.length &&",
  "   names.every(name=>ACTIVE_PLAYABLE_UNITS.includes(name) && window.BlazingCollection?.owns?.(name));",
  "}"].join('\n'), 'team ownership validation');
const pairRx=/function buildPlayerPairs\(y\)\{[\s\S]*?\n\}\nconst ACTIVE_BOSSES/;
const pair=html.match(pairRx);
if(!pair||!pair[0].includes('if(!BATTLE_ROSTER[name])'))throw new Error('Starter account: paired fighter builder missing');
html=html.replace(pairRx,pair[0].replace('if(!BATTLE_ROSTER[name])','if(!name||!BATTLE_ROSTER[name])'));
oneRx(/(<script id="blazing-unit-data">window\.BLAZING_UNIT_DATA=\{.*?\};<\/script>)/s,
 match=>match+'<script id="bb-starter-collection" src="runtime/core/starter-collection.js"></script>',
 'collection runtime before team initialization');
one('function activateSummons(){',[
"function activateSummons(){",
" const syncWallet=()=>{",
"  summonEmbers=Math.max(0,Number(window.BlazingEconomy?.emberBalance?.()??0));",
"  document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>{el.textContent=String(summonEmbers);el.classList.remove('bb-dev-infinity')});",
" };",
" const payForPull=(count,create)=>{",
"  if(!window.BlazingEconomy?.spendEmbers?.(count)){",
"   const panel=document.getElementById('bbSummonActions')||document.getElementById('summonScreen');",
"   if(panel){let note=panel.querySelector('#bbStarterBudgetNotice');if(!note){note=document.createElement('p');note.id='bbStarterBudgetNotice';note.setAttribute('role','status');panel.appendChild(note)}",
"    note.textContent='Not enough Embers. Earn Blazing Coins in battles and exchange 300 Coins for 1 Ember.'}",
"   syncWallet();return false;",
"  }",
"  const note=document.getElementById('bbStarterBudgetNotice');if(note)note.textContent='';",
"  syncWallet();launchSummonSequence(create());return true;",
" };",
" window.addEventListener('bb:economy',syncWallet);"
].join('\n'),'summon budget setup');
one("summonEmbers=999999;document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>{el.textContent='∞';el.classList.add('bb-dev-infinity')});",
 "syncWallet();", 'unlimited summon wallet');
one("spendEmbers=function(){document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>el.textContent='∞');return true};",
 "spendEmbers=function(count=1){const result=window.BlazingEconomy?.spendEmbers?.(count)??false;syncWallet();return result};",
 'free summon debit');
one("multiSummonBtn.addEventListener('click',event=>{event.stopImmediatePropagation();launchSummonSequence(Array.from({length:10},()=>randomCore()))},true);",
 "singleSummonBtn.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();payForPull(1,()=>[randomCore()])},true);\n  multiSummonBtn.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();payForPull(10,()=>Array.from({length:10},()=>randomCore()))},true);",
 'single and multi paid summon actions');
one('pulls.forEach(applyPull);','pulls.forEach(pull=>{applyPull(pull);window.BlazingCollection?.unlock?.(pull.name)});','summon unlock persistence');
one("document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>el.textContent='∞')","syncWallet()",'summon menu wallet refresh');
if(html.includes('launchSummonSequence([randomTreasury()])'))one('launchSummonSequence([randomTreasury()])','payForPull(1,()=>[randomTreasury()])','treasury single cost');
if(html.includes('launchSummonSequence(Array.from({length:10},()=>randomTreasury()))'))one('launchSummonSequence(Array.from({length:10},()=>randomTreasury()))','payForPull(10,()=>Array.from({length:10},()=>randomTreasury()))','treasury ten cost');
html=html.replace("singleSummonBtn.querySelector('span').textContent='UNLIMITED • DEV'","singleSummonBtn.querySelector('span').textContent='1 EMBER'");
html=html.replace("multiSummonBtn.querySelector('span').textContent='UNLIMITED • DEV'","multiSummonBtn.querySelector('span').textContent='10 EMBERS'");
html=html.replaceAll('FREE TEST PULLS • DUPLICATES BANKED','EMBERS REQUIRED • DUPLICATES BANKED');
html=html.replaceAll('UNLIMITED EMBERS','LIMITED EMBERS');
html=html.replaceAll('Summon pulls remain unlimited in development.','Summon pulls require earned Embers.');
html=html.replaceAll('Development pulls are free and use equal test odds.','Summons require earned Embers and use equal odds.');
// Empty partner slots are legal in a new account, and must not crash Edit Team.
one("function fighterDisplayName(name){if(owned[name]?.name)return owned[name].name;try{return canonicalUnit(name)?.display_name||name.toUpperCase()}catch(_){return name.toUpperCase()}}","function fighterDisplayName(name){if(!name)return 'EMPTY SLOT';if(owned[name]?.name)return owned[name].name;try{return canonicalUnit(name)?.display_name||String(name).toUpperCase()}catch(_){return String(name).toUpperCase()}}",'nullable partner display name');
const style='<style id="bb-starter-locked-style">#teamScreen .unitTile[data-bb-locked="true"]{opacity:.42!important;filter:grayscale(.8)!important;cursor:not-allowed!important}#teamScreen .unitTile[data-bb-locked="true"]:after{content:"LOCKED";position:absolute;inset:auto 0 0;text-align:center;background:rgba(18,17,21,.84);color:#fff;padding:4px;font:bold 11px system-ui;pointer-events:none}</style>';
one('</head>',style+'</head>','locked team styling');
for(const marker of ['bb-starter-collection','payForPull(10','BlazingCollection?.unlock',"testMode?['Itachi',null,'Obito',null,'Scorpion',null]",'blazingBattle.animationTestTeam.v1','bb-starter-locked-style'])if(!html.includes(marker))throw new Error('Starter account: missing '+marker);
await fs.writeFile(file,html);
console.log('Starter account rules: three normal starters; isolated animation-test team Itachi / Obito / Scorpion; saved summons and limited Ember wallet.');
