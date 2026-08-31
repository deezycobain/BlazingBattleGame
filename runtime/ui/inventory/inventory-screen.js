(()=>{
'use strict';
const ROOT_ID='bbInventory';
const LEGACY_SELECTORS='#inventoryScreen,.inventoryScreen,#collectionScreen,.collectionScreen,[data-screen="inventory"],[data-screen="collection"]';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const norm=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
let legacyScreen=null;
let suppressUntil=0;
let queued=false;

function visible(el){
 if(!el||el.hidden)return false;
 const style=getComputedStyle(el);
 return style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0';
}
function units(){
 return Object.values(window.BLAZING_UNIT_DATA||{}).filter(unit=>unit?.collection?.owned!==false&&unit?.collection?.inventory_visible!==false&&unit?.id);
}
function assetPath(unit,asset){
 if(!asset||String(asset).endsWith('/'))return '';
 if(/^https?:|^data:|^assets\//.test(asset))return asset;
 return `assets/characters/${unit.id}/${asset}`;
}
function cleanArt(unit){
 return assetPath(unit,unit?.assets?.art)||assetPath(unit,unit?.assets?.portrait)||'';
}
function rarityKey(unit){return norm(unit?.rarity||'unknown');}

function ensure(){
 let root=document.getElementById(ROOT_ID);
 if(root)return root;
 root=document.createElement('section');
 root.id=ROOT_ID;
 root.className='bb-inventory';
 root.hidden=true;
 root.setAttribute('aria-label','Inventory');
 root.innerHTML=`<div class="bb-inventory-shell">
  <header class="bb-inventory-head">
   <button type="button" class="bb-inventory-nav" data-inventory-action="back" aria-label="Back">‹</button>
   <div class="bb-inventory-heading"><h1>INVENTORY</h1><p>OWNED FIGHTERS</p></div>
   <button type="button" class="bb-inventory-nav" data-inventory-action="home" aria-label="Home">⌂</button>
  </header>
  <div class="bb-inventory-toolbar">
   <strong class="bb-inventory-count"></strong>
   <div class="bb-inventory-actions"><button type="button" data-inventory-action="edit">EDIT TEAM</button><button type="button" class="bb-inventory-filter" disabled>ALL ▾</button></div>
  </div>
  <div class="bb-inventory-grid" role="list"></div>
 </div>`;
 document.body.appendChild(root);
 root.addEventListener('click',event=>{
  const action=event.target.closest('[data-inventory-action]')?.dataset.inventoryAction;
  if(action){event.preventDefault();handleAction(action);return;}
  const card=event.target.closest('.bb-inventory-card');
  if(!card)return;
  const unit=(window.BLAZING_UNIT_DATA||{})[card.dataset.unitId];
  if(!unit||!window.BlazingUnitDetailsScreen)return;
  event.preventDefault();
  window.BlazingUnitDetailsScreen.open(unit,{returnScreen:root});
 });
 root.addEventListener('keydown',event=>{
  if((event.key!=='Enter'&&event.key!==' ')||!event.target.matches('.bb-inventory-card'))return;
  event.preventDefault();event.target.click();
 });
 return root;
}

function render(){
 const root=ensure(),roster=units();
 root.querySelector('.bb-inventory-count').textContent=`FIGHTERS ${roster.length} / ${roster.length}`;
 root.querySelector('.bb-inventory-grid').innerHTML=roster.map(unit=>{
  const art=cleanArt(unit),rarity=unit.rarity||'Unknown';
  return `<article class="bb-inventory-card" data-unit-id="${esc(unit.id)}" data-rarity="${esc(rarityKey(unit))}" role="listitem" tabindex="0" aria-label="${esc(unit.display_name||unit.id)}">
   <div class="bb-inventory-card-stars" aria-hidden="true">★★★★★★</div>
   <div class="bb-inventory-card-art">${art?`<img src="${esc(art)}" alt="${esc(unit.display_name||unit.id)}">`:''}</div>
   <div class="bb-inventory-card-copy"><strong>${esc(unit.display_name||unit.id)}</strong><span>${esc(rarity)}</span><b>LV ${esc(unit.stats?.level??1)}</b></div>
  </article>`;
 }).join('');
}

function legacyCandidates(){
 const direct=[...document.querySelectorAll(LEGACY_SELECTORS)];
 const generic=[...document.querySelectorAll('.screen,section,main')];
 return [...new Set([...direct,...generic])].filter(el=>el.id!==ROOT_ID&&el.id!=='bbUnitDetails');
}
function looksLikeLegacyInventory(el){
 if(!visible(el))return false;
 const copy=(el.innerText||el.textContent||'').slice(0,6000);
 return /OWNED\s+FIGHTERS/i.test(copy)&&/FIGHTERS\s+\d+\s*\/\s*\d+/i.test(copy)&&/EDIT\s+TEAM/i.test(copy);
}
function findLegacyInventory(){return legacyCandidates().find(looksLikeLegacyInventory)||null;}
function hideLegacy(screen){
 if(!screen)return;
 screen.hidden=true;screen.setAttribute('aria-hidden','true');screen.classList.add('bb-legacy-inventory-suppressed');
}
function show(screen){
 const root=ensure();
 if(screen)legacyScreen=screen;
 if(legacyScreen)hideLegacy(legacyScreen);
 render();
 root.hidden=false;root.removeAttribute('aria-hidden');
 document.body.classList.add('bb-inventory-open');
 root.scrollTop=0;
 return true;
}
function closeRoot(){const root=ensure();root.hidden=true;root.setAttribute('aria-hidden','true');document.body.classList.remove('bb-inventory-open');}

function proxyLegacyControl(kind){
 const legacy=legacyScreen;
 closeRoot();
 if(!legacy)return false;
 suppressUntil=Date.now()+900;
 legacy.hidden=false;legacy.removeAttribute('aria-hidden');
 const buttons=[...legacy.querySelectorAll('button,[role="button"]')];
 const rx=kind==='edit'?/EDIT\s+TEAM/i:kind==='home'?/HOME/i:/BACK/i;
 let target=buttons.find(btn=>rx.test(`${btn.getAttribute('aria-label')||''} ${btn.getAttribute('title')||''} ${btn.textContent||''}`));
 if(!target&&kind==='back')target=buttons[0]||null;
 if(!target&&kind==='home')target=buttons[buttons.length-1]||null;
 if(target){target.click();return true;}
 return false;
}
function handleAction(action){
 if(action==='edit'){proxyLegacyControl('edit');return;}
 if(action==='home'){proxyLegacyControl('home');return;}
 if(action==='back'){proxyLegacyControl('back');return;}
}

function scan(){
 if(Date.now()<suppressUntil)return false;
 const root=ensure();
 if(!root.hidden){if(legacyScreen)hideLegacy(legacyScreen);return true;}
 const legacy=findLegacyInventory();
 if(!legacy)return false;
 return show(legacy);
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});}
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style','aria-hidden']});
document.addEventListener('click',()=>setTimeout(schedule,0),true);
document.addEventListener('pointerup',()=>setTimeout(schedule,0),true);
window.addEventListener('pageshow',schedule);
window.addEventListener('resize',schedule,{passive:true});

// Compatibility sentinel: prevents the older details runtime from dynamically loading
// the legacy inventory decorator. The replacement inventory owns this surface now.
window.BlazingInventorySkin=Object.freeze({decorate:scan,findInventoryScreen:findLegacyInventory,replacement:true});
window.BlazingInventoryScreen=Object.freeze({show,scan,render,get legacy(){return legacyScreen;}});
Promise.resolve(window.BLAZING_UNIT_DATA_READY).catch(()=>null).finally(()=>{render();setTimeout(scan,0);});
})();
