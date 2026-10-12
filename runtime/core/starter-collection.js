(()=>{
'use strict';
const KEY='blazing.collection.v1',VERSION=1;
const STARTERS=Object.freeze(['tyler','subzero','senku']);
const aliases=Object.freeze({'sub-zero':'subzero','wong fei-hung':'jackie_chan','jackie chan':'jackie_chan','solar pharaoh naruto':'naruto_solar','egyptian gaara':'gaara','madara uchiha':'madara'});
function id(input){
 if(input&&typeof input==='object')return id(input.id||input.display_name);
 const raw=String(input||'').trim().toLowerCase();
 if(aliases[raw])return aliases[raw];
 const units=Object.values(window.BLAZING_UNIT_DATA||{});
 const unit=units.find(x=>x&&(String(x.id||'').toLowerCase()===raw||String(x.display_name||'').toLowerCase()===raw));
 return unit?.id||raw.replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}
function earned(){
 const result=[];
 for(const [key,check] of [
  ['blazing.progression.v1',u=>(Number(u?.resonance)||0)>0||(Number(u?.shards)||0)>0||!!u?.shiny],
  ['blazing.unitProgression.v1',u=>(Number(u?.copies)||0)>0||(Number(u?.level)||1)>1||(Number(u?.xp)||0)>0||(Number(u?.lifetimeXp)||0)>0||!!u?.shiny]
 ]){
  try{const record=JSON.parse(localStorage.getItem(key)||'null');for(const [name,u] of Object.entries(record?.units||{})){if(check(u))result.push(id(name))}}catch{}
 }
 return result;
}
function clean(value){return [...new Set([...STARTERS,...(Array.isArray(value)?value:[])].map(id).filter(Boolean))]}
function load(){
 try{
  const raw=localStorage.getItem(KEY);
  if(raw){const state=JSON.parse(raw);return {version:VERSION,owned:clean(state?.owned)}}
  const initial={version:VERSION,owned:clean(earned())};
  localStorage.setItem(KEY,JSON.stringify(initial));
  return initial;
 }catch{return {version:VERSION,owned:[...STARTERS]}}
}
function owns(unit){return load().owned.includes(id(unit))}
function unlock(unit){
 const name=id(unit);if(!name)return false;
 const state=load();if(state.owned.includes(name))return false;
 state.owned.push(name);
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch{return false}
 window.dispatchEvent(new CustomEvent('bb:collection',{detail:{unit:name,owned:[...state.owned]}}));
 return true;
}
function markLocked(){
 const screen=document.getElementById('teamScreen');if(!screen)return;
 for(const el of screen.querySelectorAll('.unitTile[data-unit]')){
  const locked=!owns(el.dataset.unit);
  if(locked)el.dataset.bbLocked='true';else delete el.dataset.bbLocked;
  el.setAttribute('aria-disabled',locked?'true':'false');
 }
}
document.addEventListener('click',event=>{
 const card=event.target.closest?.('#teamScreen .unitTile[data-unit]');
 if(card&&!owns(card.dataset.unit)){
  event.preventDefault();event.stopImmediatePropagation();
  const status=document.getElementById('teamSaved');
  if(status)status.textContent='FIGHTER LOCKED • Unlock this unit through summons.';
 }
},true);
window.addEventListener('bb:collection',()=>{markLocked();window.BlazingInventoryScreen?.render?.()});
window.addEventListener('pageshow',markLocked);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
 const observer=new MutationObserver(markLocked);const screen=document.getElementById('teamScreen');
 if(screen)observer.observe(screen,{childList:true,subtree:true});
 markLocked();
},{once:true});
else markLocked();
window.BlazingCollection=Object.freeze({KEY,VERSION,STARTERS,id,load,owns,unlock});
load();
})();
