import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {contract,schema,validateFile} from './validate-puppet-atlas-contract-v1.mjs';

const V2='assets/characters/scorpion/data/puppet-atlas-v2.json';
const manifest=JSON.parse(await fs.readFile(V2,'utf8'));
await validateFile(V2);

assert.equal(manifest.contractVersion,'blazing-battle-puppet-atlas-v1','V2 must reuse Contract v1 without redesign');
assert.equal(manifest.components.length,15,'Canonical Scorpion V2 should use exactly 15 required anatomical pieces');
assert.deepEqual(manifest.supportedStates,['neutral'],'Idle/Run/Attack/Recoil stay blocked until packed-neutral approval');
assert.ok(manifest.components.every(c=>c.covers.length===0),'V2 must expose every anatomical piece directly');

const slots=new Set(manifest.components.map(c=>c.slot));
for(const slot of manifest.requiredSlots)assert.ok(slots.has(slot),'Missing explicit V2 slot '+slot);
assert.deepEqual([...slots].sort(),[...manifest.requiredSlots].sort(),'V2 should not contain alternate or duplicate runtime slots');

assert.equal(manifest.atlas.image,'assets/characters/scorpion/puppet/v2/runtime/scorpion_puppet_v2_runtime_atlas.svg');
assert.equal(manifest.atlas.map,'assets/characters/scorpion/puppet/v2/runtime/scorpion_puppet_v2_runtime_atlas.json');
assert.equal(manifest.atlas.width,2720);
assert.equal(manifest.atlas.height,1560);

const map=JSON.parse(await fs.readFile(manifest.atlas.map,'utf8'));
assert.deepEqual(map.canvas,[manifest.atlas.width,manifest.atlas.height]);
assert.equal(map.metadata?.approvedSourceMaster,'assets/characters/scorpion/puppet/v2/source/scorpion_puppet_v2_master.png');
assert.equal(map.metadata?.sourceSemanticMap,'assets/characters/scorpion/puppet/v2/body/scorpion_puppet_body_atlas_v2.json');
assert.equal(map.metadata?.neutralReference,'assets/characters/scorpion/puppet/v2/body/scorpion_puppet_neutral_reference_v2.json');
assert.equal(map.metadata?.authoringMode,'manual-semantic-runtime-pack-v2');
assert.equal(map.metadata?.semanticBodyPartMap,true,'Every runtime atlas part must carry explicit semantic body-part metadata');
assert.equal(map.metadata?.automaticAlphaIslandMapping,false,'Automatic alpha-island mapping is forbidden for V2');
assert.equal(map.metadata?.weaponAndVfxExcluded,true);
assert.equal(map.metadata?.sourceSheetApproved,true);
assert.equal(map.metadata?.runtimePackingPending,false,'Packed runtime atlas must be complete before test');
assert.equal(map.metadata?.pieceCount,15);
assert.ok(map.metadata?.gutterPixels>=96,'Runtime atlas needs production-safe gutters');
assert.deepEqual(map.metadata?.cellSize,[544,520]);
assert.equal(Object.keys(map.parts).length,15);

const sourceMap=JSON.parse(await fs.readFile(map.metadata.sourceSemanticMap,'utf8'));
assert.equal(sourceMap.metadata?.semanticBodyPartMap,true,'Source semantic map must remain authoritative');
assert.equal(sourceMap.metadata?.automaticAlphaIslandMapping,false);
assert.equal(sourceMap.metadata?.approvedSourceMaster,map.metadata.approvedSourceMaster);

