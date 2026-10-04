import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {contract,schema,validateFile} from './validate-puppet-atlas-contract-v1.mjs';
import {decodePngRgba} from './lib/png-rgba.mjs';
import {generateScorpionPuppetRuntimeAtlasV2} from './generate-scorpion-puppet-runtime-atlas-v2.mjs';

const V2='assets/characters/scorpion/data/puppet-atlas-v2.json';
await generateScorpionPuppetRuntimeAtlasV2();
const manifest=JSON.parse(await fs.readFile(V2,'utf8'));
await validateFile(V2);

assert.equal(manifest.contractVersion,'blazing-battle-puppet-atlas-v1','V2 must reuse Contract v1 without redesign');
assert.equal(manifest.components.length,15,'Canonical Scorpion V2 should use exactly 15 required anatomical pieces');
assert.deepEqual(manifest.supportedStates,['neutral'],'Idle/Run/Attack/Recoil stay blocked until packed-neutral approval');
assert.ok(manifest.components.every(c=>c.covers.length===0),'V2 must expose every anatomical piece directly');
assert.equal(manifest.atlas.image,'assets/characters/scorpion/puppet/v2/runtime/scorpion_puppet_v2_runtime_atlas.png');
assert.equal(manifest.atlas.map,'assets/characters/scorpion/puppet/v2/runtime/scorpion_puppet_v2_runtime_atlas.json');
assert.equal(manifest.atlas.width,2720);assert.equal(manifest.atlas.height,1560);

const slots=new Set(manifest.components.map(c=>c.slot));
for(const slot of manifest.requiredSlots)assert.ok(slots.has(slot),'Missing explicit V2 slot '+slot);
assert.deepEqual([...slots].sort(),[...manifest.requiredSlots].sort(),'V2 should not contain alternate or duplicate runtime slots');

const map=JSON.parse(await fs.readFile(manifest.atlas.map,'utf8'));
assert.deepEqual(map.canvas,[manifest.atlas.width,manifest.atlas.height]);
assert.equal(map.metadata?.approvedSourceMaster,'assets/characters/scorpion/puppet/v2/source/scorpion_puppet_v2_master.png');
assert.equal(map.metadata?.sourceSemanticMap,'assets/characters/scorpion/puppet/v2/body/scorpion_puppet_body_atlas_v2.json');
assert.equal(map.metadata?.neutralReference,'assets/characters/scorpion/puppet/v2/body/scorpion_puppet_neutral_reference_v2.json');
assert.equal(map.metadata?.authoringMode,'manual-semantic-runtime-pack-v2');
assert.equal(map.metadata?.semanticBodyPartMap,true);
assert.equal(map.metadata?.automaticAlphaIslandMapping,false,'Automatic alpha-island mapping is forbidden for V2');
assert.equal(map.metadata?.weaponAndVfxExcluded,true);assert.equal(map.metadata?.sourceSheetApproved,true);
assert.equal(map.metadata?.runtimePackingPending,false);assert.equal(map.metadata?.visualAuthority,'coherent-neutral-restored');
assert.equal(map.metadata?.pieceCount,15);assert.ok(map.metadata?.gutterPixels>=96);assert.deepEqual(map.metadata?.cellSize,[544,520]);
assert.equal(Object.keys(map.parts).length,15);

const sourceMap=JSON.parse(await fs.readFile(map.metadata.sourceSemanticMap,'utf8'));
assert.equal(sourceMap.metadata?.semanticBodyPartMap,true);assert.equal(sourceMap.metadata?.automaticAlphaIslandMapping,false);
assert.equal(sourceMap.metadata?.approvedSourceMaster,map.metadata.approvedSourceMaster);
assert.equal(sourceMap.metadata?.visualAuthority,'coherent-neutral-restored');
const neutralReference=JSON.parse(await fs.readFile(map.metadata.neutralReference,'utf8'));
assert.equal(neutralReference.version,'scorpion-puppet-neutral-reference-v2');
assert.equal(neutralReference.approvedSourceMaster,map.metadata.approvedSourceMaster);
assert.equal(neutralReference.visualAuthority,'coherent-neutral-restored');
assert.deepEqual(neutralReference.visualBounds,manifest.neutral.visualBounds);assert.equal(neutralReference.pieces.length,15);
const neutralBySlot=new Map(neutralReference.pieces.map(p=>[p.slot,p]));

