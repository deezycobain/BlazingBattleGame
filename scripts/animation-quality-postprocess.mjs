import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Animation quality: '+message)};
const stableRuntime=await fs.readFile(path.join(process.cwd(),'runtime','animation','stable-sequence-runtime.js'),'utf8');

const runtime=String.raw`
${stableRuntime}
const BB_ANIMATION_QUALITY_RUNTIME=(()=>{
 const specs=Object.freeze({
   Scorpion:Object.freeze({
     idle:{root:'assets/characters/scorpion/sprites/runtime/idle',count:6},
     run:{root:'assets/characters/scorpion/sprites/runtime/v2/run',count:12},
     attack:{root:'assets/characters/scorpion/sprites/runtime/attack/basic',count:6},
     recoil:{root:'assets/characters/scorpion/sprites/runtime/v2/recoil',count:12}
   }),
   Mashle:Object.freeze({
     idle:{root:'assets/characters/mashle/sprites/runtime/v2/idle',count:12},
     run:{root:'assets/characters/mashle/sprites/runtime/v2/run',count:12},
     attack:{root:'assets/characters/mashle/sprites/runtime/v2/attack',count:12},
     recoil:{root:'assets/characters/mashle/sprites/runtime/v2/recoil',count:12}
   })
 });
 const cache=new Map();
 const paths=(name,kind)=>{
   const spec=specs[name]?.[kind];if(!spec)return [];
   return Array.from({length:spec.count},(_,index)=>spec.root+'/frame_'+String(index+1).padStart(2,'0')+'.png?motionQuality=v4');
 };
 const ready=frame=>frame?.complete&&frame.naturalWidth>0&&frame.naturalHeight>0;
 const median=values=>{const list=[...values].sort((a,b)=>a-b);if(!list.length)return 0;const mid=Math.floor(list.length/2);return list.length%2?list[mid]:(list[mid-1]+list[mid])/2;};
 const loadImage=src=>new Promise(resolve=>{const image=new Image();image.decoding='async';image.addEventListener('load',()=>resolve(image),{once:true});image.addEventListener('error',()=>resolve(null),{once:true});image.src=src;});
 const measure=(source,name,kind,index)=>{
   const width=source.naturalWidth||512,height=source.naturalHeight||768;
   const probe=document.createElement('canvas');probe.width=width;probe.height=height;
   const pctx=probe.getContext('2d',{willReadFrequently:true});pctx.drawImage(source,0,0,width,height);
   const imageData=pctx.getImageData(0,0,width,height),pixels=imageData.data,columns=new Uint32Array(width),runs=[];
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4;if(pixels[p+3]>12)columns[x]++;}
   let x=0;while(x<width){while(x<width&&columns[x]===0)x++;if(x>=width)break;const start=x;let mass=0;while(x<width&&columns[x]>0){mass+=columns[x];x++;}runs.push({start,end:x-1,mass});}
   const main=runs.length?runs.reduce((best,run)=>run.mass>best.mass?run:best,runs[0]):null;
   const junk=main?runs.filter(run=>run!==main&&(run.start<=Math.max(3,width*.04)||run.end>=width-1-Math.max(3,width*.04))&&run.mass<main.mass*.14&&(run.end-run.start+1)<width*.14):[];
   for(const run of junk)for(let y=0;y<height;y++)for(let cx=run.start;cx<=run.end;cx++){const p=(y*width+cx)*4;pixels[p]=pixels[p+1]=pixels[p+2]=pixels[p+3]=0;}
   let minX=width,minY=height,maxX=-1,maxY=-1;
   for(let p=0;p<pixels.length;p+=4){if(pixels[p+3]<=12)continue;const px=(p/4)%width,py=Math.floor((p/4)/width);if(px<minX)minX=px;if(px>maxX)maxX=px;if(py<minY)minY=py;if(py>maxY)maxY=py;}
   if(maxX<minX||maxY<minY)return null;
   if(minX<=1||maxX>=width-2||minY<=1||maxY>=height-2)console.warn('[BlazingBattle] source frame reaches canvas edge',name,kind,index+1);
   return {width,height,minX,minY,maxX,maxY,bodyW:maxX-minX+1,bodyH:maxY-minY+1,centerX:(minX+maxX+1)/2,bottomY:maxY+1,junk};
 };
 const normalizedSequence=(name,kind)=>{
   const key=name+':'+kind;if(cache.has(key))return cache.get(key);
   const outputs=window.BlazingStableAnimation.normalizedSequence(name,kind,paths(name,kind));cache.set(key,outputs);return outputs;
 };
 const idle=name=>{const frames=normalizedSequence(name,'idle');return name==='Scorpion'&&frames.length===6?[...frames,...frames.slice(1,-1).reverse()]:frames;};
 const run=name=>normalizedSequence(name,'run');
 const basic=name=>normalizedSequence(name,'attack');
 const recoil=name=>normalizedSequence(name,'recoil');
 const api=Object.freeze({has:name=>Object.prototype.hasOwnProperty.call(specs,name),idle,run,basic,recoil,ready});
 window.BlazingAnimationQuality=api;return api;
})();
`;

