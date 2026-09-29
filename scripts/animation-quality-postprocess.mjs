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
   return Array.from({length:12},(_,index)=>'assets/characters/'+id+'/sprites/runtime/v2/'+kind+'/frame_'+String(index+1).padStart(2,'0')+'.png?motionQuality=v1');
 };
 const ready=frame=>frame?.complete&&frame.naturalWidth>0&&frame.naturalHeight>0;
 const normalizedSequence=(name,kind)=>{
   const key=name+':'+kind;if(cache.has(key))return cache.get(key);
   const sources=paths(name,kind),outputs=sources.map(()=>new Image());
   let cursor=0;
   const pump=()=>{
     if(cursor>=sources.length)return;
     const index=cursor++,src=sources[index],output=outputs[index],source=new Image();
     source.decoding='async';
     const fallback=()=>{output.src=src;pump();};
     source.addEventListener('error',fallback,{once:true});
     source.addEventListener('load',()=>{try{
       const width=source.naturalWidth||512,height=source.naturalHeight||768;
       const probe=document.createElement('canvas');probe.width=width;probe.height=height;
       const pctx=probe.getContext('2d',{willReadFrequently:true});pctx.drawImage(source,0,0,width,height);
       const pixels=pctx.getImageData(0,0,width,height).data;
       let minX=width,minY=height,maxX=-1,maxY=-1;
       for(let p=0;p<pixels.length;p+=4){if(pixels[p+3]<=12)continue;const px=(p/4)%width,py=Math.floor((p/4)/width);if(px<minX)minX=px;if(px>maxX)maxX=px;if(py<minY)minY=py;if(py>maxY)maxY=py;}
       if(maxX<minX||maxY<minY){fallback();return;}
       const bodyW=maxX-minX+1,bodyH=maxY-minY+1;
       const maxWidth=kind==='attack'?448:420,targetHeight=600;
       const fit=Math.min(1,targetHeight/bodyH,maxWidth/bodyW);
       const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;const ctx=canvas.getContext('2d');
       const centerX=(minX+maxX+1)/2,bottomY=maxY+1;
       const dx=Math.round(256-centerX*fit),dy=Math.round(700-bottomY*fit);
       ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,width,height,dx,dy,width*fit,height*fit);
       if(minX<=1||maxX>=width-2||minY<=1||maxY>=height-2)console.warn('[BlazingBattle] source frame reaches canvas edge',name,kind,index+1);
       canvas.toBlob(blob=>{if(!blob){fallback();return;}const url=URL.createObjectURL(blob);output.addEventListener('load',()=>URL.revokeObjectURL(url),{once:true});output.src=url;pump();},'image/png');
     }catch(error){console.warn('[BlazingBattle] motion normalization fallback',name,kind,index+1,error);fallback();}}, {once:true});
     source.src=src;
   };
   pump();cache.set(key,outputs);return outputs;
 };
 const idle=name=>{const frames=normalizedSequence(name,'idle');normalizedSequence(name,'run');return frames;};
 const run=name=>normalizedSequence(name,'run');
 const basic=name=>name==='Mashle'?normalizedSequence(name,'attack'):null;
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

// Once a unit is governed by the quality runtime, never fall through to its raw
// V2 frames. Raw frames are exactly where the mobile clipping/anchor drift came from.
html=html.replace('const uploadedRun=UPLOADED_CHARACTER_MOTION.has(name)&&S?.drag&&S?.dragUnitName===name?UPLOADED_CHARACTER_MOTION.run(name):null;','const uploadedRun=!BB_ANIMATION_QUALITY_RUNTIME.has(name)&&UPLOADED_CHARACTER_MOTION.has(name)&&S?.drag&&S?.dragUnitName===name?UPLOADED_CHARACTER_MOTION.run(name):null;');
html=html.replace('const uploadedIdle=UPLOADED_CHARACTER_MOTION.has(name)?UPLOADED_CHARACTER_MOTION.idle(name):null;','const uploadedIdle=!BB_ANIMATION_QUALITY_RUNTIME.has(name)&&UPLOADED_CHARACTER_MOTION.has(name)?UPLOADED_CHARACTER_MOTION.idle(name):null;');

const attackPrefix='function unitAttackFrames(name,kind){';
const qualityAttackPrefix="function unitAttackFrames(name,kind){const bbQualityBasic=kind!=='jutsu'&&kind!=='special'?BB_ANIMATION_QUALITY_RUNTIME.basic(name):null;if(bbQualityBasic?.every(BB_ANIMATION_QUALITY_RUNTIME.ready))return bbQualityBasic;";
if(!html.includes('const bbQualityBasic='))html=html.replace(attackPrefix,qualityAttackPrefix);
html=html.replace("const uploadedBasicFrames=UPLOADED_CHARACTER_MOTION.has(name)&&kind!=='jutsu'&&kind!=='special'?UPLOADED_CHARACTER_MOTION.basic(name):null;","const uploadedBasicFrames=!BB_ANIMATION_QUALITY_RUNTIME.has(name)&&UPLOADED_CHARACTER_MOTION.has(name)&&kind!=='jutsu'&&kind!=='special'?UPLOADED_CHARACTER_MOTION.basic(name):null;");

