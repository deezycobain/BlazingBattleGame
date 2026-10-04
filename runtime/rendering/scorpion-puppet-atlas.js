(()=>{
'use strict';

// Phase 1 loads only the supplied body PNG and its supplied rectangle map.
// Disconnected alpha islands are derived in memory; no source asset is rewritten.
const ROOT='assets/characters/scorpion/puppet/v1';
const BODY_IMAGE=ROOT+'/body/scorpion_puppet_body_atlas_v1.png';
const BODY_MAP=ROOT+'/body/scorpion_puppet_body_atlas_v1.json';
const MODE_KEY='bb.scorpion-puppet-atlas.mode';
const DEV_KEY='bb.scorpion-puppet-atlas.dev';
const ASSIGNMENTS_KEY='bb.scorpion-puppet-atlas.components';
const state={
 mode:'FRAME',ready:false,failed:false,error:null,bodyImage:null,bodyMap:null,
 components:new Map(),assignments:{},
 lab:{open:false,selected:null,previewFrame:0},
 metrics:{puppetDraws:0,lastVisibleParts:0,lastDrawBounds:null,lastFeet:null,footSamples:[]}
};
try{state.mode=localStorage.getItem(MODE_KEY)==='PUPPET'?'PUPPET':'FRAME';state.assignments=JSON.parse(localStorage.getItem(ASSIGNMENTS_KEY)||'{}')||{};}catch(_){ }

const devEnabled=()=>{try{const query=new URLSearchParams(location.search);return query.has('scorpionPuppetAB')||query.has('scorpionPuppetLab')||localStorage.getItem(DEV_KEY)==='1'||['localhost','127.0.0.1','::1'].includes(location.hostname);}catch(_){return false;}};
const semanticSlots=Object.freeze(['head','torso','pelvis','leftUpperArm','leftLowerArm','rightUpperArm','rightLowerArm','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot']);

// Candidate IDs intentionally select the largest isolated island from each
// reviewed packing cell. The development lab permits replacing every candidate
// with an evidence-backed body_XX.N island before testing the neutral pose.
const candidateComponents=Object.freeze({
 head:'body_04.0',torso:'body_03.0',pelvis:'body_07.0',
 leftUpperArm:'body_08.0',leftLowerArm:'body_13.0',rightUpperArm:'body_10.0',rightLowerArm:'body_14.0',
 leftUpperLeg:'body_26.0',leftLowerLeg:'body_31.0',leftFoot:'body_35.0',
 rightUpperLeg:'body_28.0',rightLowerLeg:'body_32.0',rightFoot:'body_40.0'
});
const selectedComponentId=slot=>state.assignments[slot]||candidateComponents[slot];
const componentFor=slot=>state.components.get(selectedComponentId(slot))||null;
const assignmentsValid=()=>semanticSlots.every(slot=>componentFor(slot));

function setMode(mode){
 state.mode=mode==='PUPPET'&&state.ready&&!state.failed&&assignmentsValid()?'PUPPET':'FRAME';
 try{localStorage.setItem(MODE_KEY,state.mode);}catch(_){ }
 const button=document.getElementById('bb-scorpion-puppet-ab-switch');if(button)button.textContent='SCORPION · '+state.mode+' (A/B)';
 return state.mode;
}
function imageReady(src){return new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not load '+src));image.src=src;});}
function validateRectangleMap(map,image){
 if(!map||!Array.isArray(map.canvas)||map.canvas.length!==2||!map.parts)throw new Error('Body rectangle map shape is invalid');
 const [atlasWidth,atlasHeight]=map.canvas.map(Number);
 if(atlasWidth!==image.naturalWidth||atlasHeight!==image.naturalHeight)throw new Error('Body atlas dimensions do not match its rectangle map');
 for(const [name,rect] of Object.entries(map.parts)){
  for(const key of ['x','y','w','h'])if(!Number.isFinite(rect[key]))throw new Error('Invalid rectangle '+name);
  if(rect.x<0||rect.y<0||rect.w<=0||rect.h<=0||rect.x+rect.w>atlasWidth||rect.y+rect.h>atlasHeight)throw new Error('Out-of-bounds rectangle '+name);
 }
 return true;
}

// Extract eight-connected opaque islands for every map rectangle. A cell can
// therefore contribute body_XX.0, body_XX.1, etc. without allowing its other
// detached pixels to leak into the anatomical cutout being rendered.
function extractBodyComponents(image,map){
 const alphaThreshold=16;
 state.components.clear();
 for(const [cell,rect] of Object.entries(map.parts)){
  const source=document.createElement('canvas');source.width=rect.w;source.height=rect.h;
  const sourceCtx=source.getContext('2d',{willReadFrequently:true});sourceCtx.drawImage(image,rect.x,rect.y,rect.w,rect.h,0,0,rect.w,rect.h);
  const data=sourceCtx.getImageData(0,0,rect.w,rect.h),pixels=data.data,total=rect.w*rect.h,seen=new Uint8Array(total),found=[];
  for(let start=0;start<total;start++){
   if(seen[start]||pixels[start*4+3]<=alphaThreshold)continue;
   const queue=[start],members=[];seen[start]=1;let cursor=0,minX=rect.w,minY=rect.h,maxX=-1,maxY=-1;
   while(cursor<queue.length){
    const index=queue[cursor++],x=index%rect.w,y=Math.floor(index/rect.w);members.push(index);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
     if(!ox&&!oy)continue;const nx=x+ox,ny=y+oy;if(nx<0||ny<0||nx>=rect.w||ny>=rect.h)continue;
     const next=ny*rect.w+nx;if(!seen[next]&&pixels[next*4+3]>alphaThreshold){seen[next]=1;queue.push(next);}
    }
   }
   if(members.length<24)continue;
   found.push({members,minX,minY,maxX,maxY,pixels:members.length});
  }
  found.sort((a,b)=>b.pixels-a.pixels||a.minY-b.minY||a.minX-b.minX);
  found.forEach((island,ordinal)=>{
   const width=island.maxX-island.minX+1,height=island.maxY-island.minY+1,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const output=canvas.getContext('2d',{willReadFrequently:true}),outputData=output.createImageData(width,height);
   for(const index of island.members){const x=index%rect.w,y=Math.floor(index/rect.w),from=index*4,to=((y-island.minY)*width+(x-island.minX))*4;outputData.data[to]=pixels[from];outputData.data[to+1]=pixels[from+1];outputData.data[to+2]=pixels[from+2];outputData.data[to+3]=pixels[from+3];}
   output.putImageData(outputData,0,0);
   const id=cell+'.'+ordinal;
   state.components.set(id,Object.freeze({id,cell,ordinal,pixels:island.pixels,source:{x:rect.x+island.minX,y:rect.y+island.minY,w:width,h:height},canvas}));
  });
 }
 if(!state.components.size)throw new Error('Body atlas did not yield usable alpha components');
}
async function loadBodyAtlas(){
 try{
  const [response,image]=await Promise.all([fetch(BODY_MAP,{cache:'no-store'}),imageReady(BODY_IMAGE)]);
  if(!response.ok)throw new Error('Could not load '+BODY_MAP+' ('+response.status+')');
  const map=await response.json();validateRectangleMap(map,image);extractBodyComponents(image,map);
  state.bodyMap=map;state.bodyImage=image;state.ready=true;setMode(state.mode);
 }catch(error){state.failed=true;state.error=String(error?.message||error);setMode('FRAME');console.warn('Scorpion Puppet Atlas V1 disabled; retaining frame animation fallback.',error);}finally{ensureControls();}
}

const skeleton=Object.freeze({
 root:{parent:null,x:0,y:-8},pelvis:{parent:'root',x:0,y:-20},torso:{parent:'pelvis',x:0,y:-17},head:{parent:'torso',x:0,y:-4},
 leftShoulder:{parent:'torso',x:-11,y:-6},leftElbow:{parent:'leftShoulder',x:-7,y:13},leftWrist:{parent:'leftElbow',x:-3,y:12},
 rightShoulder:{parent:'torso',x:11,y:-6},rightElbow:{parent:'rightShoulder',x:7,y:13},rightWrist:{parent:'rightElbow',x:3,y:12},
 leftHip:{parent:'pelvis',x:-7,y:1},leftKnee:{parent:'leftHip',x:-1,y:16},leftAnkle:{parent:'leftKnee',x:1,y:23},
 rightHip:{parent:'pelvis',x:7,y:1},rightKnee:{parent:'rightHip',x:1,y:16},rightAnkle:{parent:'rightKnee',x:-1,y:23}
});
const drawParts=Object.freeze({
 pelvis:[{slot:'pelvis',w:25,h:21,px:.50,py:.20}],torso:[{slot:'torso',w:29,h:29,px:.50,py:.20}],head:[{slot:'head',w:20,h:23,px:.50,py:.88}],
 leftShoulder:[{slot:'leftUpperArm',w:12,h:17,px:.25,py:.10}],leftElbow:[{slot:'leftLowerArm',w:11,h:17,px:.25,py:.10}],
 rightShoulder:[{slot:'rightUpperArm',w:12,h:17,px:.75,py:.10}],rightElbow:[{slot:'rightLowerArm',w:11,h:16,px:.75,py:.10}],
 leftHip:[{slot:'leftUpperLeg',w:12,h:18,px:.50,py:.08}],leftKnee:[{slot:'leftLowerLeg',w:11,h:17,px:.50,py:.10}],leftAnkle:[{slot:'leftFoot',w:17,h:8,px:.50,py:1}],
 rightHip:[{slot:'rightUpperLeg',w:12,h:18,px:.50,py:.08}],rightKnee:[{slot:'rightLowerLeg',w:11,h:17,px:.50,py:.10}],rightAnkle:[{slot:'rightFoot',w:17,h:8,px:.50,py:1}]
});
const layerOrder=Object.freeze(['leftHip','leftKnee','leftAnkle','rightHip','rightKnee','rightAnkle','pelvis','torso','leftShoulder','leftElbow','rightShoulder','rightElbow','head']);
const idleKeys=Object.freeze([
 {t:0,torso:0,head:-.018,leftShoulder:.045,leftElbow:-.026,rightShoulder:-.038,rightElbow:.023},
 {t:.25,torso:-.018,head:-.042,leftShoulder:.092,leftElbow:-.058,rightShoulder:-.070,rightElbow:.046},
 {t:.50,torso:.011,head:.017,leftShoulder:.014,leftElbow:-.010,rightShoulder:-.011,rightElbow:.009},
 {t:.75,torso:.025,head:.044,leftShoulder:-.050,leftElbow:.032,rightShoulder:.064,rightElbow:-.042}
]);
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const point=(m,x,y)=>({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]});
function idlePose(now){const scaled=(((now%1800)+1800)%1800/1800)*idleKeys.length,index=Math.floor(scaled)%idleKeys.length,next=idleKeys[(index+1)%idleKeys.length],current=idleKeys[index],raw=scaled-index,ease=raw*raw*(3-2*raw),pose={};for(const name of Object.keys(skeleton)){const a=Number(current[name]||0),b=Number(next[name]||0);pose[name]=a+(b-a)*ease;}return pose;}
function jointMatrices(now){const pose=idlePose(now),out={};for(const [name,bone] of Object.entries(skeleton)){const r=pose[name]||0,c=Math.cos(r),s=Math.sin(r),local=[c,s,-s,c,bone.x,bone.y];out[name]=bone.parent?multiply(out[bone.parent],local):local;}return out;}
function paintPart(ctx,spec,mat,unit){const component=componentFor(spec.slot);if(!component)throw new Error('No isolated component assigned to '+spec.slot);ctx.save();ctx.transform(...mat);ctx.drawImage(component.canvas,-spec.w*unit*spec.px,-spec.h*unit*spec.py,spec.w*unit,spec.h*unit);ctx.restore();}
function currentTransformPoint(ctx,p){const m=ctx.getTransform();return {x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f};}
function recordFeet(ctx,joints){const left=currentTransformPoint(ctx,point(joints.leftAnkle,0,0)),right=currentTransformPoint(ctx,point(joints.rightAnkle,0,0));state.metrics.lastFeet={left,right};state.metrics.footSamples.push({left,right});if(state.metrics.footSamples.length>720)state.metrics.footSamples.shift();}
function drawHierarchy(ctx,{bodyHeight=68,now=performance.now()}={}){
 const unit=bodyHeight/68,joints=jointMatrices(now);for(const joint of layerOrder)for(const spec of drawParts[joint]||[])paintPart(ctx,spec,joints[joint],unit);return {unit,joints};
}
function render(ctx,{bodyHeight=68,now=performance.now(),measure=false}={}){
 if(state.mode!=='PUPPET'||!state.ready||state.failed||!ctx||!assignmentsValid())return false;
 try{const {unit,joints}=drawHierarchy(ctx,{bodyHeight,now});if(!measure){state.metrics.puppetDraws++;state.metrics.lastVisibleParts=13;state.metrics.lastDrawBounds={left:-18*unit,right:18*unit,top:-64*unit,bottom:12*unit};recordFeet(ctx,joints);}return true;}
 catch(error){state.failed=true;state.error='Puppet draw failed: '+String(error?.message||error);setMode('FRAME');console.warn('Scorpion Puppet Atlas V1 draw failed; retaining frame animation fallback.',error);return false;}
}
function footDrift(){const samples=state.metrics.footSamples;if(!samples.length)return {samples:0,left:0,right:0,max:0};const drift=side=>{const xs=samples.map(sample=>sample[side].x),ys=samples.map(sample=>sample[side].y);return Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));};const left=drift('left'),right=drift('right');return {samples:samples.length,left,right,max:Math.max(left,right)};}
function idleJointSamples(){return Array.from({length:37},(_,i)=>{const joints=jointMatrices(i*50);return {t:i*50,left:point(joints.leftAnkle,0,0),right:point(joints.rightAnkle,0,0)};});}
function wantsPuppet(){return state.mode==='PUPPET'&&state.ready&&!state.failed&&assignmentsValid();}

