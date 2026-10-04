/* Puppet Atlas Contract v1. Same pure validator/assembler in Node and browser. */
(function(root){
'use strict';
const VERSION='blazing-battle-puppet-atlas-v1';
const fail=message=>{throw new Error('Puppet Atlas Contract v1: '+message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const point=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
const rigid=(offset,r)=>[Math.cos(r),Math.sin(r),-Math.sin(r),Math.cos(r),...offset];
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
// Implements exactly the keywords used by the checked-in schema, not a general JSON Schema engine.
function validateShape(value,schema,path='$'){
 if('const' in schema&&!same(value,schema.const))fail(path+' must equal '+JSON.stringify(schema.const));
 if(schema.type){
  const types=[schema.type].flat(),type=value===null?'null':Array.isArray(value)?'array':typeof value;
  if(!types.some(t=>t===type||(t==='integer'&&Number.isInteger(value))))fail(path+' has invalid type');
 }
 if(typeof value==='number'){
  if(!Number.isFinite(value))fail(path+' must be finite');
  if('minimum' in schema&&value<schema.minimum||'maximum' in schema&&value>schema.maximum||'exclusiveMinimum' in schema&&value<=schema.exclusiveMinimum)fail(path+' outside range');
 }
 if(typeof value==='string'&&value.length<(schema.minLength||0))fail(path+' is empty');
 if(Array.isArray(value)){
  if(value.length<(schema.minItems||0)||value.length>(schema.maxItems??Infinity))fail(path+' wrong length');
  if(schema.uniqueItems&&new Set(value.map(v=>JSON.stringify(v))).size!==value.length)fail(path+' has duplicates');
  if(schema.items)value.forEach((v,i)=>validateShape(v,schema.items,path+'['+i+']'));
 }else if(value&&typeof value==='object'){
  for(const key of schema.required||[])if(!Object.hasOwn(value,key))fail(path+' missing '+key);
  for(const key of Object.keys(value)){
   if(schema.additionalProperties===false&&!Object.hasOwn(schema.properties||{},key))fail(path+' unknown property '+key+' (piece scaling is forbidden)');
   if(schema.properties?.[key])validateShape(value[key],schema.properties[key],path+'.'+key);
  }
 }
 return true;
}
function assemble(manifest,{boneRotations={},attachments={}}={}){
 const bones=new Map(manifest.bones.map(b=>[b.id,b])),matrices=new Map(),visiting=new Set();
 for(const [id,r] of Object.entries(boneRotations))if(!bones.has(id)||!Number.isFinite(r))fail('invalid skeletal rotation '+id);
 for(const slot of Object.keys(attachments))if(!manifest.components.some(c=>c.slot===slot))fail('unknown attachment slot '+slot);
 function visit(id){
  if(matrices.has(id))return matrices.get(id);
  const bone=bones.get(id);if(!bone)fail('missing parent bone '+id);if(visiting.has(id))fail('cyclic parent hierarchy at '+id);
  visiting.add(id);const local=rigid(bone.restOffset,bone.restRotation+(boneRotations[id]||0));
  const world=bone.parent===null?local:multiply(visit(bone.parent),local);matrices.set(id,world);visiting.delete(id);return world;
 }
 manifest.bones.forEach(b=>visit(b.id));
 const parts=manifest.components.map(c=>{
  const a=c.attachments.find(a=>a.id===(attachments[c.slot]??c.defaultAttachment));if(!a)fail('unknown attachment for '+c.slot);
  const offset=c.attachmentPoint.map((v,i)=>v+a.restOffset[i]);
  const matrix=multiply(visit(c.parentBone),rigid(offset,a.restRotation));
  return {slot:c.slot,zOrder:c.zOrder,attachment:a,matrix};
 }).sort((a,b)=>a.zOrder-b.zOrder||a.slot.localeCompare(b.slot));
 const corners=parts.flatMap(p=>{const {atlasRect:r,pivot:v}=p.attachment;return [[0,0],[r.w,0],[0,r.h],[r.w,r.h]].map(c=>point(p.matrix,[c[0]-v[0],c[1]-v[1]]));});
 const left=Math.floor(Math.min(...corners.map(p=>p[0]))),top=Math.floor(Math.min(...corners.map(p=>p[1])));
 const right=Math.ceil(Math.max(...corners.map(p=>p[0]))),bottom=Math.ceil(Math.max(...corners.map(p=>p[1])));
 const feet=manifest.neutral.feet.map(f=>{const part=parts.find(p=>p.slot===f.slot);if(!part)fail('missing foot slot '+f.slot);return {slot:f.slot,point:point(part.matrix,f.point.map((v,i)=>v-part.attachment.pivot[i]))};});
 return {parts,bones:Object.fromEntries(matrices),feet,bounds:{x:left,y:top,w:right-left,h:bottom-top}};
}
function validate(manifest,schema,{width,height,map}={}){
 validateShape(manifest,schema);
 if(schema.$id!=='blazing-battle:puppet-atlas-contract-v1'||manifest.contractVersion!==VERSION)fail('unsupported schema/version');
 const {atlas}=manifest;
 for(const path of [atlas.image,atlas.map])if(!path.startsWith('assets/characters/'+manifest.unitId+'/')||path.split('/').includes('..')||path.includes('\\')||/[?#:]/.test(path))fail('atlas must stay inside owning character');
 if(width!==undefined&&(width!==atlas.width||height!==atlas.height))fail('actual atlas dimensions mismatch');
 if(map&&(!same(map.canvas,[atlas.width,atlas.height])||!map.parts))fail('source map dimensions/shape mismatch');
 const boneIds=manifest.bones.map(b=>b.id);if(new Set(boneIds).size!==boneIds.length)fail('duplicate bone');
 if(manifest.bones.filter(b=>b.parent===null).length!==1)fail('hierarchy requires one root');
 const occupied=new Set();
 for(const c of manifest.components){
  for(const slot of [c.slot,...c.covers]){if(occupied.has(slot))fail('duplicate mandatory body slot '+slot);occupied.add(slot);}
  if(new Set(c.attachments.map(a=>a.id)).size!==c.attachments.length)fail('duplicate attachment ID for '+c.slot);
  if(!c.attachments.some(a=>a.id===c.defaultAttachment))fail('missing default attachment '+c.slot);
  for(const a of c.attachments){
   const r=a.atlasRect;
   if(r.x+r.w>atlas.width||r.y+r.h>atlas.height)fail('rectangle out of bounds '+a.id);
   if(Math.abs(a.nativeAspectRatio-r.w/r.h)>1e-10)fail('native aspect ratio mismatch '+a.id);
   if(a.pivot[0]<0||a.pivot[0]>r.w||a.pivot[1]<0||a.pivot[1]>r.h)fail('pivot outside crop '+a.id);
   if(map){const src=map.parts[a.sourceRegion];if(!src||r.x<src.x||r.y<src.y||r.x+r.w>src.x+src.w||r.y+r.h>src.y+src.h)fail('crop outside authored source region '+a.id);}
  }
 }
 for(const slot of manifest.requiredSlots)if(!occupied.has(slot))fail('missing required semantic slot '+slot);
 if(new Set(manifest.neutral.feet.map(f=>f.slot)).size!==2)fail('two distinct foot slots required');
 for(const f of manifest.neutral.feet){const c=manifest.components.find(c=>c.slot===f.slot),a=c?.attachments.find(a=>a.id===c.defaultAttachment);if(!a||f.point[0]<0||f.point[0]>a.atlasRect.w||f.point[1]<0||f.point[1]>a.atlasRect.h)fail('foot contact outside crop '+f.slot);}
 const pose=assemble(manifest),n=manifest.neutral,b=n.visualBounds;
 if(Math.abs(b.y+b.h-n.baseline)>n.footTolerance)fail('native bounds must end at baseline');
 if(n.anchorX<b.x||n.anchorX>b.x+b.w)fail('anchor outside body');
 for(const f of pose.feet)if(Math.abs(f.point[1]-n.baseline)>n.footTolerance)fail('unstable feet/baseline '+f.slot);
 if(pose.feet[0].point[0]===pose.feet[1].point[0])fail('foot contacts overlap');
 return {valid:true,slots:occupied.size,parts:pose.parts.length,feet:pose.feet,nativeBounds:b};
}
function compile(manifest,schema,source){
 validate(manifest,schema,source);
 const copy=JSON.parse(JSON.stringify(manifest));return freeze({manifest:copy,neutral:assemble(copy)});
}
function paintNative(ctx,image,pose){
 // No scale, destination sizing, alpha segmentation, or anatomical inference here.
 for(const part of pose.parts){
  const a=part.attachment,r=a.atlasRect;
  ctx.save();try{ctx.transform(...part.matrix);ctx.drawImage(image,r.x,r.y,r.w,r.h,-a.pivot[0],-a.pivot[1],r.w,r.h);}finally{ctx.restore();}
 }
}
function rasterize(model,image,createCanvas=()=>document.createElement('canvas'),options){
 const pose=options?assemble(model.manifest,options):model.neutral,b=pose.bounds,canvas=createCanvas();
 if(b.w>8192||b.h>8192)fail('native surface exceeds limit');canvas.width=b.w;canvas.height=b.h;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)fail('Canvas 2D unavailable');
 ctx.translate(-b.x,-b.y);paintNative(ctx,image,pose);
 return {canvas,pose,bounds:b};
}
function verifyPixels(model,surface){
 const {canvas,bounds}=surface,data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1,count=0;
 for(let i=3;i<data.length;i+=4)if(data[i]>16){const p=(i-3)/4,x=p%canvas.width,y=Math.floor(p/canvas.width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);count++;}
 if(!count)fail('empty neutral body');
 const measured={x:minX+bounds.x,y:minY+bounds.y,w:maxX-minX+1,h:maxY-minY+1},expected=model.manifest.neutral.visualBounds;
 for(const k of ['x','y','w','h'])if(Math.abs(measured[k]-expected[k])>2)fail('neutral pixel bounds mismatch '+JSON.stringify(measured));
 for(const foot of surface.pose.feet){
  let contact=false;const x=Math.round(foot.point[0]-bounds.x),y=Math.round(foot.point[1]-bounds.y);
  for(let dy=-2;dy<=0;dy++)for(let dx=-2;dx<=2;dx++){const px=x+dx,py=y+dy;if(px>=0&&px<canvas.width&&py>=0&&py<canvas.height&&data[(py*canvas.width+px)*4+3]>16)contact=true;}
  if(!contact)fail('foot contact has no source pixels '+foot.slot);
 }
 return {opaquePixels:count,bounds:measured,baseline:measured.y+measured.h};
}
function render(ctx,model,surface,{bodyHeight,baseline=12}={}){
 if(!Number.isFinite(bodyHeight)||bodyHeight<=0||!Number.isFinite(baseline))fail('invalid final normalization');
 const n=model.manifest.neutral,s=bodyHeight/n.visualBounds.h,b=surface.bounds;
 // The sole source-to-logical scaling stage applies to the completed native body.
 ctx.save();try{ctx.translate(0,baseline);ctx.scale(s,s);ctx.translate(-n.anchorX,-n.baseline);ctx.drawImage(surface.canvas,b.x,b.y);}finally{ctx.restore();}
 return {scale:s,feet:surface.pose.feet.map(f=>({slot:f.slot,point:[(f.point[0]-n.anchorX)*s,baseline+(f.point[1]-n.baseline)*s]})),bounds:{x:(n.visualBounds.x-n.anchorX)*s,y:baseline-bodyHeight,w:n.visualBounds.w*s,h:bodyHeight}};
}
root.BlazingPuppetAtlasContractV1=Object.freeze({version:VERSION,validateShape,validate,compile,assemble,paintNative,rasterize,verifyPixels,render,point});
})(globalThis);
