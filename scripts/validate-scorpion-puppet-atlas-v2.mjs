import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {contract,schema,validateFile} from './validate-puppet-atlas-contract-v1.mjs';

const V2='assets/characters/scorpion/data/puppet-atlas-v2.json';
const manifest=JSON.parse(await fs.readFile(V2,'utf8'));
await validateFile(V2);

assert.equal(manifest.contractVersion,'blazing-battle-puppet-atlas-v1','V2 must reuse Contract v1 without redesign');
assert.ok(manifest.components.length>=15&&manifest.components.length<=20,'V2 piece count outside 15–20 target');
assert.equal(manifest.components.length,15,'Canonical Scorpion V2 should use exactly the 15 required anatomical pieces');
assert.deepEqual(manifest.supportedStates,['neutral'],'Run/Attack/Recoil must stay blocked during articulation gate');
assert.ok(manifest.components.every(c=>c.covers.length===0),'V2 must expose every anatomical piece directly');

const slots=new Set(manifest.components.map(c=>c.slot));
for(const slot of manifest.requiredSlots)assert.ok(slots.has(slot),'Missing explicit V2 slot '+slot);
assert.deepEqual([...slots].sort(),[...manifest.requiredSlots].sort(),'V2 should not contain alternate or duplicate runtime slots');
for(const forbidden of ['leftShoulderArmor','rightShoulderArmor'])assert.ok(!slots.has(forbidden),'V2 should not add duplicate shoulder anatomy');

assert.equal(manifest.atlas.image,'assets/characters/scorpion/puppet/v2/source/scorpion_puppet_v2_master.png');
assert.equal(manifest.atlas.map,'assets/characters/scorpion/puppet/v2/body/scorpion_puppet_body_atlas_v2.json');
assert.equal(manifest.atlas.width,1448);
assert.equal(manifest.atlas.height,1086);

const map=JSON.parse(await fs.readFile(manifest.atlas.map,'utf8'));
assert.deepEqual(map.canvas,[manifest.atlas.width,manifest.atlas.height]);
assert.equal(map.metadata?.sourceMaster,manifest.atlas.image);
assert.equal(map.metadata?.neutralReference,'assets/characters/scorpion/puppet/v2/body/scorpion_puppet_neutral_reference_v2.json');
assert.equal(map.metadata?.authoringMode,'manual-canonical-source-rects-v2');
assert.equal(map.metadata?.automaticAlphaIslandMapping,false,'Automatic alpha-island mapping is forbidden for V2');
assert.equal(map.metadata?.weaponAndVfxExcluded,true);
assert.equal(map.metadata?.sourceSheetApproved,true);
assert.equal(map.metadata?.pieceCount,15);
assert.equal(Object.keys(map.parts).length,15);

for(const component of manifest.components){
 const a=component.attachments.find(x=>x.id===component.defaultAttachment);
 const part=map.parts[a.sourceRegion];
 assert.ok(part,'Missing authored map part '+a.sourceRegion);
 assert.deepEqual({x:a.atlasRect.x,y:a.atlasRect.y,w:a.atlasRect.w,h:a.atlasRect.h},{x:part.x,y:part.y,w:part.w,h:part.h},'Runtime crop drift for '+component.slot);
 assert.equal(part.authored,true,'All V2 pieces must be manually authored');
}

const sourceRect=slot=>{
 const component=manifest.components.find(c=>c.slot===slot),a=component.attachments[0];
 return a.atlasRect;
};
function overlap(a,b){
 const A=sourceRect(a),B=sourceRect(b);
 const w=Math.max(0,Math.min(A.x+A.w,B.x+B.w)-Math.max(A.x,B.x));
 const h=Math.max(0,Math.min(A.y+A.h,B.y+B.h)-Math.max(A.y,B.y));
 return {w,h,area:w*h};
}
for(const [a,b,minPixels,minArea] of [
 ['leftUpperArm','leftForearm',40,6000],
 ['rightUpperArm','rightForearm',40,6000],
 ['leftUpperLeg','leftLowerLeg',45,7500],
 ['rightUpperLeg','rightLowerLeg',45,7500]
]){
 const o=overlap(a,b);
 assert.ok(Math.max(o.w,o.h)>=minPixels&&o.area>=minArea,'Insufficient authored hidden source overlap '+a+' / '+b+': '+JSON.stringify(o));
}