function sortedComponents(){return [...state.components.values()].sort((a,b)=>Number(a.cell.slice(5))-Number(b.cell.slice(5))||a.ordinal-b.ordinal);}
function stopLabPreview(){if(state.lab.previewFrame){cancelAnimationFrame(state.lab.previewFrame);state.lab.previewFrame=0;}}
function drawLabPreview(now){
 state.lab.previewFrame=0;if(!state.lab.open)return;
 const panel=document.getElementById('bb-scorpion-puppet-lab'),canvas=panel?.querySelector('[data-preview]'),status=panel?.querySelector('[data-preview-status]');
 if(!canvas||!status||!state.ready||!assignmentsValid())return;
 const ctx=canvas.getContext('2d'),baseline=414,originX=canvas.width/2,originY=baseline-48,previewScale=4;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#0c1219';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.strokeStyle='#496170';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(18,baseline+.5);ctx.lineTo(canvas.width-18,baseline+.5);ctx.stroke();
 ctx.fillStyle='#98b3c5';ctx.font='11px ui-monospace,monospace';ctx.fillText('isolated baseline — no battlefield pixels',18,baseline+14);
 ctx.save();ctx.translate(originX,originY);ctx.scale(previewScale,previewScale);const {joints}=drawHierarchy(ctx,{bodyHeight:90,now});ctx.restore();
 const left=point(joints.leftAnkle,0,0),right=point(joints.rightAnkle,0,0),drift=footDrift();
 for(const [label,foot,color] of [['L',left,'#74e6bd'],['R',right,'#ffd46a']]){const x=originX+foot.x*previewScale,y=originY+foot.y*previewScale;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();ctx.font='10px ui-monospace,monospace';ctx.fillText(label+' ankle',x+7,y-5);}
 status.textContent='Live 1.8 s hierarchy preview · L/R ankle markers are transformed joints · gameplay samples '+drift.samples+' · max measured drift '+drift.max.toFixed(3)+' px';
 state.lab.previewFrame=requestAnimationFrame(drawLabPreview);
}
function scheduleLabPreview(){if(state.lab.open&&!state.lab.previewFrame)state.lab.previewFrame=requestAnimationFrame(drawLabPreview);}
function renderLab(){
 const panel=document.getElementById('bb-scorpion-puppet-lab');if(!panel)return;const canvas=panel.querySelector('canvas'),status=panel.querySelector('[data-status]');
 const components=sortedComponents(),columns=5,cellW=156,cellH=176,rows=Math.ceil(components.length/columns);canvas.width=columns*cellW;canvas.height=Math.max(cellH,rows*cellH);canvas.style.width=canvas.width+'px';canvas.style.height=canvas.height+'px';canvas.__bbComponents=components;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#10151d';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.textBaseline='top';
 components.forEach((component,index)=>{const col=index%columns,row=Math.floor(index/columns),x=col*cellW,y=row*cellH,selected=component.id===state.lab.selected;ctx.fillStyle=selected?'#292213':'#151c25';ctx.fillRect(x+3,y+3,cellW-6,cellH-6);ctx.strokeStyle=selected?'#f0b43c':'#536271';ctx.strokeRect(x+3.5,y+3.5,cellW-7,cellH-7);const fit=Math.min((cellW-20)/component.canvas.width,(cellH-49)/component.canvas.height,1),w=component.canvas.width*fit,h=component.canvas.height*fit;ctx.drawImage(component.canvas,x+(cellW-w)/2,y+34+(cellH-49-h)/2,w,h);ctx.font='700 11px ui-monospace,monospace';ctx.fillStyle='#ffe3a4';ctx.fillText(component.id,x+9,y+10);ctx.font='10px ui-monospace,monospace';ctx.fillStyle='#b8c7d1';ctx.fillText(component.canvas.width+'×'+component.canvas.height+' · '+component.pixels+' px',x+9,y+22);});
 const selected=state.components.get(state.lab.selected);status.textContent=selected?'Selected '+selected.id+' ('+selected.canvas.width+'×'+selected.canvas.height+', '+selected.pixels+' opaque px)':'Select an isolated alpha island, choose an anatomical slot, then assign it for the live PUPPET test.';scheduleLabPreview();
}
function ensureLab(){
 if(!devEnabled()||document.getElementById('bb-scorpion-puppet-lab'))return;
 const panel=document.createElement('section');panel.id='bb-scorpion-puppet-lab';panel.hidden=true;panel.style.cssText='position:fixed;z-index:2147483001;inset:6vh 4vw 5vh;overflow:auto;padding:12px;border:1px solid #f0b43c;border-radius:9px;background:#10151df7;color:#f6e5bd;font:12px/1.35 system-ui;box-shadow:0 12px 40px #000c';
 const title=document.createElement('div');title.innerHTML='<strong>SCORPION · ATLAS LAB</strong> <span style="opacity:.75">Derived 8-connected alpha islands from the unchanged body atlas</span>';panel.appendChild(title);
 const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:9px 0';
 const select=document.createElement('select');select.dataset.slot='';for(const slot of semanticSlots){const option=document.createElement('option');option.value=slot;option.textContent=slot;select.appendChild(option);}controls.appendChild(select);
 const assign=document.createElement('button');assign.type='button';assign.textContent='Assign selected + test';assign.onclick=()=>{if(!state.lab.selected)return;state.assignments[select.value]=state.lab.selected;try{localStorage.setItem(ASSIGNMENTS_KEY,JSON.stringify(state.assignments));}catch(_){ }setMode('PUPPET');renderLab();};controls.appendChild(assign);
 const reset=document.createElement('button');reset.type='button';reset.textContent='Reset candidates';reset.onclick=()=>{state.assignments={};try{localStorage.removeItem(ASSIGNMENTS_KEY);}catch(_){ }setMode('FRAME');renderLab();};controls.appendChild(reset);
 const close=document.createElement('button');close.type='button';close.textContent='Close lab';close.onclick=()=>{panel.hidden=true;state.lab.open=false;stopLabPreview();};controls.appendChild(close);panel.appendChild(controls);
 const preview=document.createElement('canvas');preview.dataset.preview='';preview.width=400;preview.height=452;preview.style.cssText='display:block;width:400px;max-width:100%;margin:8px 0;border:1px solid #536271;background:#0c1219';panel.appendChild(preview);
 const previewStatus=document.createElement('output');previewStatus.dataset.previewStatus='';previewStatus.style.cssText='display:block;margin:3px 0 9px;color:#9fd3c7;font:11px ui-monospace,monospace';panel.appendChild(previewStatus);
 const status=document.createElement('div');status.dataset.status='';status.style.cssText='margin:6px 0 10px;color:#b8c7d1';panel.appendChild(status);
 const canvas=document.createElement('canvas');canvas.style.cssText='display:block;max-width:none;background:#10151d;cursor:crosshair';canvas.onclick=event=>{const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*(canvas.width/rect.width),y=(event.clientY-rect.top)*(canvas.height/rect.height),index=Math.floor(y/176)*5+Math.floor(x/156),component=canvas.__bbComponents?.[index];if(component){state.lab.selected=component.id;renderLab();}};panel.appendChild(canvas);document.body.appendChild(panel);
}
function openLab(){ensureLab();const panel=document.getElementById('bb-scorpion-puppet-lab');if(!panel)return false;panel.hidden=false;state.lab.open=true;renderLab();scheduleLabPreview();return true;}
function ensureControls(){
 if(!devEnabled())return;
 if(!document.getElementById('bb-scorpion-puppet-ab-switch')){const button=document.createElement('button');button.id='bb-scorpion-puppet-ab-switch';button.type='button';button.title='Development-only Scorpion atlas prototype A/B switch';button.style.cssText='position:fixed;z-index:2147483000;right:10px;bottom:10px;padding:7px 9px;border:1px solid #f0b43c;border-radius:6px;background:#15110a;color:#ffe3a4;font:700 10px/1.1 system-ui;letter-spacing:.06em;box-shadow:0 2px 12px #0009';button.addEventListener('click',()=>setMode(state.mode==='FRAME'?'PUPPET':'FRAME'));document.body.appendChild(button);setMode(state.mode);}
 if(!document.getElementById('bb-scorpion-puppet-lab-switch')){const button=document.createElement('button');button.id='bb-scorpion-puppet-lab-switch';button.type='button';button.textContent='SCORPION · ATLAS LAB';button.title='Development-only isolated-component atlas lab';button.style.cssText='position:fixed;z-index:2147483000;right:10px;bottom:45px;padding:7px 9px;border:1px solid #7999b8;border-radius:6px;background:#0d1723;color:#d7e7f7;font:700 10px/1.1 system-ui;letter-spacing:.06em;box-shadow:0 2px 12px #0009';button.addEventListener('click',openLab);document.body.appendChild(button);}
 ensureLab();
}

window.BlazingScorpionPuppetAtlasV1=Object.freeze({
 version:'v1',durationMs:1800,joints:Object.freeze(Object.keys(skeleton)),semanticSlots,candidateComponents,
 get mode(){return state.mode},get ready(){return state.ready&&!state.failed},get error(){return state.error},get bodyAtlas(){return {src:BODY_IMAGE,width:state.bodyImage?.naturalWidth||0,height:state.bodyImage?.naturalHeight||0}},get metrics(){return {...state.metrics,footDrift:footDrift()}},get componentAssignments(){return Object.freeze(Object.fromEntries(semanticSlots.map(slot=>[slot,selectedComponentId(slot)])));},get components(){return sortedComponents().map(({id,cell,ordinal,pixels,source,canvas})=>({id,cell,ordinal,pixels,source,width:canvas.width,height:canvas.height}));},
 setMode,wantsPuppet,render,openLab,validate:()=>state.bodyImage&&state.bodyMap?validateRectangleMap(state.bodyMap,state.bodyImage)&&assignmentsValid():false,footDrift,idleJointSamples,get rectangleMap(){return state.bodyMap;}
});
loadBodyAtlas();
})();
