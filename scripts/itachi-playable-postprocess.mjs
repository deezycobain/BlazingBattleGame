import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=msg=>{throw new Error(`Itachi playable integration: ${msg}`)};
const replaceOne=(from,to,label)=>{
  const hits=html.split(from).length-1;
  if(hits!==1)fail(`expected one ${label}, found ${hits}`);
  html=html.replace(from,to);
};

replaceOne(
  "['crimson','subzero','lebee','senku','tyler','anubis']",
  "['crimson','subzero','lebee','senku','tyler','itachi','anubis']",
  'battle roster id list'
);
replaceOne(
  "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku','Tyler']);",
  "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku','Tyler','Itachi']);",
  'active playable whitelist'
);

const frameRuntime=String.raw`
const ITACHI_IDLE_FRAMES=makeImageFrames([
 'assets/characters/itachi/sprites/runtime/idle/frame_01.png','assets/characters/itachi/sprites/runtime/idle/frame_02.png','assets/characters/itachi/sprites/runtime/idle/frame_03.png','assets/characters/itachi/sprites/runtime/idle/frame_04.png','assets/characters/itachi/sprites/runtime/idle/frame_05.png','assets/characters/itachi/sprites/runtime/idle/frame_06.png'
]);
const ITACHI_BASIC_FRAMES=makeImageFrames([
 'assets/characters/itachi/sprites/runtime/attack/basic/frame_01.png','assets/characters/itachi/sprites/runtime/attack/basic/frame_02.png','assets/characters/itachi/sprites/runtime/attack/basic/frame_03.png','assets/characters/itachi/sprites/runtime/attack/basic/frame_04.png','assets/characters/itachi/sprites/runtime/attack/basic/frame_05.png','assets/characters/itachi/sprites/runtime/attack/basic/frame_06.png'
]);
const ITACHI_TSUKUYOMI_FRAMES=makeImageFrames([
 'assets/characters/itachi/sprites/runtime/jutsu/tsukuyomi/cast/frame_01.png','assets/characters/itachi/sprites/runtime/jutsu/tsukuyomi/cast/frame_02.png','assets/characters/itachi/sprites/runtime/jutsu/tsukuyomi/cast/frame_03.png','assets/characters/itachi/sprites/runtime/jutsu/tsukuyomi/cast/frame_04.png','assets/characters/itachi/sprites/runtime/jutsu/tsukuyomi/cast/frame_05.png','assets/characters/itachi/sprites/runtime/jutsu/tsukuyomi/cast/frame_06.png'
]);
const ITACHI_TSUKUYOMI_OVERLAY_FRAMES=makeImageFrames([
 'assets/characters/itachi/vfx/jutsu/tsukuyomi/overlay/frame_01.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/overlay/frame_02.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/overlay/frame_03.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/overlay/frame_04.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/overlay/frame_05.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/overlay/frame_06.png'
]);
const ITACHI_TSUKUYOMI_MANDALA_FRAMES=makeImageFrames([
 'assets/characters/itachi/vfx/jutsu/tsukuyomi/mandala/frame_01.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/mandala/frame_02.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/mandala/frame_03.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/mandala/frame_04.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/mandala/frame_05.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/mandala/frame_06.png'
]);
const ITACHI_TSUKUYOMI_TARGET_FRAMES=makeImageFrames([
 'assets/characters/itachi/vfx/jutsu/tsukuyomi/target/frame_01.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/target/frame_02.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/target/frame_03.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/target/frame_04.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/target/frame_05.png'
]);
const ITACHI_CROW_BURST=new Image();ITACHI_CROW_BURST.src='assets/characters/itachi/vfx/basic/crows/crow_chakra_burst.png';
const ITACHI_CROW_SWARM=new Image();ITACHI_CROW_SWARM.src='assets/characters/itachi/vfx/basic/crows/crow_swarm.png';
const ITACHI_CROW_VORTEX=new Image();ITACHI_CROW_VORTEX.src='assets/characters/itachi/vfx/basic/crows/crow_vortex_ring.png';
const ITACHI_CROW_FEATHERSTORM=new Image();ITACHI_CROW_FEATHERSTORM.src='assets/characters/itachi/vfx/basic/crows/crow_featherstorm.png';
`;
const idleAnchor='function unitIdleFrames(name){';
const idleAt=html.indexOf(idleAnchor);
if(idleAt<0)fail('unitIdleFrames anchor missing');
html=html.slice(0,idleAt)+frameRuntime+'\n'+html.slice(idleAt);
html=html.replace(idleAnchor,"function unitIdleFrames(name){if(name==='Itachi')return ITACHI_IDLE_FRAMES;");

