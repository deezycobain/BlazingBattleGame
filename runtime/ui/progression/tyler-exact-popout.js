(()=>{
'use strict';
let queued=false;
function sync(){
 const card=document.getElementById('forgeCard'),depth=card?.querySelector('.forgeArtDepth'),portrait=document.getElementById('forgePortrait');
 if(!card||!depth||!portrait)return;
 const active=card.dataset.fighter==='tyler'&&card.classList.contains('shiny')&&card.classList.contains('hasPopout');
 let hand=depth.querySelector('.bbTylerExactHand');
 if(!active){if(hand)hand.remove();return;}
 if(!hand){hand=document.createElement('img');hand.className='bbTylerExactHand';hand.alt='';hand.setAttribute('aria-hidden','true');hand.draggable=false;depth.appendChild(hand)}
 const src=portrait.currentSrc||portrait.getAttribute('src')||portrait.src;
 if(src&&hand.getAttribute('src')!==src)hand.src=src;
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
function boot(){const card=document.getElementById('forgeCard');if(!card)return setTimeout(boot,50);new MutationObserver(schedule).observe(card,{subtree:true,attributes:true,childList:true,attributeFilter:['class','data-fighter','src']});document.getElementById('forgeRoster')?.addEventListener('click',schedule,true);sync()}
boot();
window.BlazingTylerExactPopout=Object.freeze({sync});
})();
