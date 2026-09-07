(()=>{
'use strict';

const STYLE_ID='bb-home-approved-compat-style';
const SHELL_ID='bbHomeApproved';
const HOME_ASSET='assets/ui/home/';
const FALLBACK_UNIT='Crimson';
const FALLBACK_AVATAR='assets/characters/crimson/art/current_collection_art.jpg';
const FALLBACK_LEADER='assets/characters/crimson/sprites/runtime/idle/frame_01.png';
const norm=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
const format=value=>Math.max(0,Math.floor(Number(value)||0)).toLocaleString('en-US');

function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
#menuScreen.bb-home-theme.bb-home-v4 .bb-economy-hud{
 display:flex!important;
 z-index:65!important;
 top:max(64px,calc(env(safe-area-inset-top) + 54px))!important;
 right:max(12px,env(safe-area-inset-right))!important;
 min-height:28px!important;
 padding:0 9px!important;
 border-color:rgba(255,226,190,.28)!important;
 background:rgba(17,10,14,.78)!important;
 box-shadow:0 7px 18px rgba(0,0,0,.28)!important;
}
#menuScreen.bb-home-theme.bb-home-v4 .bb-economy-hud:after{
 content:' BATTLE MARKS';
 font-size:7px;
 letter-spacing:.11em;
 color:rgba(255,238,221,.58);
}
#menuScreen.bb-home-theme.bb-home-v5 .bb-economy-hud{display:none!important}
#${SHELL_ID}.bb-home-v5 .bb-home-v4-profile,
#${SHELL_ID}.bb-home-v5 .bb-home-v4-money{visibility:hidden!important;pointer-events:none!important}
#${SHELL_ID}.bb-home-v5 .bb-home-v4-top{z-index:8!important}
#${SHELL_ID}.bb-home-v5 .bb-home-v4-stage{isolation:isolate}
#${SHELL_ID}.bb-home-v5 .bb-home-v4-center{z-index:3}
#${SHELL_ID} .bb-home-v5-hud{position:absolute;z-index:12;top:max(9px,env(safe-area-inset-top));left:max(9px,env(safe-area-inset-left));right:max(9px,env(safe-area-inset-right));display:flex;align-items:flex-start;justify-content:space-between;gap:10px;pointer-events:none}
#${SHELL_ID} .bb-home-v5-profile{position:relative;width:clamp(180px,34vw,290px);height:clamp(58px,10vw,82px);display:grid;grid-template-columns:clamp(52px,9vw,72px) 1fr;align-items:center;gap:8px;padding:5px 12px 5px 5px;box-sizing:border-box;overflow:hidden;border:1px solid rgba(255,229,207,.2);border-radius:16px 4px 16px 4px;background:linear-gradient(115deg,rgba(16,10,14,.94),rgba(55,16,24,.83) 63%,rgba(18,10,14,.82));box-shadow:0 9px 22px rgba(0,0,0,.32),inset 0 1px rgba(255,255,255,.07);filter:drop-shadow(0 5px 8px rgba(0,0,0,.24))}
#${SHELL_ID} .bb-home-v5-profile-texture{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;opacity:.2;mix-blend-mode:screen;pointer-events:none}
#${SHELL_ID} .bb-home-v5-avatar{position:relative;z-index:2;width:100%;aspect-ratio:1;border-radius:50%;overflow:hidden;border:2px solid rgba(255,215,176,.72);background:#170d12;box-shadow:0 0 0 2px rgba(105,21,31,.72),0 5px 12px rgba(0,0,0,.38)}
#${SHELL_ID} .bb-home-v5-avatar img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 24%}
#${SHELL_ID} .bb-home-v5-profile-copy{position:relative;z-index:2;min-width:0;text-align:left;text-shadow:0 2px 6px rgba(0,0,0,.6)}
#${SHELL_ID} .bb-home-v5-profile-copy small{display:block;font:900 clamp(6px,.8vw,8px)/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.19em;color:#e9aa9e}
#${SHELL_ID} .bb-home-v5-profile-copy strong{display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:clamp(13px,2.2vw,21px);line-height:.95;letter-spacing:-.02em;color:#fff7e9}
#${SHELL_ID} .bb-home-v5-profile-meta{display:flex;align-items:center;gap:7px;margin-top:5px;font:850 clamp(6px,.86vw,8px)/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.08em;color:rgba(255,235,216,.72)}
#${SHELL_ID} .bb-home-v5-profile-meta b{color:#ffd49c}
#${SHELL_ID} .bb-home-v5-xp{height:3px;margin-top:5px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.12)}
#${SHELL_ID} .bb-home-v5-xp i{display:block;width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,#ba2734,#ffb064);box-shadow:0 0 8px rgba(255,88,62,.55);transition:width .24s ease}
#${SHELL_ID} .bb-home-v5-currencies{display:flex;align-items:flex-start;justify-content:flex-end;gap:5px}
#${SHELL_ID} .bb-home-v5-currency{position:relative;width:clamp(116px,19vw,170px);height:clamp(38px,6.2vw,50px);display:grid;grid-template-columns:27px 1fr;align-items:center;gap:4px;padding:4px 9px 4px 7px;box-sizing:border-box;overflow:hidden;border:1px solid rgba(255,230,199,.16);border-radius:11px 3px 11px 3px;background:linear-gradient(115deg,rgba(15,10,13,.92),rgba(37,19,23,.84));box-shadow:0 7px 17px rgba(0,0,0,.29),inset 0 1px rgba(255,255,255,.06)}
#${SHELL_ID} .bb-home-v5-currency>img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;opacity:.19;filter:saturate(.72) brightness(.78);pointer-events:none}
#${SHELL_ID} .bb-home-v5-currency-icon{position:relative;z-index:2;display:grid;place-items:center;width:25px;height:25px;border-radius:50%;font:900 15px/1 ui-sans-serif,system-ui,sans-serif;color:#ffe1b6;background:radial-gradient(circle at 35% 30%,#d84c54,#6f1621 65%,#2f0c13);box-shadow:0 0 0 1px rgba(255,224,188,.42),0 3px 8px rgba(0,0,0,.42)}
#${SHELL_ID} .bb-home-v5-currency[data-v5-currency="embers"] .bb-home-v5-currency-icon{color:#fff1e4;background:radial-gradient(circle at 35% 30%,#ff8f7b,#9c2535 58%,#40101b)}
#${SHELL_ID} .bb-home-v5-currency-copy{position:relative;z-index:2;min-width:0;text-align:right}
#${SHELL_ID} .bb-home-v5-currency-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:900 clamp(5px,.7vw,7px)/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.12em;color:rgba(255,229,207,.64)}
#${SHELL_ID} .bb-home-v5-currency-copy strong{display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;font:950 clamp(12px,1.8vw,17px)/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.02em;color:#fff7e9;text-shadow:0 2px 5px rgba(0,0,0,.62)}
#${SHELL_ID} .bb-home-v5-leader{position:absolute;z-index:1;right:clamp(18px,7vw,90px);bottom:clamp(36px,5vh,60px);width:min(42vw,430px);height:min(58vh,520px);pointer-events:none;opacity:.96;filter:drop-shadow(0 18px 19px rgba(0,0,0,.44))}
#${SHELL_ID} .bb-home-v5-leader:before{content:"";position:absolute;left:50%;bottom:3%;width:72%;height:24%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse,rgba(178,31,43,.28),transparent 68%);filter:blur(8px)}
#${SHELL_ID} .bb-home-v5-leader img{position:relative;z-index:1;display:block;width:100%;height:100%;object-fit:contain;object-position:center bottom;-webkit-mask-image:linear-gradient(180deg,#000 0 77%,rgba(0,0,0,.92) 87%,transparent 100%);mask-image:linear-gradient(180deg,#000 0 77%,rgba(0,0,0,.92) 87%,transparent 100%);filter:saturate(1.04) contrast(1.03)}
#${SHELL_ID} .bb-home-v5-leader-stamp{position:absolute;z-index:2;right:4%;bottom:9%;max-width:72%;padding:5px 8px 4px;border-left:3px solid #cf3341;background:linear-gradient(90deg,rgba(16,8,12,.86),rgba(16,8,12,.22));text-align:right;text-shadow:0 2px 5px #000}
#${SHELL_ID} .bb-home-v5-leader-stamp small{display:block;font:900 6px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.19em;color:#e9aaa5}
#${SHELL_ID} .bb-home-v5-leader-stamp strong{display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:clamp(11px,1.8vw,17px);line-height:1;color:#fff5e8}
@media(max-width:620px){
 #${SHELL_ID} .bb-home-v5-hud{top:max(7px,env(safe-area-inset-top));left:max(6px,env(safe-area-inset-left));right:max(6px,env(safe-area-inset-right));gap:5px}
 #${SHELL_ID} .bb-home-v5-profile{width:min(49vw,178px);height:57px;grid-template-columns:47px 1fr;gap:6px;padding:4px 7px 4px 4px;border-radius:12px 3px 12px 3px}
 #${SHELL_ID} .bb-home-v5-profile-copy small{font-size:5px}
 #${SHELL_ID} .bb-home-v5-profile-copy strong{font-size:13px}
 #${SHELL_ID} .bb-home-v5-profile-meta{gap:5px;font-size:5px;margin-top:4px}
 #${SHELL_ID} .bb-home-v5-xp{margin-top:4px}
 #${SHELL_ID} .bb-home-v5-currencies{flex-direction:column;gap:3px}
 #${SHELL_ID} .bb-home-v5-currency{width:min(34vw,122px);height:27px;grid-template-columns:20px 1fr;gap:2px;padding:2px 6px 2px 4px;border-radius:8px 2px 8px 2px}
 #${SHELL_ID} .bb-home-v5-currency-icon{width:18px;height:18px;font-size:10px}
 #${SHELL_ID} .bb-home-v5-currency-copy small{font-size:4px}
 #${SHELL_ID} .bb-home-v5-currency-copy strong{margin-top:2px;font-size:10px}
 #${SHELL_ID} .bb-home-v5-leader{right:-7vw;bottom:88px;width:min(60vw,240px);height:min(42vh,320px);opacity:.94}
 #${SHELL_ID} .bb-home-v5-leader-stamp{right:10%;bottom:7%;padding:4px 6px 3px}
 #${SHELL_ID} .bb-home-v5-leader-stamp small{font-size:5px}
 #${SHELL_ID} .bb-home-v5-leader-stamp strong{font-size:11px}
}
@media(min-width:621px) and (max-height:720px){
 #${SHELL_ID} .bb-home-v5-profile{height:58px}
 #${SHELL_ID} .bb-home-v5-currency{height:38px}
 #${SHELL_ID} .bb-home-v5-leader{bottom:28px;height:min(55vh,390px)}
}
@media(prefers-reduced-motion:reduce){#${SHELL_ID} .bb-home-v5-xp i{transition:none!important}}
`;
 document.head.appendChild(style);
}

function assetPath(unit,asset){
 if(!asset||String(asset).endsWith('/'))return '';
 if(/^https?:|^data:|^assets\//.test(asset))return asset;
 return `assets/characters/${unit?.id||''}/${asset}`;
}

function roster(){
 return Object.values(window.BLAZING_UNIT_DATA||{}).filter(unit=>unit?.id&&unit?.collection?.owned!==false&&unit?.collection?.battle_ready!==false);
}

function findUnit(identity){
 const raw=typeof identity==='string'
  ?identity
  :(identity?.display_name||identity?.name||identity?.id||'');
 const key=norm(raw);
 if(!key)return null;
 return roster().find(unit=>norm(unit.id)===key||norm(unit.display_name)===key)||null;
}

function activeTeam(){
 try{
  if(typeof getActiveTeam==='function'){
   const team=getActiveTeam();
   if(Array.isArray(team)&&team.length)return team;
  }
 }catch{}
 try{
  if(typeof S!=='undefined'&&Array.isArray(S?.pairs)){
   const team=S.pairs.map(pair=>pair?.units?.[pair?.active]).filter(unit=>unit&&unit.name&&unit.name!=='\u2014'&&(Number(unit.maxHp)||0)>0);
   if(team.length)return team;
  }
 }catch{}
 return [];
}

function leaderUnit(){
 for(const identity of activeTeam()){
  const unit=findUnit(identity);
  if(unit)return unit;
 }
 return roster().find(unit=>norm(unit.display_name)===norm(FALLBACK_UNIT))||roster()[0]||null;
}

function leaderSprite(unit){
 const frame=unit?.animation_standard?.animations?.idle?.frames?.[0];
 return assetPath(unit,frame)||assetPath(unit,unit?.assets?.art)||FALLBACK_LEADER;
}

function leaderAvatar(unit){
 return assetPath(unit,unit?.assets?.art)||leaderSprite(unit)||FALLBACK_AVATAR;
}

function progression(unit){
 const name=unit?.display_name||unit?.id||FALLBACK_UNIT;
 const api=window.BlazingUnitProgression;
 let state={level:Number(unit?.stats?.level)||1,xp:0,awakening:0,shiny:false};
 try{
  if(api?.unit)state={...state,...api.unit(name)};
 }catch{}
 let need=0,cap=50;
 try{need=Number(api?.xpForNextLevel?.(state.level))||0}catch{}
 try{cap=Number(api?.capForAwakening?.(state.awakening))||50}catch{}
 const gated=!state.shiny&&Number(state.level)>=cap;
 const pct=need>0&&!gated?Math.max(0,Math.min(100,(Number(state.xp)||0)/need*100)):100;
 return {level:Math.max(1,Number(state.level)||1),xp:Math.max(0,Number(state.xp)||0),need,awakening:Math.max(0,Number(state.awakening)||0),shiny:!!state.shiny,gated,pct};
}

function economy(){
 try{
  const state=window.BlazingEconomy?.load?.()||{};
  return {marks:Math.max(0,Number(state.battleMarks)||0),embers:Math.max(0,Number(state.embers)||0)};
 }catch{return {marks:0,embers:0}}
}

function ensureV5(shell){
 if(!shell)return null;
 const root=shell.parentElement;
 if(!shell.classList.contains('bb-home-v5'))shell.classList.add('bb-home-v5');
 if(shell.dataset.bbHomeGeneration!=='v5')shell.dataset.bbHomeGeneration='v5';
 if(root&&!root.classList.contains('bb-home-v5'))root.classList.add('bb-home-v5');

 let hud=shell.querySelector('.bb-home-v5-hud');
 if(!hud){
  hud=document.createElement('div');
  hud.className='bb-home-v5-hud';
  hud.setAttribute('aria-label','Live player and currency information');
  hud.innerHTML=`
   <section class="bb-home-v5-profile" aria-label="Team leader">
    <img class="bb-home-v5-profile-texture" src="${HOME_ASSET}hud/player-profile.webp" alt="" draggable="false">
    <span class="bb-home-v5-avatar"><img data-v5-avatar src="${FALLBACK_AVATAR}" alt="${FALLBACK_UNIT}" draggable="false"></span>
    <span class="bb-home-v5-profile-copy"><small>TEAM LEADER</small><strong data-v5-name>${FALLBACK_UNIT}</strong><span class="bb-home-v5-profile-meta"><b data-v5-level>LV 1</b><span data-v5-rank>AWAKENING 0</span></span><span class="bb-home-v5-xp" aria-hidden="true"><i data-v5-xp-fill></i></span></span>
   </section>
   <section class="bb-home-v5-currencies" aria-label="Currencies">
    <span class="bb-home-v5-currency" data-v5-currency="marks"><img src="${HOME_ASSET}hud/gold-currency.webp" alt="" draggable="false"><i class="bb-home-v5-currency-icon">◈</i><span class="bb-home-v5-currency-copy"><small>BATTLE MARKS</small><strong data-v5-marks>0</strong></span></span>
    <span class="bb-home-v5-currency" data-v5-currency="embers"><img src="${HOME_ASSET}hud/premium-currency.webp" alt="" draggable="false"><i class="bb-home-v5-currency-icon">✦</i><span class="bb-home-v5-currency-copy"><small>EMBERS</small><strong data-v5-embers>0</strong></span></span>
   </section>`;
  shell.appendChild(hud);
 }

 let leader=shell.querySelector('.bb-home-v5-leader');
 if(!leader){
  leader=document.createElement('div');
  leader.className='bb-home-v5-leader';
  leader.setAttribute('aria-hidden','true');
  leader.innerHTML=`<img data-v5-leader-art src="${FALLBACK_LEADER}" alt="" draggable="false"><span class="bb-home-v5-leader-stamp"><small>ACTIVE LEADER</small><strong data-v5-leader-name>${FALLBACK_UNIT}</strong></span>`;
  shell.querySelector('.bb-home-v4-stage')?.prepend(leader);
 }
 return {hud,leader};
}

function syncV5(shell){
 const parts=ensureV5(shell);
 if(!parts)return;
 const unit=leaderUnit();
 const prog=progression(unit);
 const cash=economy();
 const name=unit?.display_name||unit?.id||FALLBACK_UNIT;
 const title=prog.shiny?'SHINY':prog.gated?`GATE LV ${prog.level}`:`AWAKENING ${prog.awakening}`;
 const avatar=parts.hud.querySelector('[data-v5-avatar]');
 const art=parts.leader.querySelector('[data-v5-leader-art]');
 const setText=(selector,value)=>{const el=shell.querySelector(selector);if(el&&el.textContent!==String(value))el.textContent=String(value);};

 setText('[data-v5-name]',name);
 setText('[data-v5-leader-name]',name);
 setText('[data-v5-level]',`LV ${prog.level}`);
 setText('[data-v5-rank]',title);
 setText('[data-v5-marks]',format(cash.marks));
 setText('[data-v5-embers]',format(cash.embers));

 const fill=shell.querySelector('[data-v5-xp-fill]');
 if(fill)fill.style.width=`${prog.pct.toFixed(1)}%`;
 const xpBar=shell.querySelector('.bb-home-v5-xp');
 if(xpBar)xpBar.setAttribute('title',prog.need>0&&!prog.gated?`${format(prog.xp)} / ${format(prog.need)} XP`:'Level gate reached');

 const avatarSrc=leaderAvatar(unit);
 if(avatar&&avatar.getAttribute('src')!==avatarSrc)avatar.src=avatarSrc;
 if(avatar){avatar.alt=name;avatar.onerror=()=>{avatar.onerror=null;avatar.src=FALLBACK_AVATAR;};}
 const artSrc=leaderSprite(unit);
 if(art&&art.getAttribute('src')!==artSrc)art.src=artSrc;
 if(art)art.onerror=()=>{art.onerror=null;art.src=FALLBACK_LEADER;};

 shell.dataset.bbHomeLeader=norm(unit?.id||name);
}

function syncRoad(run){
 const shell=document.getElementById(SHELL_ID);
 if(!shell)return;
 const road=shell.querySelector('[data-mode="road"]');
 const castle=shell.querySelector('[data-mode="castle"]');
 if(road)road.dataset.bbHomeAction='road';
 if(castle)castle.dataset.bbHomeAction='castle';
 const desc=road?.querySelector('span:last-child');
 if(!desc)return;
 const next=run?.status==='active'
  ?`Stage ${Math.max(1,Number(run.stage)||1)} · Run in Progress`
  :run?.status==='complete'
   ?'Road Complete · 10/10'
   :'Stage 1 · First Route';
 if(desc.textContent!==next)desc.textContent=next;
}

function apply(){
 ensureStyle();
 const shell=document.getElementById(SHELL_ID);
 if(shell)syncV5(shell);
 try{window.BlazingMatchResults?.syncHud?.()}catch{}
 try{syncRoad(window.BlazingRoadRun?.loadRun?.())}catch{}
}

const previousRoadSync=window.roadSyncCard;
window.roadSyncCard=function(run){
 try{if(typeof previousRoadSync==='function')previousRoadSync(run)}catch(error){console.warn('Legacy Road card sync failed',error)}
 try{syncRoad(run)}catch(error){console.warn('Approved Home Road sync failed',error)}
};

let queued=false;
function schedule(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;apply();});
}

window.addEventListener('bb:economy',schedule);
window.addEventListener('bb:unit-progression',schedule);
window.addEventListener('storage',schedule);
window.addEventListener('pageshow',schedule);
window.addEventListener('resize',schedule,{passive:true});
document.addEventListener('click',event=>{
 const menu=document.getElementById('menuScreen');
 if(menu?.contains(event.target))setTimeout(schedule,0);
},true);
new MutationObserver(records=>{
 const relevant=records.some(record=>{
  if(record.type==='attributes')return record.target?.id==='menuScreen'||record.target?.id===SHELL_ID;
  if(record.type!=='childList')return false;
  if(record.target?.id==='menuScreen'||record.target?.id===SHELL_ID)return true;
  return [...record.addedNodes,...record.removedNodes].some(node=>node?.nodeType===1&&(node.id===SHELL_ID||node.id==='menuScreen'||node.querySelector?.(`#${SHELL_ID},#menuScreen`)));
 });
 if(relevant)schedule();
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});

Promise.resolve(window.BLAZING_UNIT_DATA_READY).catch(()=>null).finally(schedule);
setTimeout(apply,0);
window.BlazingApprovedHomeCompat=Object.freeze({apply,syncRoad,syncV5,leaderUnit});
})();
