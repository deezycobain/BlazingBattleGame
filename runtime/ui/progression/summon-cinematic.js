(()=>{
'use strict';

const VERSION='2.2.0';
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
const TIMELINES=Object.freeze({
 resonance:Object.freeze({flip:610,resolve:805,done:1015}),
 new:Object.freeze({flip:650,resolve:845,done:1065}),
 shiny:Object.freeze({flip:760,resolve:955,done:1200})
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

function clearTimeline(){timelineTimers.forEach(clearTimeout);timelineTimers=[]}
function schedule(scene,run,delay,fn){
 const timer=setTimeout(()=>{if(Number(scene.dataset.bbRevealRun)!==run)return;fn()},delay);
 timelineTimers.push(timer);
}
function setStage(scene,stage){scene.dataset.bbPaintStage=stage}

function ensureCardLabels(front){
 let name=front.querySelector('.bb-card-nameplate');
 if(!name){name=document.createElement('div');name.className='bb-card-nameplate';name.setAttribute('aria-hidden','true');front.append(name)}
 let rarity=front.querySelector('.bb-card-rarityplate');
 if(!rarity){rarity=document.createElement('div');rarity.className='bb-card-rarityplate';rarity.setAttribute('aria-hidden','true');front.append(rarity)}
 return {name,rarity};
}

function ensurePhysicalCard(){
 const wrap=document.getElementById('pullCardWrap');
 if(!wrap)return null;
 let flipper=wrap.querySelector('.bb-card-flipper');
 if(flipper){
  const front=flipper.querySelector('.bb-card-front');
  const labels=front?ensureCardLabels(front):{};
  return {wrap,flipper,front,back:flipper.querySelector('.bb-card-back'),fx:wrap.querySelector('.bb-card-reveal-vfx'),...labels};
 }
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
 const labels=ensureCardLabels(front);
 return {wrap,flipper,front,back,fx,...labels};
}

function syncCardLabels(refs,pull){
 if(refs.name)refs.name.textContent=String(pull?.name||'').toUpperCase();
 if(refs.rarity){
  const rarity=String(pull?.rarity||'rare').toLowerCase();
  refs.rarity.textContent=rarity==='legendary'?'LEGENDARY':rarity==='super'?'SUPER RARE':rarity.toUpperCase();
 }
}

function startPaintTimeline(scene,pull,run){
 clearTimeline();
 const kind=revealKind(pull),timeline=TIMELINES[kind]||TIMELINES.resonance;
 scene.classList.add('bb-cinematic-running');
 setStage(scene,'paint');

 const message=document.getElementById('pullMessage');
 const finalMessage=pull.shinyUnlock?'SHINY AWAKENING!':pull.isNew?'NEW FIGHTER!':pull.progress||'RESONANCE';
 if(message){message.dataset.bbFinalMessage=finalMessage;message.textContent=''}

 schedule(scene,run,timeline.flip,()=>setStage(scene,'flip'));
 schedule(scene,run,timeline.resolve,()=>setStage(scene,'resolve'));
 schedule(scene,run,timeline.done,()=>{
  setStage(scene,'done');
  if(message)message.textContent=message.dataset.bbFinalMessage||finalMessage;
  scene.classList.remove('bb-cinematic-running');
 });
}

function syncPhysicalCard(pull,index,total){
 const refs=ensurePhysicalCard();
 const scene=document.getElementById('pullScene')||document.querySelector('#summonPullScreen .pullScene');
 if(!refs||!scene||!pull)return;
 const kind=revealKind(pull),rarity=String(pull.rarity||'rare').toLowerCase(),run=++cinematicRun;
 scene.dataset.bbCinematic='v2.2';scene.dataset.bbRevealKind=kind;scene.dataset.bbCinematicRarity=rarity;scene.dataset.bbRevealRun=String(run);
 refs.wrap.dataset.bbRevealKind=kind;refs.wrap.dataset.bbRevealRun=String(run);refs.wrap.style.setProperty('--bb-pull-index',String(index||0));
 refs.fx.dataset.bbRevealKind=kind;refs.fx.dataset.bbCinematicRarity=rarity;
 syncCardLabels(refs,pull);
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
  card.style.setProperty('--bb-result-delay',`${index*38}ms`);
  card.style.setProperty('--bb-result-shine-delay',`${180+index*38}ms`);
  card.classList.toggle('bb-new-result-card',!!pull?.isNew);
  card.classList.toggle('bb-resonance-result-card',!!pull&&!pull.isNew&&!pull.shinyUnlock);
  card.dataset.bbRevealKind=pull?revealKind(pull):'resonance';
 });
 const scene=document.getElementById('pullScene')||document.querySelector('#summonPullScreen .pullScene');
 if(scene){scene.classList.remove('bb-cinematic-running');scene.removeAttribute('data-bb-paint-stage');scene.removeAttribute('data-bb-reveal-kind');scene.removeAttribute('data-bb-cinematic-rarity')}
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