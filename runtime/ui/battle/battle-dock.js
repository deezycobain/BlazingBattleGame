(()=>{
'use strict';
const read=name=>{try{return globalThis.eval(name)}catch{return null}};
const move=(el,parent)=>{if(el&&el.parentElement!==parent)parent.appendChild(el)};
function portrait(unit){
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const data=Object.values(window.BLAZING_UNIT_DATA||{}).find(d=>norm(d.display_name)===norm(unit.name)),asset=data?.assets?.art;
 if(asset)return asset.startsWith('assets/')?asset:`assets/characters/${data.id}/${asset}`;
 return window.BLAZING_ASSETS?.cards?.[unit.name]||window.BLAZING_ASSETS?.sprites?.[unit.name]||'';
}
function phaseFallback(s){
 const ready=s?.ready?.kind;
 if(s?.phase==='player'||ready==='pair')return {label:'YOUR TURN',tone:'player'};
 if(s?.phase==='cpu'||ready==='enemy')return {label:'ENEMY TURN',tone:'enemy'};
 if(s?.phase==='resolve')return {label:'RESOLVING',tone:'resolve'};
 return {label:'TURN METER',tone:'charge'};
}
function syncTurnStrip(dock,s){
 const strip=dock.querySelector('.bb-dock-turns'),label=strip?.querySelector('.bb-turn-label'),queue=strip?.querySelector('.bb-turn-queue');
 if(!strip||!label||!queue)return;
 const loop=window.BlazingCombatLoop;
 const snap=loop?.snapshot?.(s,{limit:5})||null;
 const phase=snap?.phase||phaseFallback(s);
 label.textContent=phase.label;
 label.dataset.tone=phase.tone||phase.key||'charge';
 const items=snap?.queue||[];
 queue.innerHTML=items.map((item,index)=>{
  const who=item.kind==='pair'?'ALLY':'ENEMY';
  const cls=['bb-turn-chip',item.kind,item.current?'current':'',index===1?'next':''].filter(Boolean).join(' ');
  const pct=Math.max(0,Math.min(100,Number(item.gauge)||0));
  return `<span class="${cls}" data-bb-turn-id="${item.id}" aria-label="${item.current?'Current turn':'Turn queue'}: ${item.name}, ${who}, gauge ${Math.round(pct)} percent"><b>${item.current?'NOW':index===1?'NEXT':index+1}</b><em>${item.name}</em><i style="--bb-turn-gauge:${pct}%"></i></span>`;
 }).join('');
 strip.dataset.phase=phase.key||phase.tone||'charge';
 strip.hidden=!items.length&&snap?.outcome==='ongoing';
}
function sync(){
 const root=document.getElementById('battleScreen'),wrap=root?.querySelector('.wrap');if(!wrap)return;
 let dock=document.getElementById('bbBattleDock');
 if(!dock){
  const field=document.createElement('div');field.id='bbBattleField';wrap.appendChild(field);move(document.getElementById('game'),field);
  dock=document.createElement('section');dock.id='bbBattleDock';dock.setAttribute('aria-label','Battle controls');
  dock.innerHTML='<div class="bb-team-health" role="progressbar" aria-label="Team health"><div id="bbTeamHealthFill"></div><span id="bbTeamHealthText"></span></div><div class="bb-dock-turns" aria-label="Turn order"><strong class="bb-turn-label">TURN METER</strong><div class="bb-turn-queue"></div></div><div class="bb-dock-timeline"></div><div class="bb-dock-team" aria-label="Team chakra"></div><div class="bb-dock-actions"></div>';
  wrap.appendChild(dock);move(document.getElementById('meter'),dock.querySelector('.bb-dock-timeline'));move(document.getElementById('phase'),dock);
 }
 for(const id of ['normal','jutsu','swap'])move(document.getElementById(id),dock.querySelector('.bb-dock-actions'));
 move(document.getElementById('bbBattlePauseButton'),dock.querySelector('.bb-dock-timeline'));
 const s=read('S');if(!s||!root.classList.contains('active'))return;
 const field=document.getElementById('bbBattleField'),r=field.getBoundingClientRect(),w=Math.min(r.width,r.height*2/3);
 field.style.setProperty('--bb-field-width',`${w}px`);field.style.setProperty('--bb-field-height',`${w*1.5}px`);
 syncTurnStrip(dock,s);
 const health=dock.querySelector('.bb-team-health');health.hidden=s.bbRunMode!=='road';
 const units=(s.pairs||[]).flatMap(p=>p.units||[]).filter(u=>u.name&&u.name!=='—'&&u.maxHp>0);
 const hp=units.reduce((sum,u)=>sum+Math.max(0,u.hp),0),max=units.reduce((sum,u)=>sum+u.maxHp,0);
 health.setAttribute('aria-valuenow',hp);health.setAttribute('aria-valuemax',max);health.setAttribute('aria-valuemin','0');
 document.getElementById('bbTeamHealthFill').style.width=`${max?hp/max*100:0}%`;document.getElementById('bbTeamHealthText').textContent=`TEAM HP  ${Math.ceil(hp)} / ${Math.ceil(max)}`;
 const team=dock.querySelector('.bb-dock-team');
 (s.pairs||[]).forEach((pair,i)=>{
  const unit=read('front')?.(pair);if(!unit)return;let el=team.children[i];
  if(!el){el=document.createElement('div');el.className='bb-dock-unit';el.innerHTML='<div class="bb-dock-portrait"><img alt=""><span class="bb-ko-badge">KO</span></div><small></small><em></em>';team.appendChild(el)}
  const img=el.querySelector('img'),src=portrait(unit);if(src&&img.getAttribute('src')!==src)img.src=src;
  const ko=unit.hp<=0;
  el.querySelector('small').textContent=unit.name;el.querySelector('em').textContent=ko?'KO':`${unit.chakra}/${unit.maxChakra}`;
  el.style.setProperty('--chakra',`${unit.maxChakra?Math.min(100,unit.chakra/unit.maxChakra*100):0}%`);el.classList.toggle('active',s.ready?.ref===pair&&!ko);el.classList.toggle('ko',ko);
  el.setAttribute('aria-label',ko?`${unit.name}, knocked out`:`${unit.name}, chakra ${unit.chakra} of ${unit.maxChakra}`);
 });
 while(team.children.length>(s.pairs||[]).length)team.lastChild.remove();
}
window.BlazingBattleDock=Object.freeze({sync,syncTurnStrip});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
window.addEventListener('resize',sync,{passive:true});window.visualViewport?.addEventListener('resize',sync,{passive:true});setInterval(sync,100);
})();
