import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const id='bb-desktop-battle-input';
const existing=new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`,'i');
html=html.replace(existing,'');

for(const marker of [
  "cvs.addEventListener('pointerdown'",
  "cvs.addEventListener('pointermove'",
  "cvs.addEventListener('pointerup'",
  "cvs.addEventListener('pointercancel'"
])if(!html.includes(marker))throw new Error(`Browser mouse input: native battle pointer listener missing: ${marker}`);

// Keep the phone/tablet pickup radius exactly as-is. Battle coordinates use the fighter's
// feet as the anchor, so a desktop circle still misses much of a tall visible sprite. Give
// mouse users a body-shaped pickup box extending upward from the feet, plus a small anchor
// circle, so clicking anywhere on the active fighter starts the same native drag path.
const original=" if(!p||!pairAlive(p)||d(pt,p)>UNIT_TOUCH_RADIUS)return;";
const patched=" const desktopPointer=ev.pointerType==='mouse'||(!ev.pointerType&&ev instanceof MouseEvent);\n const mouseBodyHit=desktopPointer&&p&&Math.abs(pt.x-p.x)<=96&&pt.y>=p.y-220&&pt.y<=p.y+52;\n const inputRadius=desktopPointer?Math.max(UNIT_TOUCH_RADIUS,118):UNIT_TOUCH_RADIUS;\n if(!p||!pairAlive(p)||(!mouseBodyHit&&d(pt,p)>inputRadius))return;";
const sourceCount=html.split(original).length-1,targetCount=html.split(patched).length-1;
if(sourceCount===1)html=html.replace(original,patched);
else if(sourceCount===0&&targetCount===1){}
else throw new Error(`Browser mouse input: expected one pointerdown hit-test, found source=${sourceCount}, target=${targetCount}`);

// Some desktop layouts place non-interactive DOM presentation layers above #game. When a
// mouse PointerEvent lands on one of those layers, retarget it to the visible battle canvas.
// Buttons/links/form controls are never bridged. Touch and pen are never bridged.
const runtime=`<script id="${id}">(()=>{
'use strict';
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
 bridgedPointerId++;
 event.preventDefault();
 event.stopImmediatePropagation();
 dispatchPointer('pointerdown',event,canvas);
},true);
document.addEventListener('pointermove',event=>{
 if(event.__bbMouseBridge||event.pointerType!=='mouse'||!activeCanvas)return;
 if((event.buttons&1)===0){
  dispatchPointer('pointerup',event,activeCanvas);
  activeCanvas=null;
  return;
 }
 event.preventDefault();
 event.stopImmediatePropagation();
 dispatchPointer('pointermove',event,activeCanvas);
},true);
document.addEventListener('pointerup',event=>{
 if(event.__bbMouseBridge||event.pointerType!=='mouse'||event.button!==0||!activeCanvas)return;
 const canvas=activeCanvas;
 activeCanvas=null;
 event.preventDefault();
 event.stopImmediatePropagation();
 dispatchPointer('pointerup',event,canvas);
},true);
document.addEventListener('pointercancel',event=>{
 if(event.__bbMouseBridge||event.pointerType!=='mouse'||!activeCanvas)return;
 const canvas=activeCanvas;
 activeCanvas=null;
 event.stopImmediatePropagation();
 dispatchPointer('pointercancel',event,canvas);
},true);
})();</script>`;

const at=html.toLowerCase().lastIndexOf('</body>');
if(at<0)throw new Error('Browser mouse input: closing body not found');
html=html.slice(0,at)+runtime+html.slice(at);

if((html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length!==1)throw new Error('Browser mouse input: desktop pointer bridge injection was not unique');
if(!html.includes("Math.abs(pt.x-p.x)<=96&&pt.y>=p.y-220&&pt.y<=p.y+52"))throw new Error('Browser mouse input: desktop body pickup patch missing');

// Preserve the exact point grabbed on the visible sprite. Without this offset, grabbing a
// torso teleports the fighter's foot anchor to the cursor and makes desktop movement feel
// delayed and inaccurate. Consume the newest coalesced mouse sample when the browser has one.
const downAnchor=" S.dragOrigin={x:p.x,y:p.y};\n S.dragVisual={scale:1.0,rot:0,lift:0,lastX:pt.x,lastY:pt.y,targetScale:1.34,targetLift:17};";
const downPatched=" S.dragOrigin={x:p.x,y:p.y};\n S.dragGrabOffset={x:p.x-pt.x,y:p.y-pt.y};\n S.dragVisual={scale:1.0,rot:0,lift:0,lastX:pt.x,lastY:pt.y,targetScale:1.34,targetLift:17};";
if(html.includes(downAnchor))html=html.replace(downAnchor,downPatched);
else if(!html.includes('S.dragGrabOffset={x:p.x-pt.x,y:p.y-pt.y};'))throw new Error('Browser mouse input: grab offset anchor missing');

const moveAnchor=" let p=S.ready.ref,pt=inputPoint(ev),v=S.dragVisual;";
const movePatched=" const samples=ev.getCoalescedEvents?.();\n const latest=samples?.length?samples[samples.length-1]:ev;\n let p=S.ready.ref,pt=inputPoint(latest),v=S.dragVisual;";
if(html.includes(moveAnchor))html=html.replace(moveAnchor,movePatched);
else if(!html.includes('const latest=samples?.length?samples[samples.length-1]:ev;'))throw new Error('Browser mouse input: latest pointer sample anchor missing');

const legalAnchor=" let legal=clampToBattlefield(pt);";
const legalPatched=" const grab=S.dragGrabOffset||{x:0,y:0};\n let legal=clampToBattlefield({x:pt.x+grab.x,y:pt.y+grab.y});";
if(html.includes(legalAnchor))html=html.replace(legalAnchor,legalPatched);
else if(!html.includes('x:pt.x+grab.x,y:pt.y+grab.y'))throw new Error('Browser mouse input: offset movement anchor missing');

html=html.replaceAll('S.dragVisual=null;S.dragOrigin=null;','S.dragVisual=null;S.dragOrigin=null;S.dragGrabOffset=null;');
const releaseAnchor=" S.drag=false;\n try{if(cvs.hasPointerCapture?.(ev.pointerId))cvs.releasePointerCapture(ev.pointerId)}catch(_e){}";
const releasePatched=" S.drag=false;\n S.dragGrabOffset=null;\n try{if(cvs.hasPointerCapture?.(ev.pointerId))cvs.releasePointerCapture(ev.pointerId)}catch(_e){}";
if(html.includes(releaseAnchor))html=html.replace(releaseAnchor,releasePatched);
else if(!html.includes('S.drag=false;\n S.dragGrabOffset=null;'))throw new Error('Browser mouse input: release cleanup anchor missing');
if(html.includes('new TouchEvent(')||html.includes("dispatchTouch('touchstart'"))throw new Error('Browser mouse input: obsolete mouse-to-touch adapter survived');

await fs.writeFile(file,html);
console.log('Desktop browser input applied: full visible fighter body is mouse-pickable, grab offset is preserved, latest pointer samples drive movement, and touch/pen remain unchanged.');
