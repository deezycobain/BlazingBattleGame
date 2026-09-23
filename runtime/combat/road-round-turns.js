(()=>{
'use strict';

const POLL_MS=12;
const ROAD_COMBAT_SCALE=1.16;
let stateRef=null,battleKey='',round=1,order=[],index=0,seenReady=false,timer=0,suppressions=new WeakMap();

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const liveState=()=>{try{return globalThis.eval('S')}catch{return null}};
const activeBattle=()=>document.getElementById('battleScreen')?.classList.contains('active');
function front(pair){if(!pair||!Array.isArray(pair.units))return null;const idx=Number.isInteger(pair.active)?pair.active:0;return pair.units[idx]||pair.units.find(u=>u&&u.name&&u.name!=='—')||null}
function normalizeName(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function canonicalSpeed(unit){
 if(!unit)return 0;
 const match=Object.values(window.BLAZING_UNIT_DATA||{}).find(data=>normalizeName(data?.display_name)===normalizeName(unit.name));
 return Math.max(.01,finite(match?.stats?.speed,unit.speed??1));
}
function authoredEnemySpeed(enemy){return Math.max(.01,finite(enemy?.speed,1))}
function roadAlive(state){const shared=window.BlazingRoadSharedHp?.snapshot?.();if(shared?.active)return !!shared.alive;return finite(state?.bbRoadTeamHp,1)>0}
function actorId(kind,ref,unit,index){const raw=String(unit?.id||unit?.name||`${kind}-${index}`).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');return `${kind}:${raw||index}`}
function collect(state){
 const players=(state?.pairs||[]).map((pair,i)=>{const unit=front(pair);if(!unit||unit.name==='—'||!roadAlive(state))return null;return {id:actorId('pair',pair,unit,i),kind:'pair',ref:pair,unit,name:unit.name,speed:canonicalSpeed(unit),index:i}}).filter(Boolean);
 const enemies=(state?.enemies||[]).map((enemy,i)=>{if(!enemy||finite(enemy.hp,0)<=0)return null;return {id:actorId('enemy',enemy,enemy,i),kind:'enemy',ref:enemy,unit:enemy,name:enemy.name||`Enemy ${i+1}`,speed:authoredEnemySpeed(enemy),index:i}}).filter(Boolean);
 return [...players,...enemies];
}
function isAlive(entry,state){if(!entry)return false;if(entry.kind==='enemy')return finite(entry.ref?.hp,0)>0;return roadAlive(state)&&!!front(entry.ref)}
function statusTarget(entry){return entry?.kind==='pair'?front(entry.ref):entry?.ref||null}
function consumeStun(entry,state){
 const target=statusTarget(entry),runtime=window.BlazingCombatRuntime;
 if(!target||!runtime?.hasStatus?.(target,'stun'))return false;
 const detail=runtime.consumeStatusTurn(target,'stun');
 if(!detail?.consumed)return false;
 if(entry?.ref)entry.ref.gauge=0;
 if(target)target.gauge=0;
 if(state)state.log=`${entry.name} is stunned and loses the turn.`;
 return true;
}
function sortInitiative(list){return list.slice().sort((a,b)=>b.speed-a.speed||(a.kind===b.kind?a.index-b.index:(a.kind==='pair'?-1:1))||a.name.localeCompare(b.name))}
function actorSetKey(list){return list.map(entry=>entry.id).slice().sort().join('|')}
function keyFor(state){return `${state?.bbRoadRun?.run_id||'road'}:${state?.bbRoadStage||state?.bbRoadRun?.stage||1}`}
function resetRound(state,{newBattle=false}={}){if(newBattle)round=1;else round++;order=sortInitiative(collect(state));index=0;seenReady=false}
function refreshOpeningRoster(state){
 if(round!==1||index!==0||seenReady||state?.ready?.ref||state?.phase!=='charge')return false;
 const next=sortInitiative(collect(state));
 if(actorSetKey(next)===actorSetKey(order))return false;
 order=next;
 return true;
}
function current(state){
 const guardMax=Math.max(8,(order.length||1)*3);
 for(let guard=0;guard<guardMax;guard++){
  while(index<order.length&&!isAlive(order[index],state))index++;
  if(index>=order.length){resetRound(state);continue}
  const candidate=order[index]||null;
  if(!candidate)return null;
  if(consumeStun(candidate,state)){index++;seenReady=false;continue}
  return candidate;
 }
 return order[index]||null;
}
function engineActors(state){return collect(state).map(entry=>({entry,gaugeOwner:entry.ref}))}
function suppressionFor(ref){return ref?suppressions.get(ref)||null:null}
function registerGaugeSuppression(target,detail={}){
 if(!target)return {ok:false,amount:0,gauge:0};
 const requested=clamp(finite(detail.requested??detail.amount,0),0,100);
 if(requested<=0)return {ok:false,amount:0,gauge:clamp(finite(target.gauge,0),0,100)};
 const previous=suppressionFor(target);
 const amount=clamp(finite(previous?.amount,0)+requested,0,100);
 const exact=clamp(finite(detail.after,target.gauge),0,100);
 const record={amount,active:false,preserve:true,exact};
 suppressions.set(target,record);
 target.gauge=exact;
 return {ok:true,amount,gauge:exact};
}
function applyNonSelectedGauge(state,item){
 const record=suppressionFor(item.entry.ref);
 // Gauges are frozen while an authored action resolves. This prevents the Road
 // round controller from erasing a status effect between its impact callback and
 // the next charge window, while leaving normal round ownership unchanged.
 if(state?.phase==='resolve'){
  if(record?.preserve)item.gaugeOwner.gauge=clamp(finite(record.exact,item.gaugeOwner.gauge),0,100);
  return;
 }
 if(record)record.preserve=false;
 item.gaugeOwner.gauge=0;
}
function enforce(state,selected){
 for(const item of engineActors(state)){
  if(!item.gaugeOwner)continue;
  if(item.entry.ref!==selected?.ref){applyNonSelectedGauge(state,item);continue}
  const record=suppressionFor(item.entry.ref);
  if(!record){item.gaugeOwner.gauge=100;continue}
  if(!record.active){
   record.active=true;
   record.preserve=false;
   item.gaugeOwner.gauge=Math.max(0,100-record.amount);
   continue;
  }
  if(state?.ready?.ref===item.entry.ref||finite(item.gaugeOwner.gauge,0)>=100){
   suppressions.delete(item.entry.ref);
   item.gaugeOwner.gauge=100;
  }
 }
}
function cancelWrongReady(state,selected){
 const ready=state?.ready;
 if(!ready?.ref||ready.ref===selected?.ref)return false;
 if(ready.ref)ready.ref.gauge=0;
 state.ready=null;
 if(state.phase==='player'||state.phase==='cpu')state.phase='charge';
 return true;
}
function advanceIfCompleted(state,selected){
 const ready=state?.ready;
 if(ready?.ref===selected?.ref){seenReady=true;return false}
 if(seenReady&&!ready?.ref&&state.phase==='charge'){index++;seenReady=false;current(state);return true}
 return false;
}
function patchRoadScale(){
 const C=window.BlazingRoadContent;if(!C||C.__bbRoundScale)return;
 const tune=map=>{if(!map)return map;const p=map.presentation||{},presentation=Object.freeze({...p,combatScale:ROAD_COMBAT_SCALE,scale:ROAD_COMBAT_SCALE});return Object.freeze({...map,presentation})};
 const maps=Object.freeze((C.MAPS||[]).map(tune));
 const stageConfig=value=>{const cfg=C.stageConfig(value),map=tune(cfg.map);return Object.freeze({...cfg,map})};
 window.BlazingRoadContent=Object.freeze({...C,__bbRoundScale:true,MAPS:maps,stageConfig,mapForStage:value=>stageConfig(value).map});
}
function syncState(state=liveState()){
 if(!state||state.bbRunMode!=='road'||!activeBattle()){
  if(stateRef){stateRef=null;battleKey='';order=[];index=0;seenReady=false;round=1;suppressions=new WeakMap()}
  return null;
 }
 patchRoadScale();
 const key=keyFor(state);
 if(state!==stateRef||key!==battleKey){stateRef=state;battleKey=key;suppressions=new WeakMap();resetRound(state,{newBattle:true})}
 // Pause freezes the authored Road round controller as well as the legacy engine tick.
 // Do not advance initiative, consume statuses, or rewrite gauges until Resume.
 if(window.BlazingBattlePause?.isPaused?.()){
  const held=order[index]||null;
  return held&&isAlive(held,state)?held:null;
 }
 refreshOpeningRoster(state);
 const selected=current(state);if(!selected)return null;
 if(window.BlazingRoadCamera?.isCombatLocked?.()){
  // The pre-FIGHT camera lock owns gauges only before combat begins. During an
  // authored resolve animation, preserve the live gauge value so status effects
  // such as Tsukuyomi can calculate from the true pre-impact gauge instead of 0.
  if(state?.phase==='resolve'){
   for(const item of engineActors(state)){
    if(!item.gaugeOwner)continue;
    const record=suppressionFor(item.entry.ref);
    if(record?.preserve)item.gaugeOwner.gauge=clamp(finite(record.exact,item.gaugeOwner.gauge),0,100);
   }
   return selected;
  }
  for(const item of engineActors(state))if(item.gaugeOwner)item.gaugeOwner.gauge=0;
  return selected;
 }
 cancelWrongReady(state,selected);
 advanceIfCompleted(state,selected);
 const now=current(state);if(!now)return null;
 if(!seenReady||state.phase==='charge')enforce(state,now);
 else for(const item of engineActors(state))if(item.entry.ref!==now.ref&&item.gaugeOwner)applyNonSelectedGauge(state,item);
 return now;
}
function beforeEngineTick(state){if(state?.bbRunMode==='road')syncState(state)}
function phaseFor(state,selected){
 const outcome=window.BlazingCombatLoop?.outcome?.(state)||'ongoing';
 if(outcome==='victory')return {key:'victory',label:'VICTORY',tone:'victory'};
 if(outcome==='defeat')return {key:'defeat',label:'DEFEAT',tone:'defeat'};
 if(state?.phase==='resolve')return {key:'resolve',label:'RESOLVING',tone:'resolve'};
 if(selected?.kind==='pair')return {key:'player',label:'YOUR TURN',tone:'player'};
 if(selected?.kind==='enemy')return {key:'enemy',label:'ENEMY TURN',tone:'enemy'};
 return {key:'round',label:`ROUND ${round}`,tone:'charge'};
}
function snapshot({limit=5}={}){
 const state=liveState();if(!state||state.bbRunMode!=='road'||!activeBattle())return Object.freeze({active:false,mode:'round',round:0,queue:[],current:null});
 const selected=syncState(state),remaining=order.slice(index).filter(entry=>isAlive(entry,state)).slice(0,Math.max(1,Math.floor(finite(limit,5))));
 const queue=remaining.map((entry,i)=>Object.freeze({id:entry.id,kind:entry.kind,name:entry.name,speed:entry.speed,current:i===0&&entry.ref===selected?.ref,order:i,round}));
 return Object.freeze({active:true,mode:'round',round,phase:phaseFor(state,selected),queue,current:queue[0]||null,key:battleKey});
}

window.BlazingRoadTurns=Object.freeze({snapshot,beforeEngineTick,registerGaugeSuppression,sync:()=>syncState(),get round(){return round}});
function boot(){patchRoadScale();syncState();timer=window.setInterval(()=>syncState(),POLL_MS)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pagehide',()=>window.clearInterval(timer),{once:true});
})();
