(()=>{
'use strict';
const KEY='blazing.progression.v1';
const MAX_RESONANCE=5,STAT_BUDGET=12,MAX_STAT=5;
const FIGHTERS=['Crimson','Sub-Zero','Lebee','Senku','Tyler'];
const IDS={'Crimson':'crimson','Sub-Zero':'subzero','Lebee':'lebee','Senku':'senku','Tyler':'tyler'};
const CARD_ART={
 'Crimson':'assets/characters/crimson/art/current_collection_art.jpg',
 'Sub-Zero':'assets/characters/subzero/art/full_art_absolute_zero_v2.jpeg',
 'Lebee':'assets/characters/lebee/art/full_art_cosmic_wish.jpeg',
 'Senku':'assets/characters/senku/cards/senku_card.jpeg',
 'Tyler':'assets/characters/tyler/cards/current_collection_card.png'
};
const FORGE_ART={
 'Crimson':'assets/characters/crimson/art/current_collection_art.jpg',
 'Sub-Zero':'assets/characters/subzero/art/full_art_absolute_zero_v2.jpeg',
 'Lebee':'assets/characters/lebee/art/full_art_cosmic_wish.jpeg',
 'Senku':'assets/characters/senku/art/senku_full_art.jpeg',
 'Tyler':'assets/characters/tyler/art/current_collection_art.png'
};
const SHINY_CUTOUT={
 'Sub-Zero':'assets/characters/subzero/art/shiny_foreground_cutout_v2.webp',
 'Tyler':'assets/characters/tyler/art/shiny_foreground_cutout_v1.webp'
};
const STATS=['hp','attack','defense','speed'];
const LABELS={hp:'HP',attack:'ATK',defense:'DEF',speed:'SPD'};
let state=load(),selected='Tyler',candidate=null,activeSummonPulls=[];
const BASE_RUNTIME=typeof BATTLE_ROSTER==='undefined'?{}:Object.fromEntries(FIGHTERS.filter(name=>BATTLE_ROSTER[name]).map(name=>[name,{...BATTLE_ROSTER[name]}]));

function freshUnit(){return {resonance:0,shards:0,shiny:false,roll:null,locks:[]}}
function fresh(){return {version:1,totalPulls:0,units:Object.fromEntries(FIGHTERS.map(name=>[name,freshUnit()]))}}
function load(){try{const parsed=JSON.parse(localStorage.getItem(KEY)||'null');const base=fresh();if(!parsed)return base;for(const name of FIGHTERS)base.units[name]={...freshUnit(),...(parsed.units?.[name]||{})};base.totalPulls=Number(parsed.totalPulls)||0;return base}catch(_){return fresh()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));applyCombatBonuses();refreshInventoryBadges()}
function unit(name=selected){return state.units[name]||(state.units[name]=freshUnit())}
function art(name){
 if(FORGE_ART[name])return FORGE_ART[name];
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
function forgeMarkup(){return `<div class="forgeShell"><header class="forgeHeader"><button id="forgeBack" class="forgeBack" aria-label="Back">‹</button><h1>RESONANCE FORGE<small>DUPLICATE AWAKENING • STAT DESTINY</small></h1><div class="forgeResource"><small>REROLL SHARDS</small><span id="forgeShardCount">0</span> ✦</div></header><nav id="forgeRoster" class="forgeRoster" aria-label="Fighters"></nav><main class="forgeBody"><section id="forgeCard" class="forgeCard"><div class="forgeArtDepth"><div class="forgeArtStage"><img id="forgePortrait" class="forgePortrait" alt=""><span class="forgeHoloTexture" aria-hidden="true"></span></div><img id="forgePopout" class="forgePopout" alt="" hidden><span class="forgeShinyStamp">SHINY EDITION</span></div><div id="forgeName" class="forgeName"></div><div id="forgeRank" class="forgeRank"></div><div id="forgePips"></div></section><section class="forgePanel"><h2>STAT DESTINY</h2><p class="forgeHelp">Every Resonance rank adds a small core combat boost. Reach R5 to unlock Shiny status and a randomized 12-point build. Lock up to two stats before rerolling; you always choose whether to keep or replace your build.</p><div class="forgeScaling"><span>RANK</span> +1% HP / ATK / DEF • +0.5% SPD<br><span>POINT</span> +2.5% HP / ATK • +3% DEF • +1.5% SPD</div><div id="forgeCurrent"></div><div id="forgeBuildName" class="forgeBuildName"></div><div id="forgeCandidate" class="forgeCandidate"><h3>NEW DESTINY ROLL</h3><div id="forgeCandidateStats"></div><div id="forgeCandidateName" class="forgeBuildName"></div></div><div class="forgeActions"><button id="forgeReroll" class="primary">REROLL STATS</button><button id="forgeKeep" style="display:none">KEEP CURRENT</button><button id="forgeAccept" class="accept" style="display:none">ACCEPT NEW</button></div><div id="forgeStatus" class="forgeStatus" aria-live="polite"></div><div class="forgeDevNote">Changes apply to the next battle. Extra R5 copies become reroll shards. Summon currency is unlimited in development.</div><button id="forgeDevReset" class="forgeDevReset">RESET DEV PROGRESSION</button></section></main></div>`}
function summonLobbyMarkup(){return `<section class="bb-summon-lobby" aria-labelledby="bbSummonTitle"><div class="bb-banner-copy"><div class="bb-banner-kicker">CORE RESONANCE BANNER</div><h1 id="bbSummonTitle">SUMMON FIGHTERS.<br><span>AWAKEN THEIR BUILD.</span></h1><p>Duplicates raise Resonance from R1 to R5. Maxed fighters awaken Shiny and unlock randomized stat builds in the Forge.</p><div class="bb-banner-roster" aria-label="Available fighters"><span>CRIMSON</span><span>SUB-ZERO</span><span>LEBEE</span><span>SENKU</span><span>TYLER</span></div></div><div class="bb-featured-card"><div class="bb-featured-label">BANNER SPOTLIGHT</div><img src="${CARD_ART.Tyler}" alt="Tyler featured card art"><div><strong>TYLER</strong><span>SUPER RARE • CORE ROSTER</span></div></div><div class="bb-resonance-path"><span><b>R1–R4</b> CORE STAT BOOSTS</span><i>›</i><span><b>R5</b> SHINY AWAKENING</span><i>›</i><span><b>EXTRAS</b> FORGE SHARDS</span></div><div id="bbSummonActions" class="bb-summon-actions"></div><div class="bb-summon-secondary"><button id="summonForgeBtn" class="bb-forge-launch">OPEN RESONANCE FORGE</button><details class="bb-banner-details"><summary>BANNER DETAILS</summary><p>Five playable fighters • equal 20% development odds • unlimited Embers • every pull advances that fighter's Resonance.</p></details></div></section>`}
function installSummonOverhaul(){
 const shell=document.querySelector('#summonScreen .summonShopShell'),header=shell?.querySelector('.summonShopHeader');
 if(shell&&header&&!document.getElementById('bbSummonActions')){shell.classList.add('bb-summon-overhaul');header.insertAdjacentHTML('afterend',summonLobbyMarkup());const actions=document.getElementById('bbSummonActions');actions.append(singleSummonBtn,multiSummonBtn);singleSummonBtn.querySelector('span').textContent='UNLIMITED • DEV';multiSummonBtn.querySelector('span').textContent='UNLIMITED • DEV';multiSummonBtn.querySelector('em').textContent='10 RESONANCE PULLS'}
 const pullHeader=document.querySelector('#summonPullScreen .summonShopHeader');
 if(pullHeader&&!document.getElementById('bbSkipReveal'))pullHeader.insertAdjacentHTML('beforeend','<button id="bbSkipReveal" class="bb-skip-reveal" type="button">SKIP TO RESULTS</button>');
 const tap=document.getElementById('pullTapArea');
 if(tap&&!document.getElementById('bbRevealActions')){const bar=document.createElement('div');bar.id='bbRevealActions';bar.className='bb-reveal-actions';nextPullBtn.before(bar);bar.appendChild(nextPullBtn);bar.insertAdjacentHTML('beforeend','<button id="bbRevealForge" class="bb-reveal-forge" type="button">OPEN IN FORGE</button>')}
 const revealMeta=document.querySelector('#summonPullScreen .pullCardMeta'),revealBadge=document.getElementById('pullNewBadge');if(revealMeta&&revealBadge)revealMeta.before(revealBadge);
 const title=document.querySelector('#pullResultsPanel .pullResultsTitle');if(title&&!document.getElementById('bbShinySummary'))title.insertAdjacentHTML('afterend','<div id="bbShinySummary" class="bb-shiny-summary" hidden></div>');
}
function installTylerPopoutFraming(){
 if(document.getElementById('bbTylerPopoutFramingV2'))return;
 const style=document.createElement('style');style.id='bbTylerPopoutFramingV2';
 style.textContent='.forgeCard[data-fighter="tyler"] .forgePopout{-webkit-mask-image:linear-gradient(to right,#000 0 8%,rgba(0,0,0,.92) 11%,transparent 19%),linear-gradient(to bottom,#000 0 5.5%,rgba(0,0,0,.92) 7%,transparent 10.5%),radial-gradient(ellipse 24% 10% at 26% 98%,#000 0 48%,rgba(0,0,0,.92) 62%,transparent 82%);mask-image:linear-gradient(to right,#000 0 8%,rgba(0,0,0,.92) 11%,transparent 19%),linear-gradient(to bottom,#000 0 5.5%,rgba(0,0,0,.92) 7%,transparent 10.5%),radial-gradient(ellipse 24% 10% at 26% 98%,#000 0 48%,rgba(0,0,0,.92) 62%,transparent 82%)}';
 document.head.appendChild(style);
}
function installDom(){
 const menuActions=document.querySelector('#menuScreen .menuActions');if(menuActions&&!document.getElementById('forgeBtn'))menuActions.insertAdjacentHTML('beforeend','<button id="forgeBtn" class="forgeNode" aria-label="Open Resonance Forge"><span class="forgeWord">FORGE</span><span class="forgeSigil">✦</span></button>');
 if(!document.getElementById('resonanceScreen')){const screen=document.createElement('div');screen.id='resonanceScreen';screen.className='screen';screen.innerHTML=forgeMarkup();document.body.appendChild(screen)}
 installSummonOverhaul();
 document.getElementById('forgeBtn')?.addEventListener('click',()=>openForge('Tyler'));
 document.getElementById('summonForgeBtn')?.addEventListener('click',()=>openForge(selected));
 document.getElementById('bbSkipReveal')?.addEventListener('click',showSummonResultsNow);
 document.getElementById('bbRevealForge')?.addEventListener('click',()=>openForge(document.getElementById('pullCardWrap')?.dataset.fighter));
 document.getElementById('forgeBack')?.addEventListener('click',closeForge);
 document.getElementById('forgeReroll')?.addEventListener('click',reroll);
 document.getElementById('forgeKeep')?.addEventListener('click',()=>{candidate=null;renderForge('Current build kept.')});
 document.getElementById('forgeAccept')?.addEventListener('click',acceptRoll);
 document.getElementById('forgeDevReset')?.addEventListener('click',resetDevProgression);
 document.getElementById('forgeRoster')?.addEventListener('click',ev=>{const btn=ev.target.closest('[data-fighter]');if(btn){selected=btn.dataset.fighter;candidate=null;renderForge()}});
 document.getElementById('forgeCurrent')?.addEventListener('click',ev=>{const btn=ev.target.closest('[data-lock]');if(btn)toggleLock(btn.dataset.lock)});
}
function showSummonResultsNow(){
 if(!activeSummonPulls.length)return;
 ++summonSequenceToken;if(nextPullResolver){nextPullResolver();nextPullResolver=null}
 renderDedicatedResults(activeSummonPulls);
}
function openForge(name){selected=FIGHTERS.includes(name)?name:'Tyler';candidate=null;document.querySelectorAll('.screen').forEach(s=>{if(s.id!=='resonanceScreen')s.classList.remove('active')});const menu=document.getElementById('menuScreen');if(menu)menu.style.display='none';const screen=document.getElementById('resonanceScreen');screen.classList.add('active');screen.scrollTop=0;renderForge();window.scrollTo(0,0)}
function closeForge(){document.getElementById('resonanceScreen').classList.remove('active');const menu=document.getElementById('menuScreen');if(menu){menu.style.display='grid';menu.classList.remove('leaving')}}
function fitForgeArtwork(image){
 const depth=image.closest('.forgeArtDepth'),ratio=image.naturalWidth&&image.naturalHeight?image.naturalWidth/image.naturalHeight:.75;if(!depth)return;
 depth.style.setProperty('--forge-art-ratio',String(ratio));depth.style.setProperty('--forge-art-max',`${Math.min(520,Math.round(430*ratio))}px`);
}
function renderForge(message=''){
 const u=unit();const maxed=u.resonance>=MAX_RESONANCE;
 document.getElementById('forgeRoster').innerHTML=FIGHTERS.map(name=>{const x=unit(name);return `<button class="forgeFighter ${name===selected?'active':''} ${x.resonance>=5?'maxed':''}" data-fighter="${name}">${name}<small>${x.resonance>=5?'SHINY • ':''}R${x.resonance}/5 • ${x.shards} ✦</small></button>`}).join('');
 const card=document.getElementById('forgeCard'),cutout=u.shiny?SHINY_CUTOUT[selected]:null;card.classList.toggle('shiny',u.shiny);card.classList.toggle('hasPopout',!!cutout);card.dataset.fighter=IDS[selected];const portrait=document.getElementById('forgePortrait');portrait.onload=()=>fitForgeArtwork(portrait);portrait.src=art(selected);portrait.alt=`${selected} card`;if(portrait.complete)fitForgeArtwork(portrait);const popout=document.getElementById('forgePopout');popout.hidden=!cutout;popout.alt=cutout?`${selected} Shiny foreground`:'';if(cutout)popout.src=cutout;else popout.removeAttribute('src');
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
 cardForSummon=function(name){return CARD_ART[name]||''};
 summonEmbers=999999;document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>{el.textContent='∞';el.classList.add('bb-dev-infinity')});
 spendEmbers=function(){document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>el.textContent='∞');return true};
 rosterForRarity=function(){return FIGHTERS};summonOne=function(){return randomCore()};
 const launch=launchSummonSequence;launchSummonSequence=function(pulls){activeSummonPulls=pulls;pulls.forEach(applyPull);summonPullScreen.scrollTop=0;pullScene.scrollTop=0;return launch(pulls)};
 multiSummonBtn.addEventListener('click',event=>{event.stopImmediatePropagation();launchSummonSequence(Array.from({length:10},()=>randomCore()))},true);
 const setup=setupPullCard;setupPullCard=function(pull,index,total){setup(pull,index,total);const wrap=document.getElementById('pullCardWrap'),badge=document.getElementById('pullNewBadge'),forge=document.getElementById('bbRevealForge');wrap.dataset.fighter=pull.name;wrap.dataset.rarity=pull.rarity;pullScene.classList.toggle('bb-shiny-awakening',!!pull.shinyUnlock);if(badge)badge.textContent=pull.shinyUnlock?'SHINY AWAKENED':pull.progress||'DUPLICATE';if(forge){forge.hidden=!pull.shinyUnlock;forge.textContent=`OPEN ${pull.name.toUpperCase()} IN FORGE`}document.getElementById('pullMessage').textContent=pull.shinyUnlock?'SHINY AWAKENING!':'RESONANCE ENERGY GATHERING...'};
 const results=renderDedicatedResults;renderDedicatedResults=function(pulls){
  results(pulls);const shiny=pulls.find(pull=>pull.shinyUnlock),summary=document.getElementById('bbShinySummary');
  [...document.querySelectorAll('#pullResultsGrid .pullCard')].forEach((card,i)=>{const pull=pulls[i];card.dataset.fighter=pull.name;card.classList.toggle('bb-shiny-result-card',!!pull.shinyUnlock);card.insertAdjacentHTML('beforeend',`<div class="bb-pull-progress">${pull.progress}${pull.shinyUnlock?' • SHINY':''}</div>`)});
  if(summary){summary.hidden=!shiny;summary.innerHTML=shiny?`<div><small>SHINY AWAKENED</small><strong>${shiny.name.toUpperCase()} REACHED R5</strong><span>Your randomized stat destiny is ready.</span></div><button type="button" data-open-forge="${shiny.name}">OPEN ${shiny.name.toUpperCase()} IN FORGE</button>`:''}
  pullCounter.textContent=`${pulls.length} PULL${pulls.length===1?'':'S'} • RESULTS`;requestAnimationFrame(()=>{summonPullScreen.scrollTop=0;pullScene.scrollTop=0;window.scrollTo(0,0)});
 };
 document.getElementById('pullResultsPanel')?.addEventListener('click',event=>{const button=event.target.closest('[data-open-forge]');if(button)openForge(button.dataset.openForge)});
 document.getElementById('summonsBtn')?.addEventListener('click',()=>{populateSummonShopArt();summonScreen.scrollTop=0;document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>el.textContent='∞')});
 document.getElementById('returnToSummonsBtn')?.addEventListener('click',()=>requestAnimationFrame(()=>{summonScreen.scrollTop=0}));
 const badge=document.querySelector('#summonScreen .testSummonBadge');if(badge)badge.textContent='DEV CORE BANNER • UNLIMITED EMBERS • DUPES BUILD RESONANCE';
 const featured=document.querySelector('#summonScreen .showcaseSubline');if(featured)featured.textContent='ALL FIVE PLAYABLE FIGHTERS • EQUAL DEV TEST ODDS';
}
installTylerPopoutFraming();installDom();activateSummons();applyCombatBonuses();refreshInventoryBadges();
window.BlazingProgression=Object.freeze({getState:()=>JSON.parse(JSON.stringify(state)),openForge,rollStats,buildName,applyPull,applyCombatBonuses});
})();