const attackAnchor='function unitAttackFrames(name,kind){';
if(!html.includes(attackAnchor))fail('unitAttackFrames anchor missing');
html=html.replace(attackAnchor,"function unitAttackFrames(name,kind){if(name==='Itachi'){if(kind==='tsukuyomi'||kind==='special'||kind==='jutsu')return ITACHI_TSUKUYOMI_FRAMES;return ITACHI_BASIC_FRAMES;}");

const itachiAnimations=String.raw`
function animateItachiCrowStrike(unitName,from,enemy,onImpact,onDone,attackKind='basic_attack'){
 const token=ACTIVE_ACTION_TOKEN;
 const state=ensureAnimState();if(!state.attackPose)state.attackPose={};
 const releaseDelay=360,flightDuration=560,impactHold=280,totalDuration=releaseDelay+flightDuration+impactHold;
 state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:totalDuration};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  const fx={kind:'itachiCrowStrike',from:{x:from.x,y:from.y-26},to:{x:enemy.x,y:enemy.y-18},start:performance.now(),duration:flightDuration+impactHold,flightDuration,impactHold,life:1};
  S.floaters.push(fx);
  setTimeout(()=>{
   if(!actionTokenAlive(token))return;
   try{onImpact&&onImpact()}catch(err){console.error('Itachi Crow Chakra Strike impact failed:',err);return recoverAction('Itachi basic impact')}
   setTimeout(()=>{
    S.floaters=S.floaters.filter(x=>x!==fx);
    const st=ensureAnimState();if(st.attackPose)delete st.attackPose[unitName];
    window.BlazingAttackPresentation.clearFacing(st,unitName);
    if(actionTokenAlive(token)){try{onDone&&onDone()}catch(err){recoverAction('Itachi basic completion')}}
   },impactHold);
  },flightDuration);
 },releaseDelay);
}

function animateItachiTsukuyomi(unitName,from,enemy,onImpact,onDone){
 const token=ACTIVE_ACTION_TOKEN;
 const state=ensureAnimState();if(!state.attackPose)state.attackPose={};
 const overlayDelay=500,nightmareAt=1450,impactAt=2200,holdAfterImpact=900,totalDuration=impactAt+holdAfterImpact;
 state.attackPose[unitName]={kind:'tsukuyomi',start:performance.now(),duration:totalDuration};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 const data=canonicalUnit('itachi'),meta=data?.abilities?.jutsu?.presentation||{};
 S.jutsuDim={start:performance.now(),alpha:meta.screen_dim_alpha??.68,end:null};
 const active=[];
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  const start=performance.now(),duration=totalDuration-overlayDelay;
  const overlay={kind:'itachiTsukuyomiOverlay',start,duration,life:1};
  const mandala={kind:'itachiTsukuyomiMandala',start,duration,life:1};
  active.push(overlay,mandala);S.floaters.push(overlay,mandala);
 },overlayDelay);
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  const liveTargets=(S.enemies||[]).filter(target=>target&&target.hp>0);
  const nightmare={kind:'itachiTsukuyomiNightmare',start:performance.now(),duration:totalDuration-nightmareAt,points:liveTargets.map(target=>({x:target.x,y:target.y})),life:1};
  active.push(nightmare);S.floaters.push(nightmare);
 },nightmareAt);
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  const liveTargets=(S.enemies||[]).filter(target=>target&&target.hp>0);
  const targetX=liveTargets.length?liveTargets.reduce((sum,target)=>sum+target.x,0)/liveTargets.length:enemy.x;
  const targetY=liveTargets.length?liveTargets.reduce((sum,target)=>sum+target.y,0)/liveTargets.length:enemy.y;
  const targetFx={kind:'itachiTsukuyomiTarget',x:targetX,y:targetY,points:liveTargets.map(target=>({x:target.x,y:target.y})),start:performance.now(),duration:holdAfterImpact,life:1};
  active.push(targetFx);S.floaters.push(targetFx);
  try{onImpact&&onImpact()}catch(err){console.error('Itachi Tsukuyomi primary impact failed:',err);return recoverAction('Itachi Tsukuyomi impact')}
  try{
   const pair=(S.pairs||[]).find(p=>front(p)?.name===unitName),actor=pair?front(pair):null;
   const multiplier=Number(data?.abilities?.jutsu?.damage_multiplier)||1.75;
   const aoeDamage=Math.max(1,Number(actor?.jutsuDamage)||window.BlazingCombatRuntime.computeScaledDamage(actor?.attack??data?.stats?.attack??40,multiplier));
   const gaugeCut=Number(data?.abilities?.jutsu?.gauge_reduction)||45;
   for(const target of liveTargets){
    if(!target||target===enemy||target.hp<=0)continue;
    window.BlazingCombatRuntime.execute('damage_target',{target,damage:aoeDamage});
    window.BlazingCombatRuntime.execute('reduce_target_gauge',{target,parameters:{amount:gaugeCut,minimum_gauge:0}});
   }
  }catch(err){console.error('Itachi Tsukuyomi AoE resolution failed:',err)}
  setTimeout(()=>{
   S.floaters=S.floaters.filter(x=>!active.includes(x));
   if(S.jutsuDim)S.jutsuDim.end=performance.now();
   const st=ensureAnimState();if(st.attackPose)delete st.attackPose[unitName];
   window.BlazingAttackPresentation.clearFacing(st,unitName);
   if(actionTokenAlive(token)){try{onDone&&onDone()}catch(err){recoverAction('Itachi Tsukuyomi completion')}}
  },holdAfterImpact);
 },impactAt);
}

`;
const freezeAnchor='function animateFreezeBlast(unitName,from,enemy,onImpact,onDone){';
const freezeAt=html.indexOf(freezeAnchor);
if(freezeAt<0)fail('Freeze Blast animation anchor missing');
html=html.slice(0,freezeAt)+itachiAnimations+html.slice(freezeAt);

