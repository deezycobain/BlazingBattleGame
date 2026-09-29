import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Animation quality hotfix: '+message)};

// Remove the older Scorpion run clip mask inserted by the September integration.
// Sequence normalization now handles the full authored frame without cropping it.
const scorpionGuard="   const bbScorpionRunGuard=name==='Scorpion'&&S?.drag&&S?.dragUnitName===name;\n   if(bbScorpionRunGuard){ctx.save();ctx.beginPath();ctx.rect(-w/2,spriteY,w*.92,h);ctx.clip();}\n";
if(html.includes(scorpionGuard))html=html.replace(scorpionGuard,'');
html=html.replace('   if(bbScorpionRunGuard)ctx.restore();\n','');

// Final invariants. No per-frame scale hacks, no mismatched uploaded spear renderer,
// and no destructive battle-frame clipping may survive after the V3 quality pass.
for(const marker of ['BB_ANIMATION_QUALITY_RUNTIME','sequenceFit','motionQuality=v3','bbScorpionChainV5'])if(!html.includes(marker))fail('missing final marker '+marker);
for(const forbidden of ["const fit=Math.min(name==='Scorpion'?1.34:1.20",'bbScorpionSuppliedSpearV3','bbScorpionRunGuard'])if(html.includes(forbidden))fail('retired workaround survived: '+forbidden);

for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`animation-quality-hotfix-${index}.js`})
  }catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`)}
}
await fs.writeFile(file,html);
console.log('Animation Quality Hotfix PASS: V3 sequence normalization is final; legacy Scorpion clip mask and mismatched spear renderer are absent.');
