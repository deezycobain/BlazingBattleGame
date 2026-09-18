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
      const t=clamp((performance.now()-f.start)/f.duration,0,1),idx=Math.min(ITACHI_TSUKUYOMI_OVERLAY_FRAMES.length-1,Math.floor(t*ITACHI_TSUKUYOMI_OVERLAY_FRAMES.length)),img=ITACHI_TSUKUYOMI_OVERLAY_FRAMES[idx];
      ctx.save();ctx.setTransform(1,0,0,1,0,0);
      const fade=t<.16?t/.16:(t>.94?Math.max(0,(1-t)/.06):1),ritual=Math.min(1,t/.46),red=.20+.12*ritual;
      ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(8,0,3,'+(.48*fade)+')';ctx.fillRect(0,0,W,H);
      const field=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.08,W/2,H/2,Math.max(W,H)*.78);field.addColorStop(0,'rgba(126,0,25,'+(red*fade)+')');field.addColorStop(.48,'rgba(62,0,14,'+(red*.78*fade)+')');field.addColorStop(1,'rgba(3,0,2,'+(.64*fade)+')');ctx.fillStyle=field;ctx.fillRect(0,0,W,H);
      if(img?.complete&&img.naturalWidth){
       const cover=Math.max(W/img.naturalWidth,H/img.naturalHeight)*1.08,iw=img.naturalWidth*cover,ih=img.naturalHeight*cover;
       ctx.globalCompositeOperation='screen';ctx.globalAlpha*=.12*fade;ctx.drawImage(img,(W-iw)/2,(H-ih)/2,iw,ih);
      }
      ctx.restore();
    }else if(f.kind==='itachiTsukuyomiMandala'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),idx=Math.min(ITACHI_TSUKUYOMI_MANDALA_FRAMES.length-1,Math.floor(t*ITACHI_TSUKUYOMI_MANDALA_FRAMES.length)),img=ITACHI_TSUKUYOMI_MANDALA_FRAMES[idx];
      ctx.save();ctx.setTransform(1,0,0,1,0,0);
      const fade=t<.14?t/.14:(t>.92?Math.max(0,(1-t)/.08):1),pulse=.96+.025*Math.sin(t*Math.PI*2.1),w=Math.min(W*.86,H*.66)*pulse;
      if(img?.complete&&img.naturalWidth){
       const h=w*(img.naturalHeight/img.naturalWidth);ctx.translate(W/2,H/2);ctx.rotate(-.055+t*.095);ctx.globalCompositeOperation='screen';ctx.shadowColor='#8d0014';ctx.shadowBlur=18;ctx.globalAlpha*=.48*fade;ctx.drawImage(img,-w/2,-h/2,w,h);ctx.rotate(.03-t*.06);ctx.globalAlpha*=.46;ctx.drawImage(img,-w*.59,-h*.59,w*1.18,h*1.18);
      }else ctx.translate(W/2,H/2);
      ctx.globalCompositeOperation='screen';ctx.lineWidth=1.5;ctx.strokeStyle='rgba(216,20,45,'+(.30*fade)+')';ctx.beginPath();ctx.arc(0,0,w*.36,0,Math.PI*2);ctx.stroke();ctx.globalAlpha*=.62;ctx.beginPath();ctx.arc(0,0,w*.47,0,Math.PI*2);ctx.stroke();
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=fade;ctx.fillStyle='rgba(2,0,1,.78)';ctx.beginPath();ctx.ellipse(0,0,w*.17,w*.075,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(184,10,34,.76)';ctx.beginPath();ctx.arc(0,0,w*.048,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(8,0,2,.94)';ctx.beginPath();ctx.arc(0,0,w*.020,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }else if(f.kind==='itachiTsukuyomiNightmare'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),rise=Math.min(1,t/.32),fade=t>.88?Math.max(0,(1-t)/.12):1;
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';
      ctx.fillStyle='rgba(25,0,7,'+(.34*rise*fade)+')';ctx.fillRect(0,0,W,H);
      for(let i=0;i<9;i++){
       const base=(i+.5)*W/9,jitter=Math.sin(t*8+i*1.7)*W*.018,width=W*(.028+(i%3)*.009),alpha=(.025+(i%4)*.012)*rise*fade;
       ctx.fillStyle='rgba(151,0,28,'+alpha+')';ctx.fillRect(base+jitter-width/2,0,width,H);
       ctx.fillStyle='rgba(0,0,0,'+(alpha*.9)+')';ctx.fillRect(base-jitter-width*.18,0,width*.32,H);
      }
      const pts=f.points||[];for(let i=0;i<pts.length;i++){const pt=pts[i],r=34+18*Math.sin(t*Math.PI*1.4+i);const g=ctx.createRadialGradient(pt.x,pt.y-16,0,pt.x,pt.y-16,r);g.addColorStop(0,'rgba(169,0,31,'+(.16*rise*fade)+')');g.addColorStop(1,'rgba(25,0,7,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(pt.x,pt.y-16,r,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }else if(f.kind==='itachiTsukuyomiTarget'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),fade=t<.10?t/.10:(t>.82?Math.max(0,(1-t)/.18):1),cx=Number.isFinite(f.x)?f.x:W/2,cy=Number.isFinite(f.y)?f.y:H*.44,r=Math.max(W,H)*(.26+.08*t);
      ctx.save();ctx.setTransform(1,0,0,1,0,0);
      ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(2,0,1,'+(.32*fade)+')';ctx.fillRect(0,0,W,H);
      const burst=ctx.createRadialGradient(cx,cy,0,cx,cy,r);burst.addColorStop(0,'rgba(185,0,35,'+(.42*fade)+')');burst.addColorStop(.24,'rgba(94,0,22,'+(.30*fade)+')');burst.addColorStop(.65,'rgba(32,0,10,'+(.16*fade)+')');burst.addColorStop(1,'rgba(10,0,4,0)');ctx.globalCompositeOperation='screen';ctx.fillStyle=burst;ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation='source-over';
      for(const pt of (f.points||[])){
       ctx.save();ctx.translate(pt.x,pt.y-18);ctx.strokeStyle='rgba(225,20,47,'+(.72*fade)+')';ctx.lineWidth=2.4;ctx.shadowColor='rgba(210,10,38,.72)';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(0,0,18+34*t,0,Math.PI*2);ctx.stroke();ctx.globalAlpha*=.62;ctx.beginPath();ctx.arc(0,0,9+19*t,0,Math.PI*2);ctx.stroke();
       ctx.fillStyle='rgba(5,0,2,'+(.70*fade)+')';ctx.beginPath();ctx.ellipse(0,0,20+7*t,7+2*t,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(190,8,35,'+(.82*fade)+')';ctx.beginPath();ctx.arc(0,0,4.2+1.8*t,0,Math.PI*2);ctx.fill();ctx.restore();
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
console.log('Itachi playable integration PASS: compact upright crow flock with red smoke, ritual-to-nightmare Tsukuyomi v2, procedural enemy-side AoE bind, multi-enemy damage, and 45-gauge suppression are wired.');
