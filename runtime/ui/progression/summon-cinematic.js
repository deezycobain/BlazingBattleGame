(()=>{
'use strict';

const VERSION='5.3.0';
const PORTAL_ROOT='assets/vfx/summon/portal-reveal';
const CARD_BACK_SRC='assets/ui/summon/reveal/summon_reveal_card_back.png';
const CARD_FRONT_FRAME_SRC='assets/ui/summon/reveal/summon_reveal_card_front_frame.png';
const VFX=Object.freeze({
 portal:`${PORTAL_ROOT}/summon_portal_base.webp`,
 ornateRing:`${PORTAL_ROOT}/ring_ornate_cloud.webp`,
 outerRing:`${PORTAL_ROOT}/ring_outer_navy_gold.webp`,
 energyRing:`${PORTAL_ROOT}/ring_energy_gold.webp`,
 chargeImpact:`${PORTAL_ROOT}/reveal_impact_burst.webp`,
 motionCards:`${PORTAL_ROOT}/flip_motion_cards.webp`,
 flipFrameBlue:`${PORTAL_ROOT}/flip_frame_blue_white.webp`,
 flipFrameCrimson:`${PORTAL_ROOT}/flip_frame_crimson_gold.webp`,
 flipSlash:`${PORTAL_ROOT}/flip_crimson_gold_slash.webp`,
 resolveFlash:`${PORTAL_ROOT}/flip_reveal_starburst.webp`,
 resolveParticles:`${PORTAL_ROOT}/flip_particles_gold_crimson.webp`
});
const TIMELINES=Object.freeze({
 resonance:Object.freeze({portal:0,circleSlow:450,circleFast:850,cardEnter:1280,flip:1500,resolve:1920,done:2240}),
 new:Object.freeze({portal:0,circleSlow:450,circleFast:850,cardEnter:1280,flip:1500,resolve:1920,done:2240}),
 shiny:Object.freeze({portal:0,circleSlow:450,circleFast:850,cardEnter:1280,flip:1500,resolve:1920,done:2240})
});
const REDUCED_MOTION=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
let cinematicRun=0;
let timelineTimers=[];

function revealKind(pull){
 if(pull?.shinyUnlock)return 'shiny';
 if(pull?.isNew)return 'new';
 return 'resonance';
}
function sceneNode(){return document.getElementById('pullScene')||document.querySelector('#summonPullScreen .pullScene')}
function img(src,className,alt=''){
 const node=document.createElement('img');
 node.src=src||'';node.className=className;node.alt=alt;node.decoding='async';node.loading='eager';node.fetchPriority='high';node.draggable=false;
 node.addEventListener('error',()=>node.classList.add('bb-vfx-missing'));
 return node;
}
function clearTimeline(){timelineTimers.forEach(clearTimeout);timelineTimers=[]}
function schedule(scene,run,delay,fn){
 const timer=setTimeout(()=>{if(Number(scene.dataset.bbRevealRun)!==run)return;fn()},delay);
 timelineTimers.push(timer);
}
function setStage(scene,stage){scene.dataset.bbRevealStage=stage}
function paintedFrame(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))}
async function prepareVfx(refs){
 const images=[...refs.portalFx.querySelectorAll('img'),...refs.chargeFx.querySelectorAll('img'),...refs.cardFx.querySelectorAll('img')];
 await Promise.all(images.map(node=>{
  if(node.complete)return node.decode?.().catch(()=>{})||Promise.resolve();
  return new Promise(resolve=>{node.addEventListener('load',resolve,{once:true});node.addEventListener('error',resolve,{once:true})});
 }));
 await paintedFrame();
}
async function waitForPortalAnimation(refs){
 void refs.portalFx.offsetWidth;
 const animation=refs.portalFx.querySelector('.bb-summon-portal')?.getAnimations?.()[0];
 if(!animation?.ready){await paintedFrame();return}
 await Promise.race([animation.ready.catch(()=>{}),new Promise(resolve=>setTimeout(resolve,240))]);
}
function ensureCardLabels(front){
 let name=front.querySelector('.bb-card-nameplate');
 if(!name){name=document.createElement('div');name.className='bb-card-nameplate';name.setAttribute('aria-hidden','true');front.append(name)}
 let rarity=front.querySelector('.bb-card-rarityplate');
 if(!rarity){rarity=document.createElement('div');rarity.className='bb-card-rarityplate';rarity.setAttribute('aria-hidden','true');front.append(rarity)}
 return {name,rarity};
}

function buildPortalFx(wrap){
 let fx=wrap.querySelector('.bb-portal-stage-vfx');
 if(fx?.dataset.bbVfxVersion===VERSION)return fx;
 fx?.remove();
 fx=document.createElement('div');fx.className='bb-portal-stage-vfx';fx.dataset.bbVfxVersion=VERSION;fx.setAttribute('aria-hidden','true');
 fx.append(img(VFX.portal,'bb-summon-portal'),img(VFX.ornateRing,'bb-portal-ring bb-portal-ring-ornate'));
 wrap.append(fx);
 return fx;
}