const idleAt=html.indexOf('function unitIdleFrames(name){');
if(idleAt<0)fail('unitIdleFrames anchor missing');
if(!html.includes('const BB_ANIMATION_QUALITY_RUNTIME=(()=>{'))html=html.slice(0,idleAt)+runtime+'\n'+html.slice(idleAt);

const idlePrefix='function unitIdleFrames(name){';
const qualityIdlePrefix="function unitIdleFrames(name){const bbQualityRun=BB_ANIMATION_QUALITY_RUNTIME.has(name)&&S?.drag&&S?.dragUnitName===name?BB_ANIMATION_QUALITY_RUNTIME.run(name):null;const bbQualityIdle=BB_ANIMATION_QUALITY_RUNTIME.has(name)?BB_ANIMATION_QUALITY_RUNTIME.idle(name):null;const bbQualityRunReady=bbQualityRun?.every(BB_ANIMATION_QUALITY_RUNTIME.ready);const bbQualityIdleReady=bbQualityIdle?.every(BB_ANIMATION_QUALITY_RUNTIME.ready);if(bbQualityRunReady)return bbQualityRun;if(bbQualityIdleReady)return bbQualityIdle;";
if(!html.includes('const bbQualityRun=BB_ANIMATION_QUALITY_RUNTIME.has(name)'))html=html.replace(idlePrefix,qualityIdlePrefix);

html=html.replace('const uploadedRun=UPLOADED_CHARACTER_MOTION.has(name)&&S?.drag&&S?.dragUnitName===name?UPLOADED_CHARACTER_MOTION.run(name):null;','const uploadedRun=!BB_ANIMATION_QUALITY_RUNTIME.has(name)&&UPLOADED_CHARACTER_MOTION.has(name)&&S?.drag&&S?.dragUnitName===name?UPLOADED_CHARACTER_MOTION.run(name):null;');
html=html.replace('const uploadedIdle=UPLOADED_CHARACTER_MOTION.has(name)?UPLOADED_CHARACTER_MOTION.idle(name):null;','const uploadedIdle=!BB_ANIMATION_QUALITY_RUNTIME.has(name)&&UPLOADED_CHARACTER_MOTION.has(name)?UPLOADED_CHARACTER_MOTION.idle(name):null;');

const attackPrefix='function unitAttackFrames(name,kind){';
const qualityAttackPrefix="function unitAttackFrames(name,kind){const bbQualityBasic=kind!=='jutsu'&&kind!=='special'&&BB_ANIMATION_QUALITY_RUNTIME.has(name)?BB_ANIMATION_QUALITY_RUNTIME.basic(name):null;if(bbQualityBasic?.every(BB_ANIMATION_QUALITY_RUNTIME.ready))return bbQualityBasic;";
if(!html.includes('const bbQualityBasic='))html=html.replace(attackPrefix,qualityAttackPrefix);
html=html.replace("const uploadedBasicFrames=UPLOADED_CHARACTER_MOTION.has(name)&&kind!=='jutsu'&&kind!=='special'?UPLOADED_CHARACTER_MOTION.basic(name):null;","const uploadedBasicFrames=!BB_ANIMATION_QUALITY_RUNTIME.has(name)&&UPLOADED_CHARACTER_MOTION.has(name)&&kind!=='jutsu'&&kind!=='special'?UPLOADED_CHARACTER_MOTION.basic(name):null;");

