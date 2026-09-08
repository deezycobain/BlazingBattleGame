(()=>{
'use strict';
const STYLE_ID='bb-home-feedback-fixes-style';
const MARK='r1';
const CSS=`
#bbHomeApproved.bb-home-v9 .bb-home-v5-leader{display:none!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-dock{row-gap:8px!important;transform:translateY(-17px)!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-social{gap:10px!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-nav[data-nav="summon"]{transform:rotate(.35deg) translateX(-3px)!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-nav[data-nav="units"]{transform:rotate(-.2deg) translateX(2px)!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-nav[data-nav="forge"]{transform:rotate(.3deg) translateX(-1px)!important}
@media(max-width:430px){
 #bbHomeApproved.bb-home-v9 .bb-home-v4-dock{row-gap:2px!important;transform:translateY(-6px)!important}
 #bbHomeApproved.bb-home-v9 .bb-home-v4-social{gap:9px!important}
 #bbHomeApproved.bb-home-v9 .bb-home-v4-nav[data-nav="summon"]{transform:rotate(.35deg) translateX(-3px)!important}
 #bbHomeApproved.bb-home-v9 .bb-home-v4-nav[data-nav="units"]{transform:rotate(-.2deg) translateX(2px)!important}
 #bbHomeApproved.bb-home-v9 .bb-home-v4-nav[data-nav="forge"]{transform:rotate(.3deg) translateX(-1px)!important}
}
`;
function ensureStyle(){
 let style=document.getElementById(STYLE_ID);
 if(!style){style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS}
 else if(style.textContent!==CSS)style.textContent=CSS;
 // v9 installs its own !important dock rules. Keep this small feedback layer last in
 // the cascade so wrapper geometry, rather than transformed artwork, owns spacing.
 document.head.appendChild(style);
 return style;
}
function apply(){
 ensureStyle();
 const shell=document.getElementById('bbHomeApproved');
 if(!shell)return false;
 shell.classList.add('bb-home-feedback-r1');
 shell.dataset.bbHomeFeedback=MARK;
 return true;
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
window.addEventListener('pageshow',schedule);
window.addEventListener('resize',schedule,{passive:true});
const observer=new MutationObserver(records=>{
 for(const record of records){
  if(record.target?.id==='menuScreen'||record.target?.id==='bbHomeApproved'||[...record.addedNodes,...record.removedNodes].some(node=>node?.id==='bbHomeApproved'||node?.id==='menuScreen')){schedule();break}
 }
});
function boot(){
 apply();
 const menu=document.getElementById('menuScreen');
 if(menu)observer.observe(menu,{childList:true,subtree:true});
}
window.BlazingHomeFeedbackFixes=Object.freeze({apply,MARK});
if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(apply,180);
setTimeout(apply,420);
})();