function buildChargeFx(wrap){
 let fx=wrap.querySelector('.bb-portal-charge-vfx');
 if(fx?.dataset.bbVfxVersion===VERSION)return fx;
 fx?.remove();
 fx=document.createElement('div');fx.className='bb-portal-charge-vfx';fx.dataset.bbVfxVersion=VERSION;fx.setAttribute('aria-hidden','true');
 fx.append(
  img(VFX.outerRing,'bb-portal-ring bb-portal-ring-outer'),
  img(VFX.energyRing,'bb-portal-ring bb-portal-ring-energy'),
  img(VFX.chargeImpact,'bb-charge-impact'),
  img(VFX.motionCards,'bb-flip-motion-cards'),
  img(VFX.resolveFlash,'bb-portal-resolve-flash')
 );
 wrap.append(fx);
 return fx;
}

function buildCardFx(wrap){
 let fx=wrap.querySelector('.bb-card-stage-vfx');
 if(fx?.dataset.bbVfxVersion===VERSION)return fx;
 fx?.remove();
 fx=document.createElement('div');fx.className='bb-card-stage-vfx';fx.dataset.bbVfxVersion=VERSION;fx.setAttribute('aria-hidden','true');
 const frame=img(VFX.flipFrameCrimson,'bb-flip-energy-frame');
 fx.append(frame,img(VFX.flipSlash,'bb-flip-slash'),img(VFX.resolveParticles,'bb-resolve-particles'));
 wrap.append(fx);
 return fx;
}

function ensurePhysicalCard(){
 const wrap=document.getElementById('pullCardWrap');
 const scene=sceneNode();
 if(!wrap||!scene)return null;
 let flipper=wrap.querySelector('.bb-card-flipper');
 let front,back;
 if(!flipper){
  front=wrap.querySelector('.showcaseCard.pullHoloCard');
  if(!front)return null;
  flipper=document.createElement('div');flipper.className='bb-card-flipper';
  back=document.createElement('div');back.className='bb-card-face bb-card-back';
  const backArt=img(CARD_BACK_SRC,'bb-card-back-art','Blazing Battle card back');
  const fallback=document.createElement('div');fallback.className='bb-card-back-fallback';
  backArt.addEventListener('load',()=>back.classList.add('bb-card-back-loaded'),{once:true});
  backArt.addEventListener('error',()=>{backArt.hidden=true;back.classList.add('bb-card-back-fallback-only')},{once:true});
  back.append(backArt,fallback);
  front.classList.add('bb-card-face','bb-card-front');
  front.before(flipper);flipper.append(back,front);

  const frame=img(CARD_FRONT_FRAME_SRC,'bb-card-front-frame','');
  frame.hidden=true;
  frame.addEventListener('load',()=>{frame.hidden=false;front.classList.add('bb-has-card-frame')},{once:true});
  frame.addEventListener('error',()=>frame.remove(),{once:true});
  front.append(frame);
 }else{
  front=flipper.querySelector('.bb-card-front');
  back=flipper.querySelector('.bb-card-back');
 }
 const labels=front?ensureCardLabels(front):{};
 const portalFx=buildPortalFx(wrap);
 const chargeFx=buildChargeFx(wrap);
 const cardFx=buildCardFx(wrap);
 return {wrap,scene,flipper,front,back,portalFx,chargeFx,cardFx,...labels};
}

function syncCardLabels(refs,pull){
 const fighterName=String(pull?.name||pull?.fighter||pull?.id||'').trim();
 if(refs.name)refs.name.textContent=fighterName.toUpperCase();
 if(refs.rarity){
  const rarity=String(pull?.rarity||'rare').toLowerCase();
  refs.rarity.textContent=rarity==='legendary'?'LEGENDARY':rarity==='super'?'SUPER RARE':rarity.toUpperCase();
 }
}

function finishReveal(scene,message,finalMessage){
 setStage(scene,'done');
 if(message)message.textContent=message.dataset.bbFinalMessage||finalMessage;
 scene.classList.remove('bb-cinematic-running');
 scene.classList.remove('bb-cinematic-preparing');
}

