import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Animation quality hotfix: '+message)};

// Final cleanup only. Scale and frame normalization are owned by
// animation-quality-postprocess.mjs and the fighter visual contract.
// Never re-scale individual frames here.
const scorpionGuard="   const bbScorpionRunGuard=name==='Scorpion'&&S?.drag&&S?.dragUnitName===name;\n   if(bbScorpionRunGuard){ctx.save();ctx.beginPath();ctx.rect(-w/2,spriteY,w*.92,h);ctx.clip();}\n";
if(html.includes(scorpionGuard))html=html.replace(scorpionGuard,'');
html=html.replace('   if(bbScorpionRunGuard)ctx.restore();\n','');

// The previously uploaded spear atlas was visually mismatched. The current
// temporary presentation is the hand-connected runtime chain spear from the
// animation-quality pass until replacement authored VFX is approved.
if(html.includes('bbScorpionSuppliedSpearV3'))fail('mismatched supplied Scorpion spear renderer survived');
if(!html.includes('bbScorpionChainV4'))fail('connected Scorpion spear renderer missing');
if(!html.includes('sequenceFit'))fail('sequence-wide animation normalization missing');
if(html.includes("const fit=Math.min(name==='Scorpion'?1.34:1.20"))fail('per-frame unit enlargement survived');
if(html.includes('bbScorpionRunGuard'))fail('retired Scorpion run clip mask survived');

for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`animation-quality-hotfix-${index}.js`})}
  catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`)}
}
await fs.writeFile(file,html);
console.log('Animation Quality Hotfix PASS: destructive per-frame scaling/clipping retired; sequence-wide normalization remains authoritative.');
