(()=>{
'use strict';

const ENEMY_PADDING=28;
const KEY='south-sac';
const POINTS=Object.freeze([
  // Keep combatants on the authored street plane. The skyline / bridge horizon
  // is visual depth only and must never become reachable movement space.
  Object.freeze({x:96,y:248}),Object.freeze({x:384,y:248}),
  Object.freeze({x:396,y:276}),Object.freeze({x:406,y:332}),Object.freeze({x:416,y:402}),
  Object.freeze({x:432,y:486}),Object.freeze({x:452,y:560}),
  Object.freeze({x:28,y:560}),Object.freeze({x:46,y:486}),Object.freeze({x:58,y:402}),
  Object.freeze({x:68,y:332}),Object.freeze({x:78,y:276})
]);
const ALLOWED=Object.freeze([Object.freeze({type:'polygon',points:POINTS})]);
const MOVEMENT=Object.freeze({allowed:ALLOWED,blocked:Object.freeze([])});

function correctedMap(map){
 if(!map||map.key!==KEY)return map;
 return Object.freeze({...map,movement:MOVEMENT});
}

function patch(){
 const C=window.BlazingRoadContent;
 if(!C||C.__bbSouthSacBoundary)return !!C;
 const maps=Object.freeze((C.MAPS||[]).map(correctedMap));
 const resolve=input=>typeof input==='string'?(maps.find(map=>map.key===input)||input):correctedMap(input);
 const isWalkablePoint=(map,point,opts)=>C.isWalkablePoint(resolve(map),point,opts);
 const nearestWalkable=(map,point,opts)=>C.nearestWalkable(resolve(map),point,opts);
 const constrainMovementPoint=(map,to,from,opts)=>C.constrainMovementPoint(resolve(map),to,from,opts);
 const stageConfig=value=>{
  const cfg=C.stageConfig(value),map=correctedMap(cfg.map);
  const enemies=Object.freeze((cfg.enemies||[]).map(enemy=>{
   const point=nearestWalkable(map,{x:enemy.x,y:enemy.y},{padding:ENEMY_PADDING,maxRadius:320})||{x:enemy.x,y:enemy.y};
   return Object.freeze({...enemy,x:point.x,y:point.y});
  }));
  return Object.freeze({...cfg,map,enemies});
 };
 window.BlazingRoadContent=Object.freeze({...C,__bbSouthSacBoundary:true,MAPS:maps,stageConfig,mapForStage:value=>stageConfig(value).map,isWalkablePoint,nearestWalkable,constrainMovementPoint});
 return true;
}

function boot(){
 if(patch())return;
 window.setTimeout(boot,0);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
