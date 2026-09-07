(()=>{
'use strict';

const params=new URLSearchParams(location.search);
const terrainMode=String(params.get('terrain')||'').toLowerCase();
const drawMode=terrainMode==='draw'||terrainMode==='author';
const enabled=terrainMode==='1'||drawMode||params.get('terrainDebug')==='1'||localStorage.getItem('bbTerrainDebug')==='1';
if(!enabled)return;

const OVERLAY_ID='bbRoadTerrainDebugOverlay';
const TOOLS_ID='bbRoadTerrainDebugTools';
const LOGICAL_W=480;
const LOGICAL_H=640;
let drawing=false;
let activePointer=null;
let draftKey='';
let draft=[];

function liveState(){try{return globalThis.eval('S')}catch{return null}}
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
    const s=liveState();
    if(document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'&&s?.bbRoadContent?.map)return s.bbRoadContent.map;
    const run=window.BlazingRoadRun?.loadRun?.();
    const stage=Math.max(1,Number(run?.stage)||1);
    return content.mapForStage?.(stage)||content.MAPS?.[(stage-1)%content.MAPS.length]||null;
  }catch(_){
    return content.MAPS?.[0]||null;
  }
}

function storageKey(map){return `bbTerrainDraft:${String(map?.key||'road')}`}
function loadDraft(map){
  const key=storageKey(map);if(key===draftKey)return;
  draftKey=key;
  try{
    const parsed=JSON.parse(localStorage.getItem(key)||'[]');
    draft=Array.isArray(parsed)?parsed.filter(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)).map(p=>({x:Number(p.x),y:Number(p.y)})):[];
  }catch(_){draft=[]}
}
function saveDraft(){try{localStorage.setItem(draftKey,JSON.stringify(draft))}catch(_){}}

function ensureOverlay(){
  let canvas=document.getElementById(OVERLAY_ID);
  if(canvas)return canvas;
  canvas=document.createElement('canvas');
  canvas.id=OVERLAY_ID;
  canvas.width=LOGICAL_W;
  canvas.height=LOGICAL_H;
  Object.assign(canvas.style,{
    position:'fixed',
    pointerEvents:drawMode?'auto':'none',
    touchAction:drawMode?'none':'auto',
    cursor:drawMode?'crosshair':'default',
    zIndex:'9990',
    display:'none'
  });
  if(drawMode){
    canvas.addEventListener('pointerdown',event=>{
      const p=logicalPoint(event,canvas);if(!p)return;
      drawing=true;activePointer=event.pointerId;canvas.setPointerCapture?.(event.pointerId);
      if(!draft.length||Math.hypot(p.x-draft[draft.length-1].x,p.y-draft[draft.length-1].y)>4)draft.push(p);
      saveDraft();schedule();event.preventDefault();
    });
    canvas.addEventListener('pointermove',event=>{
      if(!drawing||event.pointerId!==activePointer)return;
      const p=logicalPoint(event,canvas);if(!p)return;
      const last=draft[draft.length-1];
      if(!last||Math.hypot(p.x-last.x,p.y-last.y)>=10){draft.push(p);saveDraft();schedule();}
      event.preventDefault();
    });
    const end=event=>{if(event.pointerId!==activePointer)return;drawing=false;activePointer=null;saveDraft();schedule();event.preventDefault();};
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  }
  document.body.appendChild(canvas);
  return canvas;
}

function ensureTools(){
  if(!drawMode)return null;
  let tools=document.getElementById(TOOLS_ID);if(tools)return tools;
  tools=document.createElement('div');tools.id=TOOLS_ID;
  Object.assign(tools.style,{position:'fixed',zIndex:'9992',display:'none',gap:'5px',alignItems:'center',padding:'5px',borderRadius:'7px',background:'rgba(7,9,12,.86)',border:'1px solid rgba(255,210,78,.35)',font:'700 9px ui-monospace, SFMono-Regular, Menlo, monospace',color:'#fff',boxShadow:'0 5px 18px rgba(0,0,0,.35)'});
  tools.innerHTML='<button type="button" data-terrain-tool="clear">CLEAR</button><button type="button" data-terrain-tool="copy">COPY POINTS</button><span data-terrain-count>0 PTS</span>';
  for(const button of tools.querySelectorAll('button'))Object.assign(button.style,{border:'1px solid rgba(255,255,255,.18)',borderRadius:'4px',background:'rgba(255,255,255,.08)',color:'#fff',padding:'5px 7px',font:'inherit'});
  tools.addEventListener('click',async event=>{
    const action=event.target.closest('[data-terrain-tool]')?.dataset.terrainTool;if(!action)return;
    if(action==='clear'){draft=[];saveDraft();schedule();}
    if(action==='copy'){
      const text=`polygon(${draft.map(p=>`[${Math.round(p.x)},${Math.round(p.y)}]`).join(',')})`;
      try{await navigator.clipboard.writeText(text);event.target.textContent='COPIED';setTimeout(()=>event.target.textContent='COPY POINTS',900);}catch(_){window.prompt('Copy playable polygon points',text)}
    }
  });
  document.body.appendChild(tools);return tools;
}

