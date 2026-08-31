(()=>{
'use strict';
const norm=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
const text=el=>String(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const inventoryUnits=()=>Object.values(window.BLAZING_UNIT_DATA||{}).filter(unit=>unit?.collection?.inventory_visible!==false&&unit?.display_name);
const isVisible=el=>{if(!el||el.hidden)return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';};
const assetPath=(unit,asset)=>{if(!asset)return'';if(/^https?:|^data:|^assets\//.test(asset))return asset;return`assets/characters/${unit.id}/${asset}`;};
const rarityStars=rarity=>/legend/i.test(rarity)?6:/myth/i.test(rarity)?6:/epic/i.test(rarity)?5:/rare/i.test(rarity)?4:3;
let legacyInventory=null,suppressScanUntil=0;

function findLegacyInventory(){
 const selectors='#inventoryScreen,.inventoryScreen,#collectionScreen,.collectionScreen,[data-screen="inventory"],[data-screen="collection"],.screen,main,section';
 const candidates=[...new Set(document.querySelectorAll(selectors))].filter(el=>el.id!=='bbInventory'&&el.id!=='bbUnitDetails'&&isVisible(el));
 const exact=candidates.filter(el=>/\bINVENTORY\b/i.test(text(el))&&/OWNED\s+FIGHTERS/i.test(text(el)));
 if(exact.length)return exact.sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length)[0];
 return candidates.find(el=>/\bINVENTORY\b/i.test(text(el))&&/EDIT\s+TEAM/i.test(text(el)))||null;
}
function legacyControl(rx){
 if(!legacyInventory)return null;
 return [...legacyInventory.querySelectorAll('button,[role="button"],a')].find(el=>rx.test(text(el))||rx.test(el.getAttribute('aria-label')||''))||null;
}
function ensure(){
 let root=document.getElementById('bbInventory');if(root)return root;
 root=document.createElement('section');root.id='bbInventory';root.className='bb-inventory-theme';root.hidden=true;root.setAttribute('aria-label','Inventory');
 root.innerHTML='<div class="bb-inventory-shell"><header class="bb-inventory-header"><button type="button" class="bb-inventory-back" data-action="back" aria-label="Back">‹</button><div class="bb-inventory-heading"><h1>INVENTORY</h1><p>OWNED FIGHTERS</p></div></header><div class="bb-inventory-toolbar"><strong class="bb-inventory-count"></strong><div class="bb-inventory-actions"><button type="button" class="bb-inventory-control" data-action="edit-team">EDIT TEAM</button><button type="button" class="bb-inventory-control" data-action="filter">ALL ▾</button></div></div><div class="bb-inventory-grid" role="list"></div></div>';
 document.body.appendChild(root);
 root.addEventListener('click',event=>{
  const card=event.target.closest('[data-unit-id]');
  if(card&&root.contains(card)){event.preventDefault();event.stopPropagation();openUnit(card.dataset.unitId);return;}
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(action==='back'){event.preventDefault();forwardLegacy(/^(BACK|‹|←)$/i,'back');}
  if(action==='edit-team'){event.preventDefault();forwardLegacy(/^EDIT\s+TEAM$/i,'edit');}
  if(action==='filter'){event.preventDefault();forwardLegacy(/^ALL/i,'filter');}
 });
 return root;
}
function render(){
 const root=ensure(),units=inventoryUnits();
 root.querySelector('.bb-inventory-count').innerHTML=`FIGHTERS <em>${units.length}</em> / ${units.length}`;
 root.querySelector('.bb-inventory-grid').innerHTML=units.map(unit=>{
  const art=assetPath(unit,unit.assets?.art)||assetPath(unit,unit.assets?.portrait);
  const stars='★'.repeat(rarityStars(unit.rarity));
  return `<button type="button" class="bb-fighter-card" role="listitem" data-unit-id="${esc(unit.id)}" data-rarity="${esc(unit.rarity||'')}" data-element="${esc(unit.element||'neutral')}" aria-label="Open ${esc(unit.display_name)} details"><span class="bb-card-stars" aria-hidden="true">${stars}</span><span class="bb-card-element">${esc(unit.element||'')}</span><span class="bb-card-art">${art?`<img src="${esc(art)}" alt="${esc(unit.display_name)}">`:''}</span><span class="bb-card-foot"><strong class="bb-card-name">${esc(unit.display_name)}</strong><span class="bb-card-meta"><span>${esc(unit.rarity||'')}</span><span>LV ${esc(unit.stats?.level||1)}</span></span></span></button>`;
 }).join('');
}
function activate(screen){
 const root=ensure();legacyInventory=screen||legacyInventory;if(!legacyInventory)return false;
 render();
 legacyInventory.hidden=true;legacyInventory.setAttribute('aria-hidden','true');legacyInventory.classList.add('bb-legacy-inventory-suppressed');
 root.hidden=false;root.removeAttribute('aria-hidden');document.body.classList.add('bb-inventory-open');return true;
}
function openUnit(id){
 const root=ensure();
 if(window.BlazingUnitDetailsScreen?.open){window.BlazingUnitDetailsScreen.open(id,{returnScreen:root});return true;}
 return false;
}
function forwardLegacy(rx,kind){
 const root=ensure();if(!legacyInventory)return false;
 suppressScanUntil=performance.now()+420;root.hidden=true;document.body.classList.remove('bb-inventory-open');
 legacyInventory.hidden=false;legacyInventory.removeAttribute('aria-hidden');
 const control=legacyControl(rx)||((kind==='back')?[...legacyInventory.querySelectorAll('button,[role="button"]')].find(el=>/back/i.test(el.getAttribute('aria-label')||'')):null);
 if(control){control.click();return true;}
 if(kind==='back'){legacyInventory.hidden=true;root.hidden=true;return true;}
 setTimeout(()=>activate(legacyInventory),0);return false;
}
function sync(){
 if(performance.now()<suppressScanUntil)return false;
 const visibleLegacy=findLegacyInventory();if(visibleLegacy)return activate(visibleLegacy);
 return false;
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});}
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});
document.addEventListener('click',()=>setTimeout(schedule,0),true);document.addEventListener('pointerup',()=>setTimeout(schedule,0),true);
setTimeout(schedule,0);
window.BlazingInventorySkin=Object.freeze({sync,activate,render,findInventoryScreen:findLegacyInventory,get legacyInventory(){return legacyInventory;}});
})();