// Smooth run cadence. Twelve-frame premium movement should read around 14 fps;
// Gaara currently has ten authored frames, so run him slightly faster without
// changing his actual battlefield movement speed.
const cadenceRx=/const septemberRunning=SEPTEMBER27_BODY_RUNTIME\.has\(name\)&&S\?\.drag&&S\?\.dragUnitName===name;\s*const idleMs=\(obitoRunning\|\|itachiRunning\|\|uploadedRunning\|\|septemberRunning\)\?85:SEPTEMBER27_BODY_RUNTIME\.has\(name\)\?270:/;
if(cadenceRx.test(html))html=html.replace(cadenceRx,"const septemberRunning=SEPTEMBER27_BODY_RUNTIME.has(name)&&S?.drag&&S?.dragUnitName===name;\n const bbQualityRunning=BB_ANIMATION_QUALITY_RUNTIME.has(name)&&S?.drag&&S?.dragUnitName===name;\n const idleMs=bbQualityRunning?72:(name==='Egyptian Gaara'&&septemberRunning)?74:(obitoRunning||itachiRunning||uploadedRunning||septemberRunning)?85:SEPTEMBER27_BODY_RUNTIME.has(name)?270:");
else if(!html.includes('const bbQualityRunning=BB_ANIMATION_QUALITY_RUNTIME.has(name)'))fail('motion cadence anchor missing');

// Scorpion's attack is a chain spear, not a detached projectile. Render the
// chain continuously from the authored hand origin to the moving spear tip at
// display refresh rate. This keeps the attack connected even though the current
// body sheet is still the six-frame safe fallback.
const spearRx=/}else if\(f\.kind==='uploadedScorpionSpear'\)\{[\s\S]*?(?=}else if\(f\.kind==='iceProjectile'\)\{)/;
const spearRenderer=String.raw`}else if(f.kind==='uploadedScorpionSpear'){
     /* bbScorpionChainV2: continuous hand-to-spear world-space chain */
     const t=clamp((performance.now()-f.start)/Math.max(1,f.duration),0,1),ease=1-Math.pow(1-t,2.35),from=f.from,to=f.to;
     const tipX=from.x+(to.x-from.x)*ease,tipY=from.y+(to.y-from.y)*ease,dx=tipX-from.x,dy=tipY-from.y,len=Math.max(1,Math.hypot(dx,dy)),angle=Math.atan2(dy,dx);
     ctx.save();ctx.imageSmoothingEnabled=true;ctx.lineCap='round';ctx.lineJoin='round';
     ctx.strokeStyle='rgba(82,55,38,.96)';ctx.lineWidth=1.35;ctx.shadowColor='rgba(255,135,24,.35)';ctx.shadowBlur=3;ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(tipX,tipY);ctx.stroke();
     const links=Math.max(4,Math.min(30,Math.floor(len/8)));
     for(let n=1;n<=links;n++){const p=n/links,cx=from.x+dx*p,cy=from.y+dy*p+Math.sin(p*Math.PI*3+t*4)*1.15*(1-p);ctx.save();ctx.translate(cx,cy);ctx.rotate(angle+(n%2?0:Math.PI/2));ctx.strokeStyle=n%3===0?'rgba(255,171,54,.92)':'rgba(103,66,39,.95)';ctx.lineWidth=1.15;ctx.beginPath();ctx.ellipse(0,0,3.8,1.7,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
     ctx.translate(tipX,tipY);ctx.rotate(angle);ctx.shadowColor='rgba(255,119,18,.62)';ctx.shadowBlur=5;ctx.fillStyle='#d6a24b';ctx.strokeStyle='#4a2e20';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(1,-6.4);ctx.lineTo(4,-1.9);ctx.lineTo(-8,-1.9);ctx.lineTo(-8,1.9);ctx.lineTo(4,1.9);ctx.lineTo(1,6.4);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    `;
if(spearRx.test(html))html=html.replace(spearRx,spearRenderer);
else if(!html.includes('bbScorpionChainV2'))fail('Scorpion spear renderer anchor missing');

html=html.replace('releaseDelay=360,flightDuration=420,impactHold=260','releaseDelay=330,flightDuration=360,impactHold=250');
html=html.replace("state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:95};","state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:72,frameSequence:[0,1,2,3,4,4,4,4,5,5]};");

for(const marker of ['BB_ANIMATION_QUALITY_RUNTIME','bbQualityRunning','bbScorpionChainV2'])if(!html.includes(marker))fail('missing '+marker);
for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`animation-quality-${index}.js`})}
  catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`)}
}
await fs.writeFile(file,html);
console.log('Animation Quality PASS: Scorpion/Mashle V2 motion is canonicalized before display; Gaara run cadence tightened; Scorpion spear is hand-connected and continuous.');
