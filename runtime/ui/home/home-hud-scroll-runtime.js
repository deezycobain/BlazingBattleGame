(()=>{
'use strict';

const VERSION='v2';
const STYLE_ID='bb-home-scroll-hud-style';
const SHELL_ID='bbHomeApproved';
const PROFILE_KEY='bb_player_profile_v1';
const ASSETS=Object.freeze({
 profile:'assets/ui/home/hud/player-profile-scroll.png',
 coins:'assets/ui/home/hud/gold-currency-scroll.png',
 embers:'assets/ui/home/hud/embers-currency-scroll.png'
});
const COIN_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 6v12M8.8 9.1h5a2.2 2.2 0 0 1 0 4.4h-5.6M9.2 13.5h5.3a2.2 2.2 0 0 1 0 4.4H9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const EMBER_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.2 18 9.4 12 20.8 6 9.4 12 3.2Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m12 7 2.9 3.1-2.9 6-2.9-6L12 7Z" fill="currentColor"/></svg>';
const format=value=>Math.max(0,Math.floor(Number(value)||0)).toLocaleString('en-US');
let queued=false;

function ensureStyle(){
 let style=document.getElementById(STYLE_ID);
 if(!style){
  style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
#${SHELL_ID}.bb-home-v9 .bb-home-v5-hud{
  top:max(6px,env(safe-area-inset-top))!important;
  left:max(6px,env(safe-area-inset-left))!important;
  right:max(6px,env(safe-area-inset-right))!important;
  gap:5px!important;
  align-items:flex-start!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile{
  position:relative!important;
  width:min(52vw,218px)!important;
  height:auto!important;
  aspect-ratio:3/1!important;
  display:block!important;
  grid-template-columns:31% minmax(0,1fr)!important;
  align-items:center!important;
  gap:0!important;
  padding:0!important;
  box-sizing:border-box!important;
  overflow:visible!important;
  border:0!important;
  border-radius:0!important;
  background:transparent url("assets/ui/home/hud/player-profile-scroll.png") center/100% 100% no-repeat!important;
  clip-path:none!important;
  box-shadow:none!important;
  filter:drop-shadow(0 6px 8px rgba(0,0,0,.34))!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile:after{display:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-texture{
  display:none!important;
  position:absolute!important;
  inset:0!important;
  z-index:0!important;
  width:100%!important;
  height:100%!important;
  object-fit:fill!important;
  opacity:1!important;
  mix-blend-mode:normal!important;
  filter:none!important;
  pointer-events:none!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-avatar{
  position:absolute!important;
  z-index:2!important;
  left:15.5%!important;
  top:21%!important;
  grid-column:1!important;
  justify-self:center!important;
  width:17%!important;
  height:auto!important;
  aspect-ratio:1!important;
  margin:0!important;
  border:1px solid rgba(25,15,15,.72)!important;
  border-radius:50%!important;
  background:#1b1012!important;
  box-shadow:0 2px 6px rgba(0,0,0,.36)!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-copy{
  position:absolute!important;
  z-index:2!important;
  left:39%!important;
  right:14%!important;
  top:32%!important;
  height:45%!important;
  grid-column:2!important;
  min-width:0!important;
  padding:0!important;
  text-align:left!important;
  text-shadow:none!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-copy small{
  font:850 5.5px/1 ui-sans-serif,system-ui,sans-serif!important;
  letter-spacing:.14em!important;
  color:#8c1f25!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-copy strong{
  margin-top:3px!important;
  font:900 clamp(11px,2.7vw,15px)/.95 ui-sans-serif,system-ui,sans-serif!important;
  letter-spacing:-.02em!important;
  color:#1c1715!important;
  text-shadow:0 1px rgba(255,255,255,.34)!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-meta{
  position:absolute!important;
  left:13%!important;
  top:78%!important;
  white-space:nowrap!important;
  gap:5px!important;
  margin-top:0!important;
  font:800 5.5px/1 ui-sans-serif,system-ui,sans-serif!important;
  letter-spacing:.05em!important;
  color:#4e4037!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-meta b{color:#9c252b!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-meta span{display:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-xp{display:none!important}

#${SHELL_ID}.bb-home-v9 .bb-home-v5-currencies{
  display:flex!important;
  flex-direction:column!important;
  align-items:flex-end!important;
  gap:1px!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency{
  position:relative!important;
  width:min(38vw,156px)!important;
  height:auto!important;
  aspect-ratio:3/1!important;
  display:block!important;
  padding:0!important;
  overflow:visible!important;
  border:0!important;
  border-radius:0!important;
  background:none!important;
  clip-path:none!important;
  box-shadow:none!important;
  filter:drop-shadow(0 5px 7px rgba(0,0,0,.31))!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency[data-v9-currency="blazing-coins"],
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency[data-v5-currency="blazing-coins"]{background:transparent url("assets/ui/home/hud/gold-currency-scroll.png") center/100% 100% no-repeat!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency[data-v9-currency="embers"],
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency[data-v5-currency="embers"]{background:transparent url("assets/ui/home/hud/embers-currency-scroll.png") center/100% 100% no-repeat!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency>img{display:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-icon{display:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-copy{
  position:absolute!important;
  z-index:2!important;
  left:40%!important;
  right:16%!important;
  top:46%!important;
  min-width:0!important;
  transform:translateY(-50%)!important;
  text-align:left!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-copy small{
  display:block!important;
  font:900 5.5px/1 ui-sans-serif,system-ui,sans-serif!important;
  letter-spacing:.11em!important;
  color:#8f2026!important;
  text-shadow:none!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-copy strong{
  display:block!important;
  margin-top:2px!important;
  font:900 clamp(10px,2.5vw,13px)/1 ui-sans-serif,system-ui,sans-serif!important;
  letter-spacing:.01em!important;
  color:#1d1715!important;
  text-shadow:0 1px rgba(255,255,255,.28)!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency:after{
  content:'+'!important;
  position:absolute!important;
  z-index:3!important;
  right:14%!important;
  top:50%!important;
  transform:translateY(-50%)!important;
  color:#a51f27!important;
  font:950 10px/1 ui-sans-serif,system-ui,sans-serif!important;
  text-shadow:0 1px #f7e3b8!important;
}
@media(max-width:620px){
  #${SHELL_ID}.bb-home-v9 .bb-home-v5-profile{width:min(52vw,211px)!important}
  #${SHELL_ID}.bb-home-v9 .bb-home-v5-currency{width:min(38vw,154px)!important}
  #${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-copy strong{font-size:12px!important}
  #${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-copy strong{font-size:10.5px!important}
  #${SHELL_ID} .bb-main-logo-slot{
    top:max(96px,calc(env(safe-area-inset-top) + 88px))!important;
    width:min(68vw,350px)!important;
    height:min(20vh,146px)!important;
  }
}
@media(max-height:700px){
  #${SHELL_ID}.bb-home-v9 .bb-home-v5-profile{width:min(48vw,195px)!important}
  #${SHELL_ID}.bb-home-v9 .bb-home-v5-currency{width:min(35vw,142px)!important}
  #${SHELL_ID} .bb-main-logo-slot{top:max(87px,calc(env(safe-area-inset-top) + 80px))!important;height:min(18vh,125px)!important}
}
/* Anchor interaction rails to the safe viewport, not pointer parallax. */
#${SHELL_ID}.bb-home-v9.bb-home-v9 .bb-home-v4-utility{
 left:calc(env(safe-area-inset-left,0px) + 10px)!important;
 transform:translateY(-48%)!important;
 gap:5px!important;
}
#${SHELL_ID}.bb-home-v9.bb-home-v9 .bb-home-v4-util-btn{
 width:48px!important;height:56px!important;min-width:48px!important;
}
#${SHELL_ID}.bb-home-v9.bb-home-v9 .bb-home-v4-social{display:none!important}
#${SHELL_ID}.bb-home-v9.bb-home-v9 .bb-home-v5-hud{transform:none!important}
@media(max-width:620px){
 #menuScreen.bb-home-theme.bb-home-v4:before{
  transform:translate3d(var(--bb-home-bg-x,0px),calc(var(--bb-home-bg-y,0px) + 14px),0) scale(1.08)!important;
 }
}
`;
 }
 document.head.appendChild(style);
 return style;
}

function currency(shell,key){
 if(!shell)return null;
 if(key==='coins')return shell.querySelector('[data-v9-currency="blazing-coins"],[data-v5-currency="blazing-coins"],[data-v5-currency="marks"]')||shell.querySelector('[data-v5-marks]')?.closest('.bb-home-v5-currency')||null;
 return shell.querySelector('[data-v9-currency="embers"],[data-v5-currency="embers"]')||shell.querySelector('[data-v5-embers]')?.closest('.bb-home-v5-currency')||null;
}

function syncSource(img,src){
 if(!img)return false;
 if(img.getAttribute('src')!==src)img.setAttribute('src',src);
 img.hidden=true;
 img.setAttribute('hidden','');
 img.setAttribute('aria-hidden','true');
 img.setAttribute('alt','');
 img.draggable=false;
 img.dataset.bbHudSource='approved';
 return true;
}

function pinBackground(el,src){
 if(!el)return false;
 const image=`url("${src}")`;
 el.style.setProperty('background','transparent '+image+' center / 100% 100% no-repeat','important');
 el.style.setProperty('background-image',image,'important');
 el.style.setProperty('background-position','center','important');
 el.style.setProperty('background-size','100% 100%','important');
 el.style.setProperty('background-repeat','no-repeat','important');
 return true;
}

function loadPlayerProfile(){
 try{
  const profile=window.BlazingHomeV8?.loadProfile?.();
  if(profile&&typeof profile.username==='string'&&profile.username.trim())return {username:profile.username.trim().slice(0,16),level:Math.max(1,Number(profile.level)||1)};
 }catch{}
 try{
  const raw=localStorage.getItem(PROFILE_KEY);
  const profile=raw?JSON.parse(raw):null;
  if(profile&&typeof profile.username==='string'&&profile.username.trim())return {username:profile.username.trim().slice(0,16),level:Math.max(1,Number(profile.level)||1)};
 }catch{}
 return null;
}

function currentLeaderName(){
 try{
  const unit=window.BlazingApprovedHomeCompat?.leaderUnit?.();
  return String(unit?.display_name||unit?.name||unit?.id||'').trim();
 }catch{return ''}
}

function syncPlayerProfile(shell){
 const profile=loadPlayerProfile();
 if(!shell||!profile)return false;
 const card=shell.querySelector('.bb-home-v5-profile');
 const copy=card?.querySelector('.bb-home-v5-profile-copy');
 const kicker=copy?.querySelector('small');
 const name=copy?.querySelector('strong');
 const meta=copy?.querySelector('.bb-home-v5-profile-meta');
 const level=meta?.querySelector('b');
 const rank=meta?.querySelector('span');
 const leader=currentLeaderName();
 if(kicker&&kicker.textContent!=='PLAYER')kicker.textContent='PLAYER';
 if(name&&name.textContent!==profile.username)name.textContent=profile.username;
 const levelText=`LV ${profile.level}`;
 if(level&&level.textContent!==levelText)level.textContent=levelText;
 const rankText=leader?`LEADER ${leader.toUpperCase()}`:'PLAYER PROFILE';
 if(rank&&rank.textContent!==rankText)rank.textContent=rankText;
 if(card)card.setAttribute('aria-label',`Player profile ${profile.username}`);
 shell.dataset.bbPlayerProfile='ready';
 return !!(card&&copy&&name&&level);
}

function ensureCurrencyIcon(el,key){
 if(!el)return false;
 let icon=el.querySelector('.bb-home-v5-currency-icon');
 if(!icon){
  icon=document.createElement('i');
  icon.className='bb-home-v5-currency-icon';
  const copy=el.querySelector('.bb-home-v5-currency-copy');
  el.insertBefore(icon,copy||el.firstChild);
 }
 const expected=key==='coins'?COIN_ICON:EMBER_ICON;
 const marker=key==='coins'?'coins':'embers';
 if(icon.dataset.v9Icon!==marker||!icon.querySelector('svg')){
  icon.innerHTML=expected;
  icon.dataset.v9Icon=marker;
 }
 return !!icon.querySelector('svg');
}

function syncEconomy(coins,embers){
 let state=null;
 try{state=window.BlazingEconomy?.load?.()||null}catch{}
 if(!state)return false;
 const coinValue=coins?.querySelector('[data-v5-marks]');
 const emberValue=embers?.querySelector('[data-v5-embers]');
 const nextCoins=format(state.battleMarks);
 const nextEmbers=format(state.embers);
 if(coinValue&&coinValue.textContent!==nextCoins)coinValue.textContent=nextCoins;
 if(emberValue&&emberValue.textContent!==nextEmbers)emberValue.textContent=nextEmbers;
 return !!(coinValue&&emberValue);
}

function syncAssets(shell){
 if(!shell)return false;
 const profileCard=shell.querySelector('.bb-home-v5-profile');
 const profile=shell.querySelector('.bb-home-v5-profile-texture');
 const coins=currency(shell,'coins');
 const embers=currency(shell,'embers');
 const coinImg=coins?.querySelector(':scope>img')||null;
 const emberImg=embers?.querySelector(':scope>img')||null;
 syncSource(profile,ASSETS.profile);
 syncSource(coinImg,ASSETS.coins);
 syncSource(emberImg,ASSETS.embers);
 pinBackground(profileCard,ASSETS.profile);
 pinBackground(coins,ASSETS.coins);
 pinBackground(embers,ASSETS.embers);
 if(coins){
  coins.dataset.v5Currency='blazing-coins';
  coins.dataset.v9Currency='blazing-coins';
  const label=coins.querySelector('.bb-home-v5-currency-copy small');
  if(label&&label.textContent!=='BLAZING COINS')label.textContent='BLAZING COINS';
  ensureCurrencyIcon(coins,'coins');
 }
 if(embers){
  embers.dataset.v9Currency='embers';
  const label=embers.querySelector('.bb-home-v5-currency-copy small');
  if(label&&label.textContent!=='EMBERS')label.textContent='EMBERS';
  ensureCurrencyIcon(embers,'embers');
 }
 syncEconomy(coins,embers);
 syncPlayerProfile(shell);
 shell.dataset.bbHudSkin='scroll-red-black';
 shell.dataset.bbHudAssets='approved-runtime';
 return !!(profile&&coinImg&&emberImg&&profileCard&&coins&&embers);
}

function apply(){
 ensureStyle();
 const shell=document.getElementById(SHELL_ID);
 if(!shell)return false;
 return syncAssets(shell);
}

function schedule(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;apply();});
}

for(const event of ['bb:economy','bb:player-profile','bb:unit-progression','pageshow','storage'])window.addEventListener(event,schedule);
window.addEventListener('resize',schedule,{passive:true});
new MutationObserver(records=>{
 const relevant=records.some(record=>{
  const target=record.target;
  if(record.type==='attributes')return target?.id===SHELL_ID;
  if(record.type!=='childList')return false;
  if(target?.id===SHELL_ID||target?.closest?.('.bb-home-v5-hud'))return true;
  return [...record.addedNodes].some(node=>node?.nodeType===1&&(node.id===SHELL_ID||node.matches?.('.bb-home-v5-hud')||node.querySelector?.('.bb-home-v5-hud')));
 });
 if(relevant)schedule();
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
setTimeout(apply,0);
setTimeout(apply,260);
setTimeout(apply,620);
window.BlazingHomeScrollHud=Object.freeze({VERSION,ASSETS,apply,syncAssets,styleId:STYLE_ID});
})();