const cadenceRx=/const septemberRunning=SEPTEMBER27_BODY_RUNTIME\.has\(name\)&&S\?\.drag&&S\?\.dragUnitName===name;\s*const idleMs=\(obitoRunning\|\|itachiRunning\|\|uploadedRunning\|\|septemberRunning\)\?85:SEPTEMBER27_BODY_RUNTIME\.has\(name\)\?270:/;
if(cadenceRx.test(html))html=html.replace(cadenceRx,"const septemberRunning=SEPTEMBER27_BODY_RUNTIME.has(name)&&S?.drag&&S?.dragUnitName===name;\n const bbQualityRunning=BB_ANIMATION_QUALITY_RUNTIME.has(name)&&S?.drag&&S?.dragUnitName===name;\n const idleMs=bbQualityRunning?72:(name==='Egyptian Gaara'&&septemberRunning)?72:(obitoRunning||itachiRunning||uploadedRunning||septemberRunning)?85:SEPTEMBER27_BODY_RUNTIME.has(name)?270:");
else if(!html.includes('const bbQualityRunning=BB_ANIMATION_QUALITY_RUNTIME.has(name)'))fail('motion cadence anchor missing');

// The uploaded chain-spear atlas does not match the intended attack. Keep the
// projectile layer continuous and connected to Scorpion's hand until replacement
// authored VFX is approved.
const spearRx=/}else if\(f\.kind==='uploadedScorpionSpear'\)\{[\s\S]*?(?=}else if\(f\.kind==='iceProjectile'\)\{)/;
const spearRenderer=String.raw`}else if(f.kind==='uploadedScorpionSpear'){
     /* bbScorpionDynamicChainV6: one hand socket, one travelling spear head */
     const elapsed=Math.max(0,performance.now()-(f.bodyStart||f.start)),frameAt=Math.min((f.frameSequence||[]).length-1,Math.floor(elapsed/Math.max(1,f.frameMs||76))),sourceFrame=(f.frameSequence||[])[Math.max(0,frameAt)]??0;
     const hand=window.BlazingStableAnimation.handSocket(f.origin||f.from,f.facing||1,sourceFrame);
     window.BlazingStableAnimation.drawChainSpear(ctx,hand,f.to,performance.now()-f.start,f.duration,.55);
    `;
if(spearRx.test(html))html=html.replace(spearRx,spearRenderer);
else if(!html.includes('bbScorpionChainV5'))fail('Scorpion spear renderer anchor missing');

html=html.replace('releaseDelay=360,flightDuration=420,impactHold=260','releaseDelay=350,flightDuration=390,impactHold=250');
html=html.replace('releaseDelay=330,flightDuration=360,impactHold=250','releaseDelay=350,flightDuration=390,impactHold=250');
html=html.replace("state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:95};","state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:76,frameSequence:window.BlazingStableAnimation.attackFrameOrder};");
html=html.replace("state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:72,frameSequence:[0,1,2,3,4,4,4,4,5,5]};","state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:76,frameSequence:window.BlazingStableAnimation.attackFrameOrder};");
html=html.replace("const fx={kind:'uploadedScorpionSpear',from:{x:from.x+(enemy.x>=from.x?20:-20),y:from.y-25},to:{x:enemy.x,y:enemy.y-22},start:performance.now(),duration:flightDuration,life:1};","const pose=state.attackPose[unitName],fx={kind:'uploadedScorpionSpear',origin:{x:from.x,y:from.y},facing:enemy.x>=from.x?1:-1,frameSequence:pose.frameSequence,frameMs:pose.frameMs,bodyStart:pose.start,to:{x:enemy.x,y:enemy.y-22},start:performance.now(),duration:flightDuration,life:1};");
html=html.replace("let frameIndex=Math.min(attackFrames.length-1,Math.floor(attackProgress*attackFrames.length));","let frameIndex=Math.min(attackFrames.length-1,Math.floor(attackProgress*attackFrames.length));if(Array.isArray(attackState.frameSequence)&&attackState.frameSequence.length)frameIndex=attackState.frameSequence[Math.min(attackState.frameSequence.length-1,Math.floor(attackProgress*attackState.frameSequence.length))]??frameIndex;");

for(const marker of ['BB_ANIMATION_QUALITY_RUNTIME','sequenceFit','sequenceCenterX','bbQualityRunning','bbScorpionDynamicChainV6','BlazingStableAnimation','motionQuality=v4'])if(!html.includes(marker))fail('missing '+marker);
for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`animation-quality-${index}.js`})
  }catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`)}
}
await fs.writeFile(file,html);
console.log('Animation Quality PASS: shared sequence scale + anchor, low-memory two-pass normalization, safe Scorpion sources, 12-frame Scorpion/Mashle runs, connected spear presentation.');
