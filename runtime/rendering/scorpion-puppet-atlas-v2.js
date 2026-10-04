(()=>{
'use strict';
const MASTER='assets/characters/scorpion/data/puppet-atlas-v1.json';
const CANDIDATE='assets/characters/scorpion/data/puppet-atlas-v2.json';
const SCHEMA='config/puppet-atlas-contract-v1.schema.json';
const DEV_KEY='bb.scorpion-puppet-atlas.dev';
const contract=globalThis.BlazingPuppetAtlasContractV1;
const rad=degrees=>degrees*Math.PI/180;
const state={ready:false,error:null,image:null,map:null,master:null,candidate:null,masterSurface:null,candidateSurface:null,neutralDiff:null};
const devEnabled=()=>{try{const q=new URLSearchParams(location.search);return q.has('scorpionPuppetAB')||q.has('scorpionPuppetLab')||q.has('scorpionPuppetV2')||localStorage.getItem(DEV_KEY)==='1'||['localhost','127.0.0.1','::1'].includes(location.hostname);}catch(_){return false;}};
const json=async path=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error('Could not load '+path+' ('+r.status+')');return r.json();};
const imageReady=src=>new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not load '+src));image.src=src;});
function nativeDiff(a,b){
 const left=Math.min(a.bounds.x,b.bounds.x),top=Math.min(a.bounds.y,b.bounds.y),right=Math.max(a.bounds.x+a.bounds.w,b.bounds.x+b.bounds.w),bottom=Math.max(a.bounds.y+a.bounds.h,b.bounds.y+b.bounds.h),w=right-left,h=bottom-top;
 const make=surface=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(surface.canvas,surface.bounds.x-left,surface.bounds.y-top);return x.getImageData(0,0,w,h).data;};
 const aa=make(a),bb=make(b);let changedPixels=0,maxChannelDelta=0,totalChannelDelta=0,referenceOpaque=0,candidateOpaque=0;
 for(let i=0;i<aa.length;i+=4){if(aa[i+3]>16)referenceOpaque++;if(bb[i+3]>16)candidateOpaque++;let pixelChanged=false;for(let c=0;c<4;c++){const d=Math.abs(aa[i+c]-bb[i+c]);if(d){pixelChanged=true;totalChannelDelta+=d;maxChannelDelta=Math.max(maxChannelDelta,d);}}if(pixelChanged)changedPixels++;}
 return {changedPixels,maxChannelDelta,totalChannelDelta,referenceOpaque,candidateOpaque,changedRatio:referenceOpaque?changedPixels/referenceOpaque:1,boundsEqual:a.bounds.x===b.bounds.x&&a.bounds.y===b.bounds.y&&a.bounds.w===b.bounds.w&&a.bounds.h===b.bounds.h,exact:changedPixels===0};
}
function articulationSurface(rotations){return contract.rasterize(state.candidate,state.image,undefined,{boneRotations:rotations});}
const POSES=Object.freeze([
 {id:'neutral',label:'0° neutral',rotations:{}},
 {id:'elbow',label:'Elbow +20°',rotations:{leftElbow:rad(20)}},
 {id:'shoulder',label:'Shoulder +10°',rotations:{leftShoulder:rad(10)}},
 {id:'knee',label:'Knee +10°',rotations:{leftKnee:rad(10)}}
]);
function drawSurface(canvas,model,surface){
 const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.translate(canvas.width/2,canvas.height-35);contract.render(ctx,model,surface,{bodyHeight:Math.min(550,canvas.height-70),baseline:0});ctx.strokeStyle='#69dec5';ctx.beginPath();ctx.moveTo(-canvas.width*.43,.5);ctx.lineTo(canvas.width*.43,.5);ctx.stroke();
}
function card(label,model,surface){const box=document.createElement('div');box.style.cssText='border:1px solid #435263;padding:10px;background:#17232d';const h=document.createElement('div');h.textContent=label;h.style.cssText='font-weight:700;margin-bottom:8px';box.appendChild(h);const canvas=document.createElement('canvas');canvas.width=480;canvas.height=620;canvas.style.cssText='display:block;width:100%;max-width:480px;background:#25323e';box.appendChild(canvas);drawSurface(canvas,model,surface);return box;}
function openLab(){
 if(!devEnabled())return false;
 let panel=document.getElementById('bb-scorpion-puppet-v2-lab');if(!panel){panel=document.createElement('section');panel.id='bb-scorpion-puppet-v2-lab';panel.style.cssText='position:fixed;z-index:2147483002;inset:3vh 3vw;overflow:auto;padding:16px;border:1px solid #d7ae61;background:#101820;color:#eef4f7;font:13px system-ui';document.body.appendChild(panel);}panel.replaceChildren();panel.hidden=false;
 const title=document.createElement('h2');title.textContent='Scorpion · Puppet Atlas V2 Articulation Gate';panel.appendChild(title);
 const close=document.createElement('button');close.textContent='Close V2 lab';close.onclick=()=>{panel.hidden=true;};panel.appendChild(close);
 const status=document.createElement('p');status.textContent=state.ready?'17 deliberately authored pieces · native source pixels · weapon/VFX excluded · no animation clips':state.error||'Loading V2 candidate…';panel.appendChild(status);if(!state.ready)return true;
 const diff=state.neutralDiff,gate=document.createElement('p');gate.style.cssText='padding:9px;border:1px solid '+(diff.exact?'#69dec5':'#d7ae61')+';background:#0d151c';gate.textContent=(diff.exact?'NEUTRAL MASTER MATCH: PASS':'NEUTRAL MASTER MATCH: REVIEW')+' · changed '+diff.changedPixels+' px ('+(diff.changedRatio*100).toFixed(3)+'%) · max channel Δ '+diff.maxChannelDelta+' · native bounds '+(diff.boundsEqual?'match':'DIFFER');panel.appendChild(gate);
 const note=document.createElement('p');note.textContent='Gate only: neutral, +20° elbow, +10° shoulder, +10° knee. Run / Attack / Recoil remain blocked.';panel.appendChild(note);
 const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px';
 const master=card('Approved neutral master (V1)',state.master,state.masterSurface);master.querySelector('canvas').dataset.masterPreview='';grid.appendChild(master);
 for(const pose of POSES){const surface=pose.id==='neutral'?state.candidateSurface:articulationSurface(pose.rotations),item=card('V2 · '+pose.label,state.candidate,surface);item.querySelector('canvas').dataset.v2Pose=pose.id;grid.appendChild(item);}panel.appendChild(grid);
 const parts=document.createElement('pre');parts.style.cssText='white-space:pre-wrap;margin-top:12px';parts.textContent=state.candidate.manifest.components.map(c=>{const a=c.attachments.find(x=>x.id===c.defaultAttachment);return c.slot+' ← '+a.sourceRegion+' · '+a.atlasRect.w+'×'+a.atlasRect.h+' · pivot '+a.pivot.join(',')+' · '+c.parentBone;}).join('\n');panel.appendChild(parts);return true;
}
function ensureControl(){if(!devEnabled()||document.getElementById('bb-scorpion-puppet-v2-lab-switch'))return;const b=document.createElement('button');b.id='bb-scorpion-puppet-v2-lab-switch';b.textContent='SCORPION · PUPPET V2';b.onclick=openLab;b.style.cssText='position:fixed;z-index:2147483000;right:10px;bottom:80px;padding:8px;background:#151d28;color:#ffe3a4;border:1px solid #d7ae61';document.body.appendChild(b);}
window.BlazingScorpionPuppetAtlasV2=Object.freeze({version:'scorpion-puppet-atlas-v2-articulation-gate',get ready(){return state.ready},get error(){return state.error},get manifest(){return state.candidate?.manifest},get neutralDiff(){return state.neutralDiff},get components(){return state.candidate?.manifest.components||[]},poses:POSES.map(p=>({id:p.id,label:p.label})),openLab,articulationSurface:(id)=>{const pose=POSES.find(p=>p.id===id);if(!state.ready||!pose)throw new Error('Unknown/unready V2 pose '+id);return pose.id==='neutral'?state.candidateSurface:articulationSurface(pose.rotations);}});
(async()=>{try{
 if(!contract)throw new Error('Puppet Atlas Contract v1 module missing');
 const [masterManifest,candidateManifest,schema]=await Promise.all([json(MASTER),json(CANDIDATE),json(SCHEMA)]);contract.validate(masterManifest,schema);contract.validate(candidateManifest,schema);
 if(candidateManifest.components.length<15||candidateManifest.components.length>20)throw new Error('V2 requires 15–20 deliberately authored pieces');
 const [image,map]=await Promise.all([imageReady(candidateManifest.atlas.image),json(candidateManifest.atlas.map)]);
 const source={width:image.naturalWidth,height:image.naturalHeight,map},master=contract.compile(masterManifest,schema,source),candidate=contract.compile(candidateManifest,schema,source),masterSurface=contract.rasterize(master,image),candidateSurface=contract.rasterize(candidate,image);
 contract.verifyPixels(master,masterSurface);contract.verifyPixels(candidate,candidateSurface);Object.assign(state,{image,map,master,candidate,masterSurface,candidateSurface,neutralDiff:nativeDiff(masterSurface,candidateSurface),ready:true});
 }catch(error){state.error=String(error?.message||error);console.warn('Scorpion Puppet Atlas V2 candidate unavailable.',error);}finally{ensureControl();}})();
})();