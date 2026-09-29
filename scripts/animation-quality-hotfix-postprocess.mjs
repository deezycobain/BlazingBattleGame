import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Animation quality hotfix: '+message)};

// Final cleanup only. Sequence-wide scale and frame normalization are owned by
// animation-quality-postprocess.mjs and world-space size by the fighter contract.
const scorpionGuard="   const bbScorpionRunGuard=name==='Scorpion'&&S?.drag&&S?.dragUnitName===name;\n   if(bbScorpionRunGuard){ctx.save();ctx.beginPath();ctx.rect(-w/2,spriteY,w*.92,h);ctx.clip();}\n";
if(html.includes(scorpionGuard))html=html.replace(scorpionGuard,'');
html=html.replace('   if(bbScorpionRunGuard)ctx.restore();\n','');

// Scorpion's V2 idle visibly wanders on iPhone and his V2 attack source has
// authored right-edge crop damage. Keep those two states on the clean legacy
// runtime for now, while still using the sequence-normalized 12-frame V2 run.
const idleOwner="const idle=name=>{const frames=normalizedSequence(name,'idle');normalizedSequence(name,'run');normalizedSequence(name,'attack');return frames;};";
const safeIdleOwner="const bbQualityIPhone=/iPhone|iPad|iPod/i.test(navigator.userAgent);const idle=name=>{normalizedSequence(name,'run');if(name==='Scorpion'&&bbQualityIPhone)return [];const frames=normalizedSequence(name,'idle');if(name!=='Scorpion')normalizedSequence(name,'attack');return frames;};";
if(html.includes(idleOwner))html=html.replace(idleOwner,safeIdleOwner);
else if(!html.includes('const bbQualityIPhone='))fail('mobile idle ownership anchor missing');

const basicOwner="const basic=name=>normalizedSequence(name,'attack');";
const safeBasicOwner="const basic=name=>name==='Mashle'?normalizedSequence(name,'attack'):null;";
if(html.includes(basicOwner))html=html.replace(basicOwner,safeBasicOwner);
else if(!html.includes(safeBasicOwner))fail('safe basic ownership anchor missing');

const twelveSequence="state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:72,frameSequence:[0,1,2,3,4,5,6,7,8,9,10,11]};";
const mixedSequence="state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:72,frameSequence:unitName==='Scorpion'?[0,1,2,3,4,4,5,5,5,5]:[0,1,2,3,4,5,6,7,8,9,10,11]};";
if(html.includes(twelveSequence))html=html.replace(twelveSequence,mixedSequence);
else if(!html.includes("frameSequence:unitName==='Scorpion'"))fail('Scorpion safe attack sequence anchor missing');

// The previously uploaded spear atlas was visually mismatched. The temporary
// presentation is the hand-connected runtime chain spear until replacement VFX
// is authored and approved.
if(html.includes('bbScorpionSuppliedSpearV3'))fail('mismatched supplied Scorpion spear renderer survived');
if(!html.includes('bbScorpionChainV4'))fail('connected Scorpion spear renderer missing');
if(!html.includes('sequenceFit'))fail('sequence-wide animation normalization missing');
if(html.includes("const fit=Math.min(name==='Scorpion'?1.34:1.20"))fail('per-frame unit enlargement survived');
if(html.includes('bbScorpionRunGuard'))fail('retired Scorpion run clip mask survived');

for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`animation-quality-hotfix-${index}.js`})
  }catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`)}
}
await fs.writeFile(file,html);
console.log('Animation Quality Hotfix PASS: shared sequence scale retained; Scorpion mobile idle/cropped attack stay on safe sources; run clip mask and mismatched spear atlas retired.');
