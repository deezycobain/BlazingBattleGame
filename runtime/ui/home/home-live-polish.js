(()=>{
'use strict';

const STYLE_ID='bb-home-live-v7-style';
const SHELL_ID='bbHomeApproved';
const ORIGINAL_WALLPAPER='runtime/ui/home/home-wallpaper-hq.png';
const TYLER_CUTOUT='assets/characters/tyler/art/shiny_foreground_cutout_v1.webp';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 document.getElementById('bb-home-live-v6-style')?.remove();
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
#menuScreen.bb-home-theme.bb-home-v4{
 --bb-home-bg-x:0px;--bb-home-bg-y:0px;--bb-home-leader-x:0px;--bb-home-leader-y:0px;--bb-home-ui-x:0px;--bb-home-ui-y:0px;
 background:#0d1018!important;
}
#menuScreen.bb-home-theme.bb-home-v4:before{
 inset:-5%!important;
 background-image:linear-gradient(180deg,rgba(8,9,15,.02) 0%,rgba(8,9,15,.02) 47%,rgba(10,7,12,.22) 70%,rgba(7,5,9,.76) 100%),url("${ORIGINAL_WALLPAPER}")!important;
 background-size:cover!important;background-repeat:no-repeat!important;background-position:center center!important;
 filter:saturate(1.04) contrast(1.02)!important;
 transform:translate3d(var(--bb-home-bg-x),var(--bb-home-bg-y),0) scale(1.08)!important;
 transition:transform .18s cubic-bezier(.2,.7,.2,1)!important;
 will-change:transform;
}
#menuScreen.bb-home-theme.bb-home-v4:after{
 background:radial-gradient(circle at 53% 38%,transparent 0 30%,rgba(7,8,14,.04) 52%,rgba(7,6,11,.28) 100%),linear-gradient(90deg,rgba(10,7,12,.22),transparent 21%,transparent 79%,rgba(10,7,12,.2))!important;
 transform:none!important;
}
#${SHELL_ID}.bb-home-live-v7{padding-bottom:max(8px,env(safe-area-inset-bottom))!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-top{min-height:66px!important;z-index:14!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-brand{display:none!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-stage{isolation:isolate;z-index:2!important;padding:0 58px 5px!important;align-items:flex-end!important;justify-content:flex-start!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-center{
 width:min(68vw,560px)!important;margin:0 0 clamp(8px,1.5vh,16px) clamp(38px,7vw,78px)!important;align-items:flex-start!important;text-align:left!important;
 transform:translate3d(var(--bb-home-ui-x),var(--bb-home-ui-y),0);transition:transform .18s cubic-bezier(.2,.7,.2,1);will-change:transform;
}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-feature{
 width:100%!important;min-height:clamp(80px,12vh,112px)!important;filter:drop-shadow(0 15px 23px rgba(0,0,0,.45))!important;
 transform:rotate(-1.25deg);transform-origin:22% 80%;
}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-feature:hover,#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-feature:focus-visible{transform:rotate(-1.25deg) translateY(-2px) scale(1.012)!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-feature-copy{padding:11px clamp(25px,5vw,50px) 23px!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-feature-copy small{font-size:clamp(6px,.9vw,8px)!important;letter-spacing:.2em!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-feature-copy strong{margin-top:4px!important;font-size:clamp(17px,3vw,29px)!important;line-height:.92!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-feature-copy span{margin-top:5px!important;font-size:clamp(6px,.9vw,8px)!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-tag{width:clamp(68px,13vw,104px)!important;right:1.5%!important;top:-11%!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-dots{margin:3px 0 0 18px!important}

