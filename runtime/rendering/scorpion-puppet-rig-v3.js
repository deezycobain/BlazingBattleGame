(()=>{
'use strict';
const CONTRACT=globalThis.BlazingPuppetAtlasContractV1;
const MANIFEST='assets/characters/scorpion/data/puppet-atlas-v3.json';
const IDLE='assets/characters/scorpion/puppet/v3/runtime/scorpion-idle-v1.json';
const SCHEMA='config/puppet-atlas-contract-v1.schema.json';
const DEV_KEY='bb.scorpion-puppet-rig-v3.dev';
const state={ready:false,error:null,manifest:null,map:null,idle:null,model:null,image:null,source:'none',motion:'neutral',showSkeleton:true,showPivots:true,showBounds:false,start:0,raf:0};
const rad=d=>d*Math.PI/180;
const devEnabled=()=>{try{const q=new URLSearchParams(location.search);return q.has('scorpionPuppetV3')||q.has('scorpionRigV3')||localStorage.getItem(DEV_KEY)==='1'||['localhost','127.0.0.1','::1'].includes(location.hostname);}catch(_){return false;}};
const json=async path=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error('Could not load '+path+' ('+r.status+')');return r.json();};
const imageReady=src=>new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not load atlas image'));image.src=src;});
function validateLoadedImage(image){if(image.naturalWidth!==state.manifest.atlas.width||image.naturalHeight!==state.manifest.atlas.height)throw new Error('Atlas dimensions must be '+state.manifest.atlas.width+'×'+state.manifest.atlas.height+'; got '+image.naturalWidth+'×'+image.naturalHeight);const source={width:image.naturalWidth,height:image.naturalHeight,map:state.map};CONTRACT.validate(state.manifest,state.schema,source);state.model=CONTRACT.compile(state.manifest,state.schema,source);state.image=image;state.ready=true;state.error=null;state.start=performance.now();}
async function loadRemote(){try{const image=await imageReady(state.manifest.atlas.image);validateLoadedImage(image);state.source='repository atlas';return true;}catch(error){state.error='Repository atlas is not present yet. Choose the approved 2048×2304 Scorpion Runtime V2 atlas file below.';return false;}}
async function loadLocalFile(file){if(!file)return;const url=URL.createObjectURL(file);try{const image=await imageReady(url);validateLoadedImage(image);state.source='local file · '+file.name;state.error=null;}finally{URL.revokeObjectURL(url);}}
function sampleIdle(now){
 const anim=state.idle;if(!anim?.frames?.length)return {};
 const cycle=((now-state.start)%anim.durationMs+anim.durationMs)%anim.durationMs;
 const exact=cycle/anim.frameMs,i=Math.floor(exact)%anim.frameCount,t=exact-Math.floor(exact);
 const a=anim.frames[i].rotationDegrees||{},b=anim.frames[(i+1)%anim.frameCount].rotationDegrees||{},out={};
 for(const bone of new Set([...Object.keys(a),...Object.keys(b)])){const aa=a[bone]||0,bb=b[bone]||0;out[bone]=rad(aa+(bb-aa)*t);}
 return out;
}
function surface(now){if(!state.ready)throw new Error('Rig V3 not ready');const boneRotations=state.motion==='idle'?sampleIdle(now):{};return CONTRACT.rasterize(state.model,state.image,undefined,{boneRotations});}
function worldToCanvas(ctx,fn,canvas,surface,bodyHeight){
 const n=state.model.manifest.neutral,s=bodyHeight/n.visualBounds.h;
 ctx.save();ctx.translate(canvas.width/2,canvas.height-30);ctx.scale(s,s);ctx.translate(-n.anchorX,-n.baseline);try{fn(ctx,surface.pose);}finally{ctx.restore();}
}
function bonePoint(pose,id){const m=pose.bones[id];return CONTRACT.point(m,[0,0]);}
function drawSkeleton(ctx,pose){
 const byId=new Map(state.manifest.bones.map(b=>[b.id,b]));
 ctx.lineWidth=4;ctx.strokeStyle='rgba(82,220,205,.95)';
 for(const b of state.manifest.bones){if(!b.parent)continue;const a=bonePoint(pose,b.parent),p=bonePoint(pose,b.id);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(p[0],p[1]);ctx.stroke();}
}
function drawPivots(ctx,pose){
 ctx.fillStyle='#ffdf65';ctx.strokeStyle='#101820';ctx.lineWidth=2;
 for(const b of state.manifest.bones){const p=bonePoint(pose,b.id);ctx.beginPath();ctx.arc(p[0],p[1],7,0,Math.PI*2);ctx.fill();ctx.stroke();}
}
function drawBounds(ctx,pose){
 ctx.strokeStyle='rgba(255,106,151,.85)';ctx.lineWidth=2;
 for(const part of pose.parts){const a=part.attachment,r=a.atlasRect,p=a.pivot,corners=[[0,0],[r.w,0],[r.w,r.h],[0,r.h]].map(([x,y])=>CONTRACT.point(part.matrix,[x-p[0],y-p[1]]));ctx.beginPath();ctx.moveTo(...corners[0]);for(let i=1;i<corners.length;i++)ctx.lineTo(...corners[i]);ctx.closePath();ctx.stroke();}
}
function renderCanvas(canvas,now=performance.now()){
 const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#202b34';ctx.fillRect(0,0,canvas.width,canvas.height);
 if(!state.ready){ctx.fillStyle='#eef4f7';ctx.font='15px system-ui';ctx.fillText(state.error||'Choose the approved runtime atlas.',20,36);return;}
 const s=surface(now),bodyHeight=Math.min(650,canvas.height-72);ctx.save();ctx.translate(canvas.width/2,canvas.height-30);CONTRACT.render(ctx,state.model,s,{bodyHeight,baseline:0});ctx.restore();
 worldToCanvas(ctx,(g,pose)=>{if(state.showSkeleton)drawSkeleton(g,pose);if(state.showBounds)drawBounds(g,pose);if(state.showPivots)drawPivots(g,pose);},canvas,s,bodyHeight);
 ctx.strokeStyle='#69dec5';ctx.beginPath();ctx.moveTo(24,canvas.height-30.5);ctx.lineTo(canvas.width-24,canvas.height-30.5);ctx.stroke();
}
function loop(canvas){cancelAnimationFrame(state.raf);const tick=now=>{if(!document.body.contains(canvas))return;renderCanvas(canvas,now);state.raf=requestAnimationFrame(tick);};state.raf=requestAnimationFrame(tick);}
function button(label,onClick){const b=document.createElement('button');b.textContent=label;b.onclick=onClick;b.style.cssText='padding:8px 10px;background:#17232d;color:#eef4f7;border:1px solid #596b7b;border-radius:4px';return b;}
function checkbox(label,key){
 const wrap=document.createElement('label');wrap.style.cssText='display:flex;gap:6px;align-items:center';const input=document.createElement('input');input.type='checkbox';input.checked=state[key];input.onchange=()=>state[key]=input.checked;wrap.append(input,document.createTextNode(label));return wrap;
}
function openLab(){
 if(!devEnabled())return false;let panel=document.getElementById('bb-scorpion-rig-v3-lab');if(!panel){panel=document.createElement('section');panel.id='bb-scorpion-rig-v3-lab';panel.style.cssText='position:fixed;z-index:2147483010;inset:2vh 2vw;overflow:auto;padding:16px;border:1px solid #d7ae61;background:#101820;color:#eef4f7;font:13px system-ui';document.body.appendChild(panel);}panel.replaceChildren();panel.hidden=false;
 const title=document.createElement('h2');title.textContent='Scorpion · BB_HUMANOID_3Q_V1 Live Rig Gate';panel.appendChild(title);
 const close=button('Close',()=>{panel.hidden=true;cancelAnimationFrame(state.raf);});panel.appendChild(close);
 const status=document.createElement('p');status.id='bb-scorpion-rig-v3-status';status.textContent=state.ready?'READY · '+state.source+' · 15 explicit anatomical bindings · atlas placement is storage only':state.error||'Loading rig data…';panel.appendChild(status);
 const file=document.createElement('input');file.type='file';file.accept='image/png,image/webp';file.onchange=async()=>{try{await loadLocalFile(file.files?.[0]);status.textContent='READY · '+state.source+' · 15 explicit anatomical bindings';}catch(error){state.ready=false;state.error=String(error?.message||error);status.textContent=state.error;}};panel.appendChild(file);
 const hint=document.createElement('p');hint.textContent='For this first live gate, choose the repaired scorpion_puppet_atlas_v31_left_arm_repair.png generated in ChatGPT if the repository atlas has not been uploaded yet.';panel.appendChild(hint);
 const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:10px 0';controls.append(
   button('Neutral',()=>{state.motion='neutral';state.start=performance.now();}),
   button('Idle V1',()=>{state.motion='idle';state.start=performance.now();}),
   checkbox('Skeleton', 'showSkeleton'),
   checkbox('Pivots','showPivots'),
   checkbox('Part bounds','showBounds')
 );panel.appendChild(controls);
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=820;canvas.style.cssText='display:block;width:min(100%,640px);background:#202b34;border:1px solid #435263';panel.appendChild(canvas);
 const details=document.createElement('pre');details.style.cssText='white-space:pre-wrap;max-width:900px';details.textContent='Rig: BB_HUMANOID_3Q_V1\\nMotion: neutral / interpolated 12-sample Idle V1\\nValidation: exact authored sourceOrigin → pivot reconstruction, anatomical L/R locked, hidden underlap retained, feet/root translations intentionally deferred for Contract v1 live gate.';panel.appendChild(details);
 loop(canvas);return true;
}
function ensureControl(){if(!devEnabled()||document.getElementById('bb-scorpion-rig-v3-switch'))return;const b=button('SCORPION · RIG V3',openLab);b.id='bb-scorpion-rig-v3-switch';b.style.cssText+=';position:fixed;z-index:2147483008;right:10px;bottom:160px';document.body.appendChild(b);}
window.BlazingScorpionRigV3=Object.freeze({version:'scorpion-bb-humanoid-3q-v1-live-gate-v31-seam-repair',get ready(){return state.ready},get error(){return state.error},get source(){return state.source},openLab,loadLocalFile,renderCanvas,setMotion:id=>{if(!['neutral','idle'].includes(id))throw new Error('Unknown motion '+id);state.motion=id;state.start=performance.now();}});
(async()=>{try{if(!CONTRACT)throw new Error('Puppet Atlas Contract v1 module missing');const [manifest,map,idle,schema]=await Promise.all([json(MANIFEST),json('assets/characters/scorpion/puppet/v3/runtime/scorpion_puppet_v3_runtime_atlas.json'),json(IDLE),json(SCHEMA)]);Object.assign(state,{manifest,map,idle,schema});await loadRemote();}catch(error){state.error=String(error?.message||error);console.warn('Scorpion Rig V3 metadata unavailable.',error);}finally{ensureControl();}})();
})();
