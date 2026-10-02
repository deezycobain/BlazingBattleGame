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

// Observe the existing recoil lifecycle instead of replacing it. The authored
// recoil frames and movement remain authoritative; the rig only gets a short
// impact impulse timestamp for approved player profiles.
const recoilMarker='/* bbRigRecoilPilotV1 */';
if(!html.includes(recoilMarker)){
  const recoilFn=/function\s+recoil\s*\(\s*([A-Za-z_$][\w$]*)[^)]*\)\s*\{/;
  const match=html.match(recoilFn);
  if(!match)fail('recoil function anchor missing');
  const actor=match[1];
  const injected=`${match[0]}\n ${recoilMarker}\n try{const bbRigRecoilName=${actor}?.name||${actor}?.spriteKey||'';window.BlazingRigRuntime?.trigger?.(bbRigRecoilName,'recoil');}catch(_){}`;
  html=html.replace(match[0],injected);
}

// Final fighter draw seam. The renderer has already applied facing, road depth,
// camera compensation, visual scale, alpha and filter before reaching this point.
// Rig V1 owns calm idle plus a tiny recoil overlay for explicitly registered
// player profiles. Attack art, run/drag, enemies and unregistered fighters stay
// frame-driven. Recoil uses the exact spriteRef selected by the existing renderer,
// preserving the authored 12-frame sequence while adding impact compression/settle.
const drawSource=`   ctx.globalAlpha=1;\n   ctx.drawImage(spriteRef,-w/2,spriteY,w,h);`;
const drawTarget=`   ctx.globalAlpha=1;\n   const bbRig=window.BlazingRigRuntime;\n   const bbRigAttackState=S?.anim?.attackPose?.[name]||null;\n   const bbRigImpulse=!isEnemy?bbRig?.active?.(name,'recoil'):null;\n   const bbRigRecoilV1=!isEnemy&&!!bbRigImpulse&&bbRig?.has?.(name,'recoil');\n   const bbRigIdleV1=!bbRigRecoilV1&&!isEnemy&&!visual&&!bbRigAttackState&&!(S?.drag&&S?.dragUnitName===name);\n   const bbRigSource=bbRigRecoilV1?spriteRef:(bbRigIdleV1&&typeof BB_ANIMATION_QUALITY_RUNTIME!=='undefined'&&BB_ANIMATION_QUALITY_RUNTIME.has(name)?BB_ANIMATION_QUALITY_RUNTIME.idle(name)?.[0]:null);\n   const bbRigSourceReady=bbRigSource?.complete&&bbRigSource.naturalWidth>0&&bbRigSource.naturalHeight>0;\n   const bbRigDrawn=(bbRigRecoilV1||bbRigIdleV1)&&bbRigSourceReady&&bbRig?.has?.(name,bbRigRecoilV1?'recoil':'idle')?bbRig.draw(ctx,{name,clip:bbRigRecoilV1?'recoil':'idle',elapsedMs:bbRigRecoilV1?bbRigImpulse.elapsedMs:performance.now(),sourceImage:bbRigSource,x:-w/2,y:spriteY,w,h}):false;\n   if(!bbRigDrawn)ctx.drawImage(spriteRef,-w/2,spriteY,w,h);`;
if(html.includes(drawSource))html=html.replace(drawSource,drawTarget);
else if(!html.includes('const bbRigRecoilV1='))fail('canonical fighter draw seam missing');

for(const [id] of scripts)if((html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length!==1)fail(id+' injection is not unique');
for(const marker of [recoilMarker,'const bbRigAttackState=S?.anim?.attackPose?.[name]||null;','const bbRigRecoilV1=','const bbRigImpulse=','const bbRigIdleV1=','const bbRigSource=','BlazingRigRuntime','if(!bbRigDrawn)ctx.drawImage(spriteRef,-w/2,spriteY,w,h)'])if(!html.includes(marker))fail('missing '+marker);
for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`rig-animation-${index}.js`})}
  catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`)}
}

await fs.writeFile(file,html);
console.log('Rig Animation V1 PASS: normalized Canvas idle mesh + authored-frame recoil settle enabled for approved profiles without creating animation state; all other states preserve frame fallback.');