const semanticBySlot=new Map();
const runtimeRects=[];
for(const [id,part] of Object.entries(map.parts)){
 assert.equal(part.authored,true,'All V2 pieces must be manually authored: '+id);
 assert.equal(part.canonical,true,'All V2 runtime pieces must be canonical: '+id);
 assert.ok(typeof part.slot==='string'&&part.slot.length>0,'Missing semantic slot '+id);
 assert.ok(typeof part.bodyPart==='string'&&part.bodyPart.length>0,'Missing bodyPart metadata '+id);
 assert.ok(['left','right','center'].includes(part.side),'Invalid side metadata '+id);
 assert.ok(typeof part.segment==='string'&&part.segment.length>0,'Missing segment metadata '+id);
 assert.ok(typeof part.parentBone==='string'&&part.parentBone.length>0,'Missing parentBone metadata '+id);
 assert.ok(Array.isArray(part.pivot)&&part.pivot.length===2,'Missing pivot metadata '+id);
 assert.ok(Array.isArray(part.neutralTopLeft)&&part.neutralTopLeft.length===2,'Missing neutral coordinate metadata '+id);
 assert.ok(typeof part.sourceComponentId==='string'&&part.sourceComponentId.length>0,'Missing authored source component ID '+id);
 assert.ok(part.sourceRect&&Number.isFinite(part.sourceRect.x)&&Number.isFinite(part.sourceRect.y),'Missing approved-source coordinates '+id);
 assert.ok(part.x>=0&&part.y>=0&&part.x+part.w<=manifest.atlas.width&&part.y+part.h<=manifest.atlas.height,'Runtime rectangle out of bounds '+id);
 assert.ok(!semanticBySlot.has(part.slot),'Duplicate semantic slot in runtime map '+part.slot);
 semanticBySlot.set(part.slot,{id,...part});runtimeRects.push({id,...part});
 const sourcePart=sourceMap.parts[id];
 assert.ok(sourcePart,'Missing source semantic part '+id);
 assert.equal(sourcePart.slot,part.slot,'Source/runtime semantic slot drift '+id);
 assert.equal(sourcePart.bodyPart,part.bodyPart,'Source/runtime bodyPart drift '+id);
 assert.equal(sourcePart.side,part.side,'Source/runtime side drift '+id);
 assert.deepEqual(part.sourceRect,{x:sourcePart.x,y:sourcePart.y,w:sourcePart.w,h:sourcePart.h},'Approved-source coordinate drift '+id);
}