const neutralReference=JSON.parse(await fs.readFile(map.metadata.neutralReference,'utf8'));
assert.equal(neutralReference.version,'scorpion-puppet-neutral-reference-v2');
assert.equal(neutralReference.sourceMaster,manifest.atlas.image);
assert.deepEqual(neutralReference.visualBounds,manifest.neutral.visualBounds);
assert.equal(neutralReference.pieces.length,15);
const refBySlot=new Map(neutralReference.pieces.map(p=>[p.slot,p]));
for(const c of manifest.components){
 const a=c.attachments[0],ref=refBySlot.get(c.slot);
 assert.ok(ref,'Neutral reference missing '+c.slot);
 assert.deepEqual(ref.sourceRect,a.atlasRect,'Neutral reference crop drift '+c.slot);
 assert.equal(ref.zOrder,c.zOrder,'Neutral reference z-order drift '+c.slot);
}

const component=slot=>manifest.components.find(c=>c.slot===slot);
assert.equal(component('leftUpperArm').parentBone,'leftShoulder');
assert.equal(component('leftForearm').parentBone,'leftElbow');
assert.equal(component('leftHand').parentBone,'leftWrist');
assert.equal(component('rightUpperArm').parentBone,'rightShoulder');
assert.equal(component('rightForearm').parentBone,'rightElbow');
assert.equal(component('rightHand').parentBone,'rightWrist');
assert.equal(component('leftUpperLeg').parentBone,'leftHip');
assert.equal(component('leftLowerLeg').parentBone,'leftKnee');
assert.equal(component('leftFoot').parentBone,'leftAnkle');
assert.equal(component('rightUpperLeg').parentBone,'rightHip');
assert.equal(component('rightLowerLeg').parentBone,'rightKnee');
assert.equal(component('rightFoot').parentBone,'rightAnkle');

const source={width:manifest.atlas.width,height:manifest.atlas.height,map};
const model=contract.compile(manifest,schema,source);
const neutral=contract.assemble(model.manifest);
assert.deepEqual(neutral.bounds,manifest.neutral.visualBounds,'V2 zero-transform rectangle must equal authored neutral reference bounds');
for(const part of neutral.parts){
 const ref=refBySlot.get(part.slot),a=part.attachment;
 const topLeft=contract.point(part.matrix,[-a.pivot[0],-a.pivot[1]]);
 assert.ok(Math.abs(topLeft[0]-ref.topLeft[0])<1e-9&&Math.abs(topLeft[1]-ref.topLeft[1])<1e-9,'Zero-transform placement drift '+part.slot+' '+JSON.stringify({topLeft,expected:ref.topLeft}));
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
for(const marker of ['puppet-atlas-v2.json','scorpion_puppet_neutral_reference_v2.json','manual-canonical-source-rects-v2','Elbow +20°','Shoulder +10°','Knee +10°','Run / Attack / Recoil remain blocked','BlazingScorpionPuppetAtlasV2'])assert.ok(runtime.includes(marker),'V2 runtime lab missing '+marker);
for(const forbidden of ['extractBodyComponents','candidateComponents','automaticAlphaIslandMapping=true','idleKeys','runKeys','attackKeys','recoilKeys'])assert.ok(!runtime.includes(forbidden),'V2 runtime reintroduced forbidden inference/animation '+forbidden);

const postprocess=await fs.readFile('scripts/scorpion-puppet-atlas-postprocess.mjs','utf8');
assert.ok(postprocess.includes('scorpion-puppet-atlas-v2.js'),'V2 lab is not injected into Cloudflare build');
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
assert.ok(pkg.scripts.validate.includes('validate-scorpion-puppet-atlas-v2.mjs'),'V2 validator is not part of npm validate');

console.log('Scorpion Puppet Atlas V2 PASS: 15 canonical MK2/UMK3-anime source rectangles, authored elbow/knee overlap, exact neutral-reference placement, and only the 20° elbow / 10° shoulder / 10° knee articulation gate.');