import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Animation quality: '+message)};

const runtime=String.raw`
const BB_ANIMATION_QUALITY_RUNTIME=(()=>{
 const ids=Object.freeze({Scorpion:'scorpion',Mashle:'mashle'});
 const cache=new Map();
 const paths=(name,kind)=>{
   const id=ids[name];if(!id)return [];
   return Array.from({length:12},(_,index)=>'assets/characters/'+id+'/sprites/runtime/v2/'+kind+'/frame_'+String(index+1).padStart(2,'0')+'.png?motionQuality=v2');
 };
 const ready=frame=>frame?.complete&&frame.naturalWidth>0&&frame.naturalHeight>0;
 const loadImage=src=>new Promise(resolve=>{const image=new Image();image.decoding='async';image.addEventListener('load',()=>resolve(image),{once:true});image.addEventListener('error',()=>resolve(null),{once:true});image.src=src;});
 const analyse=(source,name,kind,index)=>{
   const width=source.naturalWidth||512,height=source.naturalHeight||768;
   const probe=document.createElement('canvas');probe.width=width;probe.height=height;
   const pctx=probe.getContext('2d',{willReadFrequently:true});pctx.drawImage(source,0,0,width,height);
   const imageData=pctx.getImageData(0,0,width,height),pixels=imageData.data,columns=new Uint32Array(width),runs=[];
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4;if(pixels[p+3]>12)columns[x]++;}
   let x=0;while(x<width){while(x<width&&columns[x]===0)x++;if(x>=width)break;const start=x;let mass=0;while(x<width&&columns[x]>0){mass+=columns[x];x++;}runs.push({start,end:x-1,mass});}
   const main=runs.length?runs.reduce((best,run)=>run.mass>best.mass?run:best,runs[0]):null;
   const junk=main?runs.filter(run=>run!==main&&(run.start<=2||run.end>=width-3)&&run.mass<main.mass*.16&&(run.end-run.start+1)<width*.16):[];
   for(const run of junk)for(let y=0;y<height;y++)for(let cx=run.start;cx<=run.end;cx++){const p=(y*width+cx)*4;pixels[p]=pixels[p+1]=pixels[p+2]=pixels[p+3]=0;}
   if(junk.length)pctx.putImageData(imageData,0,0);
   let minX=width,minY=height,maxX=-1,maxY=-1;
   for(let p=0;p<pixels.length;p+=4){if(pixels[p+3]<=12)continue;const px=(p/4)%width,py=Math.floor((p/4)/width);if(px<minX)minX=px;if(px>maxX)maxX=px;if(py<minY)minY=py;if(py>maxY)maxY=py;}
   if(maxX<minX||maxY<minY)return null;
   if(minX<=1||maxX>=width-2||minY<=1||maxY>=height-2)console.warn('[BlazingBattle] source frame reaches canvas edge',name,kind,index+1);
   return {probe,width,height,minX,minY,maxX,maxY,bodyW:maxX-minX+1,bodyH:maxY-minY+1};
 };
 const normalizedSequence=(name,kind)=>{
   const key=name+':'+kind;if(cache.has(key))return cache.get(key);
   const sources=paths(name,kind),outputs=sources.map(()=>new Image());cache.set(key,outputs);
   (async()=>{
     const analysed=[];
     for(let index=0;index<sources.length;index++){
       const source=await loadImage(sources[index]);
       if(!source){analysed.push(null);continue;}
       try{analysed.push(analyse(source,name,kind,index));}catch(error){console.warn('[BlazingBattle] sequence analyse fallback',name,kind,index+1,error);analysed.push(null);}
     }
     const valid=analysed.filter(Boolean);if(!valid.length){sources.forEach((src,index)=>outputs[index].src=src);return;}
     const maxBodyH=Math.max(...valid.map(frame=>frame.bodyH)),maxBodyW=Math.max(...valid.map(frame=>frame.bodyW));
     const targetHeight=600,maxWidth=kind==='attack'?448:420;
     const sequenceFit=Math.min(1.60,targetHeight/maxBodyH,maxWidth/maxBodyW);
     for(let index=0;index<analysed.length;index++){
       const frame=analysed[index],output=outputs[index];if(!frame){output.src=sources[index];continue;}
       const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;const ctx=canvas.getContext('2d');
       const centerX=(frame.minX+frame.maxX+1)/2,bottomY=frame.maxY+1;
       const dx=Math.round(256-centerX*sequenceFit),dy=Math.round(700-bottomY*sequenceFit);
       ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(frame.probe,0,0,frame.width,frame.height,dx,dy,frame.width*sequenceFit,frame.height*sequenceFit);
       canvas.toBlob(blob=>{if(!blob){output.src=sources[index];return;}const url=URL.createObjectURL(blob);output.addEventListener('load',()=>URL.revokeObjectURL(url),{once:true});output.src=url;},'image/png');
     }
     console.info('[BlazingBattle] sequence-normalized motion',name,kind,{sequenceFit,maxBodyH,maxBodyW,frames:valid.length});
   })();
   return outputs;
 };
 const idle=name=>{const frames=normalizedSequence(name,'idle');normalizedSequence(name,'run');normalizedSequence(name,'attack');return frames;};
 const run=name=>normalizedSequence(name,'run');
 const basic=name=>normalizedSequence(name,'attack');
 const recoil=name=>normalizedSequence(name,'recoil');
 const api=Object.freeze({has:name=>Object.prototype.hasOwnProperty.call(ids,name),idle,run,basic,recoil,ready});
 window.BlazingAnimationQuality=api;return api;
})();
`;

