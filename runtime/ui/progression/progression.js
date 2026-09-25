(()=>{
'use strict';
const KEY='blazing.progression.v1';
const MAX_RESONANCE=5,STAT_BUDGET=12,MAX_STAT=5;
const CORE_FIGHTERS=['Crimson','Sub-Zero','Lebee','Senku','Tyler','Itachi'];
const LEGACY_FIGHTERS=['Kakashi','Obito','Jiraiya','Sasuke','Pain','Scorpion','Rock Lee','Mashle','Wong Fei-Hung','Gabimaru','Killua','Zabuza'];
const FIGHTERS=[...CORE_FIGHTERS,...LEGACY_FIGHTERS],FORGE_FIGHTERS=FIGHTERS,SUMMON_FIGHTERS=LEGACY_FIGHTERS;
const IDS={
 'Crimson':'crimson','Sub-Zero':'subzero','Lebee':'lebee','Senku':'senku','Tyler':'tyler','Itachi':'itachi',
 'Kakashi':'kakashi','Obito':'obito','Jiraiya':'jiraiya','Sasuke':'sasuke','Pain':'pain','Scorpion':'scorpion',
 'Rock Lee':'rock_lee','Mashle':'mashle','Wong Fei-Hung':'jackie_chan','Gabimaru':'gabimaru','Killua':'killua','Zabuza':'zabuza'
};
function registryUnits(){return Object.values(window.BLAZING_UNIT_DATA||{}).filter(unit=>unit?.role==='playable'&&unit?.display_name)}
function unitData(name){const norm=v=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');return registryUnits().find(unit=>norm(unit.display_name)===norm(name)||norm(unit.id)===norm(name))||window.BLAZING_UNIT_DATA?.[IDS[name]]||null}
function unitId(name){return unitData(name)?.id||IDS[name]||String(name||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_')}
function fighterNames(){return [...new Set([...FIGHTERS,...registryUnits().map(unit=>unit.display_name).filter(Boolean)])]}
function forgeFighters(){return fighterNames()}
function canForge(name){return forgeFighters().includes(name)}
const CARD_ART={
 'Crimson':'assets/characters/crimson/art/current_collection_art.jpg',
 'Sub-Zero':'assets/characters/subzero/art/full_art_absolute_zero_v2.jpeg',
 'Lebee':'assets/characters/lebee/art/full_art_cosmic_wish.jpeg',
 'Senku':'assets/characters/senku/cards/senku_card.jpeg',
 'Tyler':'assets/characters/tyler/cards/current_collection_card.png',
 'Itachi':'assets/characters/itachi/art/itachi_full_art.png',
 'Kakashi':'assets/characters/kakashi/cards/legacy_of_shinobi_card.webp',
 'Obito':'assets/characters/obito/cards/legacy_of_shinobi_card.webp',
 'Jiraiya':'assets/characters/jiraiya/cards/legacy_of_shinobi_card.webp',
 'Sasuke':'assets/characters/sasuke/cards/legacy_of_shinobi_card.webp',
 'Pain':'assets/characters/pain/cards/legacy_of_shinobi_card.webp',
 'Scorpion':'assets/characters/scorpion/cards/legacy_of_shinobi_card.webp',
 'Rock Lee':'assets/characters/rock_lee/cards/legacy_of_shinobi_card.png',
 'Mashle':'assets/characters/mashle/cards/legacy_of_shinobi_card.png',
 'Wong Fei-Hung':'assets/characters/jackie_chan/cards/wong_fei_hung_refresh.png',
 'Gabimaru':'assets/characters/gabimaru/cards/legacy_of_shinobi_card.png',
 'Killua':'assets/characters/killua/cards/legacy_of_shinobi_card.png',
 'Zabuza':'assets/characters/zabuza/cards/legacy_of_shinobi_card.png'
};
const FORGE_ART={
 'Crimson':'assets/characters/crimson/art/current_collection_art.jpg',
 'Sub-Zero':'assets/characters/subzero/art/full_art_absolute_zero_v2.jpeg',
 'Lebee':'assets/characters/lebee/art/full_art_cosmic_wish.jpeg',
 'Senku':'assets/characters/senku/art/senku_full_art.jpeg',
 'Tyler':'assets/characters/tyler/art/current_collection_art.png',
 'Itachi':'assets/characters/itachi/art/itachi_full_art.png'
};
const SHINY_CUTOUT={
 'Sub-Zero':'assets/characters/subzero/art/shiny_foreground_cutout_v2.webp',
 'Lebee':'assets/characters/lebee/art/shiny_foreground_cutout_v3.png',
 'Senku':'assets/characters/senku/art/shiny_foreground_cutout_v5.png',
 'Tyler':'assets/characters/tyler/art/shiny_foreground_cutout_v1.webp',
 'Itachi':'assets/characters/itachi/art/shiny_foreground_cutout_v1.webp'
};
const SHINY_POPOUT_PROFILE={
 'Sub-Zero':'ice-hand',
 'Tyler':'head-hand',
 'Lebee':'lebee-hand-hair',
 'Senku':'senku-hand-hair'
};
const STATS=['hp','attack','defense','speed'];
const LABELS={hp:'HP',attack:'ATK',defense:'DEF',speed:'SPD'};
let state=load(),selected='Tyler',candidate=null,activeSummonPulls=[];
let forgeArtToken=0,forgeArtRequestedKey='';
const BASE_RUNTIME=typeof BATTLE_ROSTER==='undefined'?{}:Object.fromEntries(FIGHTERS.filter(name=>BATTLE_ROSTER[name]).map(name=>[name,{...BATTLE_ROSTER[name]}]));

function freshUnit(){return {resonance:0,shards:0,shiny:false,roll:null,locks:[]}}
function fresh(){return {version:1,totalPulls:0,units:Object.fromEntries(fighterNames().map(name=>[name,freshUnit()]))}}
function load(){try{const parsed=JSON.parse(localStorage.getItem(KEY)||'null');const base=fresh();if(!parsed)return base;for(const name of fighterNames()){const legacyName=name==='Wong Fei-Hung'?'Jackie Chan':name;base.units[name]={...freshUnit(),...(parsed.units?.[name]||parsed.units?.[legacyName]||{})}};base.totalPulls=Number(parsed.totalPulls)||0;return base}catch(_){return fresh()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));applyCombatBonuses();refreshInventoryBadges()}
function unit(name=selected){return state.units[name]||(state.units[name]=freshUnit())}
function art(name){
 if(FORGE_ART[name])return FORGE_ART[name];
 const data=unitData(name),id=unitId(name),assets=data?.assets||{},clean=assets.forge_art_clean||assets.presentation_art;
 const rel=clean||(LEGACY_FIGHTERS.includes(name)?data?.animation_standard?.animations?.idle?.frames?.[0]:(assets.art||assets.card||assets.portrait));
 return rel?(/^assets\//.test(rel)?rel:`assets/characters/${id}/${rel}`):'';
}
function summonArt(name){
 const id=unitId(name),data=unitData(name),assets=data?.assets||{},rel=assets.summon_art_clean||assets.presentation_art||assets.summon_art;
 if(rel)return /^assets\//.test(rel)?rel:`assets/characters/${id}/${rel}`;
 return CARD_ART[name]||'';
}
function syncPresentationState(image,legacy,kind){
 if(!image)return;
 const host=kind==='reveal'?document.getElementById('pullCardWrap'):image.closest('.pullCard');
 if(host){host.classList.toggle('bb-legacy-full-card',legacy);host.classList.toggle('bb-source-art-fallback',legacy);host.dataset.bbArtPresentation=legacy?'source-fallback':'canonical'}
 image.dataset.bbPresentation=legacy?'source-fallback':'canonical';
}
function weightedRarity(name){return name==='Tyler'?'super':'legendary'}
function randomCore(){const name=SUMMON_FIGHTERS[Math.floor(Math.random()*SUMMON_FIGHTERS.length)];return {name,rarity:weightedRarity(name)}}
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
function summonLobbyMarkup(){return `<section class="bb-summon-lobby bb-legacy-lobby" aria-labelledby="bbSummonTitle"><div class="bb-legacy-banner" role="img" aria-label="Legacy of the Shinobi featured summon banner"><div class="bb-legacy-art-stack" aria-hidden="true"><img src="${CARD_ART.Kakashi}" alt=""><img src="${CARD_ART.Pain}" alt=""><img src="${CARD_ART.Sasuke}" alt=""><img src="${CARD_ART.Killua}" alt=""></div><div class="bb-legacy-banner-copy"><div class="bb-banner-kicker">LIMITED DEVELOPMENT BANNER</div><h1 id="bbSummonTitle">LEGACY OF THE<br><span>SHINOBI</span></h1><p>12 new fighters are live for card, inventory, idle, and Basic Attack testing. Jutsu and dedicated VFX arrive in the next character pass.</p><div class="bb-legacy-banner-stamp">12 UNIT EVENT POOL</div></div></div><div class="bb-legacy-pool"><div class="bb-legacy-pool-head"><strong>FEATURED FIGHTERS</strong><span>EQUAL DEV TEST ODDS</span></div><div class="bb-banner-roster" aria-label="Legacy of the Shinobi available fighters">${SUMMON_FIGHTERS.map(name=>`<span>${name.toUpperCase()}</span>`).join('')}</div></div><div class="bb-resonance-path"><span><b>CARD ART</b> INVENTORY + REVEAL</span><i>›</i><span><b>6-FRAME</b> IDLE + BASIC</span><i>›</i><span><b>NEXT PASS</b> JUTSU + VFX</span></div><div id="bbSummonActions" class="bb-summon-actions"></div><div class="bb-summon-secondary"><button id="summonForgeBtn" class="bb-forge-launch">OPEN AWAKENING FORGE</button><details class="bb-banner-details"><summary>BANNER DETAILS</summary><p>Legacy of the Shinobi contains Kakashi, Obito, Jiraiya, Sasuke, Pain, Scorpion, Rock Lee, Mashle, Wong Fei-Hung, Gabimaru, Killua, and Zabuza. Development pulls are free and use equal test odds.</p></details></div></section>`}
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
function syncRevealArt(pull){const image=document.querySelector('#summonPullScreen .summonedTradingCard'),src=pull?summonArt(pull.name):'',legacy=!!pull&&LEGACY_FIGHTERS.includes(pull.name);syncPresentationState(image,legacy,'reveal');if(image&&pull&&src){image.src=src;image.alt=`${pull.name} summon art`;image.hidden=false}}
function syncResultArt(pulls){[...document.querySelectorAll('#pullResultsGrid .pullCard')].forEach((card,index)=>{const pull=pulls?.[index],image=card.querySelector('.resultTradingCard')||card.querySelector('img'),src=pull?summonArt(pull.name):'',legacy=!!pull&&LEGACY_FIGHTERS.includes(pull.name);syncPresentationState(image,legacy,'result');if(image&&pull&&src){image.src=src;image.alt=`${pull.name} summon art`;image.hidden=false}})}
function installDom(){
 const menuActions=document.querySelector('#menuScreen .menuActions');if(menuActions&&!document.getElementById('forgeBtn'))menuActions.insertAdjacentHTML('beforeend','<button id="forgeBtn" class="forgeNode" aria-label="Open Resonance Forge"><span class="forgeWord">FORGE</span><span class="forgeSigil">✦</span></button>');
 if(!document.getElementById('resonanceScreen')){const screen=document.createElement('div');screen.id='resonanceScreen';screen.className='screen';screen.innerHTML=forgeMarkup();document.body.appendChild(screen)}
 installSummonOverhaul();
 document.getElementById('forgeBtn')?.addEventListener('click',()=>openForge('Itachi'));
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
function openForge(name){const roster=forgeFighters();selected=roster.includes(name)?name:(roster.includes('Itachi')?'Itachi':roster[0]);candidate=null;document.querySelectorAll('.screen').forEach(s=>{if(s.id!=='resonanceScreen')s.classList.remove('active')});const menu=document.getElementById('menuScreen');if(menu)menu.style.display='none';const screen=document.getElementById('resonanceScreen');screen.classList.add('active');screen.scrollTop=0;renderForge();window.scrollTo(0,0)}
function closeForge(){document.getElementById('resonanceScreen').classList.remove('active');const menu=document.getElementById('menuScreen');if(menu){menu.style.display='grid';menu.classList.remove('leaving')}}
function fitForgeArtwork(image){
 const depth=image.closest('.forgeArtDepth'),ratio=image.naturalWidth&&image.naturalHeight?image.naturalWidth/image.naturalHeight:.75;if(!depth)return;
 depth.style.setProperty('--forge-art-ratio',String(ratio));depth.style.setProperty('--forge-art-max',`${Math.min(520,Math.round(430*ratio))}px`);
}
function preloadForgeAsset(src){
 if(!src)return Promise.resolve(null);
 return new Promise(resolve=>{const image=new Image();let finished=false;const done=()=>{if(finished)return;finished=true;const decoded=typeof image.decode==='function'?image.decode():null;if(decoded?.then)decoded.then(()=>resolve(image),()=>resolve(image));else resolve(image)};image.onload=done;image.onerror=done;image.src=src;if(image.complete)done()});
}
function syncForgeArtwork(card,name,shiny,portraitSrc,cutout){
 const key=[name,shiny?'1':'0',portraitSrc,cutout||''].join('|');if(forgeArtRequestedKey===key)return;forgeArtRequestedKey=key;
 const token=++forgeArtToken;card.classList.add('artSwitching');card.setAttribute('aria-busy','true');
 Promise.all([preloadForgeAsset(portraitSrc),preloadForgeAsset(cutout)]).then(()=>{
  if(token!==forgeArtToken)return;
  card.classList.toggle('shiny',shiny);card.classList.toggle('hasPopout',!!cutout);card.dataset.fighter=unitId(name);card.dataset.popoutProfile=cutout?SHINY_POPOUT_PROFILE[name]||'none':'none';
  const portrait=document.getElementById('forgePortrait');portrait.onload=()=>fitForgeArtwork(portrait);portrait.src=portraitSrc;portrait.alt=`${name} card`;if(portrait.complete)fitForgeArtwork(portrait);
  const popout=document.getElementById('forgePopout');popout.hidden=!cutout;popout.alt=cutout?`${name} Shiny foreground`:'';if(cutout)popout.src=cutout;else popout.removeAttribute('src');
  card.dataset.forgeArtKey=key;void card.offsetWidth;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(token!==forgeArtToken)return;card.classList.remove('artSwitching');card.removeAttribute('aria-busy')}));
 });
}
function renderForge(message=''){
 const u=unit();const maxed=u.resonance>=MAX_RESONANCE;
 document.getElementById('forgeRoster').innerHTML=forgeFighters().map(name=>{const x=unit(name);return `<button class="forgeFighter ${name===selected?'active':''} ${x.resonance>=5?'maxed':''}" data-fighter="${name}">${name}<small>${x.resonance>=5?'SHINY • ':''}R${x.resonance}/5 • ${x.shards} ✦</small></button>`}).join('');
 const card=document.getElementById('forgeCard'),cutout=u.shiny?SHINY_CUTOUT[selected]:null;syncForgeArtwork(card,selected,u.shiny,art(selected),cutout);
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
 cardForSummon=function(name){return summonArt(name)};
 summonEmbers=999999;document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>{el.textContent='∞';el.classList.add('bb-dev-infinity')});
 spendEmbers=function(){document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>el.textContent='∞');return true};
 rosterForRarity=function(){return SUMMON_FIGHTERS};summonOne=function(){return randomCore()};
 const launch=launchSummonSequence;launchSummonSequence=function(pulls){activeSummonPulls=pulls;pulls.forEach(applyPull);summonPullScreen.scrollTop=0;pullScene.scrollTop=0;return launch(pulls)};
 multiSummonBtn.addEventListener('click',event=>{event.stopImmediatePropagation();launchSummonSequence(Array.from({length:10},()=>randomCore()))},true);
 const setup=setupPullCard;setupPullCard=function(pull,index,total){setup(pull,index,total);const wrap=document.getElementById('pullCardWrap'),badge=document.getElementById('pullNewBadge'),forge=document.getElementById('bbRevealForge'),forgeReady=FORGE_FIGHTERS.includes(pull.name);wrap.dataset.fighter=pull.name;wrap.dataset.rarity=pull.rarity;pullScene.classList.toggle('bb-shiny-awakening',!!pull.shinyUnlock);if(badge)badge.textContent=pull.shinyUnlock?'SHINY AWAKENED':pull.progress||'DUPLICATE';if(forge){forge.hidden=!pull.shinyUnlock||!forgeReady;if(forgeReady)forge.textContent=`OPEN ${pull.name.toUpperCase()} IN FORGE`}document.getElementById('pullMessage').textContent=pull.shinyUnlock?(forgeReady?'SHINY AWAKENING!':'MAX RESONANCE!'):'RESONANCE ENERGY GATHERING...';syncRevealArt(pull);requestAnimationFrame(()=>syncRevealArt(pull))};
 const results=renderDedicatedResults;renderDedicatedResults=function(pulls){
  results(pulls);const shiny=pulls.find(pull=>pull.shinyUnlock),summary=document.getElementById('bbShinySummary');
  [...document.querySelectorAll('#pullResultsGrid .pullCard')].forEach((card,i)=>{const pull=pulls[i];card.dataset.fighter=pull.name;card.classList.toggle('bb-shiny-result-card',!!pull.shinyUnlock);card.insertAdjacentHTML('beforeend',`<div class="bb-pull-progress">${pull.progress}${pull.shinyUnlock?' • SHINY':''}</div>`)});
  if(summary){const forgeReady=!!shiny&&FORGE_FIGHTERS.includes(shiny.name);summary.hidden=!shiny;summary.innerHTML=shiny?`<div><small>${forgeReady?'SHINY AWAKENED':'MAX RESONANCE'}</small><strong>${shiny.name.toUpperCase()} REACHED R5</strong><span>${forgeReady?'Your randomized stat destiny is ready.':'Forge support for this fighter arrives in a later pass.'}</span></div>${forgeReady?`<button type="button" data-open-forge="${shiny.name}">OPEN ${shiny.name.toUpperCase()} IN FORGE</button>`:''}`:''}
  pullCounter.textContent=`${pulls.length} PULL${pulls.length===1?'':'S'} • RESULTS`;syncResultArt(pulls);requestAnimationFrame(()=>{syncResultArt(pulls);summonPullScreen.scrollTop=0;pullScene.scrollTop=0;window.scrollTo(0,0)});
 };
 document.getElementById('pullResultsPanel')?.addEventListener('click',event=>{const button=event.target.closest('[data-open-forge]');if(button)openForge(button.dataset.openForge)});
 document.getElementById('summonsBtn')?.addEventListener('click',()=>{populateSummonShopArt();summonScreen.scrollTop=0;document.querySelectorAll('#emberCount,#pullEmberCount').forEach(el=>el.textContent='∞')});
 document.getElementById('returnToSummonsBtn')?.addEventListener('click',()=>requestAnimationFrame(()=>{summonScreen.scrollTop=0}));
 const badge=document.querySelector('#summonScreen .testSummonBadge');if(badge)badge.textContent='LEGACY OF THE SHINOBI • 12 UNIT DEV BANNER • FREE TEST PULLS';
 const featured=document.querySelector('#summonScreen .showcaseSubline');if(featured)featured.textContent='12 LEGACY OF THE SHINOBI FIGHTERS • EQUAL DEV TEST ODDS';
}
installDom();activateSummons();applyCombatBonuses();refreshInventoryBadges();
window.BlazingProgression=Object.freeze({getState:()=>JSON.parse(JSON.stringify(state)),openForge,rollStats,buildName,applyPull,applyCombatBonuses,fighters:forgeFighters,canForge});
})();
