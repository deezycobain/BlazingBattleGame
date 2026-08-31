(()=>{
'use strict';
const normalized=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
const visible=el=>{if(!el||el.hidden)return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';};
function resolveFromText(value){
 const hay=normalized(value);if(!hay)return null;
 return Object.values(window.BLAZING_UNIT_DATA||{}).find(unit=>{if(unit?.collection?.inventory_visible===false)return false;return[unit.id,unit.display_name].filter(Boolean).map(normalized).some(key=>key&&hay.includes(key));})||null;
}
function hideLegacy(el){
 if(!el)return;
 el.hidden=true;el.setAttribute('aria-hidden','true');el.classList.add('bb-legacy-details-suppressed');
 el.style.setProperty('display','none','important');
}
function suppress(){
 if(!window.BlazingUnitDetailsScreen)return false;
 const candidates=[...document.querySelectorAll('.screen,section,main,[role="main"]')].filter(el=>el.id!=='bbUnitDetails'&&el.id!=='bbInventory'&&visible(el));
 for(const el of candidates){
  const copy=(el.innerText||el.textContent||'').slice(0,9000);
  if(!/FIGHTER\s+DETAILS/i.test(copy)||!/STATS/i.test(copy))continue;
  const unit=resolveFromText(copy);
  hideLegacy(el);
  if(unit){
   const inventory=document.getElementById('bbInventory');
   window.BlazingUnitDetailsScreen.open(unit,{returnScreen:inventory||undefined,legacyScreen:el});
  }
  return true;
 }
 return false;
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;suppress();});}
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});
document.addEventListener('click',()=>setTimeout(suppress,0),true);document.addEventListener('pointerup',()=>setTimeout(suppress,0),true);setTimeout(suppress,0);
window.BlazingLegacyDetailsSuppress=Object.freeze({suppress});
})();
