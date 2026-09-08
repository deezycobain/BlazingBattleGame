(()=>{
'use strict';

const DEFAULT_COMBAT_SCALE=1.12;
const DEFAULT_POSITION='center 53%';
const DEFAULT_HOLD_MS=520;
const DEFAULT_TRANSITION_MS=620;
let activeKey='';
let introUntil=0;
let mode='idle';
let targetScale=1;
let targetPosition=DEFAULT_POSITION;
let currentCanvas=null;
let timer=0;
const originalStyles=new WeakMap();

function liveState(){try{return globalThis.eval('S')}catch{return null}}
function visible(el){
  if(!el)return false;
  const r=el.getBoundingClientRect();
  const style=getComputedStyle(el);
  return r.width>120&&r.height>180&&style.display!=='none'&&style.visibility!=='hidden';
}
function battleCanvas(){
  const root=document.getElementById('battleScreen');
  if(!root?.classList.contains('active'))return null;
  const game=document.getElementById('game');
  if(game instanceof HTMLCanvasElement&&root.contains(game)&&visible(game))return game;
  const canvases=[...root.querySelectorAll('canvas')].filter(visible);
  canvases.sort((a,b)=>{
    const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
    return br.width*br.height-ar.width*ar.height;
  });
  return canvases[0]||null;
}
function remember(canvas){
  if(originalStyles.has(canvas))return;
  originalStyles.set(canvas,{
    scale:canvas.style.scale,
    transform:canvas.style.transform,
    transformOrigin:canvas.style.transformOrigin,
    transition:canvas.style.transition,
    willChange:canvas.style.willChange
  });
}
function restore(canvas){
  if(!canvas)return;
  const saved=originalStyles.get(canvas);
  if(!saved)return;
  canvas.style.scale=saved.scale;
  canvas.style.transform=saved.transform;
  canvas.style.transformOrigin=saved.transformOrigin;
  canvas.style.transition=saved.transition;
  canvas.style.willChange=saved.willChange;
  originalStyles.delete(canvas);
}
function applyCamera(canvas,scale,position,transitionMs){
  if(!canvas)return;
  if(currentCanvas&&currentCanvas!==canvas)restore(currentCanvas);
  currentCanvas=canvas;
  remember(canvas);
  const value=Math.max(1,Number(scale)||1);
  canvas.style.transformOrigin=position||DEFAULT_POSITION;
  canvas.style.willChange='scale';
  if('scale' in canvas.style){
    canvas.style.transition=`scale ${Math.max(0,transitionMs)}ms cubic-bezier(.2,.72,.2,1)`;
    canvas.style.scale=String(value);
  }else{
    canvas.style.transition=`transform ${Math.max(0,transitionMs)}ms cubic-bezier(.2,.72,.2,1)`;
    canvas.style.transform=`scale(${value})`;
  }
  targetScale=value;
  targetPosition=position||DEFAULT_POSITION;
}
function fightersAlive(state){
  const units=(state?.pairs||[]).flatMap(pair=>Array.isArray(pair?.units)?pair.units:[])
    .filter(unit=>unit&&Number(unit.maxHp)>0);
  return !units.length||units.some(unit=>Number(unit.hp)>0);
}
function battleEnding(state){
  if(document.getElementById('bbMatchResults')?.classList.contains('active'))return true;
  if(state?.victoryFX)return true;
  if(Array.isArray(state?.enemies)&&state.enemies.length&&state.enemies.every(enemy=>Number(enemy.hp)<=0))return true;
  return !fightersAlive(state);
}
function mapFor(state){
  return state?.bbRoadContent?.map||window.BlazingRoadContent?.mapForStage?.(state?.bbRoadStage||1)||null;
}
function reset(){
  if(currentCanvas)restore(currentCanvas);
  currentCanvas=null;
  activeKey='';
  introUntil=0;
  mode='idle';
  targetScale=1;
  targetPosition=DEFAULT_POSITION;
}
function sync(now=performance.now()){
  const state=liveState();
  const canvas=battleCanvas();
  if(!canvas||state?.bbRunMode!=='road'){
    reset();
    return;
  }
  const map=mapFor(state);
  const presentation=map?.presentation||{};
  const stage=Math.max(1,Number(state?.bbRoadStage)||1);
  const key=`${stage}:${String(map?.key||'road')}`;
  const combatScale=Math.max(1,Number(presentation.combatScale??presentation.scale??DEFAULT_COMBAT_SCALE)||DEFAULT_COMBAT_SCALE);
  const position=String(presentation.position||DEFAULT_POSITION);
  const transitionMs=Math.max(0,Number(presentation.transitionMs)||DEFAULT_TRANSITION_MS);
  if(key!==activeKey){
    activeKey=key;
    introUntil=now+Math.max(0,Number(presentation.introHoldMs)||DEFAULT_HOLD_MS);
    mode='intro';
    applyCamera(canvas,Number(presentation.introScale)||1,position,0);
    return;
  }
  if(battleEnding(state)){
    mode='outro';
    applyCamera(canvas,Number(presentation.introScale)||1,position,transitionMs);
    return;
  }
  if(now<introUntil){
    mode='intro';
    applyCamera(canvas,Number(presentation.introScale)||1,position,0);
    return;
  }
  mode='combat';
  applyCamera(canvas,combatScale,position,transitionMs);
}
function snapshot(){
  const state=liveState();
  const map=mapFor(state);
  const rect=currentCanvas?.getBoundingClientRect?.()||null;
  return Object.freeze({
    active:!!currentCanvas,
    mode,
    stage:Number(state?.bbRoadStage)||null,
    mapKey:map?.key||null,
    introScale:Number(map?.presentation?.introScale)||1,
    combatScale:Number(map?.presentation?.combatScale??map?.presentation?.scale)||DEFAULT_COMBAT_SCALE,
    targetScale,
    position:targetPosition,
    canvasId:currentCanvas?.id||null,
    rect:rect?Object.freeze({left:rect.left,top:rect.top,width:rect.width,height:rect.height}):null
  });
}

window.BlazingRoadCamera=Object.freeze({sync:()=>sync(),snapshot,reset});
window.addEventListener('pageshow',()=>sync(),{passive:true});
window.addEventListener('resize',()=>sync(),{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
timer=window.setInterval(()=>sync(),50);
window.addEventListener('pagehide',()=>{window.clearInterval(timer);reset();},{once:true});
sync();
})();
