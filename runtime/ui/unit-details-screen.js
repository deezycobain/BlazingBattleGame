(()=>{
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pct=value=>`${Math.round(Number(value||0)*100)}%`;
const stat=(label,value)=>`<div class="bbud-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
const ability=(item)=>item?`<article class="bbud-ability"><div><span class="bbud-kicker">${esc(item.kind==='jutsu'?'JUTSU':'BASIC ATTACK')}</span><h3>${esc(item.name)}</h3></div><div class="bbud-ability-meta">${item.cost?`<span>${item.cost} CHAKRA</span>`:''}${item.chakraGain?`<span>+${item.chakraGain} CHAKRA</span>`:''}${item.damageMultiplier?`<span>${item.damageMultiplier}× POWER</span>`:''}${item.healPercent?`<span>${pct(item.healPercent)} HEAL</span>`:''}${item.delivery?`<span>${esc(window.BlazingUnitDetails.titleCase(item.delivery))}</span>`:''}</div></article>`:'';
function ensure(){
 let root=document.getElementById('bbUnitDetails');
 if(root)return root;
 root=document.createElement('section');root.id='bbUnitDetails';root.className='bbud';root.hidden=true;root.setAttribute('aria-label','Character details');
 root.innerHTML='<div class="bbud-shell"><header class="bbud-head"><button class="bbud-back" type="button" aria-label="Back">‹</button><div><span class="bbud-eyebrow">UNIT PROFILE</span><h2 class="bbud-name"></h2><p class="bbud-title"></p></div></header><div class="bbud-hero"><div class="bbud-art"><img alt=""></div><div class="bbud-badges"></div></div><nav class="bbud-tabs" aria-label="Character details sections"><button data-tab="overview" class="is-active">OVERVIEW</button><button data-tab="stats">STATS</button><button data-tab="abilities">ABILITIES</button></nav><div class="bbud-panels"></div></div>';
 document.body.appendChild(root);
 root.querySelector('.bbud-back').addEventListener('click',close);
 root.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>selectTab(btn.dataset.tab)));
 return root;
}
let current=null,returnScreen=null;
function selectTab(tab){const root=ensure();root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('is-active',b.dataset.tab===tab));root.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==tab);}
function render(vm){const root=ensure();current=vm;root.querySelector('.bbud-name').textContent=vm.name;root.querySelector('.bbud-title').textContent=vm.title;root.querySelector('.bbud-badges').innerHTML=[vm.rarity,vm.element,window.BlazingUnitDetails.titleCase(vm.archetype||vm.role)].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('');const img=root.querySelector('.bbud-art img');img.alt=vm.name;img.src=vm.art.full||vm.art.card||'';root.querySelector('.bbud-panels').innerHTML=`<section data-panel="overview"><div class="bbud-statgrid">${stat('LEVEL',vm.stats.level)}${stat('HP',vm.stats.hp)}${stat('ATK',vm.stats.attack)}${stat('DEF',vm.stats.defense)}</div>${ability(vm.abilities.basic)}${ability(vm.abilities.jutsu)}</section><section data-panel="stats" hidden><div class="bbud-statgrid bbud-statgrid-full">${stat('LEVEL',vm.stats.level)}${stat('HP',vm.stats.hp)}${stat('ATTACK',vm.stats.attack)}${stat('DEFENSE',vm.stats.defense)}${stat('SPEED',vm.stats.speed)}${stat('MAX CHAKRA',vm.resources.chakraMax)}</div></section><section data-panel="abilities" hidden>${ability(vm.abilities.basic)}${ability(vm.abilities.jutsu)}</section>`;selectTab('overview');}
function open(unitOrId,options={}){const unit=typeof unitOrId==='string'?window.BLAZING_UNIT_DATA?.[unitOrId]:unitOrId;if(!unit)return false;const root=ensure();render(window.BlazingUnitDetails.fromUnit(unit));returnScreen=options.returnScreen||document.querySelector('.screen:not([hidden])');if(returnScreen&&returnScreen!==root)returnScreen.hidden=true;root.hidden=false;document.body.classList.add('bbud-open');return true;}
function close(){const root=ensure();root.hidden=true;document.body.classList.remove('bbud-open');if(returnScreen)returnScreen.hidden=false;returnScreen=null;}
window.BlazingUnitDetailsScreen=Object.freeze({open,close,render,get current(){return current;}});
})();
