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
function sync(){
 const root=document.getElementById('battleScreen'),wrap=root?.querySelector('.wrap');if(!wrap)return;
 let dock=document.getElementById('bbBattleDock');
 if(!dock){
  const field=document.createElement('div');field.id='bbBattleField';wrap.appendChild(field);move(document.getElementById('game'),field);
  dock=document.createElement('section');dock.id='bbBattleDock';dock.setAttribute('aria-label','Battle controls');
  dock.innerHTML='<div class="bb-team-health" role="progressbar" aria-label="Team health"><div id="bbTeamHealthFill"></div><span id="bbTeamHealthText"></span></div><div class="bb-dock-timeline"></div><div class="bb-dock-team" aria-label="Team chakra"></div><div class="bb-dock-actions"></div>';
  wrap.appendChild(dock);move(document.getElementById('meter'),dock.querySelector('.bb-dock-timeline'));move(document.getElementById('phase'),dock);
 }
 for(const id of ['normal','jutsu','swap'])move(document.getElementById(id),dock.querySelector('.bb-dock-actions'));
 move(document.getElementById('bbBattlePauseButton'),dock.querySelector('.bb-dock-timeline'));
 const s=read('S');if(!s||!root.classList.contains('active'))return;
 const field=document.getElementById('bbBattleField'),r=field.getBoundingClientRect(),w=Math.min(r.width,r.height*2/3);
 field.style.setProperty('--bb-field-width',`${w}px`);field.style.setProperty('--bb-field-height',`${w*1.5}px`);
 const health=dock.querySelector('.bb-team-health');health.hidden=s.bbRunMode!=='road';
 const units=(s.pairs||[]).flatMap(p=>p.units||[]).filter(u=>u.name&&u.name!=='—'&&u.maxHp>0);
 const hp=units.reduce((sum,u)=>sum+Math.max(0,u.hp),0),max=units.reduce((sum,u)=>sum+u.maxHp,0);
 health.setAttribute('aria-valuenow',hp);health.setAttribute('aria-valuemax',max);health.setAttribute('aria-valuemin','0');
 document.getElementById('bbTeamHealthFill').style.width=`${max?hp/max*100:0}%`;document.getElementById('bbTeamHealthText').textContent=`TEAM HP  ${Math.ceil(hp)} / ${Math.ceil(max)}`;
 const team=dock.querySelector('.bb-dock-team');
 (s.pairs||[]).forEach((pair,i)=>{
  const unit=read('front')?.(pair);if(!unit)return;let el=team.children[i];
  if(!el){el=document.createElement('div');el.className='bb-dock-unit';el.innerHTML='<div class="bb-dock-portrait"><img alt=""></div><small></small><em></em>';team.appendChild(el)}
  const img=el.querySelector('img'),src=portrait(unit);if(src&&img.getAttribute('src')!==src)img.src=src;
  el.querySelector('small').textContent=unit.name;el.querySelector('em').textContent=`${unit.chakra}/${unit.maxChakra}`;
  el.style.setProperty('--chakra',`${Math.min(100,unit.chakra/unit.maxChakra*100)}%`);el.classList.toggle('active',s.ready?.ref===pair);el.classList.toggle('ko',unit.hp<=0);
  el.setAttribute('aria-label',`${unit.name}, chakra ${unit.chakra} of ${unit.maxChakra}`);
 });
 while(team.children.length>(s.pairs||[]).length)team.lastChild.remove();
}
window.BlazingBattleDock=Object.freeze({sync});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
window.addEventListener('resize',sync,{passive:true});window.visualViewport?.addEventListener('resize',sync,{passive:true});setInterval(sync,100);
})();
