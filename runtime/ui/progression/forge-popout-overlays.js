(()=>{
'use strict';
const OVERLAYS={
 tyler:[{src:'assets/characters/tyler/art/shiny_hand_popout_v2.webp',kind:'hand'}],
 subzero:[{src:'assets/characters/subzero/art/shiny_hand_popout_v3.webp',kind:'hand'}],
 lebee:[{src:'assets/characters/lebee/art/shiny_hand_popout_v1.webp',kind:'hand'}],
 senku:[{src:'assets/characters/senku/art/shiny_hand_popout_v1.webp',kind:'hand'},{src:'assets/characters/senku/art/shiny_hair_popout_v1.webp',kind:'hair'}]
};
function sync(){
 const card=document.getElementById('forgeCard'),depth=card?.querySelector('.forgeArtDepth');if(!card||!depth)return;
 const fighter=card.dataset.fighter||'',layers=OVERLAYS[fighter]||[],active=card.classList.contains('shiny')&&layers.length>0;
 const legacy=document.getElementById('forgePopout');if(legacy){legacy.hidden=true;legacy.style.opacity='0'}
 const host=depth.querySelector('.bbForgePopouts')||(()=>{const el=document.createElement('div');el.className='bbForgePopouts';el.setAttribute('aria-hidden','true');depth.appendChild(el);return el})();
 card.classList.toggle('bb-authored-popout',active);card.classList.toggle('hasPopout',active);
 if(!active){host.replaceChildren();return;}
 const wanted=new Set();
 for(const layer of layers){const key=`${fighter}:${layer.kind}`,cls=`bbForgePopoutLayer bb-${fighter} bb-${layer.kind}`;wanted.add(key);let img=host.querySelector(`[data-pop-key="${key}"]`);if(!img){img=document.createElement('img');img.className=cls;img.dataset.popKey=key;img.alt='';img.draggable=false;host.appendChild(img)}else img.className=cls;if(img.getAttribute('src')!==layer.src)img.src=layer.src}
 [...host.children].forEach(node=>{if(!wanted.has(node.dataset.popKey))node.remove()});
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
const boot=()=>{const card=document.getElementById('forgeCard');if(!card)return setTimeout(boot,50);new MutationObserver(schedule).observe(card,{subtree:true,attributes:true,childList:true,attributeFilter:['class','data-fighter','src','hidden']});sync();document.getElementById('forgeRoster')?.addEventListener('click',schedule,true)};
boot();
window.BlazingForgePopoutOverlays=Object.freeze({sync,overlays:OVERLAYS});
})();
