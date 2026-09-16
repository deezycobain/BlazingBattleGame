(()=>{
'use strict';

const FRAME_WIDTH=543;
const FRAME_HEIGHT=724;
const FRAME_COUNT=4;
const IDLE_SEQUENCE=Object.freeze([0,1,2,3,2,1]);
const ROGUE_FALLBACK_ATTACK_SEQUENCE=Object.freeze([1,2,3,2]);
const ROOT='assets/sprites/enemies';
const ALPHA_THRESHOLD=18;
const SAMPLE_STEP=2;

const DEFINITIONS=Object.freeze({
  road_rookie:Object.freeze({id:'road_rookie',displayName:'Road Rookie',attackType:'straight_punch'}),
  // The packaged Rogue attack file is byte-for-byte the Purple Scarf Kunoichi idle
  // sheet. Quarantine it until a corrected Rogue attack sheet replaces that asset so
  // the battlefield never flashes a different character mid-attack.
  rogue_kunoichi:Object.freeze({id:'rogue_kunoichi',displayName:'Rogue Kunoichi',attackType:'side_kick',attackFallback:'procedural_lunge'}),
  masked_scout:Object.freeze({id:'masked_scout',displayName:'Masked Scout',attackType:'kunai_slash'}),
  blond_rookie:Object.freeze({id:'blond_rookie',displayName:'Blond Rookie',attackType:'straight_punch'}),
  purple_scarf_kunoichi:Object.freeze({id:'purple_scarf_kunoichi',displayName:'Purple Scarf Kunoichi',attackType:'palm_strike'}),
  mist_rogue:Object.freeze({id:'mist_rogue',displayName:'Mist Rogue',attackType:'quick_strike'})
});

const records=new Map();
const metricsCache=new WeakMap();
const metricsScheduled=new WeakSet();

function resolve(value){
  if(!value)return null;
  if(DEFINITIONS[value])return DEFINITIONS[value];
  const text=String(value);
  return Object.values(DEFINITIONS).find(def=>text===def.displayName||text.startsWith(`${def.displayName} `))||null;
}

function ready(img){return !!(img&&img.complete&&img.naturalWidth>=FRAME_WIDTH*FRAME_COUNT&&img.naturalHeight>=FRAME_HEIGHT);}

function median(values){
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length)return FRAME_HEIGHT;
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
}

function analyzeSheet(img){
  if(metricsCache.has(img))return metricsCache.get(img);
  if(!ready(img))return null;
  try{
    const canvas=document.createElement('canvas');
    canvas.width=FRAME_WIDTH;
    canvas.height=FRAME_HEIGHT;
    const c=canvas.getContext('2d',{willReadFrequently:true});
    if(!c)return null;
    const frames=[];
    for(let frame=0;frame<FRAME_COUNT;frame++){
      c.clearRect(0,0,FRAME_WIDTH,FRAME_HEIGHT);
      c.drawImage(img,frame*FRAME_WIDTH,0,FRAME_WIDTH,FRAME_HEIGHT,0,0,FRAME_WIDTH,FRAME_HEIGHT);
      const pixels=c.getImageData(0,0,FRAME_WIDTH,FRAME_HEIGHT).data;
      const xCount=new Uint16Array(FRAME_WIDTH);
      const yCount=new Uint16Array(FRAME_HEIGHT);
      for(let y=0;y<FRAME_HEIGHT;y+=SAMPLE_STEP){
        const row=y*FRAME_WIDTH*4;
        for(let x=0;x<FRAME_WIDTH;x+=SAMPLE_STEP){
          if(pixels[row+x*4+3]>ALPHA_THRESHOLD){xCount[x]++;yCount[y]++;}
        }
      }
      let left=0,right=FRAME_WIDTH-1,top=0,bottom=FRAME_HEIGHT-1;
      const occupiedX=i=>xCount[i]>=2;
      const occupiedY=i=>yCount[i]>=2;
      while(left<FRAME_WIDTH&&!occupiedX(left))left+=SAMPLE_STEP;
      while(right>0&&!occupiedX(right))right-=SAMPLE_STEP;
      while(top<FRAME_HEIGHT&&!occupiedY(top))top+=SAMPLE_STEP;
      while(bottom>0&&!occupiedY(bottom))bottom-=SAMPLE_STEP;
      if(left>=right||top>=bottom){left=0;right=FRAME_WIDTH-1;top=0;bottom=FRAME_HEIGHT-1;}
      left=Math.max(0,left-2);right=Math.min(FRAME_WIDTH-1,right+2);
      top=Math.max(0,top-2);bottom=Math.min(FRAME_HEIGHT-1,bottom+2);
      const width=Math.max(1,right-left+1),height=Math.max(1,bottom-top+1);
      frames.push({left,right,top,bottom,width,height,centerX:(left+right+1)/2});
    }
    const result={frames,medianHeight:median(frames.map(frame=>frame.height))};
    metricsCache.set(img,result);
    return result;
  }catch(_){
    metricsCache.set(img,false);
    return null;
  }
}

function scheduleAnalysis(img){
  if(!img||metricsScheduled.has(img))return;
  metricsScheduled.add(img);
  const run=()=>{if(ready(img))analyzeSheet(img);};
  if(ready(img)){
    if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:450});
    else setTimeout(run,0);
  }else{
    img.addEventListener('load',()=>{
      if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:450});
      else setTimeout(run,0);
    },{once:true});
  }
}

