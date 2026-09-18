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
function ensureItachiTsukuyomiCinematic(){
 let style=document.getElementById('bb-itachi-tsukuyomi-style');
 if(!style){
  style=document.createElement('style');style.id='bb-itachi-tsukuyomi-style';
  style.textContent='.bb-itachi-tsukuyomi-cinematic{position:fixed;inset:0;width:100vw;height:100dvh;z-index:2147483000;pointer-events:none;overflow:hidden;isolation:isolate;visibility:hidden;opacity:0;background:#050002;transition:opacity .12s linear}.bb-itachi-tsukuyomi-cinematic.bb-active{visibility:visible;opacity:1}.bb-itachi-tsukuyomi-cinematic .bb-tsu-shade{position:absolute;inset:-8%;background:radial-gradient(circle at 50% 48%,rgba(105,0,24,.42) 0%,rgba(34,0,10,.76) 46%,rgba(2,0,1,.98) 82%);transform:scale(1.08)}.bb-itachi-tsukuyomi-cinematic img{position:absolute;left:50%;top:50%;display:block;pointer-events:none;user-select:none;-webkit-user-drag:none;transform-origin:50% 50%}.bb-itachi-tsukuyomi-cinematic .bb-tsu-overlay{width:112vw;height:112dvh;object-fit:cover;transform:translate(-50%,-50%) scale(1.02);opacity:.82;mix-blend-mode:screen;filter:saturate(1.22) contrast(1.08)}.bb-itachi-tsukuyomi-cinematic .bb-tsu-mandala{width:min(112vw,96dvh);height:min(112vw,96dvh);object-fit:contain;transform:translate(-50%,-50%) scale(.96);opacity:.96;mix-blend-mode:screen;filter:saturate(1.18) contrast(1.08);animation:bbTsuMandalaPulse 1.5s ease-in-out infinite alternate}.bb-itachi-tsukuyomi-cinematic .bb-tsu-target{width:min(122vw,104dvh);height:min(122vw,104dvh);object-fit:contain;transform:translate(-50%,-50%) scale(.88);opacity:0;mix-blend-mode:screen}.bb-itachi-tsukuyomi-cinematic[data-phase="nightmare"] .bb-tsu-overlay{opacity:.96;filter:saturate(1.48) contrast(1.16)}.bb-itachi-tsukuyomi-cinematic[data-phase="nightmare"] .bb-tsu-mandala{transform:translate(-50%,-50%) scale(1.03);opacity:1}.bb-itachi-tsukuyomi-cinematic[data-phase="impact"] .bb-tsu-overlay{opacity:.9}.bb-itachi-tsukuyomi-cinematic[data-phase="impact"] .bb-tsu-mandala{opacity:.7}.bb-itachi-tsukuyomi-cinematic[data-phase="impact"] .bb-tsu-target{opacity:1;animation:bbTsuTargetImpact .72s cubic-bezier(.12,.76,.18,1) both}@keyframes bbTsuMandalaPulse{0%{filter:saturate(1.08) contrast(1.04) brightness(.88)}100%{filter:saturate(1.42) contrast(1.16) brightness(1.16)}}@keyframes bbTsuTargetImpact{0%{opacity:0;transform:translate(-50%,-50%) scale(.72);filter:brightness(1.7)}18%{opacity:1}62%{opacity:1;transform:translate(-50%,-50%) scale(1.02);filter:brightness(1.12)}100%{opacity:.86;transform:translate(-50%,-50%) scale(1);filter:brightness(.92)}}';
  document.head.append(style);
 }
 let root=document.getElementById('bb-itachi-tsukuyomi-cinematic');
 if(!root){
  root=document.createElement('div');root.id='bb-itachi-tsukuyomi-cinematic';root.className='bb-itachi-tsukuyomi-cinematic';root.dataset.phase='ritual';root.setAttribute('aria-hidden','true');
  const shade=document.createElement('div');shade.className='bb-tsu-shade';
  const overlay=document.createElement('img');overlay.className='bb-tsu-overlay';overlay.alt='';
  const mandala=document.createElement('img');mandala.className='bb-tsu-mandala';mandala.alt='';
  const target=document.createElement('img');target.className='bb-tsu-target';target.alt='';
  root.append(shade,overlay,mandala,target);document.body.append(root);
 }
 return {root,overlay:root.querySelector('.bb-tsu-overlay'),mandala:root.querySelector('.bb-tsu-mandala'),target:root.querySelector('.bb-tsu-target')};
}
function startItachiTsukuyomiCinematic(totalDuration,nightmareAt,impactAt){
 const refs=ensureItachiTsukuyomiCinematic(),started=performance.now();
 refs.root.classList.add('bb-active');refs.root.dataset.phase='ritual';
 let raf=0,stopped=false,lastOverlay=-1,lastMandala=-1,lastTarget=-1;
 const setFrame=(node,frames,index,key)=>{const img=frames[index];if(!img?.src||key===index)return index;node.src=img.src;return index};
 const tick=()=>{
  if(stopped)return;
  const elapsed=performance.now()-started;
  refs.root.dataset.phase=elapsed>=impactAt?'impact':elapsed>=nightmareAt?'nightmare':'ritual';
  const overlayIndex=Math.min(ITACHI_TSUKUYOMI_OVERLAY_FRAMES.length-1,Math.floor(elapsed/250)%ITACHI_TSUKUYOMI_OVERLAY_FRAMES.length);
  const mandalaIndex=Math.min(ITACHI_TSUKUYOMI_MANDALA_FRAMES.length-1,Math.floor(elapsed/290)%ITACHI_TSUKUYOMI_MANDALA_FRAMES.length);
  const targetElapsed=Math.max(0,elapsed-impactAt);
  const targetIndex=Math.min(ITACHI_TSUKUYOMI_TARGET_FRAMES.length-1,Math.floor(targetElapsed/170));
  lastOverlay=setFrame(refs.overlay,ITACHI_TSUKUYOMI_OVERLAY_FRAMES,overlayIndex,lastOverlay);
  lastMandala=setFrame(refs.mandala,ITACHI_TSUKUYOMI_MANDALA_FRAMES,mandalaIndex,lastMandala);
  if(elapsed>=impactAt)lastTarget=setFrame(refs.target,ITACHI_TSUKUYOMI_TARGET_FRAMES,targetIndex,lastTarget);
  if(elapsed<totalDuration)raf=requestAnimationFrame(tick);
 };
 tick();
 return ()=>{
  stopped=true;if(raf)cancelAnimationFrame(raf);
  refs.root.classList.remove('bb-active');refs.root.dataset.phase='ritual';
 };
}
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
 const overlayDelay=420,nightmareAt=1500,impactAt=2600,holdAfterImpact=1200,totalDuration=impactAt+holdAfterImpact;
 state.attackPose[unitName]={kind:'tsukuyomi',start:performance.now(),duration:totalDuration};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 const data=canonicalUnit('itachi'),meta=data?.abilities?.jutsu?.presentation||{};
 S.jutsuDim={start:performance.now(),alpha:Math.min(.42,meta.screen_dim_alpha??.42),end:null};
 let stopCinematic=null;
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  stopCinematic=startItachiTsukuyomiCinematic(totalDuration-overlayDelay,nightmareAt-overlayDelay,impactAt-overlayDelay);
 },overlayDelay);
 setTimeout(()=>{
  if(!actionTokenAlive(token)){stopCinematic?.();return}
  const liveTargets=(S.enemies||[]).filter(target=>target&&target.hp>0);
  try{onImpact&&onImpact()}catch(err){stopCinematic?.();console.error('Itachi Tsukuyomi primary impact failed:',err);return recoverAction('Itachi Tsukuyomi impact')}
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
   stopCinematic?.();
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
  'function animateItachiCrowStrike(','function animateItachiTsukuyomi(','function ensureItachiTsukuyomiCinematic(','function startItachiTsukuyomiCinematic(',
  "f.kind==='itachiCrowStrike'","bb-itachi-tsukuyomi-cinematic","bb-tsu-overlay","bb-tsu-mandala","bb-tsu-target",
  "au.name==='Itachi'",
  "u.name==='Itachi'?animateItachiTsukuyomi",
  "canonicalUnit('itachi').abilities.jutsu.gauge_reduction??45"
])if(!html.includes(marker))fail(`final shell missing ${marker}`);

if(html.includes("\\`")||html.includes("\\${"))fail("generated runtime contains escaped template syntax");
await fs.writeFile(file,html);
console.log('Itachi playable integration PASS: compact upright crow flock plus full-screen authored Tsukuyomi DOM cinematic with overlay, mandala, target sequence, AoE damage, and gauge suppression are wired.');