const vfxAnchor="}else if(f.kind==='lebeeStarProjectile'){window.BlazingVfxRenderer.drawLebeeStarProjectile(ctx,f,LEBEE_STAR_PROJECTILE);}";
if(!html.includes(vfxAnchor))fail('floater VFX renderer anchor missing');
const itachiVfx=String.raw`}else if(f.kind==='itachiCrowStrike'){
      const age=performance.now()-f.start,flight=Math.max(1,f.flightDuration||560),impact=Math.max(1,f.impactHold||280);
      const travelT=clamp(age/flight,0,1),impactT=clamp((age-flight)/impact,0,1),ease=1-Math.pow(1-travelT,2.12);
      const x=f.from.x+(f.to.x-f.from.x)*ease,y=f.from.y+(f.to.y-f.from.y)*ease-8*Math.sin(Math.PI*travelT);
      const dir=f.to.x>=f.from.x?1:-1,tilt=clamp(Math.atan2(f.to.y-f.from.y,Math.max(1,Math.abs(f.to.x-f.from.x))),-.18,.18);
      const drawSmallCrow=(cx,cy,size,alpha,wing)=>{
       ctx.save();ctx.translate(cx,cy);ctx.rotate(tilt);ctx.scale(dir*size/34,size/34);ctx.globalAlpha*=alpha;
       ctx.fillStyle='rgba(4,4,8,.97)';ctx.strokeStyle='rgba(170,12,35,.72)';ctx.lineWidth=1.15;ctx.lineJoin='round';ctx.shadowColor='rgba(196,10,38,.5)';ctx.shadowBlur=4;
       ctx.beginPath();ctx.moveTo(-14,1);ctx.quadraticCurveTo(-7,-4,1,-2);ctx.quadraticCurveTo(8,-8,13,-5);ctx.lineTo(18,-2);ctx.lineTo(12,0);ctx.quadraticCurveTo(7,5,-1,4);ctx.lineTo(-12,7);ctx.lineTo(-8,2);ctx.lineTo(-17,-2);ctx.closePath();ctx.fill();ctx.stroke();
       ctx.beginPath();ctx.moveTo(-4,-2);ctx.quadraticCurveTo(-10,-12-wing,-17,-13-wing*.5);ctx.quadraticCurveTo(-13,-6,-8,-1);ctx.closePath();ctx.fill();
       ctx.beginPath();ctx.moveTo(-3,3);ctx.quadraticCurveTo(-10,9+wing,-15,10+wing*.4);ctx.quadraticCurveTo(-11,5,-7,2);ctx.closePath();ctx.fill();
       ctx.restore();
      };
      if(age<=flight){
       ctx.save();ctx.globalCompositeOperation='source-over';
       for(let i=0;i<7;i++){
        const sx=x-dir*(10+i*12),sy=y+Math.sin(i*1.45+travelT*7)*5,r=7+i*1.8,alpha=(.14-i*.012)*(1-travelT*.28);
        const smoke=ctx.createRadialGradient(sx,sy,0,sx,sy,r);smoke.addColorStop(0,'rgba(150,8,32,'+alpha+')');smoke.addColorStop(.48,'rgba(92,0,20,'+(alpha*.72)+')');smoke.addColorStop(1,'rgba(35,0,8,0)');ctx.fillStyle=smoke;ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();
       }
       ctx.restore();
       const flock=[[0,0,28,1],[-19,-12,24,.92],[-34,8,22,.84],[-49,-3,20,.76],[-62,14,18,.66]];
       for(let i=0;i<flock.length;i++){const item=flock[i],wing=Math.sin(travelT*Math.PI*6+i*1.2)*2.2;drawSmallCrow(x+dir*item[0],y+item[1],item[2],item[3],wing);}
      }else{
       const fade=Math.max(0,1-impactT),cx=f.to.x,cy=f.to.y;
       ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='source-over';
       const smoke=ctx.createRadialGradient(0,0,0,0,0,54+18*impactT);smoke.addColorStop(0,'rgba(124,0,27,'+(.30*fade)+')');smoke.addColorStop(.55,'rgba(70,0,15,'+(.18*fade)+')');smoke.addColorStop(1,'rgba(28,0,8,0)');ctx.fillStyle=smoke;ctx.beginPath();ctx.arc(0,0,72,0,Math.PI*2);ctx.fill();
       ctx.strokeStyle='rgba(207,19,45,'+(.58*fade)+')';ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(0,0,14+34*impactT,0,Math.PI*2);ctx.stroke();
       ctx.fillStyle='rgba(4,4,8,'+(.84*fade)+')';
       for(let i=0;i<7;i++){const a=-1.5+i*.47+impactT*.4,r=18+30*impactT+i*2;ctx.save();ctx.rotate(a);ctx.translate(r,0);ctx.rotate(.35);ctx.beginPath();ctx.moveTo(-6,0);ctx.quadraticCurveTo(0,-3,7,0);ctx.quadraticCurveTo(0,2.5,-6,0);ctx.fill();ctx.restore();}
       ctx.restore();
      }
    }else if(f.kind==='itachiTsukuyomiOverlay'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),fade=t<.16?t/.16:(t>.94?Math.max(0,(1-t)/.06):1),ritual=Math.min(1,t/.42);
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';
      ctx.fillStyle='rgba(4,0,2,'+(.58*fade)+')';ctx.fillRect(0,0,W,H);
      const field=ctx.createRadialGradient(W/2,H*.44,Math.min(W,H)*.08,W/2,H*.44,Math.max(W,H)*.76);
      field.addColorStop(0,'rgba(112,0,23,'+((.22+.08*ritual)*fade)+')');
      field.addColorStop(.48,'rgba(49,0,12,'+((.16+.06*ritual)*fade)+')');
      field.addColorStop(1,'rgba(2,0,1,'+(.72*fade)+')');
      ctx.fillStyle=field;ctx.fillRect(0,0,W,H);
      const vignette=ctx.createRadialGradient(W/2,H*.46,Math.min(W,H)*.24,W/2,H*.46,Math.max(W,H)*.78);
      vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.58,'rgba(0,0,0,.08)');vignette.addColorStop(1,'rgba(0,0,0,'+(.62*fade)+')');
      ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
      ctx.restore();
    }else if(f.kind==='itachiTsukuyomiMandala'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),idx=Math.min(ITACHI_TSUKUYOMI_MANDALA_FRAMES.length-1,Math.floor(t*ITACHI_TSUKUYOMI_MANDALA_FRAMES.length)),img=ITACHI_TSUKUYOMI_MANDALA_FRAMES[idx];
      const fade=t<.14?t/.14:(t>.92?Math.max(0,(1-t)/.08):1),pulse=.985+.018*Math.sin(t*Math.PI*2.05),eyeW=Math.min(W*.72,H*.41)*pulse,eyeH=eyeW*.31;
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.translate(W/2,H/2);ctx.translate(0,-H*.075);
      if(img?.complete&&img.naturalWidth){
       const mw=Math.min(W*.88,H*.62),mh=mw*(img.naturalHeight/img.naturalWidth);
       ctx.save();ctx.rotate(-.035+t*.06);ctx.globalCompositeOperation='screen';ctx.globalAlpha*=.12*fade;ctx.shadowColor='rgba(131,0,22,.55)';ctx.shadowBlur=12;ctx.drawImage(img,-mw/2,-mh/2,mw,mh);ctx.restore();
      }
      ctx.globalCompositeOperation='screen';ctx.lineWidth=1.4;ctx.strokeStyle='rgba(194,12,38,'+(.22*fade)+')';
      ctx.beginPath();ctx.arc(0,0,eyeW*.47,0,Math.PI*2);ctx.stroke();ctx.globalAlpha*=.58;ctx.beginPath();ctx.arc(0,0,eyeW*.59,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      ctx.globalCompositeOperation='source-over';
      const eyePath=()=>{
       ctx.beginPath();ctx.moveTo(-eyeW*.50,0);ctx.bezierCurveTo(-eyeW*.29,-eyeH*.66,eyeW*.29,-eyeH*.66,eyeW*.50,0);ctx.bezierCurveTo(eyeW*.29,eyeH*.66,-eyeW*.29,eyeH*.66,-eyeW*.50,0);ctx.closePath();
      };
      eyePath();ctx.fillStyle='rgba(3,0,1,'+(.94*fade)+')';ctx.shadowColor='rgba(186,8,38,.72)';ctx.shadowBlur=16;ctx.fill();ctx.shadowBlur=0;
      ctx.save();eyePath();ctx.clip();
      const sclera=ctx.createLinearGradient(0,-eyeH*.55,0,eyeH*.55);sclera.addColorStop(0,'rgba(74,0,12,'+(.94*fade)+')');sclera.addColorStop(.48,'rgba(176,9,36,'+(.96*fade)+')');sclera.addColorStop(1,'rgba(58,0,11,'+(.95*fade)+')');ctx.fillStyle=sclera;ctx.fillRect(-eyeW*.52,-eyeH*.62,eyeW*1.04,eyeH*1.24);
      const irisR=eyeH*.43;ctx.fillStyle='rgba(190,10,38,'+fade+')';ctx.beginPath();ctx.arc(0,0,irisR,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(26,0,5,'+(.92*fade)+')';ctx.lineWidth=Math.max(2,irisR*.08);ctx.beginPath();ctx.arc(0,0,irisR*.78,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='rgba(2,0,1,'+fade+')';ctx.beginPath();ctx.arc(0,0,irisR*.24,0,Math.PI*2);ctx.fill();
      for(let i=0;i<3;i++){const a=-Math.PI/2+i*Math.PI*2/3+t*.08,rr=irisR*.58,tx=Math.cos(a)*rr,ty=Math.sin(a)*rr;ctx.save();ctx.translate(tx,ty);ctx.rotate(a+.72);ctx.fillStyle='rgba(3,0,1,'+(.96*fade)+')';ctx.beginPath();ctx.arc(0,0,irisR*.105,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(irisR*.07,0);ctx.quadraticCurveTo(irisR*.22,irisR*.03,irisR*.28,irisR*.18);ctx.quadraticCurveTo(irisR*.15,irisR*.11,irisR*.03,irisR*.07);ctx.closePath();ctx.fill();ctx.restore();}
      ctx.restore();
      eyePath();ctx.strokeStyle='rgba(8,0,2,'+fade+')';ctx.lineWidth=Math.max(3,eyeH*.055);ctx.stroke();
      ctx.restore();
    }else if(f.kind==='itachiTsukuyomiNightmare'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),rise=Math.min(1,t/.28),fade=t>.90?Math.max(0,(1-t)/.10):1;
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';
      ctx.fillStyle='rgba(10,0,3,'+(.36*rise*fade)+')';ctx.fillRect(0,0,W,H);
      for(let i=0;i<8;i++){
       const y=H*(.14+i*.095)+Math.sin(t*9+i*1.4)*H*.012,skew=Math.sin(t*7+i*.83)*W*.06,alpha=(.10+(i%3)*.025)*rise*fade;
       ctx.strokeStyle='rgba(0,0,0,'+(.62*alpha)+')';ctx.lineWidth=5+(i%2)*3;ctx.beginPath();ctx.moveTo(-W*.08,y-skew*.18);ctx.lineTo(W*1.08,y+skew);ctx.stroke();
       ctx.strokeStyle='rgba(160,5,33,'+alpha+')';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-W*.05,y-2-skew*.14);ctx.lineTo(W*1.05,y-2+skew);ctx.stroke();
      }
      const pts=f.points||[];
      for(let i=0;i<pts.length;i++){
       const pt=pts[i],cx=pt.x,cy=pt.y-16,r=24+9*Math.sin(t*Math.PI*2+i*.8);
       const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r*1.9);g.addColorStop(0,'rgba(154,0,31,'+(.18*rise*fade)+')');g.addColorStop(1,'rgba(35,0,10,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r*1.9,0,Math.PI*2);ctx.fill();
       ctx.save();ctx.translate(cx,cy);ctx.strokeStyle='rgba(197,12,41,'+(.55*rise*fade)+')';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha*=.48;ctx.beginPath();ctx.arc(0,0,r*.62,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba(3,0,1,'+(.72*rise*fade)+')';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-r*.74,0);ctx.lineTo(r*.74,0);ctx.stroke();ctx.restore();
      }
      ctx.restore();
    }else if(f.kind==='itachiTsukuyomiTarget'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),fade=t<.08?t/.08:(t>.78?Math.max(0,(1-t)/.22):1),cx=Number.isFinite(f.x)?f.x:W/2,cy=Number.isFinite(f.y)?f.y:H*.44,r=Math.max(W,H)*(.20+.09*t);
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';
      const flash=Math.max(0,1-t/.22);ctx.fillStyle='rgba(165,4,34,'+(.18*flash)+')';ctx.fillRect(0,0,W,H);
      const burst=ctx.createRadialGradient(cx,cy,0,cx,cy,r);burst.addColorStop(0,'rgba(211,13,45,'+(.42*fade)+')');burst.addColorStop(.26,'rgba(105,0,25,'+(.30*fade)+')');burst.addColorStop(.66,'rgba(36,0,11,'+(.15*fade)+')');burst.addColorStop(1,'rgba(10,0,4,0)');ctx.globalCompositeOperation='screen';ctx.fillStyle=burst;ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation='source-over';
      for(let i=0;i<(f.points||[]).length;i++){
       const pt=f.points[i],pr=30-9*t;
       ctx.save();ctx.translate(pt.x,pt.y-18);ctx.strokeStyle='rgba(226,17,49,'+(.72*fade)+')';ctx.lineWidth=2.2;ctx.shadowColor='rgba(201,8,38,.58)';ctx.shadowBlur=7;ctx.beginPath();ctx.arc(0,0,pr,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
       ctx.strokeStyle='rgba(6,0,2,'+(.86*fade)+')';ctx.lineWidth=3.2;for(let k=0;k<4;k++){const a=k*Math.PI/2+.24,rr=pr*(.72+.08*Math.sin(t*8+k));ctx.beginPath();ctx.moveTo(Math.cos(a)*rr*.25,Math.sin(a)*rr*.25);ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);ctx.stroke();}
       ctx.fillStyle='rgba(179,7,36,'+(.84*fade)+')';ctx.beginPath();ctx.arc(0,0,4.5+1.5*flash,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      ctx.restore();
    `+vfxAnchor;