function createImage(src){
  const img=new Image();
  img.decoding='async';
  img.src=src;
  scheduleAnalysis(img);
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

function attackProgress(attackState){
  const duration=Math.max(1,Number(attackState?.duration)||400);
  const elapsed=Math.max(0,performance.now()-Number(attackState?.start||0));
  return Math.max(0,Math.min(.9999,elapsed/duration));
}

function attackFrame(progress){
  // Give the readable contact pose a little more screen time instead of flashing
  // evenly through four generated frames.
  if(progress<.22)return 0;
  if(progress<.47)return 1;
  if(progress<.72)return 2;
  return 3;
}

function frameIndex(attackState,idlePhase=0){
  if(attackState)return attackFrame(attackProgress(attackState));
  const offset=(Number(idlePhase)||0)*7;
  const step=Math.floor((performance.now()+offset)/200)%IDLE_SEQUENCE.length;
  return IDLE_SEQUENCE[step];
}

function drawNormalizedFrame(ctx,sheet,frame,renderHeight){
  const baseScale=renderHeight/FRAME_HEIGHT;
  const metrics=metricsCache.get(sheet)||analyzeSheet(sheet);
  const info=metrics&&metrics.frames?.[frame];
  if(!info){
    const w=renderHeight*(FRAME_WIDTH/FRAME_HEIGHT);
    ctx.drawImage(sheet,frame*FRAME_WIDTH,0,FRAME_WIDTH,FRAME_HEIGHT,-w/2,-renderHeight+12,w,renderHeight);
    return;
  }

  // Generated sheets can carry slightly different transparent margins from frame to
  // frame. Anchor the visible silhouette to one feet baseline and mostly to its own
  // center so attacks do not "teleport" a few pixels as the source rectangle changes.
  const heightCorrection=Math.max(.96,Math.min(1.04,metrics.medianHeight/info.height));
  const scale=baseScale*heightCorrection;
  const authoredCenter=FRAME_WIDTH/2;
  const anchorX=info.centerX*.82+authoredCenter*.18;
  const dx=-(anchorX-info.left)*scale;
  const dy=12-info.height*scale;
  ctx.drawImage(
    sheet,
    frame*FRAME_WIDTH+info.left,info.top,info.width,info.height,
    dx,dy,info.width*scale,info.height*scale
  );
}

function drawRogueFallbackAttack(ctx,record,attackState,renderHeight){
  if(!ready(record.idle))return false;
  const progress=attackProgress(attackState);
  const phase=attackFrame(progress);
  const frame=ROGUE_FALLBACK_ATTACK_SEQUENCE[phase];
  // Preserve the Rogue art while still giving the attack a readable wind-up/lunge/
  // recovery beat. Caller-facing transforms make +X travel toward the target.
  const thrust=Math.sin(Math.PI*progress);
  const contact=Math.sin(Math.PI*Math.min(1,progress/.72));
  ctx.save();
  ctx.translate(5.5*thrust,-1.25*contact);
  ctx.rotate(-.025*thrust);
  drawNormalizedFrame(ctx,record.idle,frame,renderHeight);
  ctx.restore();
  return true;
}

function draw(ctx,name,{attackState=null,idlePhase=0,sizeScale=1,unitRenderScale=1}={}){
  const record=ensure(name);
  if(!record)return false;
  const h=62*(Number(sizeScale)||1)*(Number(unitRenderScale)||1);
  ctx.imageSmoothingEnabled=true;

  if(attackState&&record.def.attackFallback==='procedural_lunge'){
    return drawRogueFallbackAttack(ctx,record,attackState,h);
  }

  const sheet=attackState?record.attack:record.idle;
  if(!ready(sheet))return false;
  const frame=frameIndex(attackState,idlePhase);
  drawNormalizedFrame(ctx,sheet,frame,h);
  return true;
}

window.BlazingBasicEnemySprites=Object.freeze({
  DEFINITIONS,FRAME_WIDTH,FRAME_HEIGHT,FRAME_COUNT,resolve,preload,preloadMany,draw
});
})();
