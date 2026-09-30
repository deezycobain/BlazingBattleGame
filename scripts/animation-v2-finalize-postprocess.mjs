import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Animation V2 finalize: '+message)};

// Promote Scorpion's already-authored V2 motion pack to the canonical runtime.
// The previous quality pass deliberately kept the old six-frame idle/basic as a
// safety fallback. That fallback is now the remaining source of stepped motion.
const replacements=[
  ["idle:{root:'assets/characters/scorpion/sprites/runtime/idle',count:6}","idle:{root:'assets/characters/scorpion/sprites/runtime/v2/idle',count:12}"],
  ["attack:{root:'assets/characters/scorpion/sprites/runtime/attack/basic',count:6}","attack:{root:'assets/characters/scorpion/sprites/runtime/v2/attack',count:12}"],
  ["const idle=name=>{const frames=normalizedSequence(name,'idle');return name==='Scorpion'&&frames.length===6?[...frames,...frames.slice(1,-1).reverse()]:frames;};","const idle=name=>normalizedSequence(name,'idle');"],
  ["motionQuality=v4","motionQuality=v5"]
];
for(const [from,to] of replacements){
  if(html.includes(from))html=html.split(from).join(to);
}

// If an older attack sequence survived from a previous build layer, upgrade it
// too. This is intentionally narrow and only touches the Scorpion spear pose.
html=html.split("frameMs:72,frameSequence:[0,1,2,3,4,4,4,4,5,5]").join("frameMs:76,frameSequence:window.BlazingStableAnimation.attackFrameOrder");
html=html.split("frameMs:95,frameSequence:[0,1,2,3,4,4,5,5,5,5]").join("frameMs:76,frameSequence:window.BlazingStableAnimation.attackFrameOrder");

const required=[
  "idle:{root:'assets/characters/scorpion/sprites/runtime/v2/idle',count:12}",
  "run:{root:'assets/characters/scorpion/sprites/runtime/v2/run',count:12}",
  "attack:{root:'assets/characters/scorpion/sprites/runtime/v2/attack',count:12}",
  "recoil:{root:'assets/characters/scorpion/sprites/runtime/v2/recoil',count:12}",
  "const idle=name=>normalizedSequence(name,'idle');",
  "frameSequence:window.BlazingStableAnimation.attackFrameOrder",
  'motionQuality=v5',
  'sequenceFit',
  'sequenceCenterX',
  'bbScorpionDynamicChainV6'
];
for(const marker of required)if(!html.includes(marker))fail('missing '+marker);

const forbidden=[
  "assets/characters/scorpion/sprites/runtime/idle',count:6",
  "assets/characters/scorpion/sprites/runtime/attack/basic',count:6",
  "frames.length===6?[...frames",
  'frameSequence:[0,1,2,3,4,4,5,5,5,5]',
  'frameSequence:[0,1,2,3,4,4,4,4,5,5]'
];
for(const marker of forbidden)if(html.includes(marker))fail('stale six-frame Scorpion path survived: '+marker);

for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`animation-v2-finalize-${index}.js`});}
  catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`);}
}

await fs.writeFile(file,html);
console.log('Animation V2 Finalize PASS: Scorpion idle/run/basic/recoil use authored 12-frame V2 motion; one sequence transform remains authoritative; six-frame attack sequencing retired.');
