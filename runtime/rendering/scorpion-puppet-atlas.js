(()=>{
'use strict';
const MANIFEST='assets/characters/scorpion/data/puppet-atlas-v1.json';
const SCHEMA='config/puppet-atlas-contract-v1.schema.json';
const MODE_KEY='bb.scorpion-puppet-atlas.mode',DEV_KEY='bb.scorpion-puppet-atlas.dev';
const contract=globalThis.BlazingPuppetAtlasContractV1;
const state={mode:'FRAME',ready:false,error:null,model:null,surface:null,image:null,map:null,pixels:null,metrics:{puppetDraws:0,lastVisibleParts:0,lastFeet:null,lastDrawBounds:null,footSamples:[]}};
const devEnabled=()=>{try{const q=new URLSearchParams(location.search);return q.has('scorpionPuppetAB')||q.has('scorpionPuppetLab')||localStorage.getItem(DEV_KEY)==='1'||['localhost','127.0.0.1','::1'].includes(location.hostname);}catch(_){return false;}};
// Old lab assignment keys are deliberately never read or migrated into anatomy.
const wantsPuppet=()=>devEnabled()&&state.mode==='PUPPET'&&state.ready;
function setMode(mode){state.mode=mode==='PUPPET'&&state.ready&&devEnabled()?'PUPPET':'FRAME';try{localStorage.setItem(MODE_KEY,state.mode);}catch(_){}const b=document.getElementById('bb-scorpion-puppet-ab-switch');if(b)b.textContent='SCORPION · '+state.mode+' (A/B)';return state.mode;}
function disable(error){state.ready=false;state.error=String(error?.message||error);setMode('FRAME');console.warn('Scorpion puppet unavailable; retaining frame animation.',state.error);}
async function json(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error('Could not load '+path+' ('+r.status+')');return r.json();}
function imageReady(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not load '+src));image.src=src;});}
function footDrift(){const samples=state.metrics.footSamples;if(!samples.length)return {samples:0,left:0,right:0,max:0};const range=a=>Math.max(...a)-Math.min(...a),drift=side=>Math.max(range(samples.map(s=>s[side].x)),range(samples.map(s=>s[side].y)));const left=drift('left'),right=drift('right');return {samples:samples.length,left,right,max:Math.max(left,right)};}
function render(ctx,{bodyHeight=68,measure=false}={}){
 if(!wantsPuppet())return false;
 try{
  const out=contract.render(ctx,state.model,state.surface,{bodyHeight,baseline:12});
  if(!measure){
   const m=ctx.getTransform(),feet=out.feet.map(f=>({x:m.a*f.point[0]+m.c*f.point[1]+m.e,y:m.b*f.point[0]+m.d*f.point[1]+m.f}));
   state.metrics.puppetDraws++;state.metrics.lastVisibleParts=state.model.neutral.parts.length;state.metrics.lastDrawBounds=out.bounds;state.metrics.lastFeet={left:feet[0],right:feet[1]};state.metrics.footSamples.push(state.metrics.lastFeet);if(state.metrics.footSamples.length>720)state.metrics.footSamples.shift();
  }
  return true;
 }catch(error){disable(error);return false;}
}
function openLab(){
 if(!devEnabled())return false;
 let panel=document.getElementById('bb-scorpion-puppet-lab');
 if(!panel){panel=document.createElement('section');panel.id='bb-scorpion-puppet-lab';panel.style.cssText='position:fixed;z-index:2147483001;inset:4vh 3vw;overflow:auto;padding:16px;border:1px solid #d7ae61;background:#101820;color:#eef4f7;font:13px system-ui';document.body.appendChild(panel);}
 panel.replaceChildren();panel.hidden=false;
 const title=document.createElement('h2');title.textContent='Scorpion · Puppet Atlas Contract v1';panel.appendChild(title);
 const close=document.createElement('button');close.textContent='Close lab';close.onclick=()=>{panel.hidden=true;};panel.appendChild(close);
 const status=document.createElement('p');status.textContent=state.ready?'Read-only authored manifest · static neutral pose · native source pixels · one whole-body normalization':state.error||'Loading authored manifest…';panel.appendChild(status);
 if(!state.ready)return true;
 const preview=document.createElement('canvas');preview.dataset.preview='';preview.width=480;preview.height=620;preview.style.cssText='display:block;max-width:100%;background:#25323e';panel.appendChild(preview);
 const ctx=preview.getContext('2d');ctx.translate(240,585);contract.render(ctx,state.model,state.surface,{bodyHeight:550,baseline:0});ctx.strokeStyle='#69dec5';ctx.beginPath();ctx.moveTo(-220,.5);ctx.lineTo(220,.5);ctx.stroke();
 const table=document.createElement('pre');table.textContent=state.model.manifest.components.map(c=>{const a=c.attachments.find(a=>a.id===c.defaultAttachment);return c.slot+' ← '+a.sourceRegion+' · '+a.atlasRect.w+'×'+a.atlasRect.h+' · pivot '+a.pivot.join(',')+' · '+c.parentBone+(c.covers.length?' · includes '+c.covers.join(', '):'');}).join('\n');panel.appendChild(table);return true;
}
function ensureControls(){if(!devEnabled())return;for(const [id,text,action,bottom] of [['bb-scorpion-puppet-ab-switch','SCORPION · '+state.mode+' (A/B)',()=>setMode(state.mode==='FRAME'?'PUPPET':'FRAME'),10],['bb-scorpion-puppet-lab-switch','SCORPION · ATLAS LAB',openLab,45]]){if(document.getElementById(id))continue;const b=document.createElement('button');b.id=id;b.textContent=text;b.onclick=action;b.style.cssText='position:fixed;z-index:2147483000;right:10px;bottom:'+bottom+'px;padding:8px;background:#151d28;color:#ffe3a4;border:1px solid #d7ae61';document.body.appendChild(b);}}
window.BlazingScorpionPuppetAtlasV1=Object.freeze({
 version:'puppet-atlas-contract-v1',durationMs:0,
 get mode(){return state.mode},get ready(){return state.ready},get error(){return state.error},get manifest(){return state.model?.manifest},
 get semanticSlots(){return state.model?.manifest.requiredSlots||[]},get joints(){return state.model?.manifest.bones.map(b=>b.id)||[]},
 get metrics(){return {...state.metrics,footDrift:footDrift()}},get pixelValidation(){return state.pixels},
 get bodyAtlas(){return {src:state.model?.manifest.atlas.image,width:state.image?.naturalWidth||0,height:state.image?.naturalHeight||0}},
 get componentAssignments(){return Object.fromEntries((state.model?.manifest.components||[]).map(c=>[c.slot,c.defaultAttachment]))},
 get components(){return state.model?.manifest.components||[]},get rectangleMap(){return state.map},
 setMode,wantsPuppet,render,openLab,footDrift,validate:()=>state.ready,
 idleJointSamples:()=>Array.from({length:37},(_,i)=>({t:i*50,left:{x:state.model?.neutral.feet[0].point[0],y:state.model?.neutral.feet[0].point[1]},right:{x:state.model?.neutral.feet[1].point[0],y:state.model?.neutral.feet[1].point[1]}}))
});
(async()=>{try{
 if(!contract)throw new Error('Puppet Atlas Contract v1 module missing');
 const [manifest,schema]=await Promise.all([json(MANIFEST),json(SCHEMA)]);
 contract.validate(manifest,schema);
 const [image,map]=await Promise.all([imageReady(manifest.atlas.image),json(manifest.atlas.map)]);
 const model=contract.compile(manifest,schema,{width:image.naturalWidth,height:image.naturalHeight,map});
 // Complete offscreen first. Invalid crops/empty pixels never partially paint a fighter.
 const surface=contract.rasterize(model,image),pixels=contract.verifyPixels(model,surface);
 Object.assign(state,{model,surface,pixels,image,map,ready:true});let mode='FRAME';try{mode=localStorage.getItem(MODE_KEY);}catch(_){}setMode(mode);
 }catch(error){disable(error);}finally{ensureControls();}})();
})();
