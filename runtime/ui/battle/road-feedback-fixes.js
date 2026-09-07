(()=>{
'use strict';
const base=window.BlazingRoadContent;
if(!base||window.BlazingRoadFeedbackFixes)return;

const freezePoint=([x,y])=>Object.freeze({x,y});
const polygon=points=>Object.freeze({type:'polygon',points:Object.freeze(points.map(freezePoint))});
const LANTERN_KEY='lantern-garden';
const original=base.MAPS.find(map=>map.key===LANTERN_KEY);
if(!original)return;

const movement=Object.freeze({
  allowed:Object.freeze([
    polygon([[176,160],[304,160],[320,238],[342,350],[388,548],[92,548],[138,350],[160,238]])
  ]),
  blocked:original.movement?.blocked||Object.freeze([])
});
const enemyAnchors=Object.freeze([
  freezePoint([205,214]),
  freezePoint([275,228]),
  freezePoint([210,302]),
  freezePoint([290,350]),
  freezePoint([242,268])
]);
const lantern=Object.freeze({
  ...original,
  presentation:Object.freeze({scale:1.03,position:'center 48%'}),
  enemyAnchors,
  movement
});
const geomMap=Object.freeze({movement});
const MAPS=Object.freeze(base.MAPS.map(map=>map.key===LANTERN_KEY?lantern:map));

const isLantern=value=>value===LANTERN_KEY||value?.key===LANTERN_KEY;
function isWalkablePoint(mapOrKey,p,options){
  return base.isWalkablePoint(isLantern(mapOrKey)?geomMap:mapOrKey,p,options);
}
function nearestWalkable(mapOrKey,p,options){
  return base.nearestWalkable(isLantern(mapOrKey)?geomMap:mapOrKey,p,options);
}
function constrainMovementPoint(mapOrKey,destination,from,options){
  return base.constrainMovementPoint(isLantern(mapOrKey)?geomMap:mapOrKey,destination,from,options);
}
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
    const spawn=nearestWalkable(geomMap,desired,{padding:22,maxRadius:200})||desired;
    return Object.freeze({...enemy,x:spawn.x,y:spawn.y});
  }));
  return Object.freeze({...config,map,enemies});
}

window.BlazingRoadContent=Object.freeze({
  ...base,
  MAPS,
  stageConfig,
  mapForStage,
  isWalkablePoint,
  nearestWalkable,
  constrainMovementPoint
});
window.BlazingRoadFeedbackFixes=Object.freeze({
  VERSION:'r1',
  key:LANTERN_KEY,
  movement,
  enemyAnchors,
  map:lantern
});
})();
