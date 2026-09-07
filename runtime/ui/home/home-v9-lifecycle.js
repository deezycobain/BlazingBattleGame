(()=>{
'use strict';

const SHELL_ID='bbHomeApproved';
const EXPECTED_LAYOUT='v9-polish';
let queued=false;
let bootTimers=[];

function needsApply(){
 const shell=document.getElementById(SHELL_ID);
 if(!shell)return false;
 return shell.dataset.bbHomeLayout!==EXPECTED_LAYOUT||!shell.classList.contains('bb-home-v9')||shell.dataset.bbHomeCurrency!=='blazing-coins';
}

function apply(){
 queued=false;
 const api=window.BlazingHomeV9;
 if(!api||typeof api.apply!=='function')return false;
 if(!document.getElementById(SHELL_ID))return false;
 if(needsApply())api.apply();
 return document.getElementById(SHELL_ID)?.dataset?.bbHomeLayout===EXPECTED_LAYOUT;
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
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(0);});
document.addEventListener('click',event=>{if(document.getElementById('menuScreen')?.contains(event.target))schedule(0);},true);

new MutationObserver(records=>{
 const shell=document.getElementById(SHELL_ID);
 if(!shell)return;
 const relevant=records.some(record=>{
  if(record.type==='attributes')return record.target===shell&&needsApply();
  return record.target===shell||record.target?.id==='menuScreen'||[...record.addedNodes].some(node=>node?.nodeType===1&&(node.id===SHELL_ID||node.querySelector?.(`#${SHELL_ID}`)));
 });
 if(relevant)schedule(0);
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-bb-home-layout','data-bb-home-currency']});

window.BlazingHomeV9Lifecycle=Object.freeze({apply,schedule});
})();
