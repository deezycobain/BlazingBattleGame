(()=>{
'use strict';
function apply(){
 const root=document.getElementById('bbUnitDetails');if(!root)return false;
 const tab=root.querySelector('.bbud-tabs [data-tab="abilities"],.bbud-tabs [data-tab="reserved"]');
 if(tab){tab.dataset.tab='reserved';tab.textContent='';tab.setAttribute('aria-label','Reserved tab');tab.setAttribute('title','');}
 const panel=root.querySelector('.bbud-panels [data-panel="abilities"],.bbud-panels [data-panel="reserved"]');
 if(panel){panel.dataset.panel='reserved';panel.innerHTML='';panel.hidden=true;}
 return !!tab;
}
let queued=false;
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});};
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('click',()=>setTimeout(apply,0),true);
setTimeout(apply,0);
window.BlazingReservedDetailsTab=Object.freeze({apply});
})();