const [cellW,cellH]=map.metadata.cellSize,g=map.metadata.gutterPixels;
for(const [index,id] of map.metadata.packingOrder.entries()){
 const part=map.parts[id];assert.ok(part,'Packing order references missing part '+id);
 const row=Math.floor(index/5),col=index%5,cx=col*cellW,cy=row*cellH;
 assert.ok(part.x>=cx+g&&part.y>=cy+g,'Part violates leading gutter '+id);
 assert.ok(part.x+part.w<=cx+cellW-g&&part.y+part.h<=cy+cellH-g,'Part violates trailing gutter '+id);
}
for(let i=0;i<runtimeRects.length;i++)for(let j=i+1;j<runtimeRects.length;j++){
 const a=runtimeRects[i],b=runtimeRects[j],overlap=!(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
 assert.equal(overlap,false,'Runtime atlas cells overlap: '+a.id+' / '+b.id);
}

for(const component of manifest.components){
 const a=component.attachments.find(x=>x.id===component.defaultAttachment),part=map.parts[a.sourceRegion];
 assert.ok(part,'Missing runtime semantic map part '+a.sourceRegion);
 assert.equal(part.slot,component.slot,'Semantic slot drift '+component.slot);
 assert.equal(part.parentBone,component.parentBone,'Parent bone drift '+component.slot);
 assert.equal(part.zOrder,component.zOrder,'Z-order drift '+component.slot);
 assert.deepEqual(a.pivot,part.pivot,'Pivot metadata drift '+component.slot);
 assert.deepEqual(a.atlasRect,{x:part.x,y:part.y,w:part.w,h:part.h},'Runtime atlas coordinate drift '+component.slot);
}
assert.equal(semanticBySlot.get('leftHand').bodyPart,'closed_fist');
assert.equal(semanticBySlot.get('rightHand').bodyPart,'closed_fist');

const neutralReference=JSON.parse(await fs.readFile(map.metadata.neutralReference,'utf8'));
assert.equal(neutralReference.version,'scorpion-puppet-neutral-reference-v2');
assert.equal(neutralReference.approvedSourceMaster,map.metadata.approvedSourceMaster);
assert.deepEqual(neutralReference.visualBounds,manifest.neutral.visualBounds);
assert.equal(neutralReference.pieces.length,15);
const neutralBySlot=new Map(neutralReference.pieces.map(p=>[p.slot,p]));
for(const c of manifest.components){
 const runtime=semanticBySlot.get(c.slot),source=sourceMap.parts[runtime.id],ref=neutralBySlot.get(c.slot);
 assert.ok(ref,'Neutral reference missing '+c.slot);
 assert.deepEqual(ref.sourceRect,{x:source.x,y:source.y,w:source.w,h:source.h},'Neutral approved-source crop drift '+c.slot);
 assert.deepEqual(ref.topLeft,runtime.neutralTopLeft,'Neutral placement metadata drift '+c.slot);
 assert.deepEqual(ref.pivot,runtime.pivot,'Neutral pivot metadata drift '+c.slot);
 assert.equal(ref.zOrder,c.zOrder,'Neutral z-order drift '+c.slot);
 assert.equal(ref.sourceComponentId,runtime.sourceComponentId,'Neutral source-component drift '+c.slot);
}

const source={width:manifest.atlas.width,height:manifest.atlas.height,map};
const model=contract.compile(manifest,schema,source),neutral=contract.assemble(model.manifest);
assert.deepEqual(neutral.bounds,manifest.neutral.visualBounds,'Packed V2 zero-transform rectangle must equal authored semantic neutral bounds');
for(const part of neutral.parts){
 const semantic=semanticBySlot.get(part.slot),a=part.attachment,topLeft=contract.point(part.matrix,[-a.pivot[0],-a.pivot[1]]);
 assert.ok(Math.abs(topLeft[0]-semantic.neutralTopLeft[0])<1e-9&&Math.abs(topLeft[1]-semantic.neutralTopLeft[1])<1e-9,'Zero-transform placement drift '+part.slot+' '+JSON.stringify({topLeft,expected:semantic.neutralTopLeft}));
}

const rad=d=>d*Math.PI/180;
for(const [name,rotations] of [['elbow',{leftElbow:rad(20)}],['shoulder',{leftShoulder:rad(10)}],['knee',{leftKnee:rad(10)}]]){
 const pose=contract.assemble(model.manifest,{boneRotations:rotations});
 assert.ok(Number.isFinite(pose.bounds.x)&&Number.isFinite(pose.bounds.y)&&pose.bounds.w>0&&pose.bounds.h>0,name+' articulation did not assemble');
}

const svg=await fs.readFile(manifest.atlas.image,'utf8');
assert.ok(svg.includes('width="2720"')&&svg.includes('height="1560"'),'Packed SVG dimensions missing');
assert.equal((svg.match(/<svg x=/g)||[]).length,15,'Packed SVG must contain exactly 15 isolated body-part cells');
assert.equal((svg.match(/scorpion_puppet_v2_master\.png/g)||[]).length,15,'Every packed cell must trace to approved master');

const runtime=await fs.readFile('runtime/rendering/scorpion-puppet-atlas-v2.js','utf8');
for(const marker of ['manual-semantic-runtime-pack-v2','semanticBodyPartMap','runtimePackingPending','Elbow +20°','Shoulder +10°','Knee +10°','BlazingScorpionPuppetAtlasV2'])assert.ok(runtime.includes(marker),'V2 runtime lab missing '+marker);
for(const forbidden of ['extractBodyComponents','candidateComponents','automaticAlphaIslandMapping=true'])assert.ok(!runtime.includes(forbidden),'V2 runtime reintroduced forbidden inference '+forbidden);

const postprocess=await fs.readFile('scripts/scorpion-puppet-atlas-postprocess.mjs','utf8');
assert.ok(postprocess.includes('scorpion-puppet-atlas-v2.js'),'V2 lab is not injected into Cloudflare build');
assert.ok(!postprocess.includes("'scorpion-puppet-atlas-v2-motion.js'"),'Motion preview must stay blocked during packed-neutral gate');
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
assert.ok(pkg.scripts.validate.includes('validate-scorpion-puppet-atlas-v2.mjs'),'V2 validator is not part of npm validate');

console.log('Scorpion Puppet Atlas V2 PASS: 15 isolated runtime cells with >=96px gutters, explicit semantic body-part metadata, exact approved-source coordinates, pivots, neutral placement coordinates, and Contract v1 unchanged. Motion stays blocked pending visual neutral approval.');