const idleAt=html.indexOf('function unitIdleFrames(name){');
if(idleAt<0)fail('unitIdleFrames anchor missing');
if(!html.includes('const BB_ANIMATION_QUALITY_RUNTIME=(()=>{'))html=html.slice(0,idleAt)+runtime+'\n'+html.slice(idleAt);

const idlePrefix='function unitIdleFrames(name){';
const qualityIdlePrefix="function unitIdleFrames(name){const bbQualityRun=BB_ANIMATION_QUALITY_RUNTIME.has(name)&&S?.drag&&S?.dragUnitName===name?BB_ANIMATION_QUALITY_RUNTIME.run(name):null;const bbQualityIdle=BB_ANIMATION_QUALITY_RUNTIME.has(name)?BB_ANIMATION_QUALITY_RUNTIME.idle(name):null;const bbQualityRunReady=bbQualityRun?.every(BB_ANIMATION_QUALITY_RUNTIME.ready);const bbQualityIdleReady=bbQualityIdle?.filter(BB_ANIMATION_QUALITY_RUNTIME.ready)||[];if(bbQualityRunReady)return bbQualityRun;if(bbQualityIdleReady.length)return bbQualityIdleReady;";
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

// Scorpion Basic uses a continuous hand-to-target chain spear while the correct
// authored spear VFX is being rebuilt. Do not substitute the mismatched uploaded atlas.
const spearRx=/}else if\(f\.kind==='uploadedScorpionSpear'\)\{[\s\S]*?(?=}else if\(f\.kind==='iceProjectile'\)\{)/;
const spearRenderer=String.raw`}else if(f.kind==='uploadedScorpionSpear'){
     /* bbScorpionChainV4: hand-connected chain spear, atlas intentionally bypassed */
     const t=clamp((performance.now()-f.start)/Math.max(1,f.duration),0,1),ease=1-Math.pow(1-t,2.5),from=f.from,to=f.to;
     const tipX=from.x+(to.x-from.x)*ease,tipY=from.y+(to.y-from.y)*ease,dx=tipX-from.x,dy=tipY-from.y,len=Math.max(1,Math.hypot(dx,dy)),angle=Math.atan2(dy,dx);
     ctx.save();ctx.imageSmoothingEnabled=true;ctx.lineCap='round';ctx.lineJoin='round';
     const links=Math.max(5,Math.min(34,Math.floor(len/7.5)));
     for(let n=0;n<=links;n++){const p=n/links,cx=from.x+dx*p,cy=from.y+dy*p+Math.sin(p*Math.PI*2.5+t*3)*.9*(1-p);ctx.save();ctx.translate(cx,cy);ctx.rotate(angle+(n%2?0:Math.PI/2));ctx.strokeStyle=n%3===0?'rgba(226,172,88,.98)':'rgba(86,61,43,.98)';ctx.lineWidth=1.15;ctx.beginPath();ctx.ellipse(0,0,3.5,1.55,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
     ctx.translate(tipX,tipY);ctx.rotate(angle);ctx.shadowColor='rgba(255,132,20,.48)';ctx.shadowBlur=3;ctx.fillStyle='#c8a15b';ctx.strokeStyle='#3a2920';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(4,-5.2);ctx.lineTo(-7,-2.1);ctx.lineTo(-11,0);ctx.lineTo(-7,2.1);ctx.lineTo(4,5.2);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    `;
if(spearRx.test(html))html=html.replace(spearRx,spearRenderer);
else if(!html.includes('bbScorpionChainV4'))fail('Scorpion spear renderer anchor missing');

html=html.replace('releaseDelay=360,flightDuration=420,impactHold=260','releaseDelay=350,flightDuration=390,impactHold=250');
html=html.replace('releaseDelay=330,flightDuration=360,impactHold=250','releaseDelay=350,flightDuration=390,impactHold=250');
html=html.replace("state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:95};","state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:72,frameSequence:[0,1,2,3,4,5,6,7,8,9,10,11]};");
html=html.replace("state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:72,frameSequence:[0,1,2,3,4,4,4,4,5,5]};","state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:72,frameSequence:[0,1,2,3,4,5,6,7,8,9,10,11]};");

for(const marker of ['BB_ANIMATION_QUALITY_RUNTIME','sequenceFit','bbQualityRunning','bbScorpionChainV4'])if(!html.includes(marker))fail('missing '+marker);
for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`animation-quality-${index}.js`})}
  catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`)}
}
await fs.writeFile(file,html);
console.log('Animation Quality PASS: Scorpion/Mashle use sequence-wide 12-frame normalization; Gaara cadence tightened; Scorpion Basic uses connected temporary spear presentation.');
