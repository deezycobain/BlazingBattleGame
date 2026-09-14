(()=>{
'use strict';

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function front(pair){
 if(!pair||!Array.isArray(pair.units))return null;
 const index=Number.isInteger(pair.active)?pair.active:0;
 return pair.units[index]||pair.units.find(unit=>unit&&unit.name&&unit.name!=='—')||null;
}
function actorName(actor){return String(actor?.name||actor?.display_name||'Unknown');}
function livingUnit(unit){return !!(unit&&actorName(unit)!=='—'&&finite(unit.hp,0)>0);}
function roadTeamAlive(state){
 if(state?.bbRunMode!=='road')return false;
 const shared=window.BlazingRoadSharedHp?.snapshot?.();
 if(shared?.active)return shared.alive;
 if(Number.isFinite(Number(state?.bbRoadTeamHp)))return Number(state.bbRoadTeamHp)>0;
 return (state?.pairs||[]).some(pair=>livingUnit(front(pair)));
}
function livingPair(pair,state=null){return state?.bbRunMode==='road'?roadTeamAlive(state):livingUnit(front(pair));}
function actorId(kind,ref,index=0){
 const unit=kind==='pair'?front(ref):ref;
 const raw=String(unit?.id||unit?.unit_id||actorName(unit)||`${kind}-${index}`).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
 return `${kind}:${raw||index}`;
}
function entry(kind,ref,index=0,state=null){
 const unit=kind==='pair'?front(ref):ref;
 if(kind==='pair'&&state?.bbRunMode==='road'){
  if(!unit||actorName(unit)==='—'||!roadTeamAlive(state))return null;
 }else if(!livingUnit(unit))return null;
 const gauge=clamp(finite(ref?.gauge??unit?.gauge,0),0,100);
 const speed=Math.max(.01,finite(unit?.speed??ref?.speed,1));
 return {id:actorId(kind,ref,index),kind,ref,unit,name:actorName(unit),gauge,speed,turnsToReady:Math.max(0,100-gauge)/speed};
}
function actors(state){
 const players=(state?.pairs||[]).map((pair,index)=>entry('pair',pair,index,state)).filter(Boolean);
 const enemies=(state?.enemies||[]).map((enemy,index)=>entry('enemy',enemy,index,state)).filter(Boolean);
 return [...players,...enemies];
}
function readyEntry(state,list=actors(state)){
 const ready=state?.ready;
 if(!ready?.ref)return null;
 return list.find(item=>item.ref===ready.ref)||null;
}
function queue(state,{limit=6}={}){
 const list=actors(state),ready=readyEntry(state,list);
 const sorted=list.slice().sort((a,b)=>{
  if(ready){if(a===ready)return -1;if(b===ready)return 1;}
  if(a.turnsToReady!==b.turnsToReady)return a.turnsToReady-b.turnsToReady;
  if(a.gauge!==b.gauge)return b.gauge-a.gauge;
  if(a.speed!==b.speed)return b.speed-a.speed;
  if(a.kind!==b.kind)return a.kind==='pair'?-1:1;
  return a.name.localeCompare(b.name);
 });
 return sorted.slice(0,Math.max(1,Math.floor(finite(limit,6)))).map((item,index)=>({id:item.id,kind:item.kind,name:item.name,gauge:item.gauge,speed:item.speed,turnsToReady:item.turnsToReady,current:!!ready&&item===ready,order:index}));
}
function outcome(state){
 const players=state?.bbRunMode==='road'?(roadTeamAlive(state)?1:0):(state?.pairs||[]).filter(pair=>livingPair(pair,state)).length;
 const enemies=(state?.enemies||[]).filter(livingUnit).length;
 if(enemies===0&&players>0)return 'victory';
 if(players===0)return 'defeat';
 return 'ongoing';
}
function phase(state){
 const result=outcome(state);
 if(result==='victory')return {key:'victory',label:'VICTORY',tone:'victory'};
 if(result==='defeat')return {key:'defeat',label:'DEFEAT',tone:'defeat'};
 const ready=readyEntry(state);
 if(state?.phase==='player'||ready?.kind==='pair')return {key:'player',label:'YOUR TURN',tone:'player'};
 if(state?.phase==='cpu'||ready?.kind==='enemy')return {key:'enemy',label:'ENEMY TURN',tone:'enemy'};
 if(state?.phase==='resolve')return {key:'resolve',label:'RESOLVING',tone:'resolve'};
 return {key:'charge',label:'TURN METER',tone:'charge'};
}
function snapshot(state,{limit=6}={}){
 const order=queue(state,{limit}),current=order.find(item=>item.current)||null;
 return {phase:phase(state),outcome:outcome(state),current,queue:order};
}

window.BlazingCombatLoop=Object.freeze({front,livingUnit,livingPair,roadTeamAlive,actors,queue,outcome,phase,snapshot});
})();
