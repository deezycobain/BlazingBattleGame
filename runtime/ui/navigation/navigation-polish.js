(()=>{
'use strict';
const SURFACE_SELECTORS=['#bbUnitDetails','#bbInventory','#resonanceScreen','#teamScreen','#summonPullScreen','#summonScreen','#menuScreen','.screen.active'];
const FORWARD_RX=/\b(LEVEL\s*\d+|BOSS\s*\d+|SUMMONS?|INVENTORY|COLLECTION|FORGE|TEAM|EDIT\s+TEAM|OPEN\s+(?:IN\s+)?FORGE)\b/i;
const BACK_RX=/\b(BACK|RETURN)\b|^[‹←]$/i;
let currentSurface=null,pendingDirection='forward',scheduled=false,enterTimer=0,transitionTimer=0;
const text=el=>String(el?.getAttribute?.('aria-label')||el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
function visible(el){if(!el||el.hidden)return false;const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0;}
function findSurface(){
 for(const selector of SURFACE_SELECTORS){for(const el of document.querySelectorAll(selector)){if(visible(el))return el;}}
 return null;
}
function ensureTransition(){
 let overlay=document.getElementById('bbNavTransition');
 if(overlay)return overlay;
 overlay=document.createElement('div');overlay.id='bbNavTransition';overlay.setAttribute('aria-hidden','true');overlay.innerHTML='<i class="bb-nav-slash"></i><i class="bb-nav-slash bb-nav-slash--b"></i><b class="bb-nav-mark">✦</b>';document.body.appendChild(overlay);return overlay;
}
function runTransition(direction='forward'){
 pendingDirection=direction==='back'?'back':'forward';
 const overlay=ensureTransition();
 overlay.classList.remove('is-running','is-back');
 if(pendingDirection==='back')overlay.classList.add('is-back');
 void overlay.offsetWidth;
 overlay.classList.add('is-running');
 clearTimeout(transitionTimer);transitionTimer=setTimeout(()=>overlay.classList.remove('is-running','is-back'),430);
}
function animateSurface(surface,direction){
 if(!surface)return;
 surface.classList.remove('bb-screen-enter','bb-screen-enter--back');void surface.offsetWidth;
 surface.classList.add('bb-screen-enter');if(direction==='back')surface.classList.add('bb-screen-enter--back');
 clearTimeout(enterTimer);enterTimer=setTimeout(()=>surface.classList.remove('bb-screen-enter','bb-screen-enter--back'),390);
}
function navIntent(control){
 if(!control)return null;
 const label=text(control),id=String(control.id||'');
 if(BACK_RX.test(label)||/back/i.test(id))return 'back';
 if(FORWARD_RX.test(label)||/^(forgeBtn|summonForgeBtn|bbRevealForge)$/i.test(id))return 'forward';
 return null;
}
function decorateControls(root=document){
 for(const control of root.querySelectorAll('button,a,[role="button"],[data-inventory-action]')){
  const intent=navIntent(control);if(!intent)continue;control.classList.add('bb-nav-control');if(intent==='back')control.classList.add('bb-nav-back');
 }
}
function evaluate(){
 scheduled=false;decorateControls();const next=findSurface();
 if(!next){currentSurface=null;return;}
 if(!currentSurface){currentSurface=next;return;}
 if(next===currentSurface)return;
 const direction=pendingDirection==='back'||next.id==='menuScreen'?'back':'forward';
 currentSurface=next;animateSurface(next,direction);pendingDirection='forward';
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(evaluate);}
document.addEventListener('pointerdown',ev=>{const control=ev.target.closest?.('button,a,[role="button"],[data-inventory-action]');if(control&&navIntent(control))control.classList.add('bb-nav-control');},true);
document.addEventListener('click',ev=>{const control=ev.target.closest?.('button,a,[role="button"],[data-inventory-action]');const intent=navIntent(control);if(!intent)return;runTransition(intent);setTimeout(schedule,0);setTimeout(schedule,120);},true);
new MutationObserver(records=>{for(const record of records){if(record.type==='childList'||record.attributeName==='class'||record.attributeName==='style'||record.attributeName==='hidden'){schedule();break;}}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
window.addEventListener('pageshow',schedule);window.addEventListener('resize',schedule,{passive:true});
ensureTransition();decorateControls();currentSurface=findSurface();setTimeout(schedule,0);
window.BlazingNavigationPolish=Object.freeze({refresh:schedule,transition:runTransition,current:()=>currentSurface?.id||null});
})();
