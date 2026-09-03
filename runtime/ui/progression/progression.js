(()=>{
'use strict';
const KEY='blazing.progression.v1';
const MAX_RESONANCE=5,STAT_BUDGET=12,MAX_STAT=5;
const FIGHTERS=['Crimson','Sub-Zero','Lebee','Senku','Tyler'];
const IDS={'Crimson':'crimson','Sub-Zero':'subzero','Lebee':'lebee','Senku':'senku','Tyler':'tyler'};
const STATS=['hp','attack','defense','speed'];
const LABELS={hp:'HP',attack:'ATK',defense:'DEF',speed:'SPD'};
let state=load(),selected='Tyler',candidate=null;
const BASE_RUNTIME=typeof BATTLE_ROSTER==='undefined'?{}:Object.fromEntries(FIGHTERS.filter(name=>BATTLE_ROSTER[name]).map(name=>[name,{...BATTLE_ROSTER[name]}]));

function freshUnit(){return {resonance:0,shards:0,shiny:false,roll:null,locks:[]}}
function fresh(){return {version:1,totalPulls:0,units:Object.fromEntries(FIGHTERS.map(name=>[name,freshUnit()]))}}
function load(){try{const parsed=JSON.parse(localStorage.getItem(KEY)||'null');const base=fresh();if(!parsed)return base;for(const name of FIGHTERS)base.units[name]={...freshUnit(),...(parsed.units?.[name]||{})};base.totalPulls=Number(parsed.totalPulls)||0;return base}catch(_){return fresh()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));applyCombatBonuses();refreshInventoryBadges()}
function unit(name=selected){return state.units[name]||(state.units[name]=freshUnit())}
function art(name){
 try{const card=cardForSummon(name);if(card)return card}catch(_){}
 const data=window.BLAZING_UNIT_DATA?.[IDS[name]];const rel=data?.assets?.card||data?.assets?.art;
 return rel?`assets/characters/${IDS[name]}/${rel}`:'';
}
function weightedRarity(name){return name==='Tyler'?'super':'legendary'}
function randomCore(){const name=FIGHTERS[Math.floor(Math.random()*FIGHTERS.length)];return {name,rarity:weightedRarity(name)}}
function rollStats(locks=[],current=null){
 const next={hp:0,attack:0,defense:0,speed:0};let remaining=STAT_BUDGET;
 for(const stat of locks){const value=Math.max(0,Math.min(MAX_STAT,Number(current?.[stat])||0));next[stat]=value;remaining-=value}
 const open=STATS.filter(stat=>!locks.includes(stat));
 while(remaining>0){const available=open.filter(stat=>next[stat]<MAX_STAT);if(!available.length)break;const pick=available[Math.floor(Math.random()*available.length)];next[pick]++;remaining--}
 return next;
}
function buildName(roll){if(!roll)return 'UNROLLED';const top=[...STATS].sort((a,b)=>roll[b]-roll[a]);if(roll[top[0]]===roll[top[3]])return 'PERFECT BALANCE';return top[0]==='speed'?'LIGHTNING SOUL':top[0]==='defense'?'IRON BODY':top[0]==='hp'?'TITAN HEART':'BERSERKER';}
function applyCombatBonuses(){
 if(typeof BATTLE_ROSTER==='undefined')return;
 for(const name of FIGHTERS){
  const base=BASE_RUNTIME[name],target=BATTLE_ROSTER[name];if(!base||!target)continue;
  const u=unit(name),rank=u.resonance||0,roll=u.roll||{};
  const hpMultiplier=1+rank*.01+(roll.hp||0)*.025;
  const attackMultiplier=1+rank*.01+(roll.attack||0)*.025;
  const defenseMultiplier=1+rank*.01+(roll.defense||0)*.03;
  const speedMultiplier=1+rank*.005+(roll.speed||0)*.015;
  target.maxHp=Math.round(base.maxHp*hpMultiplier);target.hp=target.maxHp;
  target.attack=Math.round(base.attack*attackMultiplier);
  target.defense=Math.round(base.defense*defenseMultiplier);
  target.speed=Math.round(base.speed*speedMultiplier);
  target.jutsuDamage=Math.round(base.jutsuDamage*(target.attack/base.attack));
 }
}
function applyPull(pull){
 const u=unit(pull.name);state.totalPulls++;
 if(u.resonance<MAX_RESONANCE){u.resonance++;pull.progress=`R${u.resonance}/${MAX_RESONANCE}`;pull.isNew=u.resonance===1;if(u.resonance===MAX_RESONANCE){u.shiny=true;u.roll=rollStats();pull.shinyUnlock=true}}
 else{u.shards++;pull.progress=`SHARD +1`;pull.isNew=false}
 pull.resonance=u.resonance;pull.shards=u.shards;save();return pull;
}
function pipHtml(u){return `<div class="resonancePips">${Array.from({length:5},(_,i)=>`<i class="${i<u.resonance?'on ':''}${u.shiny&&i===4?'shinyPip':''}"></i>`).join('')}</div>`}
function statsHtml(roll,locks=[],candidateMode=false){return `<div class="forgeStats ${candidateMode?'candidate':''}">${STATS.map(stat=>`<div class="forgeStat ${locks.includes(stat)?'locked':''}" data-stat="${stat}"><button type="button" data-lock="${stat}">${locks.includes(stat)?'🔒 ':''}${LABELS[stat]}</button><div class="statTrack"><i style="width:${(roll?.[stat]||0)*20}%"></i></div><div class="statValue">${roll?.[stat]??'—'}/5</div></div>`).join('')}</div>`}
function forgeMarkup(){return `<div class="forgeShell"><header class="forgeHeader"><button id="forgeBack" class="forgeBack" aria-label="Back">‹</button><h1>RESONANCE FORGE<small>DUPLICATE AWAKENING • STAT DESTINY</small></h1><div class="forgeResource"><small>REROLL SHARDS</small><span id="forgeShardCount">0</span> ✦</div></header><nav id="forgeRoster" class="forgeRoster" aria-label="Fighters"></nav><main class="forgeBody"><section id="forgeCard" class="forgeCard"><img id="forgePortrait" class="forgePortrait" alt=""><div id="forgeName" class="forgeName"></div><div id="forgeRank" class="forgeRank"></div><div id="forgePips"></div></section><section class="forgePanel"><h2>STAT DESTINY</h2><p class="forgeHelp">Every Resonance rank adds a small core combat boost. Reach R5 to unlock Shiny status and a randomized 12-point build. Lock up to two stats before rerolling; you always choose whether to keep or replace your build.</p><div class="forgeScaling"><span>RANK</span> +1% HP / ATK / DEF • +0.5% SPD<br><span>POINT</span> +2.5% HP / ATK • +3% DEF • +1.5% SPD</div><div id="forgeCurrent"></div><div id="forgeBuildName" class="forgeBuildName"></div><div id="forgeCandidate" class="forgeCandidate"><h3>NEW DESTINY ROLL</h3><div id="forgeCandidateStats"></div><div id="forgeCandidateName" class="forgeBuildName"></div></div><div class="forgeActions"><button id="forgeReroll" class="primary">REROLL STATS</button><button id="forgeKeep" style="display:none">KEEP CURRENT</button><button id="forgeAccept" class="accept" style="display:none">ACCEPT NEW</button></div><div id="forgeStatus" class="forgeStatus" aria-live="polite"></div><div class="forgeDevNote">Changes apply to the next battle. Extra R5 copies become reroll shards. Summon currency is unlimited in development.</div><button id="forgeDevReset" class="forgeDevReset">RESET DEV PROGRESSION</button></section></main></div>`}
function installDom(){
 const menuActions=document.querySelector('#menuScreen .menuActions');if(menuActions&&!document.getElementById('forgeBtn'))menuActions.insertAdjacentHTML('beforeend','<button id="forgeBtn" class="forgeNode" aria-label="Open Resonance Forge"><span class="forgeWord">FORGE</span><span class="forgeSigil">✦</span></button>');
 if(!document.getElementById('resonanceScreen')){const screen=document.createElement('div');screen.id='resonanceScreen';screen.className='screen';screen.innerHTML=forgeMarkup();document.body.appendChild(screen)}
 const shop=document.querySelector('#summonScreen .summonShopHeader');if(shop&&!document.getElementById('summonForgeBtn'))shop.insertAdjacentHTML('afterend','<div class="bb-summon-tools"><button id="summonForgeBtn" class="bb-forge-launch">OPEN RESONANCE FORGE</button></div>');
 document.getElementById('forgeBtn')?.addEventListener('click',()=>openForge('Tyler'));
 document.getElementById('summonForgeBtn')?.addEventListener('click',()=>openForge(selected));
 document.getElementById('forgeBack')?.addEventListener('click',closeForge);
 document.getElementById('forgeReroll')?.addEventListener('click',reroll);
 document.getElementById('forgeKeep')?.addEventListener('click',()=>{candidate=null;renderForge('Current build kept.')});
 document.getElementById('forgeAccept')?.addEventListener('click',acceptRoll);
 document.getElementById('forgeDevReset')?.addEventListener('click',resetDevProgression);
 document.getElementById('forgeRoster')?.addEventListener('click',ev=>{const btn=ev.target.closest('[data-fighter]');if(btn){selected=btn.dataset.fighter;candidate=null;renderForge()}});
 document.getElementById('forgeCurrent')?.addEventListener('click',ev=>{const btn=ev.target.closest('[data-lock]');if(btn)toggleLock(btn.dataset.lock)});
}
function openForge(name){selected=FIGHTERS.includes(name)?name:'Tyler';candidate=null;document.querySelectorAll('.screen').forEach(s=>{if(s.id!=='resonanceScreen')s.classList.remove('active')});const menu=document.getElementById('menuScreen');if(menu)menu.style.display='none';document.getElementById('resonanceScreen').classList.add('active');renderForge();window.scrollTo(0,0)}
function closeForge(){document.getElementById('resonanceScreen').classList.remove('active');const menu=document.getElementById('menuScreen');if(menu){menu.style.display='grid';menu.classList.remove('leaving')}}
function renderForge(message=''){
 const u=unit();const maxed=u.resonance>=MAX_RESONANCE;
 document.getElementById('forgeRoster').innerHTML=FIGHTERS.map(name=>{const x=unit(name);return `<button class="forgeFighter ${name===selected?'active':''} ${x.resonance>=5?'maxed':''}" data-fighter="${name}">${name}<small>${x.resonance>=5?'SHINY • ':''}R${x.resonance}/5 • ${x.shards} ✦</small></button>`}).join('');
 const card=document.getElementById('forgeCard');card.classList.toggle('shiny',u.shiny);const portrait=document.getElementById('forgePortrait');portrait.src=art(selected);portrait.alt=`${selected} card`;
 document.getElementById('forgeName').textContent=selected.toUpperCase();const rank=document.getElementById('forgeRank');rank.textContent=maxed?'SHINY AWAKENED':`RESONANCE ${u.resonance} / 5`;rank.classList.toggle('shinyText',maxed);document.getElementById('forgePips').innerHTML=pipHtml(u);document.getElementById('forgeShardCount').textContent=u.shards;
 document.getElementById('forgeCurrent').innerHTML=statsHtml(u.roll,u.locks);document.getElementById('forgeBuildName').textContent=maxed?buildName(u.roll):`${5-u.resonance} MORE DUPLICATE${5-u.resonance===1?'':'S'} TO AWAKEN`;
 const box=document.getElementById('forgeCandidate');box.classList.toggle('active',!!candidate);document.getElementById('forgeCandidateStats').innerHTML=candidate?statsHtml(candidate,[],true):'';document.getElementById('forgeCandidateName').textContent=candidate?buildName(candidate):'';
 const reroll=document.getElementById('forgeReroll');reroll.disabled=!maxed||!!candidate;reroll.textContent=maxed?`REROLL • ${1+u.locks.length} ✦`:'R5 REQUIRED';document.getElementById('forgeKeep').style.display=candidate?'block':'none';document.getElementById('forgeAccept').style.display=candidate?'block':'none';document.getElementById('forgeStatus').textContent=message;
}
function toggleLock(stat){const u=unit();if(!u.roll||candidate)return;if(u.locks.includes(stat))u.locks=u.locks.filter(x=>x!==stat);else if(u.locks.length<2)u.locks.push(stat);else return renderForge('Only two stats can be locked.');save();renderForge()}
function reroll(){const u=unit();if(u.resonance<5)return;const cost=1+u.locks.length;if(u.shards<cost)return renderForge(`Need ${cost} shard${cost===1?'':'s'}. Summon another ${selected} duplicate.`);u.shards-=cost;candidate=rollStats(u.locks,u.roll);save();renderForge('New roll ready. Keep your current build or accept this one.')}
function acceptRoll(){if(!candidate)return;const u=unit();u.roll=candidate;candidate=null;save();renderForge('New destiny accepted.')}
function resetDevProgression(){if(!confirm('Reset all summon duplicates, Shiny unlocks, shards, and stat rolls?'))return;state=fresh();candidate=null;save();renderForge('Developer progression reset. Summon to build Resonance again.')}
function refreshInventoryBadges(){document.querySelectorAll('.unitTile[data-unit]').forEach(tile=>{const name=tile.dataset.unit;if(!state.units[name])return;let badge=tile.querySelector('.bb-resonance-badge');if(!badge){badge=document.createElement('span');badge.className='bb-resonance-badge';tile.appendChild(badge)}const u=unit(name);badge.textContent=u.resonance>=5?'SHINY':`R${u.resonance}/5`;badge.classList.toggle('maxed',u.resonance>=5)})}
function activateSummons(){
 summonEmbers=999999;document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>{el.textContent='∞';el.classList.add('bb-dev-infinity')});
 spendEmbers=function(){document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>el.textContent='∞');return true};
 rosterForRarity=function(){return FIGHTERS};summonOne=function(){return randomCore()};
 const launch=launchSummonSequence;launchSummonSequence=function(pulls){pulls.forEach(applyPull);return launch(pulls)};
 multiSummonBtn.addEventListener('click',event=>{event.stopImmediatePropagation();launchSummonSequence(Array.from({length:10},()=>randomCore()))},true);
 const setup=setupPullCard;setupPullCard=function(pull,index,total){setup(pull,index,total);const badge=document.getElementById('pullNewBadge');if(badge)badge.textContent=pull.shinyUnlock?'SHINY!':pull.progress||'DUPE';document.getElementById('pullMessage').textContent=pull.shinyUnlock?'SHINY AWAKENING!':'RESONANCE ENERGY GATHERING...'};
 const results=renderDedicatedResults;renderDedicatedResults=function(pulls){results(pulls);[...document.querySelectorAll('#pullResultsGrid .pullCard')].forEach((card,i)=>card.insertAdjacentHTML('beforeend',`<div class="rarity">${pulls[i].progress}${pulls[i].shinyUnlock?' • SHINY UNLOCKED':''}</div>`));};
 document.getElementById('summonsBtn')?.addEventListener('click',()=>{populateSummonShopArt();document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>el.textContent='∞')});
 const badge=document.querySelector('#summonScreen .testSummonBadge');if(badge)badge.textContent='DEV CORE BANNER • UNLIMITED EMBERS • DUPES BUILD RESONANCE';
 const featured=document.querySelector('#summonScreen .showcaseSubline');if(featured)featured.textContent='ALL FIVE PLAYABLE FIGHTERS • EQUAL DEV TEST ODDS';
}
installDom();activateSummons();applyCombatBonuses();refreshInventoryBadges();
window.BlazingProgression=Object.freeze({getState:()=>JSON.parse(JSON.stringify(state)),openForge,rollStats,buildName,applyPull,applyCombatBonuses});
})();