html=html.replace(vfxAnchor,itachiVfx);

const basicNeedle=`    if(au.name==='Lebee'){
      runBasicAttack=animateLebeeStarBlast;basicTarget=enemy;
    }else if(au.name==='Senku'){`;
const basicReplacement=`    if(au.name==='Lebee'){
      runBasicAttack=animateLebeeStarBlast;basicTarget=enemy;
    }else if(au.name==='Itachi'){
      runBasicAttack=animateItachiCrowStrike;basicTarget=enemy;
    }else if(au.name==='Senku'){`;
replaceOne(basicNeedle,basicReplacement,'Basic dispatcher');

replaceOne(
  `   const runActiveJutsu=(u.name==='Sub-Zero')?animateFreezeBlast:animateLunge;\n   const activeFrom=(u.name==='Sub-Zero')?from:from;\n   const activeTarget=(u.name==='Sub-Zero')?enemy:to;`,
  `   const runActiveJutsu=u.name==='Sub-Zero'?animateFreezeBlast:u.name==='Itachi'?animateItachiTsukuyomi:animateLunge;\n   const activeFrom=from;\n   const activeTarget=(u.name==='Sub-Zero'||u.name==='Itachi')?enemy:to;`,
  'Jutsu dispatcher'
);
replaceOne(
  "if(enemy.hp<=0)handleEnemyKO(enemy,jDir); else if(u.name!=='Sub-Zero')recoil(enemy,()=>{},jDir,true);",
  "if(enemy.hp<=0)handleEnemyKO(enemy,jDir); else if(u.name!=='Sub-Zero'&&u.name!=='Itachi')recoil(enemy,()=>{},jDir,true);",
  'Jutsu recoil exception'
);
replaceOne(
  "if(u.name==='Sub-Zero')window.BlazingCombatRuntime.execute('reduce_target_gauge',{target:enemy,parameters:{amount:35,minimum_gauge:0}});",
  "if(u.name==='Sub-Zero')window.BlazingCombatRuntime.execute('reduce_target_gauge',{target:enemy,parameters:{amount:35,minimum_gauge:0}});\n     if(u.name==='Itachi')window.BlazingCombatRuntime.execute('reduce_target_gauge',{target:enemy,parameters:{amount:canonicalUnit('itachi').abilities.jutsu.gauge_reduction??45,minimum_gauge:0}});",
  'Tsukuyomi gauge reduction'
);