const semanticBySlot=new Map(),runtimeRects=[];
for(const [id,part] of Object.entries(map.parts)){
 assert.equal(part.authored,true,'All V2 pieces must be manually authored: '+id);assert.equal(part.canonical,true,'All V2 pieces must be canonical: '+id);
 assert.ok(typeof part.slot==='string'&&part.slot);assert.ok(typeof part.bodyPart==='string'&&part.bodyPart);assert.ok(['left','right','center'].includes(part.side));
 assert.ok(typeof part.segment==='string'&&part.segment);assert.ok(typeof part.parentBone==='string'&&part.parentBone);assert.ok(Array.isArray(part.pivot)&&part.pivot.length===2);
 assert.ok(Array.isArray(part.neutralTopLeft)&&part.neutralTopLeft.length===2);assert.ok(typeof part.sourceComponentId==='string'&&part.sourceComponentId);
 assert.ok(part.sourceRect&&Number.isFinite(part.sourceRect.x)&&Number.isFinite(part.sourceRect.y));
 assert.ok(!semanticBySlot.has(part.slot),'Duplicate semantic slot '+part.slot);semanticBySlot.set(part.slot,{id,...part});runtimeRects.push({id,...part});
 const sourcePart=sourceMap.parts[id];assert.ok(sourcePart,'Missing source semantic part '+id);
 assert.equal(sourcePart.slot,part.slot);assert.equal(sourcePart.bodyPart,part.bodyPart);assert.equal(sourcePart.side,part.side);assert.equal(sourcePart.segment,part.segment);
 assert.equal(sourcePart.parentBone,part.parentBone);assert.deepEqual(sourcePart.pivot,part.pivot);assert.deepEqual(sourcePart.neutralTopLeft,part.neutralTopLeft);
 assert.equal(sourcePart.sourceComponentId,part.sourceComponentId);
 assert.deepEqual(part.sourceRect,{x:sourcePart.x,y:sourcePart.y,w:sourcePart.w,h:sourcePart.h},'Approved-source coordinate drift '+id);
 const ref=neutralBySlot.get(part.slot);assert.ok(ref,'Neutral reference missing '+part.slot);
 assert.deepEqual(ref.sourceRect,part.sourceRect,'Neutral/source crop drift '+part.slot);assert.deepEqual(ref.topLeft,part.neutralTopLeft,'Neutral placement drift '+part.slot);
 assert.deepEqual(ref.pivot,part.pivot,'Neutral pivot drift '+part.slot);assert.equal(ref.zOrder,part.zOrder);assert.equal(ref.sourceComponentId,part.sourceComponentId);
}
assert.equal(semanticBySlot.get('leftHand').bodyPart,'closed_fist');assert.equal(semanticBySlot.get('rightHand').bodyPart,'closed_fist');

const [cellW,cellH]=map.metadata.cellSize,g=map.metadata.gutterPixels;
for(const [index,id] of map.metadata.packingOrder.entries()){
 const part=map.parts[id];assert.ok(part,'Packing order references missing part '+id);const row=Math.floor(index/5),col=index%5,cx=col*cellW,cy=row*cellH;
 assert.ok(part.x>=cx+g&&part.y>=cy+g,'Part violates leading gutter '+id);assert.ok(part.x+part.w<=cx+cellW-g&&part.y+part.h<=cy+cellH-g,'Part violates trailing gutter '+id);
}
for(let i=0;i<runtimeRects.length;i++)for(let j=i+1;j<runtimeRects.length;j++){const a=runtimeRects[i],b=runtimeRects[j],overlap=!(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);assert.equal(overlap,false,'Runtime cells overlap '+a.id+' / '+b.id);}

for(const component of manifest.components){const a=component.attachments.find(x=>x.id===component.defaultAttachment),part=map.parts[a.sourceRegion];assert.ok(part,'Missing runtime semantic part '+a.sourceRegion);assert.equal(part.slot,component.slot);assert.equal(part.parentBone,component.parentBone);assert.equal(part.zOrder,component.zOrder);assert.deepEqual(a.pivot,part.pivot);assert.deepEqual(a.atlasRect,{x:part.x,y:part.y,w:part.w,h:part.h});}

