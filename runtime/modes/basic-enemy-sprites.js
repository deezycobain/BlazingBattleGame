(()=>{
'use strict';

const FRAME_WIDTH=543;
const FRAME_HEIGHT=724;
const FRAME_COUNT=4;
const IDLE_SEQUENCE=Object.freeze([0,1,2,3,2,1]);
const ROOT='assets/sprites/enemies';

const DEFINITIONS=Object.freeze({
  road_rookie:Object.freeze({id:'road_rookie',displayName:'Road Rookie',attackType:'straight_punch'}),
  rogue_kunoichi:Object.freeze({id:'rogue_kunoichi',displayName:'Rogue Kunoichi',attackType:'side_kick'}),
  masked_scout:Object.freeze({id:'masked_scout',displayName:'Masked Scout',attackType:'kunai_slash'}),
  blond_rookie:Object.freeze({id:'blond_rookie',displayName:'Blond Rookie',attackType:'straight_punch'}),
  purple_scarf_kunoichi:Object.freeze({id:'purple_scarf_kunoichi',displayName:'Purple Scarf Kunoichi',attackType:'palm_strike'}),
  mist_rogue:Object.freeze({id:'mist_rogue',displayName:'Mist Rogue',attackType:'quick_strike'})
});

const records=new Map();

function resolve(value){
  if(!value)return null;
  if(DEFINITIONS[value])return DEFINITIONS[value];
  const text=String(value);
  return Object.values(DEFINITIONS).find(def=>text===def.displayName||text.startsWith(`${def.displayName} `))||null;
}

function createImage(src){
  const img=new Image();
  img.decoding='async';
  img.src=src;
  return img;
}

function ensure(value){
  const def=resolve(value);
  if(!def)return null;
  let record=records.get(def.id);
  if(record)return record;
  const base=`${ROOT}/${def.id}/${def.id}`;
  record={
    def,
    idle:createImage(`${base}_idle.png`),
    attack:createImage(`${base}_attack.png`)
  };
  records.set(def.id,record);
  return record;
}

function preload(value){return !!ensure(value);}
function preloadMany(values){for(const value of values||[])ensure(value);}

function ready(img){return !!(img&&img.complete&&img.naturalWidth>=FRAME_WIDTH*FRAME_COUNT&&img.naturalHeight>=FRAME_HEIGHT);}

function frameIndex(attackState,idlePhase=0){
  if(attackState){
    const duration=Math.max(1,Number(attackState.duration)||400);
    const elapsed=Math.max(0,performance.now()-Number(attackState.start||0));
    const progress=Math.max(0,Math.min(.9999,elapsed/duration));
    return Math.min(FRAME_COUNT-1,Math.floor(progress*FRAME_COUNT));
  }
  const offset=(Number(idlePhase)||0)*7;
  const step=Math.floor((performance.now()+offset)/200)%IDLE_SEQUENCE.length;
  return IDLE_SEQUENCE[step];
}

function draw(ctx,name,{attackState=null,idlePhase=0,sizeScale=1,unitRenderScale=1}={}){
  const record=ensure(name);
  if(!record)return false;
  const sheet=attackState?record.attack:record.idle;
  if(!ready(sheet))return false;
  const frame=frameIndex(attackState,idlePhase);
  const h=62*(Number(sizeScale)||1)*(Number(unitRenderScale)||1);
  const w=h*(FRAME_WIDTH/FRAME_HEIGHT);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(sheet,frame*FRAME_WIDTH,0,FRAME_WIDTH,FRAME_HEIGHT,-w/2,-h+12,w,h);
  return true;
}

window.BlazingBasicEnemySprites=Object.freeze({
  DEFINITIONS,FRAME_WIDTH,FRAME_HEIGHT,FRAME_COUNT,resolve,preload,preloadMany,draw
});
})();
