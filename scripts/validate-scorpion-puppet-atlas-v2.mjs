import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {contract,schema,validateFile} from './validate-puppet-atlas-contract-v1.mjs';

const MASTER='assets/characters/scorpion/data/puppet-atlas-v1.json';
const V2='assets/characters/scorpion/data/puppet-atlas-v2.json';
const [master,v2]=await Promise.all([MASTER,V2].map(async file=>JSON.parse(await fs.readFile(file,'utf8'))));
await validateFile(V2);
assert.equal(v2.contractVersion,master.contractVersion,'V2 must reuse Contract v1 without redesign');
assert.equal(v2.components.length,17,'V2 should contain the deliberately authored 17-piece Scorpion cut');
assert.ok(v2.components.length>=15&&v2.components.length<=20,'V2 piece count outside 15–20 target');
assert.deepEqual(v2.supportedStates,['neutral'],'Run/Attack/Recoil must stay blocked during articulation gate');
assert.ok(v2.components.every(c=>c.covers.length===0),'V2 must expose every anatomical piece instead of cover aliases');
const slots=new Set(v2.components.map(c=>c.slot));
for(const slot of v2.requiredSlots)assert.ok(slots.has(slot),'Missing explicit V2 slot '+slot);
for(const slot of ['leftShoulderArmor','rightShoulderArmor'])assert.ok(slots.has(slot),'Missing necessary shoulder cover '+slot);
for(const forbidden of ['body_08','body_10'])assert.ok(!v2.components.some(c=>c.attachments.some(a=>a.sourceRegion===forbidden)),'V2 must not reintroduce whole-arm candidate '+forbidden);

const map=JSON.parse(await fs.readFile(v2.atlas.map,'utf8'));
const source={width:v2.atlas.width,height:v2.atlas.height,map};
const masterModel=contract.compile(master,schema,source),v2Model=contract.compile(v2,schema,source);
const masterPose=contract.assemble(masterModel.manifest),v2Pose=contract.assemble(v2Model.manifest);
const origin=part=>contract.point(part.matrix,[-part.attachment.pivot[0],-part.attachment.pivot[1]]);
const masterBySource=new Map(masterPose.parts.map(part=>[part.attachment.sourceRegion,part]));
for(const part of v2Pose.parts){
 const base=masterBySource.get(part.attachment.sourceRegion);assert.ok(base,'V2 introduced source pixels outside approved neutral master: '+part.attachment.sourceRegion);
 const actual=origin(part),baseOrigin=origin(base),a=part.attachment.atlasRect,b=base.attachment.atlasRect,expected=[baseOrigin[0]+a.x-b.x,baseOrigin[1]+a.y-b.y];
 assert.ok(Math.abs(actual[0]-expected[0])<1e-9&&Math.abs(actual[1]-expected[1])<1e-9,'V2 zero-transform source placement drift: '+part.slot+' '+JSON.stringify({actual,expected}));
}

function coverageFor(sourceRegion){
 const base=masterBySource.get(sourceRegion),r=base.attachment.atlasRect,w=r.w,h=r.h,mask=new Uint8Array(w*h);
 for(const c of v2.components)for(const a of c.attachments)if(a.sourceRegion===sourceRegion){const x0=Math.max(r.x,a.atlasRect.x),y0=Math.max(r.y,a.atlasRect.y),x1=Math.min(r.x+r.w,a.atlasRect.x+a.atlasRect.w),y1=Math.min(r.y+r.h,a.atlasRect.y+a.atlasRect.h);for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)mask[(y-r.y)*w+(x-r.x)]=1;}
 const missing=mask.reduce((n,v)=>n+(v?0:1),0);assert.equal(missing,0,'V2 does not fully reconstruct master source region '+sourceRegion+' ('+missing+' source pixels uncovered)');
}
for(const sourceRegion of masterBySource.keys())coverageFor(sourceRegion);

const component=slot=>v2.components.find(c=>c.slot===slot),rect=slot=>component(slot).attachments[0].atlasRect;
function overlap(a,b){const A=rect(a),B=rect(b),w=Math.max(0,Math.min(A.x+A.w,B.x+B.w)-Math.max(A.x,B.x)),h=Math.max(0,Math.min(A.y+A.h,B.y+B.h)-Math.max(A.y,B.y));return {w,h,area:w*h};}
for(const [a,b,minArea] of [
 ['leftShoulderArmor','leftUpperArm',4000],['rightShoulderArmor','rightUpperArm',2500],
 ['torso','leftUpperArm',3000],['torso','rightUpperArm',2500],
 ['leftForearm','leftHand',7000],['rightForearm','rightHand',7000]
]){const o=overlap(a,b);assert.ok(o.area>=minArea,'Insufficient hidden joint overlap '+a+' / '+b+': '+JSON.stringify(o));}

assert.equal(component('leftUpperArm').parentBone,'leftShoulder');assert.equal(component('leftForearm').parentBone,'leftElbow');assert.equal(component('leftHand').parentBone,'leftWrist');
assert.equal(component('rightUpperArm').parentBone,'rightShoulder');assert.equal(component('rightForearm').parentBone,'rightElbow');assert.equal(component('rightHand').parentBone,'rightWrist');
assert.equal(component('leftUpperLeg').parentBone,'leftHip');assert.equal(component('leftLowerLeg').parentBone,'leftKnee');assert.equal(component('leftFoot').parentBone,'leftAnkle');

const runtime=await fs.readFile('runtime/rendering/scorpion-puppet-atlas-v2.js','utf8');
for(const marker of ['puppet-atlas-v2.json','nativeDiff','Elbow +20°','Shoulder +10°','Knee +10°','Run / Attack / Recoil remain blocked','BlazingScorpionPuppetAtlasV2'])assert.ok(runtime.includes(marker),'V2 runtime lab missing '+marker);
for(const forbidden of ['extractBodyComponents','candidateComponents','idleKeys','runKeys','attackKeys','recoilKeys'])assert.ok(!runtime.includes(forbidden),'V2 runtime reintroduced forbidden inference/animation '+forbidden);
const postprocess=await fs.readFile('scripts/scorpion-puppet-atlas-postprocess.mjs','utf8');assert.ok(postprocess.includes('scorpion-puppet-atlas-v2.js'),'V2 lab is not injected into Cloudflare build');
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));assert.ok(pkg.scripts.validate.includes('validate-scorpion-puppet-atlas-v2.mjs'),'V2 validator is not part of npm validate');
const rad=d=>d*Math.PI/180;
for(const [name,rotations] of [['elbow',{leftElbow:rad(20)}],['shoulder',{leftShoulder:rad(10)}],['knee',{leftKnee:rad(10)}]]){const pose=contract.assemble(v2Model.manifest,{boneRotations:rotations});assert.ok(Number.isFinite(pose.bounds.x)&&Number.isFinite(pose.bounds.y)&&pose.bounds.w>0&&pose.bounds.h>0,name+' articulation did not assemble');}
console.log('Scorpion Puppet Atlas V2 PASS: 17 deliberate pieces, exact zero-transform source placement/coverage, hidden joint overlap, and only the 20° elbow / 10° shoulder / 10° knee articulation gate.');