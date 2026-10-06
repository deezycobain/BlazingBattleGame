import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {contract,schema} from './validate-puppet-atlas-contract-v1.mjs';

const manifest=JSON.parse(await fs.readFile('assets/characters/scorpion/data/puppet-atlas-v3.json','utf8'));
const map=JSON.parse(await fs.readFile(manifest.atlas.map,'utf8'));
const idle=JSON.parse(await fs.readFile('assets/characters/scorpion/puppet/v3/runtime/scorpion-idle-v1.json','utf8'));

assert.equal(manifest.contractVersion,'blazing-battle-puppet-atlas-v1');
assert.equal(manifest.components.length,15);
assert.deepEqual(manifest.supportedStates,['neutral']);
assert.deepEqual(map.canvas,[2048,2304]);
assert.equal(map.metadata.rigId,'BB_HUMANOID_3Q_V1');
assert.equal(map.metadata.sideRule,'L/R are anatomical, never screen-relative');
assert.equal(map.metadata.visibleNeutralExact.pass,true);
assert.equal(Object.keys(map.parts).length,15);
assert.equal(idle.frameCount,12);
assert.equal(idle.durationMs,1200);
assert.equal(idle.runtimePolicy.rotationOnlyForLiveGate,true);

const source={width:manifest.atlas.width,height:manifest.atlas.height,map};
const model=contract.compile(manifest,schema,source);
const neutral=contract.assemble(model.manifest);
const bySlot=new Map(manifest.components.map(c=>[c.slot,c]));
const sourceByPart=map.parts;
for(const component of neutral.parts){
 const attachment=component.attachment;
 const sourcePart=sourceByPart[attachment.sourceRegion];
 assert.ok(sourcePart,'Missing source metadata '+attachment.sourceRegion);
 const topLeft=contract.point(component.matrix,[-attachment.pivot[0],-attachment.pivot[1]]);
 const expected=[sourcePart.sourceOrigin[0]-512,sourcePart.sourceOrigin[1]-1517];
 assert.deepEqual(topLeft,expected,'Zero-transform sourceOrigin drift '+component.slot);
}
for(const required of manifest.requiredSlots)assert.ok(bySlot.has(required),'Missing required slot '+required);
for(const frame of idle.frames){
 assert.ok(frame.rotationDegrees&&typeof frame.rotationDegrees==='object');
 for(const [bone,degrees] of Object.entries(frame.rotationDegrees)){
  assert.ok(manifest.bones.some(b=>b.id===bone),'Idle references unknown bone '+bone);
  assert.ok(Number.isFinite(degrees));
 }
}
const runtime=await fs.readFile('runtime/rendering/scorpion-puppet-rig-v3.js','utf8');
for(const marker of ['BB_HUMANOID_3Q_V1 Live Rig Gate','Idle V1','Skeleton','Pivots','Part bounds','loadLocalFile','sourceOrigin'])assert.ok(runtime.includes(marker),'V3 live gate missing '+marker);
console.log('Scorpion Rig V3 PASS: universal 3/4 skeleton binding, 15 explicit parts, deterministic zero-transform placement, 12-sample idle metadata, and live local-atlas debug gate.');
