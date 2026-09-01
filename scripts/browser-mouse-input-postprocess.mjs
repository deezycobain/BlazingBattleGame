import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const id='bb-desktop-battle-input';
const existing=new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`,'i');
html=html.replace(existing,'');

const runtime=`<script id="${id}">(()=>{
'use strict';
// Desktop compatibility only: preserve the game's native touch path and translate
// left-mouse canvas gestures into the same touchstart/move/end sequence.
let activeTarget=null;
let active=false;
let recentRealTouch=0;
let identifier=9001;
const now=()=>Date.now();
const isCanvas=target=>target instanceof HTMLCanvasElement;
const list=items=>{const out=Array.from(items);Object.defineProperty(out,'item',{value:i=>out[i]||null,enumerable:false});return out;};
function pointFromMouse(mouse,target,ended=false){
  const init={identifier,target,screenX:mouse.screenX,screenY:mouse.screenY,clientX:mouse.clientX,clientY:mouse.clientY,pageX:mouse.pageX,pageY:mouse.pageY,radiusX:1,radiusY:1,rotationAngle:0,force:ended?0:.5};
  try{if(typeof Touch==='function')return new Touch(init);}catch(_){}
  return init;
}
function dispatchTouch(type,mouse,target){
  const ended=type==='touchend'||type==='touchcancel';
  const point=pointFromMouse(mouse,target,ended);
  const touches=list(ended?[]:[point]);
  const changed=list([point]);
  let event;
  try{
    event=new TouchEvent(type,{bubbles:true,cancelable:true,composed:true,touches,targetTouches:touches,changedTouches:changed});
  }catch(_){
    event=new Event(type,{bubbles:true,cancelable:true,composed:true});
    Object.defineProperties(event,{touches:{value:touches},targetTouches:{value:touches},changedTouches:{value:changed}});
  }
  try{Object.defineProperty(event,'__bbMouseShim',{value:true});}catch(_){}
  target.dispatchEvent(event);
  return event;
}
function finish(mouse,type='touchend'){
  if(!active||!activeTarget)return;
  const target=activeTarget;
  active=false;activeTarget=null;
  dispatchTouch(type,mouse,target);
}
document.addEventListener('touchstart',event=>{if(!event.__bbMouseShim)recentRealTouch=now();},true);
document.addEventListener('mousedown',event=>{
  if(event.button!==0||now()-recentRealTouch<900||!isCanvas(event.target))return;
  active=true;activeTarget=event.target;identifier++;
  event.preventDefault();
  dispatchTouch('touchstart',event,activeTarget);
},true);
document.addEventListener('mousemove',event=>{
  if(!active||!activeTarget)return;
  if((event.buttons&1)===0){finish(event,'touchend');return;}
  event.preventDefault();
  dispatchTouch('touchmove',event,activeTarget);
},true);
document.addEventListener('mouseup',event=>{
  if(event.button!==0||!active)return;
  event.preventDefault();
  finish(event,'touchend');
},true);
window.addEventListener('blur',event=>{
  if(!active)return;
  const fallback={screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0};
  finish(fallback,'touchcancel');
});
})();</script>`;
const at=html.toLowerCase().lastIndexOf('</body>');
if(at<0)throw new Error('Browser mouse input: closing body not found');
html=html.slice(0,at)+runtime+html.slice(at);
if((html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length!==1)throw new Error('Browser mouse input: adapter injection was not unique');
await fs.writeFile(file,html);
console.log('Desktop browser input applied: left-mouse canvas drag/release now reuses native touch gameplay; touch remains unchanged.');