const source={width:manifest.atlas.width,height:manifest.atlas.height,map},model=contract.compile(manifest,schema,source),neutral=contract.assemble(model.manifest);
assert.deepEqual(neutral.bounds,manifest.neutral.visualBounds,'Packed V2 zero-transform rectangle must equal coherent neutral bounds');
for(const part of neutral.parts){const semantic=semanticBySlot.get(part.slot),a=part.attachment,topLeft=contract.point(part.matrix,[-a.pivot[0],-a.pivot[1]]);assert.deepEqual(topLeft,semantic.neutralTopLeft,'Zero-transform placement drift '+part.slot);}
const rad=d=>d*Math.PI/180;for(const [name,rotations] of [['elbow',{leftElbow:rad(20)}],['shoulder',{leftShoulder:rad(10)}],['knee',{leftKnee:rad(10)}]]){const pose=contract.assemble(model.manifest,{boneRotations:rotations});assert.ok(Number.isFinite(pose.bounds.x)&&Number.isFinite(pose.bounds.y)&&pose.bounds.w>0&&pose.bounds.h>0,name+' articulation did not assemble');}

// Pixel authority check: every runtime cell must be an exact native-pixel copy of its authored source rectangle, with transparent space everywhere else.
const sourcePng=decodePngRgba(await fs.readFile(map.metadata.approvedSourceMaster)),runtimePng=decodePngRgba(await fs.readFile(manifest.atlas.image));
assert.equal(sourcePng.width,1448);assert.equal(sourcePng.height,1086);assert.equal(runtimePng.width,manifest.atlas.width);assert.equal(runtimePng.height,manifest.atlas.height);
const occupied=new Uint8Array(runtimePng.width*runtimePng.height);
for(const id of map.metadata.packingOrder){const p=map.parts[id],s=p.sourceRect;assert.equal(p.w,s.w);assert.equal(p.h,s.h);for(let y=0;y<p.h;y++){
 const srcStart=((s.y+y)*sourcePng.width+s.x)*4,dstStart=((p.y+y)*runtimePng.width+p.x)*4;
 assert.ok(sourcePng.data.subarray(srcStart,srcStart+p.w*4).equals(runtimePng.data.subarray(dstStart,dstStart+p.w*4)),'Runtime pixel drift '+id+' row '+y);
 occupied.fill(1,(p.y+y)*runtimePng.width+p.x,(p.y+y)*runtimePng.width+p.x+p.w);
}}
for(let i=0;i<occupied.length;i++)if(!occupied[i])assert.equal(runtimePng.data[i*4+3],0,'Non-transparent pixel outside authored runtime cells at '+i);

const runtime=await fs.readFile('runtime/rendering/scorpion-puppet-atlas-v2.js','utf8');
for(const marker of ['manual-semantic-runtime-pack-v2','semanticBodyPartMap','runtimePackingPending','Elbow +20°','Shoulder +10°','Knee +10°','BlazingScorpionPuppetAtlasV2'])assert.ok(runtime.includes(marker),'V2 runtime lab missing '+marker);
for(const forbidden of ['extractBodyComponents','candidateComponents','automaticAlphaIslandMapping=true'])assert.ok(!runtime.includes(forbidden),'V2 runtime reintroduced forbidden inference '+forbidden);
const postprocess=await fs.readFile('scripts/scorpion-puppet-atlas-postprocess.mjs','utf8');assert.ok(postprocess.includes('scorpion-puppet-atlas-v2.js'));assert.ok(!postprocess.includes("'scorpion-puppet-atlas-v2-motion.js'"),'Motion preview must stay blocked during packed-neutral gate');

console.log('Scorpion Puppet Atlas V2 PASS: coherent neutral authority locked; 15 isolated PNG runtime cells; 128px gutters; explicit semantic coordinates/pivots; exact source-pixel identity; Contract v1 unchanged; motion blocked pending visual approval.');
