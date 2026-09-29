import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Battle visual normalization: '+message)};

// Final visual authority for uploaded character packs. The source sheets do not
// share the same visible-body occupancy even though they use 512x768 canvases.
// Mashle's V2 art fills substantially more of that canvas, so the previous 1.46
// boost made him tower over the rest of the squad on mobile.
const oldScale="name==='Scorpion'?1.38:name==='Mashle'?1.46:1";
const newScale="name==='Scorpion'?1.38:name==='Mashle'?.92:1";
if(html.includes(oldScale))html=html.replace(oldScale,newScale);
else if(!html.includes(newScale))fail('fighter scale anchor missing');

// Scorpion's live V2 normalization intentionally does not run on iPhone because
// duplicating twelve decoded canvases can black-screen WebKit. The raw V2 idle
// frames visibly wander on mobile, so use the already-normalized legacy runtime
// set there until a pre-normalized V2 pack is committed.
const oldMobileSafe="const mobileSafeNames=new Set(['Scorpion','Mashle']);";
const newMobileSafe="const mobileSafeNames=new Set(['Mashle']);";
if(html.includes(oldMobileSafe))html=html.replace(oldMobileSafe,newMobileSafe);

// The uploaded Egyptian effect sheets were authored as self-contained effect
// animations, not moving projectile sprites. Translating/rotating them across
// the battlefield exposed their source crop and made the attack look clipped.
// Render clean world-space effects for the current Basic attacks instead. These
// are independent of fighter scale and never inherit sprite-sheet crop bounds.
const egyptianVfxRx=/}else if\(f\.kind==='gaaraSandBlast'\)\{[\s\S]*?(?=}else if\(f\.kind==='obitoFireball'\)\{)/;
const egyptianVfx=String.raw`}else if(f.kind==='gaaraSandBlast'){
     /* bbEgyptianVfxV2: world-space sand stream, no source-sheet crop */
     const age=performance.now()-f.start,flight=Math.max(1,f.flightDuration||560),impact=Math.max(1,f.impactDuration||420),travel=Math.min(1,age/flight),ease=1-Math.pow(1-travel,2.15),x=f.from.x+(f.to.x-f.from.x)*ease,y=f.from.y+(f.to.y-f.from.y)*ease-4*Math.sin(Math.PI*travel),angle=Math.atan2(f.to.y-f.from.y,f.to.x-f.from.x);
     ctx.save();ctx.imageSmoothingEnabled=true;
     if(age<=flight){
       ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=.96;
       ctx.shadowColor='rgba(126,78,26,.35)';ctx.shadowBlur=5;
       for(let n=0;n<11;n++){
         const p=n/10,wobble=Math.sin(age/52+n*1.37)*4.5,px=-p*62,ry=3.1+2.4*(1-p),rx=5.5+6.5*(1-p);
         ctx.fillStyle=n%3===0?'rgba(247,215,145,.86)':n%3===1?'rgba(215,166,86,.90)':'rgba(174,123,61,.84)';
         ctx.beginPath();ctx.ellipse(px,wobble,rx,ry,-.08,0,Math.PI*2);ctx.fill();
       }
       ctx.globalAlpha=.54;ctx.strokeStyle='rgba(255,230,170,.78)';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(-54,-5);ctx.quadraticCurveTo(-19,-13,12,-2);ctx.stroke();
     }else{
       const t=Math.min(1,(age-flight)/impact),fade=1-t;ctx.translate(f.to.x,f.to.y+7);ctx.globalAlpha=fade;
       ctx.fillStyle='rgba(210,157,78,.78)';ctx.shadowColor='rgba(118,73,24,.28)';ctx.shadowBlur=5;
       for(let n=0;n<14;n++){
         const a=n*Math.PI*2/14+(n%2)*.13,r=10+42*t+(n%4)*3,rx=4.8+(n%3),ry=2.6+(n%2)*1.4;
         ctx.beginPath();ctx.ellipse(Math.cos(a)*r,Math.sin(a)*r*.46-7*t,rx,ry,a,0,Math.PI*2);ctx.fill();
       }
       ctx.strokeStyle='rgba(248,211,135,'+(.74*fade)+')';ctx.lineWidth=2.6;ctx.beginPath();ctx.ellipse(0,1,16+38*t,7+16*t,0,0,Math.PI*2);ctx.stroke();
     }
     ctx.restore();
    }else if(f.kind==='solarNarutoRasengan'){
     /* bbEgyptianVfxV2: compact golden Sun Rasengan in world space */
     const age=performance.now()-f.start,flight=Math.max(1,f.flightDuration||520),impact=Math.max(1,f.impactDuration||440),travel=Math.min(1,age/flight),ease=1-Math.pow(1-travel,2.3),x=f.from.x+(f.to.x-f.from.x)*ease,y=f.from.y+(f.to.y-f.from.y)*ease-6*Math.sin(Math.PI*travel);
     ctx.save();ctx.imageSmoothingEnabled=true;ctx.globalCompositeOperation='screen';
     if(age<=flight){
       ctx.translate(x,y);const pulse=1+Math.sin(age/55)*.045,r=13.5*pulse;
       const glow=ctx.createRadialGradient(0,0,2,0,0,25);glow.addColorStop(0,'rgba(255,255,224,.98)');glow.addColorStop(.28,'rgba(255,228,92,.95)');glow.addColorStop(.62,'rgba(255,164,25,.48)');glow.addColorStop(1,'rgba(255,136,0,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.fill();
       ctx.fillStyle='rgba(255,232,105,.84)';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
       ctx.strokeStyle='rgba(255,250,194,.94)';ctx.lineWidth=1.9;
       for(let n=0;n<3;n++){ctx.save();ctx.rotate(age/145+n*Math.PI*2/3);ctx.beginPath();ctx.ellipse(0,0,18,7.2,n*.35,.15,Math.PI*1.78);ctx.stroke();ctx.restore();}
     }else{
       const t=Math.min(1,(age-flight)/impact),fade=1-t;ctx.translate(f.to.x,f.to.y);ctx.globalAlpha=fade;
       const glow=ctx.createRadialGradient(0,0,2,0,0,38+22*t);glow.addColorStop(0,'rgba(255,255,230,.96)');glow.addColorStop(.24,'rgba(255,224,83,.76)');glow.addColorStop(.62,'rgba(255,159,21,.28)');glow.addColorStop(1,'rgba(255,130,0,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,38+22*t,0,Math.PI*2);ctx.fill();
       ctx.strokeStyle='rgba(255,239,145,.92)';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,15+39*t,0,Math.PI*2);ctx.stroke();
       ctx.lineWidth=1.7;for(let n=0;n<8;n++){const a=n*Math.PI/4+age/420,inner=19+19*t,outer=31+39*t;ctx.beginPath();ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);ctx.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);ctx.stroke();}
     }
     ctx.restore();
    `;
if(egyptianVfxRx.test(html))html=html.replace(egyptianVfxRx,egyptianVfx);
else if(!html.includes('bbEgyptianVfxV2'))fail('Egyptian Basic VFX renderer anchor missing');

// Scorpion's spear needs to release from his forward hand line, not from the
// unit centre plus a second renderer Y offset. Tighten the timing and remove the
// extra vertical translation so body pose, chain, and target contact read as one
// attack rather than three disconnected beats.
html=html.replace('releaseDelay=420,flightDuration=480,impactHold=420','releaseDelay=360,flightDuration=420,impactHold=260');
html=html.replace("state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:105};","state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:95};");
html=html.replace("from:{x:from.x,y:from.y-29},to:{x:enemy.x,y:enemy.y-22}","from:{x:from.x+(enemy.x>=from.x?20:-20),y:from.y-25},to:{x:enemy.x,y:enemy.y-22}");
html=html.replace('ctx.translate(x,y-17);ctx.scale(dir,1);','ctx.translate(x,y);ctx.scale(dir,1);');
// On iPhone prefer the lightweight procedural chain/spear fallback. It is
// stable and aligned while avoiding another high-resolution twelve-frame VFX decode.
html=html.replace("if(img?.complete&&img.naturalWidth>0){ctx.shadowColor='rgba(255,182,42,.76)'","if(!UPLOADED_VFX_MOBILE_GUARD&&img?.complete&&img.naturalWidth>0){ctx.shadowColor='rgba(255,182,42,.76)'");

for(const marker of [newScale,'bbEgyptianVfxV2'])if(!html.includes(marker))fail('missing final marker '+marker);
for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`battle-visual-normalization-${index}.js`})}
  catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`)}
}
await fs.writeFile(file,html);
console.log('Battle visual normalization PASS: Mashle footprint corrected; Scorpion mobile idle fallback and spear alignment applied; Egyptian Basics use unclipped world-space VFX.');
