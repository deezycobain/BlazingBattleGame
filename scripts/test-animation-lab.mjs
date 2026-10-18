import fs from 'node:fs/promises';
import vm from 'node:vm';

const lab=await fs.readFile('animation-lab/index.html','utf8');
const build=await fs.readFile('scripts/build-cloudflare.mjs','utf8');
const scripts=[...lab.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
if(scripts.length!==1)throw new Error('Animation Lab must have one self-contained script');
new vm.Script(scripts[0],{filename:'animation-lab/index.html'});
for(const marker of ['id="draft"','id="reference"','id="stageA"','id="stageB"','id="qa"','id="bounds"','id="onion"','requestAnimationFrame(tick)','frame_count']){
 if(!lab.includes(marker))throw new Error('Animation Lab missing '+marker);
}
if(build.includes("'animation-lab'"))throw new Error('Animation Lab directory excluded from production static copy');
if(/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/.test(scripts[0]))throw new Error('Lab must not mutate game or upload user frames');
console.log('Animation Lab smoke PASS: standalone script parses, expected controls are present, no game/network mutation.');
