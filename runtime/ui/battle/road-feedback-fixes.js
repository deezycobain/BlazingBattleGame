(()=>{
'use strict';
const base=window.BlazingRoadContent;
if(!base||window.BlazingRoadFeedbackFixes)return;

const STYLE_ID='bb-road-feedback-fixes-style';
const LANTERN_KEY='lantern-garden';
const freezePoint=([x,y])=>Object.freeze({x,y});
const original=base.MAPS.find(map=>map.key===LANTERN_KEY);
if(!original)return;

// Keep the existing authored blocked scenery for now. Do not invent another narrow
// allowed corridor before the playable floor has been traced by hand in terrain draw mode.
const movement=original.movement||Object.freeze({allowed:Object.freeze([]),blocked:Object.freeze([])});
const enemyAnchors=Object.freeze([
  freezePoint([195,238]),
  freezePoint([286,246]),
  freezePoint([214,316]),
  freezePoint([296,360]),
  freezePoint([248,286])
]);
const lantern=Object.freeze({
  ...original,
  presentation:Object.freeze({scale:1.03,position:'center 51%',brightness:1.20}),
  enemyAnchors,
  movement
});
const MAPS=Object.freeze(base.MAPS.map(map=>map.key===LANTERN_KEY?lantern:map));

const isLantern=value=>value===LANTERN_KEY||value?.key===LANTERN_KEY;
function isWalkablePoint(mapOrKey,p,options){return base.isWalkablePoint(isLantern(mapOrKey)?lantern:mapOrKey,p,options)}
function nearestWalkable(mapOrKey,p,options){return base.nearestWalkable(isLantern(mapOrKey)?lantern:mapOrKey,p,options)}
function constrainMovementPoint(mapOrKey,destination,from,options){return base.constrainMovementPoint(isLantern(mapOrKey)?lantern:mapOrKey,destination,from,options)}
function mapForStage(value){
  const map=base.mapForStage(value);
  return map?.key===LANTERN_KEY?Object.freeze({...lantern,slot:map.slot}):map;
}
function stageConfig(value){
  const config=base.stageConfig(value);
  if(config.map?.key!==LANTERN_KEY)return config;
  const map=Object.freeze({...lantern,slot:config.map.slot});
  const enemies=Object.freeze(config.enemies.map((enemy,index)=>{
    const desired=enemyAnchors[index%enemyAnchors.length];
    const spawn=nearestWalkable(map,desired,{padding:22,maxRadius:200})||desired;
    return Object.freeze({...enemy,x:spawn.x,y:spawn.y});
  }));
  return Object.freeze({...config,map,enemies});
}

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;
  style.textContent='#battleScreen canvas.bb-road-lantern-bright{filter:brightness(1.20) saturate(1.06)!important}';
  document.head.appendChild(style);
}
function currentMap(){
  try{const s=globalThis.eval('S');return s?.bbRunMode==='road'?s?.bbRoadContent?.map:null}catch{return null}
}
function syncPresentation(){
  ensureStyle();
  const canvas=document.querySelector('#battleScreen canvas');if(!canvas)return;
  const map=currentMap(),active=map?.key===LANTERN_KEY;
  canvas.classList.toggle('bb-road-lantern-bright',active);
  if(active){
    canvas.dataset.bbRoadPresentation=LANTERN_KEY;
  }else if(canvas.dataset.bbRoadPresentation===LANTERN_KEY){
    delete canvas.dataset.bbRoadPresentation;
  }
}

window.BlazingRoadContent=Object.freeze({...base,MAPS,stageConfig,mapForStage,isWalkablePoint,nearestWalkable,constrainMovementPoint});
window.BlazingRoadFeedbackFixes=Object.freeze({VERSION:'r2',key:LANTERN_KEY,movement,enemyAnchors,map:lantern,syncPresentation});
window.addEventListener('pageshow',syncPresentation);
document.addEventListener('click',()=>setTimeout(syncPresentation,0),true);
setInterval(syncPresentation,300);
setTimeout(syncPresentation,0);
})();
