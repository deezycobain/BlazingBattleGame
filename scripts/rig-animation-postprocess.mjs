import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const file=path.join(root,'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Rig animation integration: '+message)};

// Keep rigging additive. Existing authored frame animation remains the fallback
// for every unit/state until that exact state receives an approved rig profile.
const scripts=[
  ['bb-rig-animation-runtime','runtime/animation/rig-runtime.js'],
  ['bb-rig-animation-profiles','runtime/animation/rig-profiles.js']
];
for(const [id] of scripts){
  html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'');
  html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*/>`,'gi'),'');
}
const bodyEnd=html.toLowerCase().lastIndexOf('</body>');
if(bodyEnd<0)fail('closing body missing');
const tags=scripts.map(([id,src])=>`<script id="${id}" src="${src}"></script>`).join('');
html=html.slice(0,bodyEnd)+tags+html.slice(bodyEnd);

// Final fighter draw seam. The renderer has already applied facing, road depth,
// camera compensation, visual scale, alpha and filter before reaching this point.
// Rig V1 only owns calm player idle for explicitly registered profiles. Attacks,
// run/drag, hit/recoil, enemies and all unregistered fighters stay frame-driven.
// Use the already-normalized first V2 idle frame when available so switching from
// the frame runtime to the rig cannot reintroduce source-scale or feet-anchor drift.
const drawSource=`   ctx.globalAlpha=1;\n   ctx.drawImage(spriteRef,-w/2,spriteY,w,h);`;
const drawTarget=`   ctx.globalAlpha=1;\n   const bbRig=window.BlazingRigRuntime;\n   const bbRigAttackState=typeof ensureAnimState==='function'?ensureAnimState()?.attackPose?.[name]:null;\n   const bbRigIdleV1=!isEnemy&&!visual&&!bbRigAttackState&&!(S?.drag&&S?.dragUnitName===name);\n   const bbRigSource=bbRigIdleV1&&typeof BB_ANIMATION_QUALITY_RUNTIME!=='undefined'&&BB_ANIMATION_QUALITY_RUNTIME.has(name)?BB_ANIMATION_QUALITY_RUNTIME.idle(name)?.[0]:null;\n   const bbRigSourceReady=bbRigSource?.complete&&bbRigSource.naturalWidth>0&&bbRigSource.naturalHeight>0;\n   const bbRigDrawn=bbRigIdleV1&&bbRigSourceReady&&bbRig?.has?.(name,'idle')?bbRig.draw(ctx,{name,clip:'idle',elapsedMs:performance.now(),sourceImage:bbRigSource,x:-w/2,y:spriteY,w,h}):false;\n   if(!bbRigDrawn)ctx.drawImage(spriteRef,-w/2,spriteY,w,h);`;
if(html.includes(drawSource))html=html.replace(drawSource,drawTarget);
else if(!html.includes('const bbRigIdleV1='))fail('canonical fighter draw seam missing');

for(const [id] of scripts)if((html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length!==1)fail(id+' injection is not unique');
for(const marker of ['const bbRigIdleV1=','const bbRigSource=','BlazingRigRuntime','if(!bbRigDrawn)ctx.drawImage(spriteRef,-w/2,spriteY,w,h)'])if(!html.includes(marker))fail('missing '+marker);
for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`rig-animation-${index}.js`})}
  catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`)}
}

await fs.writeFile(file,html);
console.log('Rig Animation V1 PASS: normalized Canvas control-point idle mesh enabled for approved profiles; all non-rig states preserve authored frame fallback.');
