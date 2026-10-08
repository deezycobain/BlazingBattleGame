import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Animation V2 finalize: '+message)};

// Curate Scorpion's active runtime around the approved Legacy of the Shinobi
// character design. The V2 pack remains retained on disk for audit history, but
// it is not allowed to override the approved idle, attack, or direct-frame run.
const replacements=[
  ["run:{root:'assets/characters/scorpion/sprites/runtime/v2/run',count:12}","run:{root:'assets/characters/scorpion/sprites/runtime/run',count:12}"],
  ["motionQuality=v4","motionQuality=v6"],
  ["motionQuality=v5","motionQuality=v6"]
];
for(const [from,to] of replacements){
  if(html.includes(from))html=html.split(from).join(to);
}

const required=[
  "idle:{root:'assets/characters/scorpion/sprites/runtime/idle',count:6}",
  "run:{root:'assets/characters/scorpion/sprites/runtime/run',count:12}",
  "attack:{root:'assets/characters/scorpion/sprites/runtime/attack/basic',count:6}",
  "recoil:{root:'assets/characters/scorpion/sprites/runtime/v2/recoil',count:12}",
  "const idle=name=>{const frames=normalizedSequence(name,'idle');return name==='Scorpion'&&frames.length===6?[...frames,...frames.slice(1,-1).reverse()]:frames;};",
  'motionQuality=v6',
  'sequenceFit',
  'sequenceCenterX',
  'bbScorpionChainV5'
];
for(const marker of required)if(!html.includes(marker))fail('missing '+marker);

const forbidden=[
  "assets/characters/scorpion/sprites/runtime/v2/run',count:12",
  "assets/characters/scorpion/sprites/runtime/v2/idle',count:12",
  "assets/characters/scorpion/sprites/runtime/v2/attack',count:12",
  'motionQuality=v4',
  'motionQuality=v5'
];
for(const marker of forbidden)if(html.includes(marker))fail('stale six-frame Scorpion path survived: '+marker);

for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`animation-v2-finalize-${index}.js`});}
  catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`);}
}

await fs.writeFile(file,html);
console.log('Animation runtime curation PASS: Scorpion uses approved-design idle/basic frames and the direct-frame twelve-frame run; one sequence transform remains authoritative.');
