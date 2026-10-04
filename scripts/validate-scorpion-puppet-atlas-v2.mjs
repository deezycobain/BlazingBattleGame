import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {contract,schema,validateFile} from './validate-puppet-atlas-contract-v1.mjs';

const V2='assets/characters/scorpion/data/puppet-atlas-v2.json';
const manifest=JSON.parse(await fs.readFile(V2,'utf8'));
await validateFile(V2);

assert.equal(manifest.contractVersion,'blazing-battle-puppet-atlas-v1','V2 must reuse Contract v1 without redesign');
assert.equal(manifest.components.length,15,'Canonical Scorpion V2 should use exactly the 15 required anatomical pieces');
assert.deepEqual(manifest.supportedStates,['neutral'],'Attack/Recoil production wiring stays blocked during semantic map test');
assert.ok(manifest.components.every(c=>c.covers.length===0),'V2 must expose every anatomical piece directly');

const slots=new Set(manifest.components.map(c=>c.slot));
for(const slot of manifest.requiredSlots)assert.ok(slots.has(slot),'Missing explicit V2 slot '+slot);
assert.deepEqual([...slots].sort(),[...manifest.requiredSlots].sort(),'V2 should not contain alternate or duplicate runtime slots');

assert.equal(manifest.atlas.image,'assets/characters/scorpion/puppet/v2/source/scorpion_puppet_v2_master.png');
assert.equal(manifest.atlas.map,'assets/characters/scorpion/puppet/v2/body/scorpion_puppet_body_atlas_v2.json');
assert.equal(manifest.atlas.width,1448);
assert.equal(manifest.atlas.height,1086);

const map=JSON.parse(await fs.readFile(manifest.atlas.map,'utf8'));
assert.deepEqual(map.canvas,[manifest.atlas.width,manifest.atlas.height]);
assert.equal(map.metadata?.sourceMaster,manifest.atlas.image);
assert.equal(map.metadata?.approvedSourceMaster,manifest.atlas.image);
assert.equal(map.metadata?.neutralReference,'assets/characters/scorpion/puppet/v2/body/scorpion_puppet_neutral_reference_v2.json');
assert.equal(map.metadata?.authoringMode,'manual-canonical-source-rects-v2');
assert.equal(map.metadata?.semanticBodyPartMap,true,'Every atlas part must carry explicit semantic body-part metadata');
assert.equal(map.metadata?.automaticAlphaIslandMapping,false,'Automatic alpha-island mapping is forbidden for V2');
assert.equal(map.metadata?.weaponAndVfxExcluded,true);
assert.equal(map.metadata?.sourceSheetApproved,true);
assert.equal(map.metadata?.runtimePackingPending,true,'Semantic mapping must pass before repacking a final runtime atlas');
assert.equal(map.metadata?.pieceCount,15);
assert.equal(Object.keys(map.parts).length,15);

const semanticBySlot=new Map();
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
 assert.ok(part.x>=0&&part.y>=0&&part.x+part.w<=manifest.atlas.width&&part.y+part.h<=manifest.atlas.height,'Authored source rectangle out of bounds '+id);
 assert.ok(!semanticBySlot.has(part.slot),'Duplicate semantic slot in map '+part.slot);
 semanticBySlot.set(part.slot,{id,...part});
}

for(const component of manifest.components){
 const a=component.attachments.find(x=>x.id===component.defaultAttachment);
 const part=map.parts[a.sourceRegion];
 assert.ok(part,'Missing authored semantic map part '+a.sourceRegion);
 assert.equal(part.slot,component.slot,'Semantic slot drift '+component.slot);
 assert.equal(part.parentBone,component.parentBone,'Parent bone drift '+component.slot);
 assert.equal(part.zOrder,component.zOrder,'Z-order drift '+component.slot);
 assert.deepEqual(a.pivot,part.pivot,'Pivot metadata drift '+component.slot);
 assert.deepEqual({x:a.atlasRect.x,y:a.atlasRect.y,w:a.atlasRect.w,h:a.atlasRect.h},{x:part.x,y:part.y,w:part.w,h:part.h},'Coordinate drift '+component.slot);
}

const overlap=(A,B)=>{
 const w=Math.max(0,Math.min(A.x+A.w,B.x+B.w)-Math.max(A.x,B.x));
 const h=Math.max(0,Math.min(A.y+A.h,B.y+B.h)-Math.max(A.y,B.y));
 return {w,h,area:w*h};
};
for(const [a,b,minPixels] of [
 ['leftUpperArm','leftForearm',30],
 ['rightUpperArm','rightForearm',30],
 ['leftUpperLeg','leftLowerLeg',50],
 ['rightUpperLeg','rightLowerLeg',50]
]){
 const A=semanticBySlot.get(a),B=semanticBySlot.get(b);
 assert.equal(A.sourceComponentId,B.sourceComponentId,'Joint split must come from one authored source component: '+a+'/'+b);
 const o=overlap(A,B);
 assert.ok(Math.max(o.w,o.h)>=minPixels,'Insufficient authored hidden source overlap '+a+' / '+b+': '+JSON.stringify(o));
}

