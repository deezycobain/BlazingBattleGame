(()=>{
'use strict';

const SHELL_ID='bbHomeApproved';
const EXPECTED_LAYOUT='v9-polish';
const STYLE_ID='bb-home-v9-leader-stage-style';
const PROFILE_ID='bbHomePlayerProfile';
const CUTOUTS=Object.freeze({
 tyler:'assets/characters/tyler/art/shiny_foreground_cutout_v1.webp',
 subzero:'assets/characters/subzero/art/shiny_foreground_cutout_v2.webp',
 lebee:'assets/characters/lebee/art/shiny_foreground_cutout_v3.png',
 senku:'assets/characters/senku/art/shiny_foreground_cutout_v5.png'
});
const norm=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
const format=value=>Math.max(0,Math.floor(Number(value)||0)).toLocaleString('en-US');
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let queued=false;
let bootTimers=[];

function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
#${SHELL_ID}.bb-home-v9 .bb-home-v5-leader{
 z-index:14!important;
 left:clamp(28px,8vw,92px)!important;
 right:auto!important;
 bottom:calc(var(--bb-home-v9-dock-h) - 24px)!important;
 width:min(34vw,230px)!important;
 height:min(34vh,320px)!important;
 pointer-events:none!important;
 opacity:1!important;
 filter:drop-shadow(0 14px 17px rgba(0,0,0,.42))!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-leader:before{
 left:48%!important;
 bottom:1%!important;
 width:78%!important;
 height:13%!important;
 background:radial-gradient(ellipse,rgba(23,19,20,.52),rgba(91,66,48,.16) 46%,transparent 72%)!important;
 filter:blur(5px)!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-leader:after{display:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-leader img{
 width:100%!important;
 height:100%!important;
 object-fit:contain!important;
 object-position:center bottom!important;
 -webkit-mask-image:linear-gradient(180deg,#000 0 82%,rgba(0,0,0,.98) 88%,rgba(0,0,0,.72) 94%,transparent 100%)!important;
 mask-image:linear-gradient(180deg,#000 0 82%,rgba(0,0,0,.98) 88%,rgba(0,0,0,.72) 94%,transparent 100%)!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile{
 pointer-events:auto!important;
 cursor:pointer!important;
 transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile:hover{transform:translateY(-1px);border-color:rgba(255,214,170,.44)!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile:focus-visible{outline:2px solid rgba(255,202,132,.92);outline-offset:3px}
#${PROFILE_ID}[hidden]{display:none!important}
#${PROFILE_ID}{position:absolute;z-index:95;inset:0;display:grid;place-items:center;padding:max(16px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;pointer-events:auto}
#${PROFILE_ID} .bb-player-profile-backdrop{position:absolute;inset:0;width:100%;height:100%;border:0;background:rgba(5,5,8,.72);-webkit-backdrop-filter:blur(13px) saturate(.92);backdrop-filter:blur(13px) saturate(.92);cursor:default}
#${PROFILE_ID} .bb-player-profile-card{position:relative;z-index:1;width:min(92vw,760px);max-height:min(88dvh,760px);overflow:auto;box-sizing:border-box;padding:clamp(18px,3vw,30px);border:1px solid rgba(255,224,190,.25);border-radius:22px 6px 22px 6px;background:linear-gradient(145deg,rgba(27,13,19,.985),rgba(10,10,15,.99) 58%,rgba(31,17,17,.985));box-shadow:0 34px 90px rgba(0,0,0,.62),inset 0 1px rgba(255,255,255,.08)}
#${PROFILE_ID} .bb-player-profile-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:1px solid rgba(255,230,205,.13)}
#${PROFILE_ID} .bb-player-profile-head small,#${PROFILE_ID} .bb-player-profile-section-title{display:block;font-size:8px;font-weight:950;line-height:1;letter-spacing:.2em;color:#eaa79a}
#${PROFILE_ID} .bb-player-profile-head h2{margin:7px 0 0;font-size:clamp(21px,4vw,34px);line-height:.95;letter-spacing:-.03em;color:#fff7e9}
#${PROFILE_ID} .bb-player-profile-head p{margin:8px 0 0;font-size:10px;font-weight:850;letter-spacing:.09em;color:rgba(255,232,211,.67)}
#${PROFILE_ID} .bb-player-profile-close{display:grid;place-items:center;flex:0 0 auto;width:38px;height:38px;border:1px solid rgba(255,231,207,.2);border-radius:50%;background:rgba(255,255,255,.055);color:#fff5e9;font:800 23px/1 ui-sans-serif,system-ui;cursor:pointer}
#${PROFILE_ID} .bb-player-profile-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:16px}
#${PROFILE_ID} .bb-player-profile-stat{min-width:0;padding:12px 11px;border:1px solid rgba(255,232,210,.1);border-radius:12px 3px 12px 3px;background:rgba(255,255,255,.035)}
#${PROFILE_ID} .bb-player-profile-stat small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:6px;font-weight:900;letter-spacing:.13em;color:rgba(255,229,207,.54)}
#${PROFILE_ID} .bb-player-profile-stat strong{display:block;margin-top:6px;overflow:hidden;text-overflow:ellipsis;font-size:clamp(14px,2vw,19px);line-height:1;color:#fff5e8}
#${PROFILE_ID} .bb-player-profile-stat[data-stat="coins"] strong{color:#ffd49c}
#${PROFILE_ID} .bb-player-profile-stat[data-stat="embers"] strong{color:#ffb5aa}
#${PROFILE_ID} .bb-player-profile-road{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;margin-top:16px;padding:15px;border:1px solid rgba(238,170,92,.2);border-radius:15px 4px 15px 4px;background:linear-gradient(110deg,rgba(117,47,31,.17),rgba(255,255,255,.025))}
#${PROFILE_ID} .bb-player-profile-road strong{display:block;margin-top:6px;font-size:17px;line-height:1;color:#fff5e8}
#${PROFILE_ID} .bb-player-profile-road p{margin:6px 0 0;font-size:9px;font-weight:700;line-height:1.35;color:rgba(255,232,212,.63)}
#${PROFILE_ID} .bb-player-profile-road-badge{padding:8px 10px;border:1px solid rgba(255,214,166,.22);border-radius:999px;background:rgba(8,7,10,.42);font-size:8px;font-weight:950;letter-spacing:.13em;color:#ffd6a6}
#${PROFILE_ID} .bb-player-profile-fighters{margin-top:18px}
#${PROFILE_ID} .bb-player-profile-fighter-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:9px}
#${PROFILE_ID} .bb-player-profile-fighter{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:11px 12px;border:1px solid rgba(255,231,208,.1);border-radius:10px 3px 10px 3px;background:rgba(255,255,255,.026)}
#${PROFILE_ID} .bb-player-profile-fighter strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#fff3e6}
#${PROFILE_ID} .bb-player-profile-fighter span{text-align:right}
#${PROFILE_ID} .bb-player-profile-fighter b{display:block;font-size:10px;color:#ffd098}
#${PROFILE_ID} .bb-player-profile-fighter em{display:block;margin-top:3px;font-style:normal;font-size:6px;font-weight:850;letter-spacing:.08em;color:rgba(255,226,204,.55)}
#${PROFILE_ID} .bb-player-profile-foot{margin:15px 0 0;font-size:7px;font-weight:700;line-height:1.4;letter-spacing:.04em;color:rgba(255,231,211,.4)}
@media(max-width:620px){
 #${SHELL_ID}.bb-home-v9 .bb-home-v5-leader{
  left:8vw!important;
  bottom:calc(var(--bb-home-v9-dock-h) - 20px)!important;
  width:min(37vw,185px)!important;
  height:min(31vh,252px)!important;
 }
 #${PROFILE_ID}{padding:max(10px,env(safe-area-inset-top)) 8px max(10px,env(safe-area-inset-bottom))}
 #${PROFILE_ID} .bb-player-profile-card{width:min(96vw,520px);max-height:91dvh;padding:16px;border-radius:17px 4px 17px 4px}
 #${PROFILE_ID} .bb-player-profile-head h2{font-size:20px}
 #${PROFILE_ID} .bb-player-profile-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
 #${PROFILE_ID} .bb-player-profile-stat{padding:10px 9px}
 #${PROFILE_ID} .bb-player-profile-fighter-grid{grid-template-columns:1fr}
}
@media(max-height:700px){
 #${SHELL_ID}.bb-home-v9 .bb-home-v5-leader{
  bottom:calc(var(--bb-home-v9-dock-h) - 16px)!important;
  width:min(34vw,165px)!important;
  height:min(30vh,220px)!important;
 }
}
@media(prefers-reduced-motion:reduce){#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile{transition:none!important}}
`;
 document.head.appendChild(style);
}

function currentLeader(){
 try{return window.BlazingApprovedHomeCompat?.leaderUnit?.()||null}catch(_){return null}
}
function expectedCutout(){
 const unit=currentLeader();
 const id=norm(unit?.id||unit?.display_name||unit?.name||'');
 return CUTOUTS[id]||'';
}
function syncLeader(shell=document.getElementById(SHELL_ID)){
 if(!shell)return false;
 const art=shell.querySelector('[data-v5-leader-art]');
 const expected=expectedCutout();
 if(!art||!expected)return false;
 if(art.getAttribute('src')!==expected)art.setAttribute('src',expected);
 art.dataset.bbHomePresentation='cutout';
 shell.dataset.bbHomeLeaderStage='battle-dock';
 return true;
}

function profileSnapshot(){
 const unit=currentLeader();
 const leaderName=unit?.display_name||unit?.name||unit?.id||'Current Fighter';
 const progressionApi=window.BlazingUnitProgression;
 let progression={totalBattleXp:0,units:{}};
 try{progression=progressionApi?.getState?.()||progression}catch(_){ }
 const names=Array.isArray(progressionApi?.FIGHTERS)&&progressionApi.FIGHTERS.length?progressionApi.FIGHTERS:Object.keys(progression.units||{});
 const fighters=names.map(name=>{
  const state=progression.units?.[name]||{};
  return {
   name,
   level:Math.max(1,Math.floor(Number(state.level)||1)),
   awakening:Math.max(0,Math.min(5,Math.floor(Number(state.awakening)||0))),
   shiny:!!state.shiny,
   lifetimeXp:Math.max(0,Math.floor(Number(state.lifetimeXp)||0))
  };
 });
 const leaderProgress=fighters.find(fighter=>norm(fighter.name)===norm(leaderName))||null;
 let economy={battleMarks:0,lifetimeEarned:0,embers:0,wins:{road:0,castle:0}};
 try{economy={...economy,...window.BlazingEconomy?.load?.()};economy.wins={road:Number(economy.wins?.road)||0,castle:Number(economy.wins?.castle)||0}}catch(_){ }
 let road=null;
 try{road=window.BlazingRoadRun?.loadRun?.()||null}catch(_){ }
 const roadFighters=Array.isArray(road?.fighters)?road.fighters:[];
 const living=roadFighters.filter(fighter=>(Number(fighter?.hp)||0)>0).length;
 return {
  leaderName,
  leaderLevel:leaderProgress?.level||1,
  leaderAwakening:leaderProgress?.awakening||0,
  leaderShiny:!!leaderProgress?.shiny,
  totalBattleXp:Math.max(0,Math.floor(Number(progression.totalBattleXp)||0)),
  shinyCount:fighters.filter(fighter=>fighter.shiny).length,
  fighters,
  coins:Math.max(0,Math.floor(Number(economy.battleMarks)||0)),
  lifetimeCoins:Math.max(0,Math.floor(Number(economy.lifetimeEarned)||0)),
  embers:Math.max(0,Math.floor(Number(economy.embers)||0)),
  roadWins:Math.max(0,Math.floor(Number(economy.wins?.road)||0)),
  castleWins:Math.max(0,Math.floor(Number(economy.wins?.castle)||0)),
  road:road?{stage:Math.max(1,Math.floor(Number(road.stage)||1)),status:String(road.status||'active'),living,total:roadFighters.length}:null
 };
}

function roadCopy(snapshot){
 const road=snapshot.road;
 if(!road)return {title:'NO ACTIVE ROAD RUN',detail:`${format(snapshot.roadWins)} recorded Road win${snapshot.roadWins===1?'':'s'}.`,badge:'READY'};
 const status=road.status==='complete'?'COMPLETE':road.status==='failed'?'FAILED':'ACTIVE';
 const detail=road.total?`${format(road.living)} / ${format(road.total)} fighters standing in the saved run.`:'Saved Road run.';
 return {title:`STAGE ${format(road.stage)}`,detail,badge:status};
}

function renderProfile(panel=document.getElementById(PROFILE_ID)){
 if(!panel)return null;
 const snapshot=profileSnapshot();
 const signature=JSON.stringify(snapshot);
 const road=roadCopy(snapshot);
 const card=panel.querySelector('.bb-player-profile-card');
 if(!card)return snapshot;
 if(panel.dataset.bbProfileSignature===signature&&card.querySelector('#bbPlayerProfileTitle'))return snapshot;
 const rank=snapshot.leaderShiny?'SHINY':`AWAKENING ${snapshot.leaderAwakening} / 5`;
 const fighterRows=snapshot.fighters.map(fighter=>`<div class="bb-player-profile-fighter" data-profile-fighter="${esc(norm(fighter.name))}"><strong>${esc(fighter.name)}</strong><span><b>LV. ${format(fighter.level)}</b><em>${fighter.shiny?'SHINY':`AWAKENING ${format(fighter.awakening)} / 5`}</em></span></div>`).join('');
 card.innerHTML=`
  <header class="bb-player-profile-head">
   <div><small>PLAYER PROFILE</small><h2 id="bbPlayerProfileTitle">${esc(snapshot.leaderName)}</h2><p>CURRENT LEADER · LV. ${format(snapshot.leaderLevel)} · ${esc(rank)}</p></div>
   <button class="bb-player-profile-close" type="button" data-profile-close aria-label="Close player profile">×</button>
  </header>
  <section class="bb-player-profile-stats" aria-label="Saved player statistics">
   <div class="bb-player-profile-stat" data-stat="coins"><small>BLAZING COINS</small><strong>${format(snapshot.coins)}</strong></div>
   <div class="bb-player-profile-stat" data-stat="embers"><small>EMBERS</small><strong>${format(snapshot.embers)}</strong></div>
   <div class="bb-player-profile-stat" data-stat="battle-xp"><small>TOTAL BATTLE XP</small><strong>${format(snapshot.totalBattleXp)}</strong></div>
   <div class="bb-player-profile-stat" data-stat="shiny"><small>SHINY FIGHTERS</small><strong>${format(snapshot.shinyCount)}</strong></div>
   <div class="bb-player-profile-stat" data-stat="road-wins"><small>ROAD WINS</small><strong>${format(snapshot.roadWins)}</strong></div>
   <div class="bb-player-profile-stat" data-stat="castle-wins"><small>CASTLE WINS</small><strong>${format(snapshot.castleWins)}</strong></div>
   <div class="bb-player-profile-stat" data-stat="lifetime-coins"><small>LIFETIME COINS EARNED</small><strong>${format(snapshot.lifetimeCoins)}</strong></div>
  </section>
  <section class="bb-player-profile-road" aria-label="Blazing Road status">
   <div><span class="bb-player-profile-section-title">BLAZING ROAD</span><strong>${esc(road.title)}</strong><p>${esc(road.detail)}</p></div>
   <span class="bb-player-profile-road-badge">${esc(road.badge)}</span>
  </section>
  <section class="bb-player-profile-fighters"><span class="bb-player-profile-section-title">FIGHTER PROGRESSION</span><div class="bb-player-profile-fighter-grid">${fighterRows}</div></section>
  <p class="bb-player-profile-foot">Profile values come from saved fighter progression, economy records, and the current Blazing Road run on this device.</p>`;
 panel.dataset.bbProfileSignature=signature;
 panel.dataset.bbProfileLeader=norm(snapshot.leaderName);
 panel.dataset.bbProfileRoad=road.badge.toLowerCase();
 return snapshot;
}

function ensureProfile(shell=document.getElementById(SHELL_ID)){
 if(!shell)return null;
 const trigger=shell.querySelector('.bb-home-v5-profile');
 if(trigger){
  trigger.dataset.bbHomeAction='player-profile';
  trigger.setAttribute('role','button');
  trigger.setAttribute('tabindex','0');
  trigger.setAttribute('aria-controls',PROFILE_ID);
  if(!trigger.hasAttribute('aria-expanded'))trigger.setAttribute('aria-expanded','false');
  const leader=currentLeader();
  const name=leader?.display_name||leader?.name||leader?.id||'current leader';
  trigger.setAttribute('aria-label',`Open player profile for ${name}`);
  trigger.setAttribute('title','Open Player Profile');
 }
 let panel=document.getElementById(PROFILE_ID);
 if(!panel){
  panel=document.createElement('section');
  panel.id=PROFILE_ID;
  panel.className='bb-player-profile-panel';
  panel.hidden=true;
  panel.innerHTML='<button class="bb-player-profile-backdrop" type="button" tabindex="-1" data-profile-close aria-label="Close player profile"></button><article class="bb-player-profile-card" role="dialog" aria-modal="true" aria-labelledby="bbPlayerProfileTitle"></article>';
  shell.appendChild(panel);
 }
 return panel;
}

function openProfile(){
 const shell=document.getElementById(SHELL_ID);if(!shell)return false;
 const panel=ensureProfile(shell);if(!panel)return false;
 renderProfile(panel);
 panel.hidden=false;
 panel.classList.add('active');
 const trigger=shell.querySelector('.bb-home-v5-profile');
 trigger?.setAttribute('aria-expanded','true');
 queueMicrotask(()=>panel.querySelector('.bb-player-profile-close')?.focus({preventScroll:true}));
 window.dispatchEvent(new CustomEvent('bb:player-profile',{detail:{open:true}}));
 return true;
}
function closeProfile({restoreFocus=true}={}){
 const panel=document.getElementById(PROFILE_ID);if(!panel)return false;
 panel.classList.remove('active');
 panel.hidden=true;
 const trigger=document.querySelector(`#${SHELL_ID} .bb-home-v5-profile`);
 trigger?.setAttribute('aria-expanded','false');
 if(restoreFocus)queueMicrotask(()=>trigger?.focus({preventScroll:true}));
 window.dispatchEvent(new CustomEvent('bb:player-profile',{detail:{open:false}}));
 return true;
}
function syncProfile(shell=document.getElementById(SHELL_ID)){
 const panel=ensureProfile(shell);if(!panel)return false;
 if(!panel.hidden)renderProfile(panel);
 return true;
}

function needsApply(){
 const shell=document.getElementById(SHELL_ID);
 if(!shell)return false;
 const art=shell.querySelector('[data-v5-leader-art]');
 const expected=expectedCutout();
 return shell.dataset.bbHomeLayout!==EXPECTED_LAYOUT||!shell.classList.contains('bb-home-v9')||shell.dataset.bbHomeCurrency!=='blazing-coins'||(expected&&art?.getAttribute('src')!==expected);
}

function apply(){
 queued=false;
 ensureStyle();
 const api=window.BlazingHomeV9;
 if(!api||typeof api.apply!=='function')return false;
 const shell=document.getElementById(SHELL_ID);if(!shell)return false;
 if(shell.dataset.bbHomeLayout!==EXPECTED_LAYOUT||!shell.classList.contains('bb-home-v9')||shell.dataset.bbHomeCurrency!=='blazing-coins')api.apply();
 syncLeader(shell);
 syncProfile(shell);
 return shell.dataset.bbHomeLayout===EXPECTED_LAYOUT;
}

function schedule(delay=0){
 if(delay>0){
  const id=setTimeout(()=>{bootTimers=bootTimers.filter(timer=>timer!==id);schedule(0);},delay);
  bootTimers.push(id);
  return;
 }
 if(queued)return;
 queued=true;
 queueMicrotask(()=>requestAnimationFrame(apply));
}

for(const delay of [0,80,180,360,720,1400,2800,4800])schedule(delay);
window.addEventListener('pageshow',()=>schedule(0));
window.addEventListener('resize',()=>schedule(0),{passive:true});
window.addEventListener('bb:unit-progression',()=>schedule(0));
window.addEventListener('bb:economy',()=>schedule(0));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(0);});
document.addEventListener('click',event=>{
 const close=event.target.closest?.(`#${PROFILE_ID} [data-profile-close]`);
 if(close){event.preventDefault();closeProfile();return;}
 const trigger=event.target.closest?.(`#${SHELL_ID} .bb-home-v5-profile`);
 if(trigger){event.preventDefault();openProfile();return;}
 if(document.getElementById('menuScreen')?.contains(event.target))schedule(0);
},true);
document.addEventListener('keydown',event=>{
 const panel=document.getElementById(PROFILE_ID);
 if(event.key==='Escape'&&panel&&!panel.hidden){event.preventDefault();closeProfile();return;}
 const trigger=event.target.closest?.(`#${SHELL_ID} .bb-home-v5-profile`);
 if(trigger&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openProfile();}
},true);

new MutationObserver(records=>{
 const shell=document.getElementById(SHELL_ID);
 if(!shell)return;
 const art=shell.querySelector('[data-v5-leader-art]');
 const relevant=records.some(record=>{
  if(record.type==='attributes')return (record.target===shell&&needsApply())||(record.target===art&&record.attributeName==='src');
  return record.target===shell||record.target?.id==='menuScreen'||[...record.addedNodes].some(node=>node?.nodeType===1&&(node.id===SHELL_ID||node.querySelector?.(`#${SHELL_ID}`)));
 });
 if(relevant)schedule(0);
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-bb-home-layout','data-bb-home-currency','src']});

window.BlazingHomeV9Lifecycle=Object.freeze({apply,schedule,syncLeader,expectedCutout,syncProfile,profileSnapshot,openProfile,closeProfile});
})();
