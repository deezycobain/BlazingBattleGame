(()=>{
'use strict';

const KEY='blazing.economy.v1';
const VERSION=2;
const CURRENCY='BATTLE MARKS';
const SYMBOL='◈';
const EMBER_COST=300;
const EMBER_WEEKLY_CAP=10;

function weekKey(date=new Date()){
  const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
  const day=d.getUTCDay()||7;
  d.setUTCDate(d.getUTCDate()-day+1);
  return d.toISOString().slice(0,10);
}

function fresh(){
  return {version:VERSION,battleMarks:0,lifetimeEarned:0,embers:0,emberWeek:weekKey(),embersBoughtThisWeek:0,wins:{road:0,castle:0}};
}

function normalize(input){
  const base=fresh();
  if(!input||typeof input!=='object')return base;
  base.battleMarks=Math.max(0,Math.floor(Number(input.battleMarks)||0));
  base.lifetimeEarned=Math.max(base.battleMarks,Math.floor(Number(input.lifetimeEarned)||0));
  base.embers=Math.max(0,Math.floor(Number(input.embers)||0));
  base.wins.road=Math.max(0,Math.floor(Number(input.wins?.road)||0));
  base.wins.castle=Math.max(0,Math.floor(Number(input.wins?.castle)||0));
  const currentWeek=weekKey();
  if(String(input.emberWeek||'')===currentWeek){
    base.emberWeek=currentWeek;
    base.embersBoughtThisWeek=Math.max(0,Math.min(EMBER_WEEKLY_CAP,Math.floor(Number(input.embersBoughtThisWeek)||0)));
  }
  return base;
}

function load(){
  try{return normalize(JSON.parse(localStorage.getItem(KEY)||'null'))}catch{return fresh()}
}

function save(state){
  const next=normalize(state);
  localStorage.setItem(KEY,JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('bb:economy',{detail:{...next}}));
  return next;
}

function rewardFor({mode,stage=1,boss=1}={}){
  if(mode==='road')return 100+Math.max(0,Math.floor(Number(stage)||1)-1)*25;
  if(mode==='castle')return 250+Math.max(0,Math.floor(Number(boss)||1)-1)*50;
  return 0;
}

function awardVictory({mode,stage=1,boss=1}={}){
  const amount=rewardFor({mode,stage,boss});
  if(amount<=0)return null;
  const state=load();
  state.battleMarks+=amount;
  state.lifetimeEarned+=amount;
  if(mode==='road')state.wins.road++;
  if(mode==='castle')state.wins.castle++;
  const saved=save(state);
  return Object.freeze({currency:CURRENCY,symbol:SYMBOL,amount,balance:saved.battleMarks,mode,stage:Math.max(1,Math.floor(Number(stage)||1)),boss:Math.max(1,Math.floor(Number(boss)||1))});
}

function balance(){return load().battleMarks;}
function emberBalance(){return load().embers;}
function canSpend(amount){return balance()>=Math.max(0,Math.floor(Number(amount)||0));}
function spend(amount,reason='SPEND'){
  const cost=Math.max(0,Math.floor(Number(amount)||0));
  if(cost<=0)return {ok:true,cost:0,balance:balance(),reason};
  const state=load();
  if(state.battleMarks<cost)return {ok:false,cost,balance:state.battleMarks,reason};
  state.battleMarks-=cost;
  const saved=save(state);
  return {ok:true,cost,balance:saved.battleMarks,reason};
}
function grantMarks(amount,reason='GRANT'){
  const value=Math.max(0,Math.floor(Number(amount)||0));
  const state=load();state.battleMarks+=value;state.lifetimeEarned+=value;const saved=save(state);
  return {ok:true,amount:value,balance:saved.battleMarks,reason};
}
function emberExchangeStatus(){
  const state=load();
  return {cost:EMBER_COST,weeklyCap:EMBER_WEEKLY_CAP,bought:state.embersBoughtThisWeek,remaining:Math.max(0,EMBER_WEEKLY_CAP-state.embersBoughtThisWeek),embers:state.embers,battleMarks:state.battleMarks,week:state.emberWeek};
}
function purchaseEmber(){
  const state=load();
  if(state.embersBoughtThisWeek>=EMBER_WEEKLY_CAP)return {ok:false,reason:'WEEKLY_CAP',...emberExchangeStatus()};
  if(state.battleMarks<EMBER_COST)return {ok:false,reason:'INSUFFICIENT_MARKS',...emberExchangeStatus()};
  state.battleMarks-=EMBER_COST;state.embers++;state.embersBoughtThisWeek++;
  const saved=save(state);
  return {ok:true,reason:'PURCHASED',cost:EMBER_COST,weeklyCap:EMBER_WEEKLY_CAP,bought:saved.embersBoughtThisWeek,remaining:EMBER_WEEKLY_CAP-saved.embersBoughtThisWeek,embers:saved.embers,battleMarks:saved.battleMarks,week:saved.emberWeek};
}
function spendEmbers(amount){
  const cost=Math.max(0,Math.floor(Number(amount)||0));
  const state=load();
  if(state.embers<cost)return false;
  state.embers-=cost;save(state);return true;
}
function reset(){localStorage.removeItem(KEY);window.dispatchEvent(new CustomEvent('bb:economy',{detail:fresh()}));return fresh();}

window.BlazingEconomy=Object.freeze({KEY,VERSION,CURRENCY,SYMBOL,EMBER_COST,EMBER_WEEKLY_CAP,load,save,balance,emberBalance,rewardFor,awardVictory,canSpend,spend,grantMarks,emberExchangeStatus,purchaseEmber,spendEmbers,reset});
})();