assert.equal(semanticBySlot.get('leftHand').bodyPart,'closed_fist');
assert.equal(semanticBySlot.get('rightHand').bodyPart,'closed_fist');

const neutralReference=JSON.parse(await fs.readFile(map.metadata.neutralReference,'utf8'));
assert.equal(neutralReference.version,'scorpion-puppet-neutral-reference-v2');
assert.equal(neutralReference.sourceMaster,manifest.atlas.image);
assert.equal(neutralReference.approvedSourceMaster,manifest.atlas.image);
assert.deepEqual(neutralReference.visualBounds,manifest.neutral.visualBounds);
assert.equal(neutralReference.pieces.length,15);
const neutralBySlot=new Map(neutralReference.pieces.map(p=>[p.slot,p]));
for(const c of manifest.components){
 const a=c.attachments[0],semantic=semanticBySlot.get(c.slot),ref=neutralBySlot.get(c.slot);
 assert.ok(ref,'Neutral reference missing '+c.slot);
 assert.deepEqual(ref.sourceRect,a.atlasRect,'Neutral reference crop drift '+c.slot);
 assert.deepEqual(ref.topLeft,semantic.neutralTopLeft,'Neutral placement metadata drift '+c.slot);
 assert.deepEqual(ref.pivot,semantic.pivot,'Neutral pivot metadata drift '+c.slot);
 assert.equal(ref.zOrder,c.zOrder,'Neutral z-order drift '+c.slot);
 assert.equal(ref.sourceComponentId,semantic.sourceComponentId,'Neutral source-component drift '+c.slot);
}

const source={width:manifest.atlas.width,height:manifest.atlas.height,map};
const model=contract.compile(manifest,schema,source);
const neutral=contract.assemble(model.manifest);
assert.deepEqual(neutral.bounds,manifest.neutral.visualBounds,'V2 zero-transform rectangle must equal authored semantic neutral bounds');
for(const part of neutral.parts){
 const semantic=semanticBySlot.get(part.slot),a=part.attachment;
 const topLeft=contract.point(part.matrix,[-a.pivot[0],-a.pivot[1]]);
 assert.ok(Math.abs(topLeft[0]-semantic.neutralTopLeft[0])<1e-9&&Math.abs(topLeft[1]-semantic.neutralTopLeft[1])<1e-9,'Zero-transform placement drift '+part.slot+' '+JSON.stringify({topLeft,expected:semantic.neutralTopLeft}));
}

const rad=d=>d*Math.PI/180;
for(const [name,rotations] of [
 ['elbow',{leftElbow:rad(20)}],
 ['shoulder',{leftShoulder:rad(10)}],
 ['knee',{leftKnee:rad(10)}]
]){
 const pose=contract.assemble(model.manifest,{boneRotations:rotations});
 assert.ok(Number.isFinite(pose.bounds.x)&&Number.isFinite(pose.bounds.y)&&pose.bounds.w>0&&pose.bounds.h>0,name+' articulation did not assemble');
}

const runtime=await fs.readFile('runtime/rendering/scorpion-puppet-atlas-v2.js','utf8');
for(const marker of ['puppet-atlas-v2.json','scorpion_puppet_neutral_reference_v2.json','manual-canonical-source-rects-v2','Elbow +20°','Shoulder +10°','Knee +10°','BlazingScorpionPuppetAtlasV2'])assert.ok(runtime.includes(marker),'V2 runtime lab missing '+marker);
for(const forbidden of ['extractBodyComponents','candidateComponents','automaticAlphaIslandMapping=true'])assert.ok(!runtime.includes(forbidden),'V2 runtime reintroduced forbidden inference '+forbidden);

const postprocess=await fs.readFile('scripts/scorpion-puppet-atlas-postprocess.mjs','utf8');
assert.ok(postprocess.includes('scorpion-puppet-atlas-v2.js'),'V2 lab is not injected into Cloudflare build');
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
assert.ok(pkg.scripts.validate.includes('validate-scorpion-puppet-atlas-v2.mjs'),'V2 validator is not part of npm validate');

console.log('Scorpion Puppet Atlas V2 PASS: 15 semantic body-part records with explicit authored source coordinates, side/segment labels, pivots, neutral placement coordinates, and source-component joint overlap; Contract v1 remains unchanged.');
