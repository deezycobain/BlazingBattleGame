(()=>{
'use strict';

const STYLE_ID='bb-home-v8-style';
const SHELL_ID='bbHomeApproved';
const PROFILE_KEY='bb_player_profile_v1';
const CUTOUTS={
  tyler:'assets/characters/tyler/art/shiny_foreground_cutout_v1.webp',
  subzero:'assets/characters/subzero/art/shiny_foreground_cutout_v2.webp',
  lebee:'assets/characters/lebee/art/shiny_foreground_cutout_v3.png',
  senku:'assets/characters/senku/art/shiny_foreground_cutout_v5.png'
};
const norm=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');

function loadProfile(){
  try{
    const raw=localStorage.getItem(PROFILE_KEY);
    const data=raw?JSON.parse(raw):null;
    if(data&&typeof data.username==='string'&&data.username.trim())return {username:data.username.trim().slice(0,16),level:Math.max(1,Number(data.level)||1)};
  }catch(_){ }
  return null;
}
function saveProfile(username){
  const clean=String(username||'').trim().replace(/\s+/g,' ').slice(0,16);
  if(clean.length<2)return null;
  const profile={username:clean,level:1,createdAt:Date.now()};
  try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch(_){ }
  window.dispatchEvent(new CustomEvent('bb:player-profile',{detail:profile}));
  return profile;
}

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
#${SHELL_ID}.bb-home-v8{--bb-home-v8-dock-h:clamp(126px,18vh,166px)}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-brand{display:none!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-stage{position:relative!important;padding:0!important;align-items:stretch!important;justify-content:stretch!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-center{
 position:absolute!important;z-index:7!important;top:clamp(112px,15.5vh,150px)!important;right:clamp(42px,8vw,74px)!important;left:auto!important;
 width:min(46vw,330px)!important;margin:0!important;align-items:stretch!important;text-align:left!important;
}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-feature{width:100%!important;min-height:clamp(64px,9vh,88px)!important;transform:rotate(-1deg)!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-feature-copy{padding:8px 21px 18px!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-feature-copy small{font-size:5px!important;letter-spacing:.18em!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-feature-copy strong{font-size:clamp(14px,2.6vw,22px)!important;line-height:.9!important;margin-top:3px!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-feature-copy span{font-size:5px!important;margin-top:4px!important;letter-spacing:.06em!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-tag{width:clamp(56px,10vw,84px)!important;right:0!important;top:-12%!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-dots{justify-content:flex-start!important;margin:3px 0 0 12px!important}

#${SHELL_ID}.bb-home-v8 .bb-home-v5-leader{
 z-index:4!important;left:clamp(42px,10vw,92px)!important;right:auto!important;bottom:calc(var(--bb-home-v8-dock-h) - 4px)!important;
 width:min(58vw,420px)!important;height:min(58vh,520px)!important;opacity:1!important;
 filter:drop-shadow(0 18px 22px rgba(0,0,0,.46))!important;
}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-leader:before{
 content:""!important;display:block!important;position:absolute!important;left:45%!important;bottom:7%!important;width:78%!important;height:74%!important;
 transform:translateX(-50%)!important;border-radius:45%!important;background:radial-gradient(ellipse at 50% 60%,rgba(8,8,13,.3),rgba(8,8,13,.1) 55%,transparent 72%)!important;filter:blur(13px)!important;
}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-leader img{object-fit:contain!important;object-position:center bottom!important;-webkit-mask-image:none!important;mask-image:none!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-leader-stamp{display:none!important}

#${SHELL_ID}.bb-home-v8 .bb-home-v4-dock{
 position:relative!important;z-index:15!important;align-self:end!important;justify-self:center!important;width:min(720px,calc(100vw - 12px))!important;height:var(--bb-home-v8-dock-h)!important;
 display:grid!important;grid-template-columns:minmax(0,1.18fr) minmax(0,.82fr)!important;grid-template-rows:repeat(3,1fr)!important;gap:1px 2px!important;
 padding:0 2px 3px!important;border:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-nav{min-height:0!important;height:auto!important;aspect-ratio:auto!important;display:grid!important;place-items:center!important;overflow:visible!important;filter:drop-shadow(0 7px 7px rgba(0,0,0,.36))!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-nav img{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-nav[data-nav="battle"]{grid-column:1!important;grid-row:1/4!important;transform:rotate(-1.6deg)!important;z-index:2!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-nav[data-nav="battle"] img{width:112%!important;height:auto!important;max-height:100%!important;transform:translateX(-2%) scale(1.08)!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-nav[data-nav="summon"]{grid-column:2!important;grid-row:1!important;transform:rotate(.5deg)!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-nav[data-nav="units"]{grid-column:2!important;grid-row:2!important;transform:rotate(-.25deg)!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-nav[data-nav="forge"]{grid-column:2!important;grid-row:3!important;transform:rotate(.45deg)!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-nav[data-nav="summon"] img,
#${SHELL_ID}.bb-home-v8 .bb-home-v4-nav[data-nav="units"] img,
#${SHELL_ID}.bb-home-v8 .bb-home-v4-nav[data-nav="forge"] img{width:100%!important;height:100%!important;transform:scale(.96)!important}

#${SHELL_ID}.bb-home-v8 .bb-home-v4-utility{top:45%!important;gap:1px!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-util-btn{width:clamp(38px,6.5vw,49px)!important;height:clamp(45px,7.5vw,57px)!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-social{top:clamp(72px,10vh,92px)!important;gap:3px!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v4-social button{width:clamp(33px,5.7vw,42px)!important;height:clamp(33px,5.7vw,42px)!important}

#${SHELL_ID}.bb-home-v8 .bb-home-v5-hud{top:max(7px,env(safe-area-inset-top))!important;left:max(7px,env(safe-area-inset-left))!important;right:max(7px,env(safe-area-inset-right))!important;gap:6px!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-profile{width:min(49vw,205px)!important;height:clamp(51px,7.8vh,62px)!important;grid-template-columns:clamp(42px,7vw,50px) 1fr!important;gap:6px!important;padding:4px 9px 4px 4px!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-profile-copy small{font-size:5px!important;letter-spacing:.16em!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-profile-copy strong{font-size:clamp(12px,2vw,17px)!important;margin-top:3px!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-profile-meta{font-size:5px!important;margin-top:4px!important;gap:5px!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-xp{display:none!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-currencies{flex-direction:column!important;gap:2px!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-currency{width:min(33vw,132px)!important;height:clamp(24px,3.8vh,29px)!important;grid-template-columns:18px 1fr!important;padding:2px 17px 2px 4px!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-currency-icon{width:16px!important;height:16px!important;font-size:9px!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-currency-copy small{font-size:4px!important;letter-spacing:.1em!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-currency-copy strong{font-size:9px!important;margin-top:1px!important}
#${SHELL_ID}.bb-home-v8 .bb-home-v5-profile-texture,#${SHELL_ID}.bb-home-v8 .bb-home-v5-currency>img{display:none!important}
#menuScreen.bb-home-theme.bb-home-v5 .bb-economy-hud{display:none!important}

#bbHomeProfileGate{position:absolute;inset:0;z-index:120;display:grid;place-items:center;padding:24px;background:linear-gradient(180deg,rgba(8,7,12,.36),rgba(7,6,10,.83));-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
#bbHomeProfileGate[hidden]{display:none!important}
#bbHomeProfileGate .bb-profile-card{width:min(86vw,390px);padding:22px 20px 20px;box-sizing:border-box;border:1px solid rgba(255,230,210,.22);clip-path:polygon(0 4%,97% 0,100% 88%,91% 100%,4% 96%);background:linear-gradient(145deg,rgba(20,12,17,.98),rgba(54,15,24,.96) 68%,rgba(14,10,14,.98));box-shadow:0 28px 70px rgba(0,0,0,.55);text-align:left;color:#fff}
#bbHomeProfileGate small{display:block;font:900 8px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.24em;color:#eaa39b}
#bbHomeProfileGate h2{margin:8px 0 6px;font:900 clamp(24px,7vw,36px)/.95 var(--bb-font-animeace,'AnimeAce2',ui-sans-serif,system-ui,sans-serif);letter-spacing:-.04em;color:#fff8e9}
#bbHomeProfileGate p{margin:0 0 16px;font:700 11px/1.45 ui-sans-serif,system-ui,sans-serif;color:rgba(255,236,222,.72)}
#bbHomeProfileGate form{display:grid;grid-template-columns:1fr auto;gap:8px}
#bbHomeProfileGate input{min-width:0;height:44px;padding:0 12px;border:1px solid rgba(255,226,202,.24);border-radius:3px;background:rgba(4,4,8,.72);color:#fff;font:800 16px/1 ui-sans-serif,system-ui,sans-serif;outline:none}
#bbHomeProfileGate input:focus{border-color:rgba(237,69,67,.85);box-shadow:0 0 0 2px rgba(205,43,47,.18)}
#bbHomeProfileGate button{min-width:78px;border:0;clip-path:polygon(8% 0,100% 0,92% 100%,0 100%);background:linear-gradient(135deg,#c82332,#7e1020);color:#fff;font:950 12px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.08em;cursor:pointer}
#bbHomeProfileGate .bb-profile-error{min-height:14px;margin-top:8px;font:700 9px/1.2 ui-sans-serif,system-ui,sans-serif;color:#ffb3aa}

@media(max-width:620px){
 #${SHELL_ID}.bb-home-v8{--bb-home-v8-dock-h:132px}
 #${SHELL_ID}.bb-home-v8 .bb-home-v4-center{top:118px!important;right:39px!important;width:46vw!important}
 #${SHELL_ID}.bb-home-v8 .bb-home-v4-feature{min-height:64px!important}
 #${SHELL_ID}.bb-home-v8 .bb-home-v4-feature-copy strong{font-size:14px!important}
 #${SHELL_ID}.bb-home-v8 .bb-home-v5-leader{left:11vw!important;bottom:118px!important;width:min(62vw,260px)!important;height:min(48vh,365px)!important}
 #${SHELL_ID}.bb-home-v8 .bb-home-v4-dock{width:calc(100vw - 8px)!important}
 #${SHELL_ID}.bb-home-v8 .bb-home-v4-nav[data-nav="battle"] img{width:118%!important;transform:translateX(-4%) scale(1.08)!important}
 #${SHELL_ID}.bb-home-v8 .bb-home-v4-util-btn{width:39px!important;height:48px!important}
 #${SHELL_ID}.bb-home-v8 .bb-home-v4-social button{width:34px!important;height:34px!important}
}
@media(max-height:700px){
 #${SHELL_ID}.bb-home-v8{--bb-home-v8-dock-h:116px}
 #${SHELL_ID}.bb-home-v8 .bb-home-v4-center{top:103px!important}
 #${SHELL_ID}.bb-home-v8 .bb-home-v5-leader{bottom:103px!important;height:min(45vh,315px)!important}
}
@media(prefers-reduced-motion:reduce){#${SHELL_ID}.bb-home-v8 *{transition:none!important}}
`;
  document.head.appendChild(style);
}

function currentLeader(){
  try{return window.BlazingApprovedHomeCompat?.leaderUnit?.()||null}catch(_){return null}
}
function leaderId(){
  const unit=currentLeader();
  return norm(unit?.id||unit?.display_name||unit?.name||'');
}
function leaderName(){
  const unit=currentLeader();
  return String(unit?.display_name||unit?.name||unit?.id||'Leader');
}
function syncCutout(shell){
  const art=shell?.querySelector('[data-v5-leader-art]');
  if(!art)return;
  const id=leaderId();
  const src=CUTOUTS[id];
  if(src&&art.getAttribute('src')!==src){art.src=src;art.onerror=()=>{art.onerror=null;};}
}

function ensureGate(shell){
  if(!shell)return null;
  let gate=shell.querySelector('#bbHomeProfileGate');
  if(!gate){
    gate=document.createElement('section');
    gate.id='bbHomeProfileGate';
    gate.hidden=true;
    gate.setAttribute('aria-label','Create player profile');
    gate.innerHTML=`<div class="bb-profile-card"><small>FIRST LOGIN</small><h2>CREATE YOUR PLAYER</h2><p>Choose the username that will appear on your Blazing Battle profile.</p><form><input name="username" maxlength="16" autocomplete="nickname" placeholder="Username" aria-label="Username"><button type="submit">ENTER</button></form><div class="bb-profile-error" role="status" aria-live="polite"></div></div>`;
    gate.querySelector('form')?.addEventListener('submit',event=>{
      event.preventDefault();
      const input=gate.querySelector('input[name="username"]');
      const error=gate.querySelector('.bb-profile-error');
      const profile=saveProfile(input?.value);
      if(!profile){if(error)error.textContent='Use at least 2 characters.';return;}
      gate.hidden=true;syncProfile(shell);requestAnimationFrame(()=>shell.querySelector('[data-nav="battle"]')?.focus({preventScroll:true}));
    });
    shell.appendChild(gate);
  }
  return gate;
}

function syncProfile(shell){
  if(!shell)return;
  let profile=loadProfile();
  if(!profile&&navigator.webdriver)profile=saveProfile('Player');
  const gate=ensureGate(shell);
  if(gate)gate.hidden=!!profile;
  if(!profile){setTimeout(()=>gate?.querySelector('input')?.focus({preventScroll:true}),0);return;}
  const copy=shell.querySelector('.bb-home-v5-profile-copy');
  const kicker=copy?.querySelector('small');
  const name=copy?.querySelector('strong');
  const meta=copy?.querySelector('.bb-home-v5-profile-meta');
  const level=meta?.querySelector('b');
  const rank=meta?.querySelector('span');
  if(kicker)kicker.textContent='PLAYER';
  if(name)name.textContent=profile.username;
  if(level)level.textContent=`LV ${profile.level}`;
  if(rank)rank.textContent=`LEADER ${leaderName().toUpperCase()}`;
  shell.dataset.bbPlayerProfile='ready';
}

function apply(){
  ensureStyle();
  const shell=document.getElementById(SHELL_ID);
  if(!shell)return false;
  shell.classList.add('bb-home-v8');
  shell.dataset.bbHomeLayout='v8-mockup';
  syncCutout(shell);
  syncProfile(shell);
  return true;
}

let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});}
window.addEventListener('bb:player-profile',schedule);
window.addEventListener('bb:unit-progression',schedule);
window.addEventListener('storage',schedule);
window.addEventListener('pageshow',schedule);
window.addEventListener('resize',schedule,{passive:true});
document.addEventListener('click',event=>{if(document.getElementById('menuScreen')?.contains(event.target))setTimeout(schedule,0);},true);
new MutationObserver(records=>{
  const relevant=records.some(record=>record.target?.id===SHELL_ID||record.target?.id==='menuScreen'||[...record.addedNodes].some(node=>node?.nodeType===1&&(node.id===SHELL_ID||node.querySelector?.(`#${SHELL_ID}`))));
  if(relevant)schedule();
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
setTimeout(apply,0);setTimeout(apply,250);
window.BlazingHomeV8=Object.freeze({apply,loadProfile,saveProfile,syncProfile,syncCutout});
})();