for(const marker of [
  "['crimson','subzero','lebee','senku','tyler','itachi','anubis']",
  "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku','Tyler','Itachi']);",
  'ITACHI_IDLE_FRAMES','ITACHI_BASIC_FRAMES','ITACHI_TSUKUYOMI_FRAMES','ITACHI_TSUKUYOMI_OVERLAY_FRAMES','ITACHI_TSUKUYOMI_MANDALA_FRAMES','ITACHI_TSUKUYOMI_TARGET_FRAMES',
  'crow_chakra_burst.png','crow_swarm.png','crow_vortex_ring.png','crow_featherstorm.png',
  "if(name==='Itachi')return ITACHI_IDLE_FRAMES",
  "if(name==='Itachi'){if(kind==='tsukuyomi'",
  'function animateItachiCrowStrike(','function animateItachiTsukuyomi(',
  "f.kind==='itachiCrowStrike'","f.kind==='itachiTsukuyomiOverlay'","f.kind==='itachiTsukuyomiMandala'","f.kind==='itachiTsukuyomiTarget'",
  "au.name==='Itachi'",
  "u.name==='Itachi'?animateItachiTsukuyomi",
  "canonicalUnit('itachi').abilities.jutsu.gauge_reduction??45"
])if(!html.includes(marker))fail(`final shell missing ${marker}`);

if(html.includes("\\`")||html.includes("\\${"))fail("generated runtime contains escaped template syntax");
await fs.writeFile(file,html);
console.log('Itachi playable integration PASS: compact upright crow flock with red smoke plus cleaned ritual-eye, nightmare-fracture, and procedural AoE impact Tsukuyomi presentation are wired.');
