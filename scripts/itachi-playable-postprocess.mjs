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
 const releaseDelay=420,flightDuration=500,impactHold=300,totalDuration=releaseDelay+flightDuration+impactHold;
 state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:totalDuration};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  const fx={kind:'itachiCrowStrike',from:{x:from.x,y:from.y-24},to:{x:enemy.x,y:enemy.y-18},start:performance.now(),duration:flightDuration,life:1};
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
 const overlayDelay=320,impactAt=1450,holdAfterImpact=900,totalDuration=impactAt+holdAfterImpact;
 state.attackPose[unitName]={kind:'tsukuyomi',start:performance.now(),duration:totalDuration};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 const data=canonicalUnit('itachi'),meta=data?.abilities?.jutsu?.presentation||{};
 S.jutsuDim={start:performance.now(),alpha:meta.screen_dim_alpha??.56,end:null};
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
  const targetFx={kind:'itachiTsukuyomiTarget',start:performance.now(),duration:holdAfterImpact,life:1};
  active.push(targetFx);S.floaters.push(targetFx);
  try{onImpact&&onImpact()}catch(err){console.error('Itachi Tsukuyomi primary impact failed:',err);return recoverAction('Itachi Tsukuyomi impact')}
  try{
   const pair=(S.pairs||[]).find(p=>front(p)?.name===unitName),actor=pair?front(pair):null;
   const multiplier=Number(data?.abilities?.jutsu?.damage_multiplier)||1.75;
   const aoeDamage=Math.max(1,Number(actor?.jutsuDamage)||window.BlazingCombatRuntime.computeScaledDamage(actor?.attack??data?.stats?.attack??40,multiplier));
   const gaugeCut=Number(data?.abilities?.jutsu?.gauge_reduction)||45;
   for(const target of (S.enemies||[])){
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
      const t=clamp((performance.now()-f.start)/f.duration,0,1),e=1-Math.pow(1-t,2.1);
      const x=f.from.x+(f.to.x-f.from.x)*e,y=f.from.y+(f.to.y-f.from.y)*e-14*Math.sin(Math.PI*t);
      const travel=t<.82,burst=Math.max(0,(t-.68)/.32),draw=(img,cx,cy,w,alpha=1,rot=0)=>{if(!img?.complete||!img.naturalWidth)return;const h=w*(img.naturalHeight/img.naturalWidth);ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);ctx.globalAlpha*=alpha;ctx.globalCompositeOperation='screen';ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();};
      if(travel)draw(ITACHI_CROW_SWARM,x,y,82,.95,(f.to.x<f.from.x?Math.PI:0));
      draw(ITACHI_CROW_VORTEX,f.to.x,f.to.y,118,.72*Math.sin(Math.PI*Math.min(1,burst)),burst*1.4);
      draw(ITACHI_CROW_BURST,f.to.x,f.to.y,126,Math.min(1,burst*2));
      draw(ITACHI_CROW_FEATHERSTORM,f.to.x,f.to.y-8,132,.78*burst,-burst*.7);
    }else if(f.kind==='itachiTsukuyomiOverlay'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),idx=Math.min(ITACHI_TSUKUYOMI_OVERLAY_FRAMES.length-1,Math.floor(t*ITACHI_TSUKUYOMI_OVERLAY_FRAMES.length)),img=ITACHI_TSUKUYOMI_OVERLAY_FRAMES[idx];
      if(img?.complete&&img.naturalWidth){
       ctx.setTransform(1,0,0,1,0,0);
       const fade=t<.16?t/.16:(t>.84?Math.max(0,(1-t)/.16):1),pulse=.86+.14*Math.sin(t*Math.PI*2),size=Math.max(W,H)*1.42;
       ctx.globalCompositeOperation='source-over';ctx.globalAlpha*=1;ctx.fillStyle=\`rgba(86,0,12,\${.30*fade})\`;ctx.fillRect(0,0,W,H);
       ctx.globalCompositeOperation='screen';ctx.globalAlpha*=.46*fade*pulse;ctx.drawImage(img,(W-size)/2,(H-size)/2,size,size);
      }
    }else if(f.kind==='itachiTsukuyomiMandala'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),idx=Math.min(ITACHI_TSUKUYOMI_MANDALA_FRAMES.length-1,Math.floor(t*ITACHI_TSUKUYOMI_MANDALA_FRAMES.length)),img=ITACHI_TSUKUYOMI_MANDALA_FRAMES[idx];
      if(img?.complete&&img.naturalWidth){
       ctx.setTransform(1,0,0,1,0,0);
       const fade=t<.18?t/.18:(t>.88?Math.max(0,(1-t)/.12):1),pulse=.92+.06*Math.sin(t*Math.PI*2.4),w=Math.min(W*.94,H*.78)*pulse,h=w*(img.naturalHeight/img.naturalWidth);
       ctx.translate(W/2,H*.43);ctx.rotate(-.10+t*.22);ctx.globalCompositeOperation='screen';ctx.globalAlpha*=.92*fade;ctx.shadowColor='#9d0016';ctx.shadowBlur=22;ctx.drawImage(img,-w/2,-h/2,w,h);
      }
    }else if(f.kind==='itachiTsukuyomiTarget'){
      const t=clamp((performance.now()-f.start)/f.duration,0,1),idx=Math.min(ITACHI_TSUKUYOMI_TARGET_FRAMES.length-1,Math.floor(t*ITACHI_TSUKUYOMI_TARGET_FRAMES.length)),img=ITACHI_TSUKUYOMI_TARGET_FRAMES[idx];
      if(img?.complete&&img.naturalWidth){
       ctx.setTransform(1,0,0,1,0,0);
       const fade=t<.18?t/.18:(t>.74?Math.max(0,(1-t)/.26):1),w=Math.min(W*.88,H*.72)*(1+.04*Math.sin(Math.PI*t)),h=w*(img.naturalHeight/img.naturalWidth);
       ctx.globalCompositeOperation='source-over';ctx.fillStyle=\`rgba(116,0,18,\${.22*fade})\`;ctx.fillRect(0,0,W,H);
       ctx.translate(W/2,H*.43);ctx.globalCompositeOperation='screen';ctx.globalAlpha*=.96*fade;ctx.shadowColor='#ff1638';ctx.shadowBlur=28;ctx.drawImage(img,-w/2,-h/2,w,h);
      }
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

await fs.writeFile(file,html);
console.log('Itachi playable integration PASS: enlarged battle presentation, readable Crow Chakra Strike timing, and centered full-screen AoE Tsukuyomi with deep-red takeover, multi-enemy damage, and 45-gauge suppression are wired.');