function logicalPoint(event,canvas){
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return null;
  return {x:Math.max(0,Math.min(LOGICAL_W,(event.clientX-r.left)/r.width*LOGICAL_W)),y:Math.max(0,Math.min(LOGICAL_H,(event.clientY-r.top)/r.height*LOGICAL_H))};
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
  if(shape.type==='rect'){ctx.rect(shape.x,shape.y,shape.w,shape.h);return true;}
  if(shape.type==='ellipse'){ctx.ellipse(shape.x,shape.y,shape.rx,shape.ry,0,0,Math.PI*2);return true;}
  return false;
}

function paintShapes(ctx,shapes,fill,stroke){
  for(const shape of shapes||[]){
    if(!pathShape(ctx,shape))continue;
    ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();
  }
}
function paintDraft(ctx){
  if(!drawMode||!draft.length)return;
  ctx.beginPath();ctx.moveTo(draft[0].x,draft[0].y);
  for(let i=1;i<draft.length;i++)ctx.lineTo(draft[i].x,draft[i].y);
  if(draft.length>=3){ctx.closePath();ctx.fillStyle='rgba(255,214,62,.12)';ctx.fill();}
  ctx.strokeStyle='#ffe04f';ctx.lineWidth=4;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  for(let i=0;i<draft.length;i+=Math.max(1,Math.floor(draft.length/18))){const p=draft[i];ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle='#fff4a4';ctx.fill();}
}

function draw(){
  const source=battleCanvas();
  const overlay=ensureOverlay();
  const tools=ensureTools();
  if(!source||!visible(source)){
    overlay.style.display='none';if(tools)tools.style.display='none';return;
  }
  const map=currentMap();
  if(!map){overlay.style.display='none';if(tools)tools.style.display='none';return;}
  loadDraft(map);
  const r=source.getBoundingClientRect();
  overlay.style.display='block';overlay.style.left=`${r.left}px`;overlay.style.top=`${r.top}px`;overlay.style.width=`${r.width}px`;overlay.style.height=`${r.height}px`;
  if(tools){tools.style.display='flex';tools.style.left=`${Math.max(6,r.left+8)}px`;tools.style.top=`${Math.max(6,r.top+36)}px`;const count=tools.querySelector('[data-terrain-count]');if(count)count.textContent=`${draft.length} PTS`;}

  const ctx=overlay.getContext('2d');ctx.clearRect(0,0,LOGICAL_W,LOGICAL_H);ctx.save();
  paintShapes(ctx,map.movement?.allowed,drawMode?'rgba(53,255,151,.07)':'rgba(53,255,151,.14)',drawMode?'rgba(70,255,164,.45)':'rgba(70,255,164,.94)');
  paintShapes(ctx,map.movement?.blocked,drawMode?'rgba(255,64,78,.06)':'rgba(255,64,78,.14)',drawMode?'rgba(255,76,90,.4)':'rgba(255,76,90,.92)');

  for(const anchor of map.enemyAnchors||[]){
    ctx.beginPath();ctx.arc(anchor.x,anchor.y,5,0,Math.PI*2);ctx.fillStyle='rgba(255,196,63,.95)';ctx.fill();ctx.strokeStyle='rgba(25,20,12,.9)';ctx.lineWidth=1.5;ctx.stroke();
  }
  paintDraft(ctx);

  ctx.font='700 11px ui-monospace, SFMono-Regular, Menlo, monospace';ctx.textBaseline='top';
  const label=`${drawMode?'DRAW PLAYABLE FLOOR':'TERRAIN DEBUG'} · ${String(map.name||map.key||'ROAD').toUpperCase()}`;
  const w=Math.ceil(ctx.measureText(label).width)+14;ctx.fillStyle='rgba(8,10,12,.82)';ctx.fillRect(8,8,w,22);ctx.fillStyle='#f4f0df';ctx.fillText(label,15,13);
  if(drawMode){ctx.font='700 8px ui-monospace, SFMono-Regular, Menlo, monospace';ctx.fillStyle='rgba(8,10,12,.76)';ctx.fillRect(8,610,224,20);ctx.fillStyle='#ffe88a';ctx.fillText('DRAG AROUND THE OUTER PLAYABLE EDGE',14,616);}
  ctx.restore();
}

let raf=0;
function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;draw();});}
window.addEventListener('resize',schedule,{passive:true});
window.addEventListener('pageshow',schedule);
window.addEventListener('bb:road-reset-restored',schedule);
document.addEventListener('visibilitychange',schedule);
const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
const timer=setInterval(schedule,350);

window.BlazingTerrainDebug=Object.freeze({
  enabled:true,drawMode,redraw:schedule,
  draft(){return draft.map(p=>({x:p.x,y:p.y}))},
  clear(){draft=[];saveDraft();schedule()},
  disable(){clearInterval(timer);observer.disconnect();document.getElementById(OVERLAY_ID)?.remove();document.getElementById(TOOLS_ID)?.remove();}
});

schedule();
})();
