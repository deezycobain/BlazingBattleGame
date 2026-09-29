import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Animation quality hotfix: '+message)};

// The prior runtime centered V2 frames but refused to enlarge undersized source
// art. That made Scorpion visibly smaller than the rest of the battlefield.
const oldFit="const fit=Math.min(1,targetHeight/bodyH,maxWidth/bodyW);";
const newFit="const fit=Math.min(name==='Scorpion'?1.34:1.20,targetHeight/bodyH,maxWidth/bodyW);";
if(html.includes(oldFit))html=html.replace(oldFit,newFit);
else if(!html.includes(newFit))fail('canonical fit anchor missing');

// Remove isolated neighboring-cell fragments from Scorpion/Mashle run frames
// before bounds are measured. We remove only small edge islands; the main body
// is never cropped or masked.
const readyAnchor="const ready=frame=>frame?.complete&&frame.naturalWidth>0&&frame.naturalHeight>0;";
const cleaner=String.raw`
 const clearDetachedRunEdgeFragments=(imageData,width,height,name,kind,index)=>{
   if(kind!=='run')return false;
   const pixels=imageData.data,columns=new Uint32Array(width),runs=[];
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4;if(pixels[p+3]>12)columns[x]++;}
   let x=0;
   while(x<width){while(x<width&&columns[x]===0)x++;if(x>=width)break;const start=x;let mass=0;while(x<width&&columns[x]>0){mass+=columns[x];x++;}runs.push({start,end:x-1,mass});}
   if(runs.length<2)return false;
   const main=runs.reduce((best,run)=>run.mass>best.mass?run:best,runs[0]);
   const junk=runs.filter(run=>run!==main&&(run.start<=2||run.end>=width-3)&&run.mass<main.mass*.24&&(run.end-run.start+1)<width*.22);
   if(!junk.length)return false;
   for(const run of junk)for(let y=0;y<height;y++)for(let cx=run.start;cx<=run.end;cx++){const p=(y*width+cx)*4;pixels[p]=0;pixels[p+1]=0;pixels[p+2]=0;pixels[p+3]=0;}
   console.warn('[BlazingBattle] removed detached run atlas fragment',name,index+1,junk.map(run=>[run.start,run.end]));
   return true;
 };
`;
if(html.includes(readyAnchor)&&!html.includes('clearDetachedRunEdgeFragments='))html=html.replace(readyAnchor,readyAnchor+cleaner);
else if(!html.includes('clearDetachedRunEdgeFragments='))fail('run fragment cleaner anchor missing');

const oldPixels="const pixels=pctx.getImageData(0,0,width,height).data;";
const newPixels="const bbImageData=pctx.getImageData(0,0,width,height);if(clearDetachedRunEdgeFragments(bbImageData,width,height,name,kind,index))pctx.putImageData(bbImageData,0,0);const pixels=bbImageData.data;";
if(html.includes(oldPixels))html=html.replace(oldPixels,newPixels);
else if(!html.includes('const bbImageData=pctx.getImageData'))fail('run fragment cleanup injection missing');

const oldDraw="ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,width,height,dx,dy,width*fit,height*fit);";
const newDraw="ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(probe,0,0,width,height,dx,dy,width*fit,height*fit);";
if(html.includes(oldDraw))html=html.replace(oldDraw,newDraw);
else if(!html.includes(newDraw))fail('cleaned probe render anchor missing');

// Retire the old 92%-width Scorpion run clip mask. It removed legitimate body
// pixels and caused exactly the clipping seen on the phone build.
const scorpionGuard="   const bbScorpionRunGuard=name==='Scorpion'&&S?.drag&&S?.dragUnitName===name;\n   if(bbScorpionRunGuard){ctx.save();ctx.beginPath();ctx.rect(-w/2,spriteY,w*.92,h);ctx.clip();}\n";
if(html.includes(scorpionGuard))html=html.replace(scorpionGuard,'');
html=html.replace('   if(bbScorpionRunGuard)ctx.restore();\n','');

// Restore the supplied Scorpion chain-spear atlas. The previous final pass
// replaced it with a procedural spear, and an earlier iPhone guard forced the
// fallback path even when the real atlas existed.
const spearRx=/}else if\(f\.kind==='uploadedScorpionSpear'\)\{[\s\S]*?(?=}else if\(f\.kind==='iceProjectile'\)\{)/;
const spearRenderer=String.raw`}else if(f.kind==='uploadedScorpionSpear'){
     /* bbScorpionSuppliedSpearV3: supplied chain-spear atlas only */
     const t=clamp((performance.now()-f.start)/Math.max(1,f.duration),0,1),ease=1-Math.pow(1-t,2.25),from=f.from,to=f.to;
     const x=from.x+(to.x-from.x)*ease,y=from.y+(to.y-from.y)*ease,dir=to.x<from.x?-1:1;
     const frames=uploadedVfxFrames('scorpionSpear'),wanted=Math.min(frames.length-1,Math.floor(t*frames.length));
     let img=frames[wanted];
     if(!(img?.complete&&img.naturalWidth>0))for(let delta=1;delta<frames.length;delta++){const before=frames[wanted-delta],after=frames[wanted+delta];if(before?.complete&&before.naturalWidth>0){img=before;break}if(after?.complete&&after.naturalWidth>0){img=after;break}}
     if(img?.complete&&img.naturalWidth>0){ctx.save();ctx.translate(x,y);ctx.scale(dir,1);ctx.globalAlpha=.99;ctx.imageSmoothingEnabled=true;ctx.shadowColor='rgba(255,148,28,.48)';ctx.shadowBlur=4;ctx.drawImage(img,-64,-36,128,72);ctx.restore();}
    `;
if(spearRx.test(html))html=html.replace(spearRx,spearRenderer);
else if(!html.includes('bbScorpionSuppliedSpearV3'))fail('Scorpion supplied spear renderer anchor missing');

html=html.replace('releaseDelay=330,flightDuration=360,impactHold=250','releaseDelay=350,flightDuration=390,impactHold=250');

for(const marker of [newFit,'clearDetachedRunEdgeFragments','bbScorpionSuppliedSpearV3',"uploadedVfxFrames('scorpionSpear')"])if(!html.includes(marker))fail('missing final marker '+marker);
for(const forbidden of ['bbScorpionChainV2','bbScorpionRunGuard'])if(html.includes(forbidden))fail('retired visual workaround survived: '+forbidden);
for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`animation-quality-hotfix-${index}.js`})}
  catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`)}
}
await fs.writeFile(file,html);
console.log('Animation Quality Hotfix PASS: Scorpion canonical size restored; Scorpion/Mashle run overlap cleanup active; supplied Scorpion spear atlas restored.');
