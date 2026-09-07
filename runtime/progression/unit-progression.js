(()=>{
'use strict';

const KEY='blazing.unitProgression.v1';
const LEGACY_KEY='blazing.progression.v1';
const VERSION=1;
const FIGHTERS=['Crimson','Sub-Zero','Lebee','Senku','Tyler'];
const AWAKENING_COSTS=Object.freeze([1,1,1,1,2]);
const CAPS=Object.freeze([10,20,30,40,50,50]);
const MAX_LEVEL=50;
const LEVEL_CORE_MAX=.15;
const AWAKENING_CORE=Object.freeze([0,.0125,.025,.0375,.05,.07]);
const LEVEL_SPEED_MAX=.03;
const AWAKENING_SPEED=Object.freeze([0,.004,.008,.012,.016,.02]);

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const clone=value=>JSON.parse(JSON.stringify(value));

function freshUnit(){return {level:1,xp:0,awakening:0,copies:0,shiny:false,lifetimeXp:0}}
function fresh(){return {version:VERSION,totalBattleXp:0,units:Object.fromEntries(FIGHTERS.map(name=>[name,freshUnit()]))}}
function capForAwakening(awakening){return CAPS[clamp(Math.floor(Number(awakening)||0),0,5)]}
function xpForNextLevel(level){
  const current=clamp(Math.floor(Number(level)||1),1,MAX_LEVEL);
  if(current>=MAX_LEVEL)return 0;
  const n=current-1;
  return Math.round(100+20*n+3*Math.pow(n,1.4));
}
function fullMarkCost(level){
  const current=clamp(Math.floor(Number(level)||1),1,MAX_LEVEL);
  if(current>=MAX_LEVEL)return 0;
  const band=Math.floor((current-1)/10);
  return 35+5*(current+1)+30*band*band;
}
function normalizeUnit(input={}){
  const awakening=clamp(Math.floor(Number(input.awakening)||0),0,5);
  const cap=capForAwakening(awakening);
  const level=clamp(Math.floor(Number(input.level)||1),1,cap);
  const shiny=awakening>=5||!!input.shiny;
  const xp=level>=cap||level>=MAX_LEVEL?0:clamp(Math.floor(Number(input.xp)||0),0,Math.max(0,xpForNextLevel(level)-1));
  return {level,xp,awakening:shiny?5:awakening,copies:Math.max(0,Math.floor(Number(input.copies)||0)),shiny,lifetimeXp:Math.max(0,Math.floor(Number(input.lifetimeXp)||0))};
}
function migrateLegacy(){
  const state=fresh();
  try{
    const legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');
    if(!legacy?.units)return state;
    for(const name of FIGHTERS){
      const old=legacy.units[name]||{};
      if(old.shiny||Number(old.resonance)>=5){state.units[name]={level:50,xp:0,awakening:5,copies:Math.max(0,Math.floor(Number(old.shards)||0)),shiny:true,lifetimeXp:0};continue;}
      state.units[name].copies=Math.max(0,Math.floor(Number(old.resonance)||0)+Math.floor(Number(old.shards)||0));
    }
  }catch{}
  return state;
}
function normalize(input){
  const base=fresh();
  if(!input||typeof input!=='object')return base;
  base.totalBattleXp=Math.max(0,Math.floor(Number(input.totalBattleXp)||0));
  for(const name of FIGHTERS)base.units[name]=normalizeUnit(input.units?.[name]);
  return base;
}
function load(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw)return normalize(JSON.parse(raw));
    const migrated=migrateLegacy();
    localStorage.setItem(KEY,JSON.stringify(migrated));
    return migrated;
  }catch{return fresh()}
}
function save(state){
  const next=normalize(state);
  localStorage.setItem(KEY,JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('bb:unit-progression',{detail:clone(next)}));
  return next;
}
function getState(){return clone(load())}
function unit(name){return clone(load().units[name]||freshUnit())}
function isAtGate(data){const u=normalizeUnit(data);return !u.shiny&&u.level>=capForAwakening(u.awakening)}
function nextAwakeningCost(data){const u=normalizeUnit(data);return u.awakening>=5?0:AWAKENING_COSTS[u.awakening]}
function canAwaken(name){
  const u=unit(name),cost=nextAwakeningCost(u),cap=capForAwakening(u.awakening);
  return {ok:u.awakening<5&&u.level>=cap&&u.copies>=cost,levelReady:u.level>=cap,copiesReady:u.copies>=cost,cost,cap,unit:u};
}
function addDuplicate(name,count=1){
  if(!FIGHTERS.includes(name))return null;
  const state=load(),u=state.units[name],amount=Math.max(1,Math.floor(Number(count)||1));
  u.copies+=amount;const saved=save(state);
  return {name,added:amount,copies:saved.units[name].copies,unit:clone(saved.units[name])};
}
function grantXp(name,amount){
  if(!FIGHTERS.includes(name))return null;
  const state=load(),u=state.units[name],earned=Math.max(0,Math.floor(Number(amount)||0));
  let remaining=earned,levels=0;
  u.lifetimeXp+=earned;state.totalBattleXp+=earned;
  while(remaining>0&&u.level<MAX_LEVEL){
    const cap=capForAwakening(u.awakening);
    if(u.level>=cap){u.xp=0;break;}
    const need=xpForNextLevel(u.level)-u.xp;
    if(remaining<need){u.xp+=remaining;remaining=0;break;}
    remaining-=need;u.level++;u.xp=0;levels++;
    if(u.level>=cap){remaining=0;break;}
  }
  const saved=save(state),next=saved.units[name];
  return {name,earned,levelsGained:levels,level:next.level,xp:next.xp,cap:capForAwakening(next.awakening),locked:isAtGate(next),discarded:remaining,unit:clone(next)};
}
function battleXpFor({mode,stage=1,boss=1}={}){
  if(mode==='road')return 180+Math.max(0,Math.floor(Number(stage)||1)-1)*25;
  if(mode==='castle')return 450+Math.max(0,Math.floor(Number(boss)||1)-1)*75;
  return 0;
}
function awardBattleXp({mode,stage=1,boss=1,names=[]}={}){
  const amount=battleXpFor({mode,stage,boss});
  const unique=[...new Set((Array.isArray(names)?names:[]).filter(name=>FIGHTERS.includes(name)))];
  const results=unique.map(name=>grantXp(name,amount)).filter(Boolean);
  return Object.freeze({amount,mode,stage,boss,units:results});
}
function markCostToFinish(name){
  const u=unit(name),cap=capForAwakening(u.awakening);
  if(u.level>=MAX_LEVEL||u.level>=cap)return 0;
  const need=xpForNextLevel(u.level),remaining=Math.max(1,need-u.xp),full=fullMarkCost(u.level);
  return Math.max(15,Math.ceil(full*(remaining/need)));
}
function buyLevel(name){
  if(!FIGHTERS.includes(name))return {ok:false,reason:'UNKNOWN_UNIT'};
  const state=load(),u=state.units[name],cap=capForAwakening(u.awakening);
  if(u.level>=MAX_LEVEL)return {ok:false,reason:'MAX_LEVEL',unit:clone(u)};
  if(u.level>=cap)return {ok:false,reason:'AWAKENING_REQUIRED',unit:clone(u),cap};
  const cost=markCostToFinish(name),economy=window.BlazingEconomy;
  if(!economy?.spend)return {ok:false,reason:'ECONOMY_UNAVAILABLE',cost,unit:clone(u)};
  const spent=economy.spend(cost,`LEVEL_${name}`);
  if(!spent.ok)return {ok:false,reason:'INSUFFICIENT_MARKS',cost,balance:spent.balance,unit:clone(u)};
  u.level++;u.xp=0;
  const saved=save(state),next=saved.units[name];
  return {ok:true,cost,balance:spent.balance,name,level:next.level,cap:capForAwakening(next.awakening),locked:isAtGate(next),unit:clone(next)};
}
function awaken(name){
  if(!FIGHTERS.includes(name))return {ok:false,reason:'UNKNOWN_UNIT'};
  const state=load(),u=state.units[name],check=canAwaken(name);
  if(u.awakening>=5)return {ok:false,reason:'MAX_AWAKENING',unit:clone(u)};
  if(!check.levelReady)return {ok:false,reason:'LEVEL_REQUIRED',requiredLevel:check.cap,unit:clone(u)};
  if(!check.copiesReady)return {ok:false,reason:'COPIES_REQUIRED',requiredCopies:check.cost,copies:u.copies,unit:clone(u)};
  u.copies-=check.cost;u.awakening++;u.xp=0;if(u.awakening>=5)u.shiny=true;
  const saved=save(state),next=saved.units[name];
  return {ok:true,name,cost:check.cost,awakening:next.awakening,shiny:next.shiny,newCap:capForAwakening(next.awakening),unit:clone(next)};
}
function levelCoreGrowth(level){return ((clamp(Number(level)||1,1,MAX_LEVEL)-1)/(MAX_LEVEL-1))*LEVEL_CORE_MAX}
function levelSpeedGrowth(level){return ((clamp(Number(level)||1,1,MAX_LEVEL)-1)/(MAX_LEVEL-1))*LEVEL_SPEED_MAX}
function statMultipliers(data){
  const u=normalizeUnit(data),a=clamp(u.awakening,0,5);
  const core=1+levelCoreGrowth(u.level)+AWAKENING_CORE[a];
  const speed=1+levelSpeedGrowth(u.level)+AWAKENING_SPEED[a];
  return {hp:core,attack:core,defense:core,speed,coreGrowth:core-1,speedGrowth:speed-1};
}
function reset(){localStorage.removeItem(KEY);const next=fresh();localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('bb:unit-progression',{detail:clone(next)}));return clone(next)}

window.BlazingUnitProgression=Object.freeze({KEY,LEGACY_KEY,VERSION,FIGHTERS,AWAKENING_COSTS,CAPS,MAX_LEVEL,load,getState,unit,save,capForAwakening,xpForNextLevel,fullMarkCost,markCostToFinish,isAtGate,nextAwakeningCost,canAwaken,addDuplicate,grantXp,battleXpFor,awardBattleXp,buyLevel,awaken,statMultipliers,reset});
})();
