(()=>{
'use strict';
const MASTER='assets/characters/scorpion/data/puppet-atlas-v1.json';
const CANDIDATE='assets/characters/scorpion/data/puppet-atlas-v2.json';
const SCHEMA='config/puppet-atlas-contract-v1.schema.json';
const DEV_KEY='bb.scorpion-puppet-atlas.dev';
const contract=globalThis.BlazingPuppetAtlasContractV1;
const rad=degrees=>degrees*Math.PI/180;
const clone=value=>JSON.parse(JSON.stringify(value));
const PACK=Object.freeze({width:2048,height:768,gutter:32});
const OPACITY_FLOOR=252;
// Deliberately authored joint-underlap windows in the approved V1 source atlas.
// These are not discovered from alpha islands. They are fixed anatomy decisions.
const AUTHORED_UNDERLAP=Object.freeze([
 {joint:'leftShoulder',lower:'v2_left_upper_arm',upper:'v2_left_shoulder_armor',rect:{x:2486,y:208,w:90,h:45}},
 {joint:'rightShoulder',lower:'v2_right_upper_arm',upper:'v2_right_shoulder_armor',rect:{x:2726,y:208,w:56,h:45}},
 {joint:'leftWrist',lower:'v2_left_hand',upper:'v2_left_forearm',rect:{x:198,y:820,w:122,h:45}},
 {joint:'rightWrist',lower:'v2_right_hand',upper:'v2_right_forearm',rect:{x:1475,y:815,w:143,h:45}}
]);
const state={ready:false,error:null,image:null,map:null,masterImage:null,master:null,candidate:null,masterSurface:null,candidateSurface:null,neutralDiff:null,authoring:null};
const devEnabled=()=>{try{const q=new URLSearchParams(location.search);return q.has('scorpionPuppetAB')||q.has('scorpionPuppetLab')||q.has('scorpionPuppetV2')||localStorage.getItem(DEV_KEY)==='1'||['localhost','127.0.0.1','::1'].includes(location.hostname);}catch(_){return false;}};
const json=async path=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error('Could not load '+path+' ('+r.status+')');return r.json();};
const imageReady=src=>new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not load '+src));image.src=src;});
function rectContains(r,x,y){return x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;}
function packPieces(records){
 const ordered=[...records].sort((a,b)=>b.sourceRect.h-a.sourceRect.h||b.sourceRect.w-a.sourceRect.w||a.id.localeCompare(b.id));
 let x=PACK.gutter,y=PACK.gutter,row=0;const placements={};
 for(const part of ordered){
  const {w,h}=part.sourceRect;if(x+w+PACK.gutter>PACK.width){x=PACK.gutter;y+=row+PACK.gutter;row=0;}
  if(y+h+PACK.gutter>PACK.height)throw new Error('Authored V2 pieces exceed virtual atlas');
  placements[part.id]={x,y,w,h};x+=w+PACK.gutter;row=Math.max(row,h);
 }
 return placements;
}
function buildAuthoredAtlas(sourceImage,sourceManifest){
 const records=sourceManifest.components.map(component=>{const attachment=component.attachments.find(a=>a.id===component.defaultAttachment);return {slot:component.slot,id:attachment.id,sourceRegion:attachment.sourceRegion,sourceRect:clone(attachment.atlasRect),zOrder:component.zOrder};});
 const placements=packPieces(records),canvas=document.createElement('canvas');canvas.width=PACK.width;canvas.height=PACK.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Canvas 2D unavailable for V2 authoring');ctx.imageSmoothingEnabled=false;
 for(const part of records){const s=part.sourceRect,d=placements[part.id];ctx.drawImage(sourceImage,s.x,s.y,s.w,s.h,d.x,d.y,d.w,d.h);}
 // De-duplicate only overlaps created by splitting one approved V1 source region.
 // Keep strong painted underlap solely inside the four authored joint windows.
 const imageData=ctx.getImageData(0,0,canvas.width,canvas.height),pixels=imageData.data;
 let zeroedDuplicatePixels=0,retainedUnderlapPixels=0,duplicateSourcePixels=0;
 const groups=new Map();for(const part of records){if(!groups.has(part.sourceRegion))groups.set(part.sourceRegion,[]);groups.get(part.sourceRegion).push(part);}
 const windowFor=(lower,upper)=>AUTHORED_UNDERLAP.find(w=>w.lower===lower.id&&w.upper===upper.id);
 for(const group of groups.values()){
  if(group.length<2)continue;
  for(const lower of group){
   const s=lower.sourceRect,d=placements[lower.id];
   for(let ly=0;ly<s.h;ly++)for(let lx=0;lx<s.w;lx++){
    const sx=s.x+lx,sy=s.y+ly;
    const higher=group.filter(other=>other.zOrder>lower.zOrder&&rectContains(other.sourceRect,sx,sy)).sort((a,b)=>b.zOrder-a.zOrder);
    if(!higher.length)continue;duplicateSourcePixels++;
    const top=higher[0],window=windowFor(lower,top),index=((d.y+ly)*canvas.width+(d.x+lx))*4,alpha=pixels[index+3];
    const retain=!!window&&rectContains(window.rect,sx,sy)&&alpha>=OPACITY_FLOOR;
    if(retain){retainedUnderlapPixels++;continue;}
    if(alpha){pixels[index+3]=0;zeroedDuplicatePixels++;}
   }
  }
 }
 ctx.putImageData(imageData,0,0);
 const manifest=clone(sourceManifest),map={version:'scorpion-puppet-body-atlas-v2-authored-virtual',canvas:[PACK.width,PACK.height],parts:{}};
 manifest.atlas={image:'virtual://scorpion-puppet-body-atlas-v2',map:'virtual://scorpion-puppet-body-atlas-v2-map',width:PACK.width,height:PACK.height};
 for(const component of manifest.components){const attachment=component.attachments.find(a=>a.id===component.defaultAttachment),placement=placements[attachment.id];attachment.sourceRegion=attachment.id;attachment.atlasRect=clone(placement);map.parts[attachment.id]={...clone(placement),authored_from:records.find(r=>r.id===attachment.id).sourceRegion};}
 return {image:canvas,map,manifest,metrics:Object.freeze({mode:'authored-rect-splits-with-masked-underlap',automaticAlphaIslandMapping:false,opacityFloor:OPACITY_FLOOR,pieceCount:records.length,zeroedDuplicatePixels,retainedUnderlapPixels,duplicateSourcePixels,underlapWindows:AUTHORED_UNDERLAP.map(clone)})};
}
function nativeDiff(a,b){
 const left=Math.min(a.bounds.x,b.bounds.x),top=Math.min(a.bounds.y,b.bounds.y),right=Math.max(a.bounds.x+a.bounds.w,b.bounds.x+b.bounds.w),bottom=Math.max(a.bounds.y+a.bounds.h,b.bounds.y+b.bounds.h),w=right-left,h=bottom-top;
 const make=surface=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(surface.canvas,surface.bounds.x-left,surface.bounds.y-top);return x.getImageData(0,0,w,h).data;};
 const aa=make(a),bb=make(b);let changedPixels=0,maxChannelDelta=0,totalChannelDelta=0,referenceOpaque=0,candidateOpaque=0,silhouetteMismatch=0;
 for(let i=0;i<aa.length;i+=4){if(aa[i+3]>16)referenceOpaque++;if(bb[i+3]>16)candidateOpaque++;if((aa[i+3]>16)!==(bb[i+3]>16))silhouetteMismatch++;let pixelChanged=false;for(let c=0;c<4;c++){const d=Math.abs(aa[i+c]-bb[i+c]);if(d){pixelChanged=true;totalChannelDelta+=d;maxChannelDelta=Math.max(maxChannelDelta,d);}}if(pixelChanged)changedPixels++;}
 const boundsEqual=a.bounds.x===b.bounds.x&&a.bounds.y===b.bounds.y&&a.bounds.w===b.bounds.w&&a.bounds.h===b.bounds.h;
 const changedRatio=referenceOpaque?changedPixels/referenceOpaque:1,meanDeltaPerOpaque=referenceOpaque?totalChannelDelta/referenceOpaque:Infinity;
 // The approved source uses near-opaque 252/253 alpha through interior art. A real hidden underlap
 // cannot be byte-identical under source-over without making the underlap transparent. The V2 gate
 // therefore permits only <=4 channel levels of drift, with identical silhouette/opaque population.
 const accepted=boundsEqual&&silhouetteMismatch===0&&referenceOpaque===candidateOpaque&&maxChannelDelta<=4&&changedRatio<=0.04&&meanDeltaPerOpaque<=0.12;
 return {changedPixels,maxChannelDelta,totalChannelDelta,referenceOpaque,candidateOpaque,silhouetteMismatch,changedRatio,meanDeltaPerOpaque,boundsEqual,exact:changedPixels===0,accepted};
}
function articulationSurface(rotations){return contract.rasterize(state.candidate,state.image,undefined,{boneRotations:rotations});}
const POSES=Object.freeze([
 {id:'neutral',label:'0° neutral',rotations:{}},
 {id:'elbow',label:'Elbow +20°',rotations:{leftElbow:rad(20)}},
 {id:'shoulder',label:'Shoulder +10°',rotations:{leftShoulder:rad(10)}},
 {id:'knee',label:'Knee +10°',rotations:{leftKnee:rad(10)}}
]);
function drawSurface(canvas,model,surface){const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.translate(canvas.width/2,canvas.height-35);contract.render(ctx,model,surface,{bodyHeight:Math.min(550,canvas.height-70),baseline:0});ctx.strokeStyle='#69dec5';ctx.beginPath();ctx.moveTo(-canvas.width*.43,.5);ctx.lineTo(canvas.width*.43,.5);ctx.stroke();}
function card(label,model,surface){const box=document.createElement('div');box.style.cssText='border:1px solid #435263;padding:10px;background:#17232d';const h=document.createElement('div');h.textContent=label;h.style.cssText='font-weight:700;margin-bottom:8px';box.appendChild(h);const canvas=document.createElement('canvas');canvas.width=480;canvas.height=620;canvas.style.cssText='display:block;width:100%;max-width:480px;background:#25323e';box.appendChild(canvas);drawSurface(canvas,model,surface);return box;}
function openLab(){
 if(!devEnabled())return false;
 let panel=document.getElementById('bb-scorpion-puppet-v2-lab');if(!panel){panel=document.createElement('section');panel.id='bb-scorpion-puppet-v2-lab';panel.style.cssText='position:fixed;z-index:2147483002;inset:3vh 3vw;overflow:auto;padding:16px;border:1px solid #d7ae61;background:#101820;color:#eef4f7;font:13px system-ui';document.body.appendChild(panel);}panel.replaceChildren();panel.hidden=false;
 const title=document.createElement('h2');title.textContent='Scorpion · Puppet Atlas V2 Articulation Gate';panel.appendChild(title);
 const close=document.createElement('button');close.textContent='Close V2 lab';close.onclick=()=>{panel.hidden=true;};panel.appendChild(close);
 const status=document.createElement('p');status.textContent=state.ready?'17 deliberately authored anatomical pieces · native source pixels · masked hidden underlap · weapon/VFX excluded · no animation clips':state.error||'Loading V2 candidate…';panel.appendChild(status);if(!state.ready)return true;
 const diff=state.neutralDiff,gate=document.createElement('p');gate.style.cssText='padding:9px;border:1px solid '+(diff.accepted?'#69dec5':'#d7ae61')+';background:#0d151c';gate.textContent=(diff.accepted?'NEUTRAL MASTER MATCH: PASS':'NEUTRAL MASTER MATCH: REVIEW')+' · changed '+diff.changedPixels+' px ('+(diff.changedRatio*100).toFixed(3)+'%) · max channel Δ '+diff.maxChannelDelta+' · silhouette Δ '+diff.silhouetteMismatch+' · native bounds '+(diff.boundsEqual?'match':'DIFFER');panel.appendChild(gate);
 const authored=document.createElement('p');authored.textContent='Authored overlap · '+state.authoring.retainedUnderlapPixels+' high-opacity underlap px retained · '+state.authoring.zeroedDuplicatePixels+' duplicate px removed · alpha-island inference OFF';panel.appendChild(authored);
 const note=document.createElement('p');note.textContent='Gate only: neutral, +20° elbow, +10° shoulder, +10° knee. Run / Attack / Recoil remain blocked.';panel.appendChild(note);
 const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px';
 const master=card('Approved neutral master (V1)',state.master,state.masterSurface);master.querySelector('canvas').dataset.masterPreview='';grid.appendChild(master);
 for(const pose of POSES){const surface=pose.id==='neutral'?state.candidateSurface:articulationSurface(pose.rotations),item=card('V2 · '+pose.label,state.candidate,surface);item.querySelector('canvas').dataset.v2Pose=pose.id;grid.appendChild(item);}panel.appendChild(grid);
 const parts=document.createElement('pre');parts.style.cssText='white-space:pre-wrap;margin-top:12px';parts.textContent=state.candidate.manifest.components.map(c=>{const a=c.attachments.find(x=>x.id===c.defaultAttachment);return c.slot+' ← '+a.sourceRegion+' · '+a.atlasRect.w+'×'+a.atlasRect.h+' · pivot '+a.pivot.join(',')+' · '+c.parentBone;}).join('\n');panel.appendChild(parts);return true;
}
function ensureControl(){if(!devEnabled()||document.getElementById('bb-scorpion-puppet-v2-lab-switch'))return;const b=document.createElement('button');b.id='bb-scorpion-puppet-v2-lab-switch';b.textContent='SCORPION · PUPPET V2';b.onclick=openLab;b.style.cssText='position:fixed;z-index:2147483000;right:10px;bottom:80px;padding:8px;background:#151d28;color:#ffe3a4;border:1px solid #d7ae61';document.body.appendChild(b);}
window.BlazingScorpionPuppetAtlasV2=Object.freeze({version:'scorpion-puppet-atlas-v2-articulation-gate',get ready(){return state.ready},get error(){return state.error},get manifest(){return state.candidate?.manifest},get neutralDiff(){return state.neutralDiff},get authoring(){return state.authoring},get components(){return state.candidate?.manifest.components||[]},poses:POSES.map(p=>({id:p.id,label:p.label})),openLab,articulationSurface:(id)=>{const pose=POSES.find(p=>p.id===id);if(!state.ready||!pose)throw new Error('Unknown/unready V2 pose '+id);return pose.id==='neutral'?state.candidateSurface:articulationSurface(pose.rotations);}});
(async()=>{try{
 if(!contract)throw new Error('Puppet Atlas Contract v1 module missing');
 const [masterManifest,candidateSourceManifest,schema]=await Promise.all([json(MASTER),json(CANDIDATE),json(SCHEMA)]);contract.validate(masterManifest,schema);contract.validate(candidateSourceManifest,schema);
 if(candidateSourceManifest.components.length<15||candidateSourceManifest.components.length>20)throw new Error('V2 requires 15–20 deliberately authored pieces');
 const [masterImage,masterMap]=await Promise.all([imageReady(masterManifest.atlas.image),json(masterManifest.atlas.map)]),masterSource={width:masterImage.naturalWidth,height:masterImage.naturalHeight,map:masterMap};
 contract.validate(masterManifest,schema,masterSource);const master=contract.compile(masterManifest,schema,masterSource),masterSurface=contract.rasterize(master,masterImage);contract.verifyPixels(master,masterSurface);
 const authored=buildAuthoredAtlas(masterImage,candidateSourceManifest),candidateSource={width:authored.image.width,height:authored.image.height,map:authored.map};
 contract.validate(authored.manifest,schema,candidateSource);const candidate=contract.compile(authored.manifest,schema,candidateSource),candidateSurface=contract.rasterize(candidate,authored.image);contract.verifyPixels(candidate,candidateSurface);
 Object.assign(state,{image:authored.image,map:authored.map,masterImage,master,candidate,masterSurface,candidateSurface,neutralDiff:nativeDiff(masterSurface,candidateSurface),authoring:authored.metrics,ready:true});
 }catch(error){state.error=String(error?.message||error);console.warn('Scorpion Puppet Atlas V2 candidate unavailable.',error);}finally{ensureControl();}})();
})();