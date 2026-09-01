import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const id='bb-desktop-battle-input';
const existing=new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`,'i');
html=html.replace(existing,'');

const runtime=`<script id="${id}">(()=>{
'use strict';
// Pointer-native desktop compatibility. The battle itself listens for PointerEvents;
// this bridge only retargets mouse pointers when a visible DOM layer sits above #game.
// Native canvas mouse input, touch, and pen input remain untouched.
let activeCanvas=null;
let bridgedPointerId=4242;
const interactive=target=>!!target?.closest?.('button,a,input,select,textarea,[role="button"]');
const inside=(rect,x,y)=>x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;
function visibleBattleCanvas(){
 const game=document.getElementById('game');
 if(game instanceof HTMLCanvasElement){
  const rect=game.getBoundingClientRect(),style=getComputedStyle(game);
  if(rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden')return game;
 }
 const candidates=[...document.querySelectorAll('canvas')].filter(canvas=>{
  const rect=canvas.getBoundingClientRect(),style=getComputedStyle(canvas);
  return rect.width>=200&&rect.height>=150&&style.display!=='none'&&style.visibility!=='hidden';
 });
 candidates.sort((a,b)=>{
  const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
  return br.width*br.height-ar.width*ar.height;
 });
 return candidates[0]||null;
}
function dispatchPointer(type,source,target){
 const ended=type==='pointerup'||type==='pointercancel';
 const init={
  bubbles:true,cancelable:true,composed:true,
  pointerId:bridgedPointerId,pointerType:'mouse',isPrimary:true,
  width:1,height:1,pressure:ended?0:.5,
  button:source.button??0,buttons:ended?0:(source.buttons||1),
  clientX:source.clientX,clientY:source.clientY,
  screenX:source.screenX??0,screenY:source.screenY??0,
  ctrlKey:!!source.ctrlKey,shiftKey:!!source.shiftKey,
  altKey:!!source.altKey,metaKey:!!source.metaKey
 };
 let event;
 try{event=new PointerEvent(type,init);}
 catch(_){
  event=new MouseEvent(type,init);
  Object.defineProperties(event,{
   pointerId:{value:bridgedPointerId},
   pointerType:{value:'mouse'},
   isPrimary:{value:true},
   pressure:{value:init.pressure}
  });
 }
 try{Object.defineProperty(event,'__bbMouseBridge',{value:true});}catch(_){}
 target.dispatchEvent(event);
}
document.addEventListener('pointerdown',event=>{
 if(event.__bbMouseBridge||event.pointerType!=='mouse'||event.button!==0)return;
 if(interactive(event.target))return;
 const canvas=visibleBattleCanvas();
 if(!canvas)return;
 const rect=canvas.getBoundingClientRect();
 if(!inside(rect,event.clientX,event.clientY))return;
 activeCanvas=canvas;
 if(event.target===canvas)return;
 bridgedPointerId++;
 event.preventDefault();
 dispatchPointer('pointerdown',event,canvas);
},true);
document.addEventListener('pointermove',event=>{
 if(event.__bbMouseBridge||event.pointerType!=='mouse'||!activeCanvas)return;
 if((event.buttons&1)===0){
  dispatchPointer('pointerup',event,activeCanvas);
  activeCanvas=null;
  return;
 }
 if(event.target===activeCanvas)return;
 event.preventDefault();
 dispatchPointer('pointermove',event,activeCanvas);
},true);
document.addEventListener('pointerup',event=>{
 if(event.__bbMouseBridge||event.pointerType!=='mouse'||event.button!==0||!activeCanvas)return;
 const canvas=activeCanvas;
 activeCanvas=null;
 if(event.target===canvas)return;
 event.preventDefault();
 dispatchPointer('pointerup',event,canvas);
},true);
document.addEventListener('pointercancel',event=>{
 if(event.__bbMouseBridge||event.pointerType!=='mouse'||!activeCanvas)return;
 const canvas=activeCanvas;
 activeCanvas=null;
 dispatchPointer('pointercancel',event,canvas);
},true);
})();</script>`;

const at=html.toLowerCase().lastIndexOf('</body>');
if(at<0)throw new Error('Browser mouse input: closing body not found');
html=html.slice(0,at)+runtime+html.slice(at);
if((html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length!==1)throw new Error('Browser mouse input: adapter injection was not unique');
for(const marker of ["cvs.addEventListener('pointerdown'","cvs.addEventListener('pointermove'","cvs.addEventListener('pointerup'"]){
 if(!html.includes(marker))throw new Error(`Browser mouse input: native battle pointer listener missing: ${marker}`);
}
await fs.writeFile(file,html);
console.log('Desktop browser input applied: mouse PointerEvents route to the battle canvas; native canvas mouse, touch, and pen remain unchanged.');
