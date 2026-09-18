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
 const releaseDelay=380,flightDuration=520,impactHold=300,totalDuration=releaseDelay+flightDuration+impactHold;
 state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:totalDuration};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  const fx={kind:'itachiCrowStrike',from:{x:from.x,y:from.y-28},to:{x:enemy.x,y:enemy.y-20},start:performance.now(),duration:flightDuration+impactHold,flightDuration,impactHold,life:1};
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
 const overlayDelay=420,impactAt=1800,holdAfterImpact=1000,totalDuration=impactAt+holdAfterImpact;
 state.attackPose[unitName]={kind:'tsukuyomi',start:performance.now(),duration:totalDuration};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 const data=canonicalUnit('itachi'),meta=data?.abilities?.jutsu?.presentation||{};
 S.jutsuDim={start:performance.now(),alpha:meta.screen_dim_alpha??.62,end:null};
 const active=[];
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  const start=performance.now(),duration=(impactAt-overlayDelay)+holdAfterImpact;
  const overlay={kind:'itachiTsukuyomiOverlay',start,duration,life:1};
  const mandala={kind:'itachiTsukuyomiMandala',start,duration,life:1};
  active.push(overlay,mandala);S.floaters.push(overlay,mandala);
 },overlayDelay);
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
      const age=performance.now()-f.start,flight=Math.max(1,f.flightDuration||520),impact=Math.max(1,f.impactHold||300);
      const travelT=clamp(age/flight,0,1),impactT=clamp((age-flight)/impact,0,1),ease=1-Math.pow(1-travelT,2.15);
      const x=f.from.x+(f.to.x-f.from.x)*ease,y=f.from.y+(f.to.y-f.from.y)*ease-12*Math.sin(Math.PI*travelT),angle=Math.atan2(f.to.y-f.from.y,f.to.x-f.from.x);
      const drawCrowSilhouette=(cx,cy,size,alpha)=>{
       ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.scale(size/76,size/76);ctx.globalAlpha*=alpha;
       ctx.fillStyle='rgba(5,5,9,.99)';ctx.strokeStyle='rgba(215,24,48,.96)';ctx.lineWidth=2.3;ctx.lineJoin='round';ctx.shadowColor='rgba(232,18,48,.92)';ctx.shadowBlur=10;
       ctx.beginPath();ctx.moveTo(-28,1);ctx.bezierCurveTo(-17,-6,-7,-8,3,-6);ctx.bezierCurveTo(10,-13,18,-14,24,-10);ctx.lineTo(35,-6);ctx.lineTo(24,-2);ctx.bezierCurveTo(19,7,9,11,-2,8);ctx.bezierCurveTo(-12,10,-20,7,-28,5);ctx.lineTo(-43,15);ctx.lineTo(-34,4);ctx.lineTo(-47,-5);ctx.closePath();ctx.fill();ctx.stroke();
       ctx.beginPath();ctx.moveTo(-9,-4);ctx.bezierCurveTo(-18,-23,-31,-34,-40,-28);ctx.bezierCurveTo(-31,-17,-25,-9,-17,-2);ctx.bezierCurveTo(-12,2,-5,1,-9,-4);ctx.closePath();ctx.fill();ctx.stroke();
       ctx.beginPath();ctx.moveTo(-6,5);ctx.bezierCurveTo(-17,17,-26,28,-32,23);ctx.bezierCurveTo(-25,13,-19,7,-12,3);ctx.closePath();ctx.fill();ctx.stroke();
       ctx.shadowBlur=0;ctx.fillStyle='#e51c3b';ctx.beginPath();ctx.arc(20,-7,1.8,0,Math.PI*2);ctx.fill();ctx.restore();
      };
      if(age<=flight){
       ctx.save();ctx.strokeStyle='rgba(155,12,32,.38)';ctx.lineWidth=3;ctx.globalAlpha*=.75*(1-travelT*.45);ctx.beginPath();ctx.moveTo(x-Math.cos(angle)*34,y-Math.sin(angle)*34);ctx.lineTo(x-Math.cos(angle)*7,y-Math.sin(angle)*7);ctx.stroke();ctx.restore();
       drawCrowSilhouette(x,y,82+5*Math.sin(Math.PI*travelT),.98);
      }else{
       const fade=Math.max(0,1-impactT),cx=f.to.x,cy=f.to.y;
       ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='source-over';ctx.strokeStyle='rgba(220,26,49,'+(.72*fade)+')';ctx.lineWidth=3;ctx.shadowColor='rgba(220,18,42,.72)';ctx.shadowBlur=9;ctx.beginPath();ctx.arc(0,0,18+36*impactT,0,Math.PI*2);ctx.stroke();
       ctx.fillStyle='rgba(6,6,10,'+(.9*fade)+')';
       for(let i=0;i<5;i++){const a=-1.4+i*.7+impactT*.55,r=24+34*impactT+i*3;ctx.save();ctx.rotate(a);ctx.translate(r,0);ctx.rotate(.5);ctx.beginPath();ctx.moveTo(-8,0);ctx.quadraticCurveTo(0,-4,9,0);ctx.quadraticCurveTo(0,3,-8,0);ctx.fill();ctx.restore();}
       ctx.restore();
      }
    }else if(f.kind==='itachiTsukuyomiOverlay'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),idx=Math.min(ITACHI_TSUKUYOMI_OVERLAY_FRAMES.length-1,Math.floor(t*ITACHI_TSUKUYOMI_OVERLAY_FRAMES.length)),img=ITACHI_TSUKUYOMI_OVERLAY_FRAMES[idx];
      ctx.setTransform(1,0,0,1,0,0);
      const fade=t<.14?t/.14:(t>.90?Math.max(0,(1-t)/.10):1),pulse=.96+.04*Math.sin(t*Math.PI*1.7),redPulse=.30+.08*(.5+.5*Math.sin(t*Math.PI*1.55));
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha*=1;ctx.fillStyle='rgba(58,0,9,'+(redPulse*fade)+')';ctx.fillRect(0,0,W,H);
      const vignette=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.12,W/2,H/2,Math.max(W,H)*.72);vignette.addColorStop(0,'rgba(55,0,8,0)');vignette.addColorStop(.58,'rgba(30,0,5,.16)');vignette.addColorStop(1,'rgba(3,0,1,.68)');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
      if(img?.complete&&img.naturalWidth){ctx.globalCompositeOperation='screen';ctx.globalAlpha*=.28*fade*pulse;ctx.drawImage(img,-W*.08,-H*.05,W*1.16,H*1.10);}
    }else if(f.kind==='itachiTsukuyomiMandala'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),idx=Math.min(ITACHI_TSUKUYOMI_MANDALA_FRAMES.length-1,Math.floor(t*ITACHI_TSUKUYOMI_MANDALA_FRAMES.length)),img=ITACHI_TSUKUYOMI_MANDALA_FRAMES[idx];
      if(img?.complete&&img.naturalWidth){
       ctx.setTransform(1,0,0,1,0,0);
       const fade=t<.16?t/.16:(t>.92?Math.max(0,(1-t)/.08):1),pulse=.94+.05*Math.sin(t*Math.PI*1.8),w=Math.min(W*.98,H*.72)*pulse,h=w*(img.naturalHeight/img.naturalWidth);
       ctx.save();ctx.translate(W/2,H/2);ctx.rotate(-.08+t*.18);ctx.globalCompositeOperation='screen';ctx.shadowColor='#9d0016';ctx.shadowBlur=24;ctx.globalAlpha*=.22*fade;ctx.drawImage(img,-w*.70,-h*.70,w*1.40,h*1.40);ctx.globalAlpha*=3.05;ctx.rotate(.04-t*.08);ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();
       ctx.save();ctx.translate(W/2,H/2);ctx.strokeStyle='rgba(222,26,48,'+(.32*fade)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,w*.42,0,Math.PI*2);ctx.stroke();ctx.globalAlpha*=.55;ctx.beginPath();ctx.arc(0,0,w*.54,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
    }else if(f.kind==='itachiTsukuyomiTarget'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),idx=Math.min(ITACHI_TSUKUYOMI_TARGET_FRAMES.length-1,Math.floor(t*ITACHI_TSUKUYOMI_TARGET_FRAMES.length)),img=ITACHI_TSUKUYOMI_TARGET_FRAMES[idx];
      ctx.setTransform(1,0,0,1,0,0);
      const fade=t<.12?t/.12:(t>.82?Math.max(0,(1-t)/.18):1),cx=Number.isFinite(f.x)?f.x:W/2,cy=Number.isFinite(f.y)?f.y:H*.42,r=Math.max(W,H)*(.34+.08*t);
      const burst=ctx.createRadialGradient(cx,cy,0,cx,cy,r);burst.addColorStop(0,'rgba(250,22,52,'+(.48*fade)+')');burst.addColorStop(.28,'rgba(128,0,24,'+(.34*fade)+')');burst.addColorStop(.68,'rgba(45,0,10,'+(.18*fade)+')');burst.addColorStop(1,'rgba(20,0,5,0)');ctx.globalCompositeOperation='screen';ctx.fillStyle=burst;ctx.fillRect(0,0,W,H);
      if(img?.complete&&img.naturalWidth){ctx.save();ctx.beginPath();ctx.arc(cx,cy,r*.82,0,Math.PI*2);ctx.clip();const size=Math.max(W,H)*1.16;ctx.translate(cx,cy);ctx.rotate(-.05+t*.10);ctx.globalAlpha*=.62*fade;ctx.shadowColor='#ff1638';ctx.shadowBlur=30;ctx.drawImage(img,-size/2,-size/2,size,size);ctx.restore();}
      ctx.save();ctx.globalCompositeOperation='screen';for(const pt of (f.points||[])){ctx.strokeStyle='rgba(255,35,62,'+(.78*fade)+')';ctx.lineWidth=3;ctx.shadowColor='#ff1738';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(pt.x,pt.y-18,24+30*t,0,Math.PI*2);ctx.stroke();ctx.globalAlpha*=.72;ctx.beginPath();ctx.arc(pt.x,pt.y-18,12+18*t,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}ctx.restore();
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
console.log('Itachi playable integration PASS: single black-crow projectile with red rim, cinematic 2.8s Tsukuyomi takeover, enemy-side AoE distortion, multi-enemy damage, and 45-gauge suppression are wired.');
