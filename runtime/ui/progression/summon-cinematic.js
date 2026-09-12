(()=>{
'use strict';

const VERSION='2.1.0';
const VFX_ROOT='assets/vfx/summon/reveal-brush';
const CARD_BACK_SRC='assets/ui/summon/reveal/summon_reveal_card_back.png';
const CARD_FRONT_FRAME_SRC='assets/ui/summon/reveal/summon_reveal_card_front_frame.png';
const VFX=Object.freeze({
 primary:`${VFX_ROOT}/brush-stroke-01.png`,
 curve:`${VFX_ROOT}/brush-stroke-02.png`,
 impact:`${VFX_ROOT}/brush-stroke-03.png`,
 halo:`${VFX_ROOT}/brush-stroke-04.png`,
 secondary:`${VFX_ROOT}/brush-stroke-05.png`,
 finisher:`${VFX_ROOT}/brush-stroke-06.png`
});
const TIMELINE=Object.freeze({
 paint1:280,
 paint2:1080,
 charge:1880,
 flip:2160,
 resolve:2510,
 done:3010
});
let cinematicRun=0;
let timelineTimers=[];

function revealKind(pull){
 if(pull?.shinyUnlock)return 'shiny';
 if(pull?.isNew)return 'new';
 return 'resonance';
}

function img(src,className,alt=''){
 const node=document.createElement('img');
 node.src=src;node.className=className;node.alt=alt;node.decoding='async';node.draggable=false;
 return node;
}

function clearTimeline(){
 timelineTimers.forEach(clearTimeout);
 timelineTimers=[];
}

function schedule(scene,run,delay,fn){
 const timer=setTimeout(()=>{
  if(Number(scene.dataset.bbRevealRun)!==run)return;
  fn();
 },delay);
 timelineTimers.push(timer);
}

function setStage(scene,stage){
 scene.dataset.bbPaintStage=stage;
}

function ensurePhysicalCard(){
 const wrap=document.getElementById('pullCardWrap');
 if(!wrap)return null;
 let flipper=wrap.querySelector('.bb-card-flipper');
 if(flipper)return {wrap,flipper,front:flipper.querySelector('.bb-card-front'),back:flipper.querySelector('.bb-card-back'),fx:wrap.querySelector('.bb-card-reveal-vfx')};
 const front=wrap.querySelector('.showcaseCard.pullHoloCard');
 if(!front)return null;

 flipper=document.createElement('div');flipper.className='bb-card-flipper';
 const back=document.createElement('div');back.className='bb-card-face bb-card-back';
 const backArt=img(CARD_BACK_SRC,'bb-card-back-art','Blazing Battle card back');
 const fallback=document.createElement('div');fallback.className='bb-card-back-fallback';
 backArt.addEventListener('load',()=>back.classList.add('bb-card-back-loaded'),{once:true});
 backArt.addEventListener('error',()=>{backArt.hidden=true;back.classList.add('bb-card-back-fallback-only')},{once:true});
 back.append(backArt,fallback);

 front.classList.add('bb-card-face','bb-card-front');
 front.before(flipper);flipper.append(back,front);

 const fx=document.createElement('div');fx.className='bb-card-reveal-vfx';fx.setAttribute('aria-hidden','true');
 const curve=img(VFX.curve,'bb-reveal-vfx-image bb-reveal-curve');
 const halo=img(VFX.halo,'bb-reveal-vfx-image bb-reveal-halo');
 const swipe1=img(VFX.primary,'bb-reveal-vfx-image bb-reveal-swipe bb-reveal-swipe-1');
 const swipe2=img(VFX.secondary,'bb-reveal-vfx-image bb-reveal-swipe bb-reveal-swipe-2');
 const swipe3=img(VFX.finisher,'bb-reveal-vfx-image bb-reveal-swipe bb-reveal-swipe-3');
 const impact=img(VFX.impact,'bb-reveal-vfx-image bb-reveal-impact');
 fx.append(curve,halo,swipe1,swipe2,swipe3,impact);wrap.append(fx);

 const frame=img(CARD_FRONT_FRAME_SRC,'bb-card-front-frame','');
 frame.hidden=true;
 frame.addEventListener('load',()=>{frame.hidden=false;front.classList.add('bb-has-card-frame')},{once:true});
 frame.addEventListener('error',()=>frame.remove(),{once:true});
 front.append(frame);
 return {wrap,flipper,front,back,fx};
}

function startPaintTimeline(scene,pull,run){
 clearTimeline();
 scene.classList.add('bb-cinematic-running');
 setStage(scene,'enter');

 const message=document.getElementById('pullMessage');
 const finalMessage=pull.shinyUnlock?'SHINY AWAKENING!':pull.isNew?'NEW FIGHTER!':pull.progress||'RESONANCE';
 if(message){
  message.dataset.bbFinalMessage=finalMessage;
  message.textContent='';
 }

 schedule(scene,run,TIMELINE.paint1,()=>setStage(scene,'paint-1'));
 schedule(scene,run,TIMELINE.paint2,()=>setStage(scene,'paint-2'));
 schedule(scene,run,TIMELINE.charge,()=>setStage(scene,'charge'));
 schedule(scene,run,TIMELINE.flip,()=>setStage(scene,'flip'));
 schedule(scene,run,TIMELINE.resolve,()=>{
  setStage(scene,'resolve');
  if(message)message.textContent=message.dataset.bbFinalMessage||finalMessage;
 });
 schedule(scene,run,TIMELINE.done,()=>{
  setStage(scene,'done');
  scene.classList.remove('bb-cinematic-running');
 });
}

function syncPhysicalCard(pull,index,total){
 const refs=ensurePhysicalCard();
 const scene=document.getElementById('pullScene')||document.querySelector('#summonPullScreen .pullScene');
 if(!refs||!scene||!pull)return;
 const kind=revealKind(pull),rarity=String(pull.rarity||'rare').toLowerCase(),run=++cinematicRun;
 scene.dataset.bbCinematic='v2.1';scene.dataset.bbRevealKind=kind;scene.dataset.bbCinematicRarity=rarity;scene.dataset.bbRevealRun=String(run);
 refs.wrap.dataset.bbRevealKind=kind;refs.wrap.dataset.bbRevealRun=String(run);refs.wrap.style.setProperty('--bb-pull-index',String(index||0));
 refs.fx.dataset.bbRevealKind=kind;refs.fx.dataset.bbCinematicRarity=rarity;
 const badge=document.getElementById('pullNewBadge');
 if(badge)badge.textContent=pull.shinyUnlock?'SHINY AWAKENED':pull.isNew?'NEW FIGHTER':pull.progress||'RESONANCE';
 const counter=document.getElementById('pullCounter')||document.querySelector('#summonPullScreen .largePullCounter');
 if(counter&&Number.isFinite(total)&&total>1)counter.dataset.bbSequence=`${Number(index||0)+1}/${total}`;
 startPaintTimeline(scene,pull,run);
}

function decorateResults(pulls){
 clearTimeline();
 const cards=[...document.querySelectorAll('#pullResultsGrid .pullCard')];
 cards.forEach((card,index)=>{
  const pull=pulls?.[index];
  card.style.setProperty('--bb-result-delay',`${index*45}ms`);
  card.style.setProperty('--bb-result-shine-delay',`${220+index*45}ms`);
  card.classList.toggle('bb-new-result-card',!!pull?.isNew);
  card.classList.toggle('bb-resonance-result-card',!!pull&&!pull.isNew&&!pull.shinyUnlock);
  card.dataset.bbRevealKind=pull?revealKind(pull):'resonance';
 });
 const scene=document.getElementById('pullScene')||document.querySelector('#summonPullScreen .pullScene');
 if(scene){
  scene.classList.remove('bb-cinematic-running');
  scene.removeAttribute('data-bb-paint-stage');
  scene.removeAttribute('data-bb-reveal-kind');
  scene.removeAttribute('data-bb-cinematic-rarity');
 }
}

function installTapGuard(){
 const tap=document.getElementById('pullTapArea');
 if(!tap||tap.dataset.bbCinematicGuard==='1')return;
 tap.dataset.bbCinematicGuard='1';
 tap.addEventListener('click',event=>{
  const scene=document.getElementById('pullScene')||document.querySelector('#summonPullScreen .pullScene');
  if(!scene?.classList.contains('bb-cinematic-running'))return;
  event.preventDefault();event.stopImmediatePropagation();
 },true);
}

function install(){
 ensurePhysicalCard();
 installTapGuard();
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
window.BlazingSummonCinematic=Object.freeze({version:VERSION,refresh:ensurePhysicalCard,vfx:VFX,timeline:TIMELINE,cardBack:CARD_BACK_SRC,cardFrontFrame:CARD_FRONT_FRAME_SRC});
})();
