(()=>{
'use strict';

const params=new URLSearchParams(location.search);
const enabled=params.get('terrain')==='1'||params.get('terrainDebug')==='1'||localStorage.getItem('bbTerrainDebug')==='1';
if(!enabled)return;

const OVERLAY_ID='bbRoadTerrainDebugOverlay';
const LOGICAL_W=480;
const LOGICAL_H=640;

function battleCanvas(){
  const root=document.getElementById('battleScreen');
  if(!root)return null;
  const canvases=[...root.querySelectorAll('canvas')].filter(canvas=>{
    const r=canvas.getBoundingClientRect();
    return r.width>120&&r.height>180;
  });
  if(!canvases.length)return null;
  return canvases.sort((a,b)=>{
    const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
    return br.width*br.height-ar.width*ar.height;
  })[0];
}

function currentMap(){
  const content=window.BlazingRoadContent;
  if(!content)return null;
  try{
    const run=window.BlazingRoadRun?.loadRun?.();
    const stage=Math.max(1,Number(run?.stage)||1);
    return content.mapForStage?.(stage)||content.MAPS?.[(stage-1)%content.MAPS.length]||null;
  }catch(_){
    return content.MAPS?.[0]||null;
  }
}

function ensureOverlay(){
  let canvas=document.getElementById(OVERLAY_ID);
  if(canvas)return canvas;
  canvas=document.createElement('canvas');
  canvas.id=OVERLAY_ID;
  canvas.width=LOGICAL_W;
  canvas.height=LOGICAL_H;
  Object.assign(canvas.style,{
    position:'fixed',
    pointerEvents:'none',
    zIndex:'9990',
    display:'none'
  });
  document.body.appendChild(canvas);
  return canvas;
}

function visible(el){
  if(!el)return false;
  const r=el.getBoundingClientRect();
  const style=getComputedStyle(el);
  return r.width>0&&r.height>0&&style.display!=='none'&&style.visibility!=='hidden';
}

function pathShape(ctx,shape){
  if(!shape)return false;
  ctx.beginPath();
  if(shape.type==='polygon'){
    const points=shape.points||[];
    if(points.length<3)return false;
    ctx.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
    ctx.closePath();
    return true;
  }
  if(shape.type==='rect'){
    ctx.rect(shape.x,shape.y,shape.w,shape.h);
    return true;
  }
  if(shape.type==='ellipse'){
    ctx.ellipse(shape.x,shape.y,shape.rx,shape.ry,0,0,Math.PI*2);
    return true;
  }
  return false;
}

function paintShapes(ctx,shapes,fill,stroke){
  for(const shape of shapes||[]){
    if(!pathShape(ctx,shape))continue;
    ctx.fillStyle=fill;
    ctx.fill();
    ctx.strokeStyle=stroke;
    ctx.lineWidth=2;
    ctx.stroke();
  }
}

function draw(){
  const source=battleCanvas();
  const overlay=ensureOverlay();
  if(!source||!visible(source)){
    overlay.style.display='none';
    return;
  }
  const map=currentMap();
  if(!map){
    overlay.style.display='none';
    return;
  }
  const r=source.getBoundingClientRect();
  overlay.style.display='block';
  overlay.style.left=`${r.left}px`;
  overlay.style.top=`${r.top}px`;
  overlay.style.width=`${r.width}px`;
  overlay.style.height=`${r.height}px`;

  const ctx=overlay.getContext('2d');
  ctx.clearRect(0,0,LOGICAL_W,LOGICAL_H);
  ctx.save();
  paintShapes(ctx,map.movement?.allowed,'rgba(53,255,151,.14)','rgba(70,255,164,.94)');
  paintShapes(ctx,map.movement?.blocked,'rgba(255,64,78,.14)','rgba(255,76,90,.92)');

  for(const anchor of map.enemyAnchors||[]){
    ctx.beginPath();
    ctx.arc(anchor.x,anchor.y,5,0,Math.PI*2);
    ctx.fillStyle='rgba(255,196,63,.95)';
    ctx.fill();
    ctx.strokeStyle='rgba(25,20,12,.9)';
    ctx.lineWidth=1.5;
    ctx.stroke();
  }

  ctx.font='700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline='top';
  const label=`TERRAIN DEBUG · ${String(map.name||map.key||'ROAD').toUpperCase()}`;
  const w=Math.ceil(ctx.measureText(label).width)+14;
  ctx.fillStyle='rgba(8,10,12,.78)';
  ctx.fillRect(8,8,w,22);
  ctx.fillStyle='#f4f0df';
  ctx.fillText(label,15,13);
  ctx.restore();
}

let raf=0;
function schedule(){
  if(raf)return;
  raf=requestAnimationFrame(()=>{raf=0;draw();});
}

window.addEventListener('resize',schedule,{passive:true});
window.addEventListener('pageshow',schedule);
document.addEventListener('visibilitychange',schedule);
const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
const timer=setInterval(schedule,350);

window.BlazingTerrainDebug=Object.freeze({
  enabled:true,
  redraw:schedule,
  disable(){
    clearInterval(timer);
    observer.disconnect();
    document.getElementById(OVERLAY_ID)?.remove();
  }
});

schedule();
})();
