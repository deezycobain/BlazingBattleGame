(()=>{
'use strict';

const SHELL_ID='bbHomeApproved';
const EXPECTED_LAYOUT='v9-polish';
const STYLE_ID='bb-home-v9-leader-stage-style';
const CUTOUTS=Object.freeze({
 tyler:'assets/characters/tyler/art/shiny_foreground_cutout_v1.webp',
 subzero:'assets/characters/subzero/art/shiny_foreground_cutout_v2.webp',
 lebee:'assets/characters/lebee/art/shiny_foreground_cutout_v3.png',
 senku:'assets/characters/senku/art/shiny_foreground_cutout_v5.png'
});
const norm=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
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
@media(max-width:620px){
 #${SHELL_ID}.bb-home-v9 .bb-home-v5-leader{
  left:8vw!important;
  bottom:calc(var(--bb-home-v9-dock-h) - 20px)!important;
  width:min(37vw,185px)!important;
  height:min(31vh,252px)!important;
 }
}
@media(max-height:700px){
 #${SHELL_ID}.bb-home-v9 .bb-home-v5-leader{
  bottom:calc(var(--bb-home-v9-dock-h) - 16px)!important;
  width:min(34vw,165px)!important;
  height:min(30vh,220px)!important;
 }
}
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
window.addEventListener('bb:player-profile',()=>schedule(0));
window.addEventListener('bb:unit-progression',()=>schedule(0));
window.addEventListener('bb:economy',()=>schedule(0));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(0);});
document.addEventListener('click',event=>{if(document.getElementById('menuScreen')?.contains(event.target))schedule(0);},true);

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

window.BlazingHomeV9Lifecycle=Object.freeze({apply,schedule,syncLeader,expectedCutout});
})();
