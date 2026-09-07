(()=>{
'use strict';
const STYLE_ID='bb-home-feedback-fixes-style';
const MARK='r1';
const CSS=`
#bbHomeApproved.bb-home-v9 .bb-home-v5-leader{display:none!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-dock{row-gap:7px!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-social{gap:8px!important}
@media(max-width:430px){
 #bbHomeApproved.bb-home-v9 .bb-home-v4-dock{row-gap:6px!important}
 #bbHomeApproved.bb-home-v9 .bb-home-v4-social{gap:7px!important}
}
`;
function ensureStyle(){
 let style=document.getElementById(STYLE_ID);
 if(!style){style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS;document.head.appendChild(style)}
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
})();
