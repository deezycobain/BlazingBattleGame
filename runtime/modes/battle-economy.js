(()=>{
'use strict';

const KEY='blazing.economy.v1';
const VERSION=1;
const CURRENCY='BATTLE MARKS';
const SYMBOL='◈';

function fresh(){
  return {version:VERSION,battleMarks:0,lifetimeEarned:0,wins:{road:0,castle:0}};
}

function normalize(input){
  const base=fresh();
  if(!input||typeof input!=='object')return base;
  base.battleMarks=Math.max(0,Math.floor(Number(input.battleMarks)||0));
  base.lifetimeEarned=Math.max(base.battleMarks,Math.floor(Number(input.lifetimeEarned)||0));
  base.wins.road=Math.max(0,Math.floor(Number(input.wins?.road)||0));
  base.wins.castle=Math.max(0,Math.floor(Number(input.wins?.castle)||0));
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
  return Object.freeze({
    currency:CURRENCY,
    symbol:SYMBOL,
    amount,
    balance:saved.battleMarks,
    mode,
    stage:Math.max(1,Math.floor(Number(stage)||1)),
    boss:Math.max(1,Math.floor(Number(boss)||1))
  });
}

function balance(){return load().battleMarks;}
function reset(){localStorage.removeItem(KEY);window.dispatchEvent(new CustomEvent('bb:economy',{detail:fresh()}));return fresh();}

window.BlazingEconomy=Object.freeze({KEY,VERSION,CURRENCY,SYMBOL,load,save,balance,rewardFor,awardVictory,reset});
})();
