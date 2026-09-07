(()=>{
'use strict';
const P=()=>window.BlazingUnitProgression;
const E=()=>window.BlazingEconomy;
const FIGHTERS=['Crimson','Sub-Zero','Lebee','Senku','Tyler'];
let current='Tyler';

function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function roman(n){return ['I','II','III','IV','V'][Math.max(0,Math.min(4,n-1))]||String(n)}
function selectedName(){
 const raw=document.getElementById('forgeName')?.textContent?.trim().toLowerCase();
 const found=FIGHTERS.find(name=>name.toLowerCase()===raw);
 return found||current;
}
function refreshCombat(){try{window.BlazingProgression?.applyCombatBonuses?.()}catch{}}
function reopen(name,message=''){
 current=name;refreshCombat();try{window.BlazingProgression?.openForge?.(name)}catch{}
 renderLevelPanel(message);renderExchange();
}

function ensureLevelPanel(){
 const panel=document.querySelector('#resonanceScreen .forgePanel');if(!panel)return null;
 let box=document.getElementById('bbLevelProgression');
 if(!box){
  box=document.createElement('section');box.id='bbLevelProgression';box.className='bb-level-progression';
  panel.prepend(box);
  box.addEventListener('click',event=>{
   const button=event.target.closest('button[data-action]');if(!button)return;
   const name=selectedName(),api=P();if(!api)return;
   if(button.dataset.action==='level'){
    const result=api.buyLevel(name);
    const msg=result.ok?`${name} reached Lv.${result.level}.`:result.reason==='AWAKENING_REQUIRED'?'Awaken this unit before the next ten levels.':result.reason==='INSUFFICIENT_MARKS'?`Need ${result.cost} Battle Marks to finish this level.`:'Level upgrade unavailable.';
    reopen(name,msg);
   }
   if(button.dataset.action==='awaken'){
    const result=api.awaken(name);
    let msg='Awakening unavailable.';
    if(result.ok)msg=result.shiny?`${name} awakened into the Shiny version.`:`Awakening ${roman(result.awakening)} complete. Level cap raised to ${result.newCap}.`;
    else if(result.reason==='LEVEL_REQUIRED')msg=`Reach Lv.${result.requiredLevel} first.`;
    else if(result.reason==='COPIES_REQUIRED')msg=`Need ${result.requiredCopies} duplicate cop${result.requiredCopies===1?'y':'ies'}.`;
    reopen(name,msg);
   }
  });
 }
 return box;
}
function renderLevelPanel(message=''){
 const box=ensureLevelPanel(),api=P();if(!box||!api)return;
 current=selectedName();
 const u=api.unit(current),cap=api.capForAwakening(u.awakening),xpNeed=u.level>=cap||u.level>=50?0:api.xpForNextLevel(u.level);
 const xpPct=xpNeed?Math.max(0,Math.min(100,(u.xp/xpNeed)*100)):100;
 const gate=api.canAwaken(current),markCost=api.markCostToFinish(current),atGate=api.isAtGate(u);
 const nextAwakening=Math.min(5,u.awakening+1),copyLabel=gate.cost===1?'COPY':'COPIES';
 const levelButton=u.level>=50?'<button type="button" data-action="level" disabled>MAX LEVEL</button>':atGate?'<button type="button" data-action="level" disabled>AWAKEN TO CONTINUE</button>':`<button type="button" data-action="level">FINISH LEVEL <b>${markCost} ◈</b></button>`;
 const awakenButton=u.shiny?'<button type="button" data-action="awaken" class="awaken" disabled>SHINY COMPLETE</button>':`<button type="button" data-action="awaken" class="awaken" ${gate.ok?'':'disabled'}>${nextAwakening===5?'SHINY AWAKEN':`AWAKEN ${roman(nextAwakening)}`} <b>${gate.cost} ${copyLabel}</b></button>`;
 box.innerHTML=`<div class="bb-level-head"><div><span>UNIT PROGRESSION</span><strong>LV. ${u.level}<small>/ ${cap}</small></strong></div><div class="bb-awaken-rank">${u.shiny?'SHINY':`AWAKENING ${u.awakening} / 5`}</div></div><div class="bb-xp-row"><div><span>XP</span><b>${xpNeed?`${u.xp} / ${xpNeed}`:'LEVEL CAP'}</b></div><div class="bb-xp-track"><i style="width:${xpPct}%"></i></div></div><div class="bb-progression-meta"><span>DUPLICATES <b>${u.copies}</b></span><span>NEXT GATE <b>${u.shiny?'COMPLETE':`LV.${cap}`}</b></span><span>CORE GROWTH <b>+${Math.round(api.statMultipliers(u).coreGrowth*1000)/10}%</b></span></div><div class="bb-progression-actions">${levelButton}${awakenButton}</div><p class="bb-progression-note">Battle XP levels units naturally. Battle Marks finish the current level. Each 10-level band requires Awakening before the next band opens.${message?` <strong>${esc(message)}</strong>`:''}</p>`;
}

function ensureExchange(){
 const lobby=document.querySelector('#summonScreen .bb-summon-lobby');if(!lobby)return null;
 let box=document.getElementById('bbEmberExchange');
 if(!box){
  box=document.createElement('section');box.id='bbEmberExchange';box.className='bb-ember-exchange';
  const secondary=lobby.querySelector('.bb-summon-secondary');(secondary||lobby).before?.(box);
  box.addEventListener('click',event=>{
   const button=event.target.closest('#bbBuyEmber');if(!button)return;
   const result=E()?.purchaseEmber?.();
   box.dataset.message=result?.ok?'Ember purchased.':result?.reason==='WEEKLY_CAP'?'Weekly Ember limit reached.':'Not enough Battle Marks.';
   renderExchange();
  });
 }
 return box;
}
function renderExchange(){
 const box=ensureExchange(),economy=E();if(!box||!economy)return;
 const s=economy.emberExchangeStatus(),message=box.dataset.message||'';
 box.innerHTML=`<div><span>EMBER EXCHANGE</span><strong>1 EMBER</strong><small>Expensive summon conversion • weekly limited</small></div><div class="bb-ember-price"><b>${s.cost} ◈</b><span>${s.battleMarks} Battle Marks</span></div><button id="bbBuyEmber" type="button" ${s.remaining<=0||s.battleMarks<s.cost?'disabled':''}>BUY 1 EMBER</button><div class="bb-ember-status"><span>EMBER BANK <b>${s.embers}</b></span><span>WEEKLY <b>${s.bought}/${s.weeklyCap}</b></span>${message?`<em>${esc(message)}</em>`:''}</div><p>Development pulls remain free for testing. Purchased Embers are still banked and persisted for the real economy.</p>`;
}
function rewriteSummonCopy(){
 const lobby=document.querySelector('#summonScreen .bb-summon-lobby');if(!lobby)return;
 const p=lobby.querySelector('.bb-banner-copy p');if(p)p.textContent='Duplicates are banked as copies. Level a fighter to each 10-level cap, then spend the required copy in the Awakening Forge to unlock the next band.';
 const path=lobby.querySelector('.bb-resonance-path');if(path)path.innerHTML='<span><b>LEVEL</b> EARN XP OR SPEND MARKS</span><i>›</i><span><b>AWAKEN</b> SPEND DUPLICATES AT CAPS</span><i>›</i><span><b>LV.50</b> FINAL SHINY AWAKENING</span>';
 const details=lobby.querySelector('.bb-banner-details p');if(details)details.textContent='Five playable fighters • equal 20% development odds • free dev pulls • duplicates are stored until an Awakening gate is ready.';
}
function sync(){renderLevelPanel();renderExchange();rewriteSummonCopy()}

window.addEventListener('bb:unit-progression',()=>{renderLevelPanel();refreshCombat()});
window.addEventListener('bb:economy',()=>{renderLevelPanel();renderExchange()});
document.getElementById('forgeRoster')?.addEventListener('click',event=>{const b=event.target.closest('[data-fighter]');if(b){current=b.dataset.fighter;setTimeout(()=>renderLevelPanel(),0)}});
const nameEl=document.getElementById('forgeName');if(nameEl)new MutationObserver(()=>renderLevelPanel()).observe(nameEl,{childList:true,subtree:true,characterData:true});
window.BlazingProgressionEconomyUI=Object.freeze({sync,renderLevelPanel,renderExchange});
if(document.readyState==='loading')addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