#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-profile-texture,
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-currency>img{display:none!important}
#menuScreen.bb-home-theme.bb-home-v5 .bb-economy-hud{display:none!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-hud{
 top:max(8px,env(safe-area-inset-top))!important;left:max(8px,env(safe-area-inset-left))!important;right:max(8px,env(safe-area-inset-right))!important;
 transform:translate3d(var(--bb-home-ui-x),var(--bb-home-ui-y),0);transition:transform .18s cubic-bezier(.2,.7,.2,1);
}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-profile{
 overflow:visible!important;border:0!important;border-radius:0!important;
 background:linear-gradient(102deg,rgba(10,9,13,.94),rgba(38,15,20,.88) 72%,rgba(72,19,29,.16))!important;
 clip-path:polygon(0 8%,94% 0,100% 73%,91% 100%,4% 94%);
 box-shadow:none!important;filter:drop-shadow(0 8px 12px rgba(0,0,0,.42))!important;
}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-profile:after{content:"";position:absolute;left:4px;right:5%;bottom:0;height:2px;background:linear-gradient(90deg,#e54643,#9f1625 68%,transparent);transform:skewX(-28deg)}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-avatar{border:2px solid rgba(255,229,202,.75)!important;box-shadow:0 0 0 2px rgba(126,21,34,.75),0 5px 12px rgba(0,0,0,.42)!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-profile-copy small{color:#f2b0a6!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-profile-copy strong{font-family:var(--bb-font-animeace,'AnimeAce2',ui-sans-serif,system-ui,sans-serif)!important;color:#fff9ed!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-xp{background:rgba(255,255,255,.12)!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-currencies{gap:4px!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-currency{
 overflow:visible!important;border:0!important;border-radius:0!important;padding-right:19px!important;
 background:linear-gradient(103deg,rgba(13,11,15,.93),rgba(40,20,25,.91) 74%,rgba(97,24,35,.38))!important;
 clip-path:polygon(5% 0,100% 6%,94% 100%,0 91%);box-shadow:none!important;filter:drop-shadow(0 6px 9px rgba(0,0,0,.4))!important;
}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-currency:after{content:'+';position:absolute;right:7px;top:50%;transform:translateY(-50%);z-index:3;font:950 13px/1 ui-sans-serif,system-ui,sans-serif;color:#ffe1c0;text-shadow:0 2px 5px #000}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-currency-icon{box-shadow:0 0 0 1px rgba(255,224,188,.35),0 4px 8px rgba(0,0,0,.44)!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-currency-copy small{color:rgba(255,231,213,.66)!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-currency-copy strong{color:#fff7e9!important}

#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-leader{
 z-index:2!important;right:clamp(-18px,1.3vw,20px)!important;bottom:clamp(104px,14vh,155px)!important;width:min(48vw,430px)!important;height:min(63vh,570px)!important;
 opacity:1!important;filter:drop-shadow(0 20px 22px rgba(0,0,0,.46))!important;
 transform:translate3d(var(--bb-home-leader-x),var(--bb-home-leader-y),0)!important;transition:transform .18s cubic-bezier(.2,.7,.2,1)!important;will-change:transform;
}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-leader:before{bottom:2%!important;width:64%!important;height:15%!important;background:radial-gradient(ellipse,rgba(149,28,45,.26),transparent 69%)!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-leader img{
 width:100%!important;height:100%!important;object-fit:contain!important;object-position:center bottom!important;-webkit-mask-image:none!important;mask-image:none!important;
 animation:bbHomeV7LeaderFloat 6.6s ease-in-out infinite;transform-origin:52% 92%;filter:saturate(1.03) contrast(1.025)!important;
}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-leader-stamp{right:2%!important;bottom:5%!important;max-width:68%!important;background:linear-gradient(90deg,rgba(10,8,12,.78),rgba(10,8,12,.08))!important}

#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-utility{left:max(5px,env(safe-area-inset-left))!important;top:48%!important;gap:2px!important;transform:translate3d(var(--bb-home-ui-x),calc(-48% + var(--bb-home-ui-y)),0)!important;transition:transform .18s cubic-bezier(.2,.7,.2,1)}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-social{right:max(5px,env(safe-area-inset-right))!important;gap:3px!important;transform:translate3d(var(--bb-home-ui-x),var(--bb-home-ui-y),0)!important;transition:transform .18s cubic-bezier(.2,.7,.2,1)}

#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-dock{
 width:min(760px,calc(100vw - 18px))!important;display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;grid-template-rows:auto auto!important;gap:0 3px!important;
 padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
 transform:translate3d(var(--bb-home-ui-x),var(--bb-home-ui-y),0);transition:transform .18s cubic-bezier(.2,.7,.2,1);
}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav{aspect-ratio:auto!important;height:auto!important;filter:drop-shadow(0 8px 7px rgba(0,0,0,.36))!important;transform-origin:center}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav img{object-fit:contain!important;object-position:center!important}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav[data-nav="battle"]{grid-column:1/7;grid-row:1;height:clamp(52px,8.5vh,72px)!important;transform:rotate(-1.1deg) scale(1.025);z-index:2}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav[data-nav="summon"]{grid-column:1/3;grid-row:2;height:clamp(37px,6vh,51px)!important;transform:rotate(.7deg) translateY(-4px)}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav[data-nav="units"]{grid-column:3/5;grid-row:2;height:clamp(37px,6vh,51px)!important;transform:rotate(-.35deg) translateY(-1px)}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav[data-nav="forge"]{grid-column:5/7;grid-row:2;height:clamp(37px,6vh,51px)!important;transform:rotate(.65deg) translateY(-4px)}
#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav:hover,#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav:focus-visible{filter:drop-shadow(0 10px 10px rgba(0,0,0,.42)) brightness(1.08)!important;outline:none}

#${SHELL_ID} .bb-home-v6-road-progress{position:absolute;z-index:5;left:clamp(25px,5vw,46px);right:clamp(25px,5vw,46px);bottom:8px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:7px;pointer-events:none}
#${SHELL_ID} .bb-home-v6-road-progress[hidden]{display:none!important}
#${SHELL_ID} .bb-home-v6-road-track{position:relative;height:3px;overflow:hidden;border-radius:999px;background:rgba(255,244,225,.13);box-shadow:inset 0 1px 2px rgba(0,0,0,.45),0 0 0 1px rgba(255,226,198,.05)}
#${SHELL_ID} .bb-home-v6-road-track i{display:block;width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,#b72332,#ff7e52 64%,#ffd28b);box-shadow:0 0 10px rgba(255,89,59,.58);transition:width .32s cubic-bezier(.2,.7,.2,1)}
#${SHELL_ID} .bb-home-v6-road-progress b{white-space:nowrap;font:950 clamp(5px,.7vw,7px)/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.13em;color:rgba(255,239,218,.78);text-shadow:0 2px 4px rgba(0,0,0,.62)}
#${SHELL_ID}[data-bb-road-state="complete"] .bb-home-v6-road-track i{background:linear-gradient(90deg,#d38b32,#ffe096,#fff4cf)}
#${SHELL_ID}[data-bb-road-state="failed"] .bb-home-v6-road-track i{filter:saturate(.45);opacity:.65}

@keyframes bbHomeV7LeaderFloat{0%,100%{transform:translate3d(0,0,0) rotate(-.12deg)}48%{transform:translate3d(0,-5px,0) rotate(.14deg)}72%{transform:translate3d(1px,-2px,0) rotate(.03deg)}}
@media(max-width:620px){
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-top{min-height:59px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-stage{padding:0 46px 1px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-center{width:min(76vw,360px)!important;margin:0 0 5px 18px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-feature{min-height:76px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-feature-copy{padding:9px 24px 20px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-feature-copy strong{font-size:18px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-feature-copy span{font-size:6px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v5-hud{gap:4px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v5-profile{width:min(49vw,176px)!important;height:54px!important;grid-template-columns:44px 1fr!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v5-profile-copy strong{font-size:12px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v5-currency{width:min(34vw,121px)!important;height:27px!important;grid-template-columns:19px 1fr!important;padding:2px 17px 2px 4px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v5-currency-icon{width:17px!important;height:17px!important;font-size:9px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v5-currency-copy strong{font-size:9px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v5-leader{right:-8vw!important;bottom:112px!important;width:min(58vw,265px)!important;height:min(46vh,365px)!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v5-leader-stamp{right:9%!important;bottom:4%!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-utility{top:49%!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-util-btn{width:43px!important;height:52px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-social{top:82px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-social button{width:39px!important;height:39px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-dock{width:calc(100vw - 12px)!important;gap:0 1px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav[data-nav="battle"]{height:58px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav[data-nav="summon"],#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav[data-nav="units"],#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav[data-nav="forge"]{height:39px!important}
 #${SHELL_ID} .bb-home-v6-road-progress{left:22px;right:22px;bottom:6px;gap:6px}
}
@media(max-height:650px){
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v5-leader{bottom:90px!important;height:min(43vh,300px)!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-feature{min-height:70px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav[data-nav="battle"]{height:51px!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav[data-nav="summon"],#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav[data-nav="units"],#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-nav[data-nav="forge"]{height:34px!important}
}
@media(prefers-reduced-motion:reduce){
 #menuScreen.bb-home-theme.bb-home-v4:before,#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-hud,#${SHELL_ID}.bb-home-live-v7 .bb-home-v5-leader,#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-center,#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-utility,#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-social,#${SHELL_ID}.bb-home-live-v7 .bb-home-v4-dock{transition:none!important}
 #${SHELL_ID}.bb-home-live-v7 .bb-home-v5-leader img{animation:none!important}
 #${SHELL_ID} .bb-home-v6-road-track i{transition:none!important}
}
`;
 document.head.appendChild(style);
}

function ensureProgress(shell){
 const feature=shell?.querySelector('.bb-home-v4-feature');
 if(!feature)return null;
 let progress=feature.querySelector('.bb-home-v6-road-progress');
 if(progress)return progress;
 progress=document.createElement('div');
 progress.className='bb-home-v6-road-progress';
 progress.hidden=true;
 progress.setAttribute('aria-hidden','true');
 progress.innerHTML='<span class="bb-home-v6-road-track"><i></i></span><b>STAGE 1 / 10</b>';
 feature.appendChild(progress);
 return progress;
}

function readRun(){try{return window.BlazingRoadRun?.loadRun?.()||null}catch{return null}}
function viewForRun(run){
 if(!run)return {state:'fresh',stage:1,progress:0,showProgress:false,kicker:'FEATURED',title:'ENTER THE BATTLE',desc:'Blazing Road · Phantom Castle',label:'STAGE 1 / 10'};
 const stage=clamp(run.stage,1,10),cleared=clamp(stage-1,0,10);
 if(run.status==='complete')return {state:'complete',stage:10,progress:100,showProgress:true,kicker:'ROAD CLEARED',title:'BLAZING ROAD COMPLETE',desc:'10 stages cleared · Phantom Castle awaits',label:'10 / 10 COMPLETE'};
 if(run.status==='failed')return {state:'failed',stage,progress:cleared*10,showProgress:true,kicker:'RUN ENDED',title:'BLAZING ROAD FALLEN',desc:`Stage ${stage} reached · Restart when ready`,label:`STAGE ${stage} / 10`};
 return {state:'active',stage,progress:cleared*10,showProgress:true,kicker:'RUN IN PROGRESS',title:'CONTINUE BLAZING ROAD',desc:`Stage ${stage} of 10 · Squad HP carries forward`,label:`STAGE ${stage} / 10`};
}
function setText(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value)}
function syncRoad(shell,run=readRun()){
 if(!shell)return null;
 const feature=shell.querySelector('.bb-home-v4-feature'),copy=feature?.querySelector('.bb-home-v4-feature-copy'),progress=ensureProgress(shell);
 if(!feature||!copy||!progress)return null;
 const view=viewForRun(run);
 setText(copy.querySelector('small'),view.kicker);setText(copy.querySelector('strong'),view.title);setText(copy.querySelector('span'),view.desc);setText(progress.querySelector('b'),view.label);
 const fill=progress.querySelector('i');if(fill)fill.style.width=`${view.progress}%`;
 progress.hidden=!view.showProgress;shell.dataset.bbRoadState=view.state;shell.dataset.bbRoadStage=String(view.stage);
 feature.setAttribute('aria-label',view.state==='active'?`Open Battle modes, Blazing Road stage ${view.stage}`:'Open Battle modes');
 return view;
}

function currentLeader(){try{return window.BlazingApprovedHomeCompat?.leaderUnit?.()||null}catch{return null}}
function syncLeaderPresentation(shell){
 const unit=currentLeader(),id=String(unit?.id||unit?.display_name||'').trim().toLowerCase();
 const art=shell?.querySelector('[data-v5-leader-art]');
 if(!art)return;
 if(id==='tyler'){
  if(art.getAttribute('src')!==TYLER_CUTOUT)art.src=TYLER_CUTOUT;
  art.onerror=()=>{art.onerror=null;};
 }
}
function suppressBakedHud(shell){
 shell?.querySelectorAll('.bb-home-v5-profile-texture,.bb-home-v5-currency>img').forEach(img=>{img.hidden=true;img.setAttribute('aria-hidden','true');});
}
function syncStructure(shell){
 const brand=shell?.querySelector('.bb-home-v4-brand');
 if(brand){brand.setAttribute('aria-hidden','true');brand.hidden=true;}
 suppressBakedHud(shell);syncLeaderPresentation(shell);
}

let parallaxInstalled=false,lastX=0,lastY=0,raf=0;
function setParallax(x,y){
 lastX=clamp(x,-1,1);lastY=clamp(y,-1,1);
 if(raf)return;
 raf=requestAnimationFrame(()=>{
  raf=0;
  const menu=document.getElementById('menuScreen'),shell=document.getElementById(SHELL_ID);
  if(!menu||!shell)return;
  menu.style.setProperty('--bb-home-bg-x',`${(-lastX*9).toFixed(1)}px`);
  menu.style.setProperty('--bb-home-bg-y',`${(-lastY*7).toFixed(1)}px`);
  shell.style.setProperty('--bb-home-leader-x',`${(lastX*17).toFixed(1)}px`);
  shell.style.setProperty('--bb-home-leader-y',`${(lastY*11).toFixed(1)}px`);
  shell.style.setProperty('--bb-home-ui-x',`${(lastX*2.5).toFixed(1)}px`);
  shell.style.setProperty('--bb-home-ui-y',`${(lastY*2).toFixed(1)}px`);
 });
}
function installParallax(){
 if(parallaxInstalled)return;parallaxInstalled=true;
 document.addEventListener('pointermove',event=>{
  const menu=document.getElementById('menuScreen');if(!menu||menu.hidden)return;
  const r=menu.getBoundingClientRect();if(!r.width||!r.height)return;
  setParallax(((event.clientX-r.left)/r.width-.5)*2,((event.clientY-r.top)/r.height-.5)*2);
 },{passive:true});
 window.addEventListener('deviceorientation',event=>{
  const menu=document.getElementById('menuScreen');if(!menu||menu.hidden||!Number.isFinite(event.gamma)||!Number.isFinite(event.beta))return;
  setParallax(clamp(event.gamma/28,-1,1),clamp((event.beta-45)/35,-1,1));
 },{passive:true});
}

function apply(){
 ensureStyle();installParallax();
 const shell=document.getElementById(SHELL_ID);if(!shell)return false;
 shell.classList.remove('bb-home-live-v6');shell.classList.add('bb-home-live-v7');shell.dataset.bbHomeLivePolish='v7';
 syncStructure(shell);syncRoad(shell);return true;
}

const previousRoadSync=window.roadSyncCard;
window.roadSyncCard=function(run){
 try{if(typeof previousRoadSync==='function')previousRoadSync(run)}catch(error){console.warn('Home previous Road sync failed',error)}
 try{const shell=document.getElementById(SHELL_ID);syncStructure(shell);syncRoad(shell,run)}catch(error){console.warn('Home v7 Road feature sync failed',error)}
};

let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()});}
window.addEventListener('bb:economy',schedule);window.addEventListener('bb:unit-progression',schedule);window.addEventListener('storage',schedule);window.addEventListener('pageshow',schedule);window.addEventListener('resize',schedule,{passive:true});
document.addEventListener('click',event=>{const menu=document.getElementById('menuScreen');if(menu?.contains(event.target))setTimeout(schedule,0);},true);
new MutationObserver(records=>{
 const relevant=records.some(record=>{
  if(record.type==='attributes')return record.target?.id==='menuScreen'||record.target?.id===SHELL_ID;
  if(record.type!=='childList')return false;
  if(record.target?.id==='menuScreen'||record.target?.id===SHELL_ID)return true;
  return [...record.addedNodes,...record.removedNodes].some(node=>node?.nodeType===1&&(node.id===SHELL_ID||node.querySelector?.(`#${SHELL_ID}`)));
 });
 if(relevant)schedule();
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});
Promise.resolve(window.BLAZING_UNIT_DATA_READY).catch(()=>null).finally(schedule);
setTimeout(apply,0);setTimeout(apply,220);
window.BlazingHomeLivePolish=Object.freeze({apply,syncRoad,viewForRun,syncLeaderPresentation});
})();
