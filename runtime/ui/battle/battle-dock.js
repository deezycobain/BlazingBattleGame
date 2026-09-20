(()=>{
'use strict';
const read=name=>{try{return globalThis.eval(name)}catch{return null}};
const move=(el,parent)=>{if(el&&el.parentElement!==parent)parent.appendChild(el)};
function portrait(unit){
 if(!unit)return '';
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const data=Object.values(window.BLAZING_UNIT_DATA||{}).find(d=>norm(d.display_name)===norm(unit.name)),asset=data?.assets?.art;
 if(asset)return asset.startsWith('assets/')?asset:`assets/characters/${data.id}/${asset}`;
 return window.BLAZING_ASSETS?.cards?.[unit.name]||window.BLAZING_ASSETS?.sprites?.[unit.name]||'';
}
function phaseFallback(s){const ready=s?.ready?.kind;if(s?.phase==='player'||ready==='pair')return {label:'YOUR TURN',tone:'player'};if(s?.phase==='cpu'||ready==='enemy')return {label:'ENEMY TURN',tone:'enemy'};if(s?.phase==='resolve')return {label:'RESOLVING',tone:'resolve'};return {label:'TURN ORDER',tone:'charge'}}
function control(kind){const id=kind==='normal'?'normal':kind==='jutsu'?'jutsu':'swap';return document.getElementById(id)||read(kind==='normal'?'normalBtn':kind==='jutsu'?'jutsuBtn':'swapBtn')}
function isJutsuArmed(){const btn=control('jutsu');return !!(btn&&(btn.classList.contains('selected')||btn.getAttribute('aria-pressed')==='true'))}
function setBackdrop(field){const canvas=document.getElementById('game'),bg=canvas?.style?.backgroundImage||'';if(bg&&bg!=='none')field.style.setProperty('--bb-road-backdrop',bg)}
function sizeField(field){const r=field?.getBoundingClientRect?.();if(!r||!(r.width>0&&r.height>0))return;const width=Math.max(r.width,r.height*(2/3)),height=width*1.5;field.style.setProperty('--bb-field-width',`${width}px`);field.style.setProperty('--bb-field-height',`${height}px`)}
function toggleJutsu(pair){const s=read('S');if(!s||s.bbRunMode!=='road'||s.ready?.ref!==pair||window.BlazingRoadCamera?.isCombatLocked?.())return;const normal=control('normal'),jutsu=control('jutsu');if(!normal||!jutsu)return;if(isJutsuArmed()){normal.click();return}if(!jutsu.disabled)jutsu.click()}
function swapPair(pair){const s=read('S'),swap=control('swap');if(!s||!swap||s.ready?.ref!==pair||window.BlazingRoadCamera?.isCombatLocked?.()||swap.disabled)return;swap.click()}
function reserve(pair,frontUnit){if(!pair)return null;const candidates=[];if(Array.isArray(pair.units))candidates.push(...pair.units);if(Array.isArray(pair.members))candidates.push(...pair.members);for(const key of ['back','reserve','sub','rear','unit2','b'])if(pair[key])candidates.push(pair[key]);return candidates.find(u=>u&&u!==frontUnit&&u.name&&u.name!=='—')||null}
function chakraGradient(value,maxValue){
 const max=Math.max(1,Math.round(Number(maxValue)||1)),filled=Math.max(0,Math.min(max,Math.round(Number(value)||0))),step=360/max,gap=Math.min(4,step*.14),parts=[];
 for(let i=0;i<max;i++){const start=i*step,end=(i+1)*step,fillEnd=Math.max(start,end-gap),color=i<filled?'#43c7ea':'#263640';parts.push(`${color} ${start}deg ${fillEnd}deg`,`#111920 ${fillEnd}deg ${end}deg`)}
 return `conic-gradient(from -90deg,${parts.join(',')})`;
}
function syncTurnStrip(dock,s){
 const strip=dock.querySelector('.bb-dock-turns'),label=strip?.querySelector('.bb-turn-label'),queue=strip?.querySelector('.bb-turn-queue');if(!strip||!label||!queue)return;
 const roadSnap=s?.bbRunMode==='road'?window.BlazingRoadTurns?.snapshot?.({limit:5}):null;
 const snap=roadSnap?.active?roadSnap:(window.BlazingCombatLoop?.snapshot?.(s,{limit:5})||null),phase=snap?.phase||phaseFallback(s),roundMode=snap?.mode==='round';
 label.textContent=phase.label;label.dataset.tone=phase.tone||phase.key||'charge';strip.dataset.mode=roundMode?'round':'meter';
 const items=snap?.queue||[];
 queue.innerHTML=items.map((item,index)=>{const cls=['bb-turn-chip',item.kind,item.current?'current':'',index===1?'next':''].filter(Boolean).join(' '),pct=Math.max(0,Math.min(100,Number(item.gauge)||0)),tag=item.current?'NOW':index===1?'NEXT':`${index+1}`;return `<span class="${cls}" data-bb-turn-id="${item.id}" aria-label="${item.current?'Current turn':'Turn order'}: ${item.name}${roundMode?`, speed ${Math.round(item.speed||0)}`:` gauge ${Math.round(pct)} percent`}"><b>${tag}</b><em>${item.name}</em>${roundMode?'':`<i style="--bb-turn-gauge:${pct}%"></i>`}</span>`}).join('');
 strip.dataset.phase=phase.key||phase.tone||'charge';strip.hidden=!items.length&&snap?.outcome==='ongoing';
}
function sync(){
 const root=document.getElementById('battleScreen'),wrap=root?.querySelector('.wrap');if(!wrap)return;let dock=document.getElementById('bbBattleDock');
 if(!dock){const field=document.createElement('div');field.id='bbBattleField';wrap.appendChild(field);move(document.getElementById('game'),field);dock=document.createElement('section');dock.id='bbBattleDock';dock.setAttribute('aria-label','Battle controls');dock.innerHTML='<div class="bb-team-health" role="progressbar" aria-label="Team health"><div id="bbTeamHealthFill"></div><span id="bbTeamHealthText"></span></div><div class="bb-dock-turns" aria-label="Turn order"><strong class="bb-turn-label">TURN ORDER</strong><div class="bb-turn-queue"></div></div><div class="bb-dock-timeline"></div><div class="bb-dock-team" aria-label="Team chakra"></div><div class="bb-dock-actions" aria-hidden="true"></div>';wrap.appendChild(dock);move(document.getElementById('meter'),dock.querySelector('.bb-dock-timeline'));move(document.getElementById('phase'),dock)}
 for(const id of ['normal','jutsu','swap'])move(document.getElementById(id),dock.querySelector('.bb-dock-actions'));move(document.getElementById('bbBattlePauseButton'),dock.querySelector('.bb-dock-timeline'));
 const s=read('S');if(!s||!root.classList.contains('active'))return;const field=document.getElementById('bbBattleField');setBackdrop(field);sizeField(field);syncTurnStrip(dock,s);
 const health=dock.querySelector('.bb-team-health');health.hidden=s.bbRunMode!=='road';const shared=window.BlazingRoadSharedHp?.snapshot?.();const units=(s.pairs||[]).map(pair=>read('front')?.(pair)).filter(unit=>unit&&unit.name&&unit.name!=='—'&&unit.maxHp>0);const fallbackHp=units.reduce((sum,u)=>sum+Math.max(0,u.hp),0),fallbackMax=units.reduce((sum,u)=>sum+u.maxHp,0);const hp=s.bbRunMode==='road'&&shared?.active?shared.hp:fallbackHp,max=s.bbRunMode==='road'&&shared?.active?shared.maxHp:fallbackMax;
 health.setAttribute('aria-valuenow',hp);health.setAttribute('aria-valuemax',max);health.setAttribute('aria-valuemin','0');document.getElementById('bbTeamHealthFill').style.width=`${max?hp/max*100:0}%`;document.getElementById('bbTeamHealthText').textContent=`TEAM HP  ${Math.ceil(hp)} / ${Math.ceil(max)}`;
 const team=dock.querySelector('.bb-dock-team'),armed=isJutsuArmed();(s.pairs||[]).forEach((pair,i)=>{const unit=read('front')?.(pair);if(!unit)return;let el=team.children[i];if(!el){el=document.createElement('button');el.type='button';el.className='bb-dock-unit';el.innerHTML='<span class="bb-dock-portrait"><img class="bb-active-art" alt=""><span class="bb-reserve-portrait"><img alt=""></span></span><small></small><em></em>';el.addEventListener('click',event=>{if(event.target.closest('.bb-reserve-portrait'))swapPair(el._bbPair);else toggleJutsu(el._bbPair)});team.appendChild(el)}el._bbPair=pair;
  const img=el.querySelector('.bb-active-art'),src=portrait(unit);if(src&&img.getAttribute('src')!==src)img.src=src;const sub=reserve(pair,unit),subWrap=el.querySelector('.bb-reserve-portrait'),subImg=subWrap.querySelector('img'),subSrc=portrait(sub);subWrap.hidden=!sub;if(subSrc&&subImg.getAttribute('src')!==subSrc)subImg.src=subSrc;subWrap.setAttribute('aria-label',sub?`Swap to ${sub.name}`:'No reserve unit');
  const active=s.ready?.ref===pair,roadAlive=s.bbRunMode==='road'?(shared?.alive??hp>0):unit.hp>0,portraitRing=el.querySelector('.bb-dock-portrait');el.querySelector('small').textContent=unit.name;el.querySelector('em').textContent='';portraitRing.style.backgroundImage=chakraGradient(unit.chakra,unit.maxChakra);el.classList.toggle('active',active&&roadAlive);el.classList.toggle('armed',active&&armed&&roadAlive);el.classList.toggle('ko',!roadAlive);el.disabled=!active||!roadAlive||window.BlazingRoadCamera?.isCombatLocked?.();el.setAttribute('aria-pressed',active&&armed?'true':'false');el.setAttribute('aria-label',!roadAlive?`${unit.name}, team defeated`:`${unit.name}, chakra ${unit.chakra} of ${unit.maxChakra}${active?', tap portrait to toggle jutsu':''}`)});while(team.children.length>(s.pairs||[]).length)team.lastChild.remove();
}
window.BlazingBattleDock=Object.freeze({sync,syncTurnStrip});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();window.addEventListener('resize',sync,{passive:true});window.visualViewport?.addEventListener('resize',sync,{passive:true});setInterval(sync,80);
})();