async function startRevealTimeline(refs,pull,run){
 clearTimeline();
 const {scene}=refs;
 const kind=revealKind(pull),timeline=TIMELINES[kind]||TIMELINES.resonance;
 scene.classList.remove('bb-cinematic-running');
 scene.classList.add('bb-cinematic-preparing');
 scene.removeAttribute('data-bb-reveal-stage');

 const message=document.getElementById('pullMessage');
 const finalMessage=pull.shinyUnlock?'SHINY AWAKENING!':pull.isNew?'NEW FIGHTER!':pull.progress||'RESONANCE';
 if(message){message.dataset.bbFinalMessage=finalMessage;message.textContent=''}

 if(REDUCED_MOTION){
  scene.classList.remove('bb-cinematic-preparing');
  scene.classList.add('bb-cinematic-running');
  schedule(scene,run,40,()=>setStage(scene,'resolve'));
  schedule(scene,run,90,()=>finishReveal(scene,message,finalMessage));
  return;
 }
 await prepareVfx(refs);
 if(Number(scene.dataset.bbRevealRun)!==run)return;
 void scene.offsetWidth;
 scene.classList.add('bb-cinematic-running');
 await waitForPortalAnimation(refs);
 if(Number(scene.dataset.bbRevealRun)!==run)return;
 scene.classList.remove('bb-cinematic-preparing');
 setStage(scene,'portal');
 schedule(scene,run,timeline.circleSlow,()=>setStage(scene,'circle-slow'));
 schedule(scene,run,timeline.circleFast,()=>setStage(scene,'circle-fast'));
 schedule(scene,run,timeline.cardEnter,()=>setStage(scene,'card-enter'));
 schedule(scene,run,timeline.flip,()=>setStage(scene,'flip'));
 schedule(scene,run,timeline.resolve,()=>setStage(scene,'resolve'));
 schedule(scene,run,timeline.done,()=>finishReveal(scene,message,finalMessage));
}

function syncPhysicalCard(pull,index,total){
 const refs=ensurePhysicalCard();
 if(!refs||!pull)return;
 const {scene}=refs;
 const kind=revealKind(pull),rarity=String(pull.rarity||'rare').toLowerCase(),run=++cinematicRun;
 scene.dataset.bbCinematic='v5';scene.dataset.bbRevealKind=kind;scene.dataset.bbCinematicRarity=rarity;scene.dataset.bbRevealRun=String(run);
 refs.wrap.dataset.bbRevealKind=kind;refs.wrap.dataset.bbRevealRun=String(run);refs.wrap.style.setProperty('--bb-pull-index',String(index||0));
 refs.portalFx.dataset.bbRevealKind=kind;refs.chargeFx.dataset.bbRevealKind=kind;refs.cardFx.dataset.bbRevealKind=kind;
 const flipFrame=refs.cardFx.querySelector('.bb-flip-energy-frame');
 if(flipFrame){const frameSrc=kind==='new'?VFX.flipFrameBlue:VFX.flipFrameCrimson;if(!flipFrame.src.endsWith(frameSrc))flipFrame.src=frameSrc}
 syncCardLabels(refs,pull);
 const badge=document.getElementById('pullNewBadge');
 if(badge)badge.textContent=pull.shinyUnlock?'SHINY AWAKENED':pull.isNew?'NEW FIGHTER':pull.progress||'RESONANCE';
 const counter=document.getElementById('pullCounter')||document.querySelector('#summonPullScreen .largePullCounter');
 if(counter&&Number.isFinite(total)&&total>1)counter.dataset.bbSequence=`${Number(index||0)+1}/${total}`;
 startRevealTimeline(refs,pull,run);
}

function decorateResults(pulls){
 clearTimeline();
 cinematicRun+=1;
 const cards=[...document.querySelectorAll('#pullResultsGrid .pullCard')];
 cards.forEach((card,index)=>{
  const pull=pulls?.[index];
  card.style.setProperty('--bb-result-delay',`${index*38}ms`);
  card.style.setProperty('--bb-result-shine-delay',`${180+index*38}ms`);
  card.classList.toggle('bb-new-result-card',!!pull?.isNew);
  card.classList.toggle('bb-resonance-result-card',!!pull&&!pull.isNew&&!pull.shinyUnlock);
  card.dataset.bbRevealKind=pull?revealKind(pull):'resonance';
 });
 const scene=sceneNode();
 if(scene){scene.dataset.bbRevealRun=String(cinematicRun);scene.classList.remove('bb-cinematic-running','bb-cinematic-preparing');scene.removeAttribute('data-bb-reveal-stage');scene.removeAttribute('data-bb-reveal-kind');scene.removeAttribute('data-bb-cinematic-rarity')}
}

function installTapGuard(){
 const tap=document.getElementById('pullTapArea');
 if(!tap||tap.dataset.bbCinematicGuard==='1')return;
 tap.dataset.bbCinematicGuard='1';
 tap.addEventListener('click',event=>{
  const scene=sceneNode();
  if(!scene?.classList.contains('bb-cinematic-running')&&!scene?.classList.contains('bb-cinematic-preparing'))return;
  event.preventDefault();event.stopImmediatePropagation();
 },true);
}

function install(){
 ensurePhysicalCard();installTapGuard();
 if(typeof setupPullCard==='function'){
  const previousSetup=setupPullCard;
  setupPullCard=function(pull,index,total){previousSetup(pull,index,total);syncPhysicalCard(pull,index,total)};
 }
 if(typeof renderDedicatedResults==='function'){
  const previousResults=renderDedicatedResults;
  renderDedicatedResults=function(pulls){previousResults(pulls);requestAnimationFrame(()=>decorateResults(pulls))};
 }
}

install();
window.BlazingSummonCinematic=Object.freeze({version:VERSION,refresh:ensurePhysicalCard,vfx:VFX,timeline:TIMELINES,cardBack:CARD_BACK_SRC,cardFrontFrame:CARD_FRONT_FRAME_SRC});
})();
