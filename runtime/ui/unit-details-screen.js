(()=>{
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pct=value=>`${Math.round(Number(value||0)*100)}%`;
const normalized=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
const assetAvailable=value=>!!value&&!String(value).endsWith('/');
const stat=(label,value)=>`<div class="bbud-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
const ability=item=>item?`<article class="bbud-ability"><div><span class="bbud-kicker">${esc(item.kind==='jutsu'?'JUTSU':'BASIC ATTACK')}</span><h3>${esc(item.name)}</h3></div><div class="bbud-ability-meta">${item.cost?`<span>${item.cost} CHAKRA</span>`:''}${item.chakraGain?`<span>+${item.chakraGain} CHAKRA</span>`:''}${item.damageMultiplier?`<span>${item.damageMultiplier}× POWER</span>`:''}${item.healPercent?`<span>${pct(item.healPercent)} HEAL</span>`:''}${item.delivery?`<span>${esc(window.BlazingUnitDetails.titleCase(item.delivery))}</span>`:''}</div></article>`:'';
let current=null,returnScreen=null,legacyScreen=null;

function ensure(){
 let root=document.getElementById('bbUnitDetails');if(root)return root;
 root=document.createElement('section');root.id='bbUnitDetails';root.className='bbud';root.hidden=true;root.tabIndex=-1;root.setAttribute('aria-label','Character details');
 root.innerHTML='<div class="bbud-shell"><header class="bbud-head"><button class="bbud-back" type="button" data-action="back" aria-label="Back">‹</button><div><span class="bbud-eyebrow">CHARACTER DETAILS</span><h2 class="bbud-name"></h2><p class="bbud-title"></p></div></header><div class="bbud-hero"><div class="bbud-art"><img alt=""></div><button class="bbud-card-art-btn" type="button" data-action="view-card-art">VIEW ART</button><div class="bbud-badges"></div></div><nav class="bbud-tabs" aria-label="Character details sections"><button type="button" data-tab="overview" class="is-active">OVERVIEW</button><button type="button" data-tab="stats">STATS</button><button type="button" data-tab="reserved" aria-label="Reserved tab"></button></nav><div class="bbud-panels"></div></div><div class="bbud-art-viewer" data-card-art-viewer hidden><div class="bbud-art-viewer-head"><span class="bbud-art-viewer-title">FULL ART</span><button class="bbud-art-close" type="button" data-action="close-card-art" aria-label="Close art">×</button></div><div class="bbud-art-viewer-stage" data-action="close-card-art"><img alt=""></div></div>';
 document.body.appendChild(root);
 root.addEventListener('click',event=>{
  const tab=event.target.closest('[data-tab]');if(tab&&root.contains(tab)){event.preventDefault();event.stopPropagation();selectTab(tab.dataset.tab);return;}
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(action==='back'){event.preventDefault();close();return;}
  if(action==='view-card-art'){event.preventDefault();openCardArt();return;}
  if(action==='close-card-art'){event.preventDefault();closeCardArt();return;}
 });
 return root;
}

function selectTab(tab){
 const root=ensure();
 root.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('is-active',active);b.setAttribute('aria-selected',String(active));});
 root.querySelectorAll('[data-panel]').forEach(p=>{p.hidden=p.dataset.panel!==tab;});
 const panels=root.querySelector('.bbud-panels');if(panels&&root.scrollTop>panels.offsetTop)root.scrollTo({top:Math.max(0,panels.offsetTop-118),behavior:'smooth'});
}

function render(vm){
 const root=ensure();current=vm;root.dataset.element=String(vm.element||'neutral').toLowerCase();
 root.querySelector('.bbud-name').textContent=vm.name;root.querySelector('.bbud-title').textContent=vm.title;
 root.querySelector('.bbud-badges').innerHTML=[vm.rarity,vm.element,window.BlazingUnitDetails.titleCase(vm.archetype||vm.role)].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('');
 const img=root.querySelector('.bbud-art img');img.alt=vm.name;img.src=assetAvailable(vm.art.full)?vm.art.full:'';
 const artButton=root.querySelector('.bbud-card-art-btn');artButton.hidden=!assetAvailable(vm.art.full);artButton.setAttribute('aria-label',`View ${vm.name} full art`);
 root.querySelector('.bbud-panels').innerHTML=`<section data-panel="overview"><div class="bbud-statgrid">${stat('LEVEL',vm.stats.level)}${stat('HP',vm.stats.hp)}${stat('ATK',vm.stats.attack)}${stat('DEF',vm.stats.defense)}</div>${ability(vm.abilities.basic)}${ability(vm.abilities.jutsu)}</section><section data-panel="stats" hidden><div class="bbud-section-title">CHARACTER STATS</div><div class="bbud-statgrid bbud-statgrid-full">${stat('LEVEL',vm.stats.level)}${stat('HP',vm.stats.hp)}${stat('ATTACK',vm.stats.attack)}${stat('DEFENSE',vm.stats.defense)}${stat('SPEED',vm.stats.speed)}${stat('MAX CHAKRA',vm.resources.chakraMax)}</div></section><section data-panel="reserved" hidden></section>`;
 selectTab('overview');closeCardArt();
}

function openCardArt(){
 if(!current||!assetAvailable(current.art.full))return false;
 const root=ensure(),viewer=root.querySelector('[data-card-art-viewer]'),img=viewer.querySelector('img');
 img.alt=`${current.name} full art`;img.src=current.art.full;viewer.hidden=false;viewer.querySelector('.bbud-art-viewer-stage').scrollTop=0;return true;
}
function closeCardArt(){const viewer=document.querySelector('#bbUnitDetails [data-card-art-viewer]');if(viewer)viewer.hidden=true;}

function resolveUnit(value){
 if(!value)return null;if(typeof value!=='string')return value;
 const direct=window.BLAZING_UNIT_DATA?.[value];if(direct)return direct;
 const key=normalized(value);return Object.values(window.BLAZING_UNIT_DATA||{}).find(unit=>normalized(unit?.id)===key||normalized(unit?.display_name)===key)||null;
}

function open(unitOrId,options={}){
 const unit=resolveUnit(unitOrId);if(!unit)return false;
 const root=ensure();render(window.BlazingUnitDetails.fromUnit(unit));
 returnScreen=options.returnScreen||returnScreen||document.querySelector('.screen:not([hidden])');legacyScreen=options.legacyScreen||null;
 if(returnScreen&&returnScreen!==root)returnScreen.hidden=true;if(legacyScreen&&legacyScreen!==returnScreen)legacyScreen.hidden=true;
 root.hidden=false;document.body.classList.add('bbud-open');root.scrollTop=0;requestAnimationFrame(()=>root.focus({preventScroll:true}));return true;
}
function close(){
 const root=ensure();closeCardArt();root.hidden=true;document.body.classList.remove('bbud-open');
 if(legacyScreen&&legacyScreen!==returnScreen)legacyScreen.hidden=true;
 if(returnScreen)returnScreen.hidden=false;
 returnScreen=null;legacyScreen=null;
}

function unitFromElement(el){
 if(!el)return null;
 const direct=el.dataset?.unitId||el.dataset?.characterId||el.dataset?.fighterId||el.dataset?.unit||el.dataset?.character||el.dataset?.fighter;
 const resolved=resolveUnit(direct);if(resolved)return resolved;
 const hay=[direct,el.getAttribute?.('aria-label'),el.getAttribute?.('title'),el.querySelector?.('[data-unit-name],[data-character-name],[data-fighter-name]')?.textContent,el.querySelector?.('.name,.unitName,.characterName,.fighterName,.rosterName,.teamName')?.textContent,el.textContent].filter(Boolean).join(' ');
 const text=normalized(hay);if(!text)return null;
 for(const unit of Object.values(window.BLAZING_UNIT_DATA||{})){if(unit?.collection?.inventory_visible===false)continue;const names=[unit.id,unit.display_name].filter(Boolean).map(normalized);if(names.some(name=>name&&text.includes(name)))return unit;}
 return null;
}

const SURFACE_SELECTOR='#teamScreen,.teamScreen,#rosterScreen,.rosterScreen,#inventoryScreen,.inventoryScreen,#collectionScreen,.collectionScreen,[data-screen="team"],[data-screen="roster"],[data-screen="inventory"],[data-screen="collection"],.teamBody,.rosterGrid,.characterGrid,.inventoryGrid,.collectionGrid';
function surfaceFor(el){return el?.closest?.(SURFACE_SELECTOR)||null;}
function candidateUnitTrigger(target,surface){
 let node=target;
 for(let depth=0;node&&node!==surface&&depth<10;depth++,node=node.parentElement){
  const direct=node.dataset?.unitId||node.dataset?.characterId||node.dataset?.fighterId||node.dataset?.unit||node.dataset?.character||node.dataset?.fighter;
  const hint=/card|fighter|unit|character|roster|inventory|collection|portrait|tile|item/i.test(`${node.id||''} ${node.className||''}`);
  const visual=!!node.querySelector?.('img,picture,canvas');
  if(!direct&&!hint&&!visual)continue;
  const unit=unitFromElement(node);if(unit)return {node,unit};
 }
 return null;
}
function protectedControl(target){return !!target.closest?.('input,select,textarea,a[href],[data-team-slot],[data-action="select"],[data-action="remove"],[data-action="save"],[data-action="filter"],[data-action="sort"]');}
function bindRosterNavigation(){
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button>0||ensure().contains(event.target)||protectedControl(event.target))return;
  const surface=surfaceFor(event.target);if(!surface)return;
  const hit=candidateUnitTrigger(event.target,surface);if(!hit)return;
  event.preventDefault();event.stopImmediatePropagation();
  open(hit.unit,{returnScreen:surface.closest('.screen')||surface});
 },true);
 document.addEventListener('keydown',event=>{
  if((event.key!=='Enter'&&event.key!==' ')||ensure().contains(event.target)||protectedControl(event.target))return;
  const surface=surfaceFor(event.target);if(!surface)return;const hit=candidateUnitTrigger(event.target,surface);if(!hit)return;
  event.preventDefault();event.stopImmediatePropagation();open(hit.unit,{returnScreen:surface.closest('.screen')||surface});
 },true);
}

function visible(el){if(!el||el===ensure()||el.hidden)return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';}
function findInventoryReturn(exclude){
 const replacement=document.getElementById('bbInventory');if(replacement&&replacement!==exclude)return replacement;
 const candidates=[...document.querySelectorAll('#inventoryScreen,.inventoryScreen,#collectionScreen,.collectionScreen,[data-screen="inventory"],[data-screen="collection"],.screen')];
 return candidates.find(el=>el!==exclude&&!el.hidden&&/inventory|collection|roster/i.test(`${el.id} ${el.className} ${el.getAttribute?.('data-screen')||''}`))||candidates.find(el=>el!==exclude&&/inventory|collection|roster/i.test(`${el.id} ${el.className} ${el.getAttribute?.('data-screen')||''}`))||null;
}
function takeoverLegacyDetails(){
 if(!ensure().hidden)return false;
 const candidates=[...document.querySelectorAll('.screen,section,main,[role="main"]')].filter(visible);
 for(const el of candidates){
  const text=(el.innerText||'').slice(0,6500);if(!/FIGHTER\s+DETAILS/i.test(text)||!/JUTSU/i.test(text)||!/STATS/i.test(text))continue;
  const unit=Object.values(window.BLAZING_UNIT_DATA||{}).find(u=>u?.display_name&&new RegExp(`\\b${String(u.display_name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(text));if(!unit)continue;
  const inventory=findInventoryReturn(el);open(unit,{returnScreen:inventory||undefined,legacyScreen:el});return true;
 }
 return false;
}
function bindLegacyTakeover(){
 let queued=false;const scan=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;takeoverLegacyDetails();});};
 new MutationObserver(scan).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});
 document.addEventListener('click',()=>setTimeout(scan,0),true);document.addEventListener('pointerup',()=>setTimeout(scan,0),true);setTimeout(scan,0);
}

bindRosterNavigation();bindLegacyTakeover();
window.BlazingUnitDetailsScreen=Object.freeze({open,close,render,selectTab,resolveUnit,openCardArt,closeCardArt,bindRosterNavigation,takeoverLegacyDetails,get current(){return current;}});
})();
