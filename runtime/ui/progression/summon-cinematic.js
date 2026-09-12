(()=>{
'use strict';

const VERSION='2.0.0';
const VFX_ROOT='assets/vfx/summon/reveal-brush';
const CARD_BACK_SRC='assets/ui/cards/summon/card-back.png';
const CARD_FRONT_FRAME_SRC='assets/ui/cards/summon/card-front-frame.png';
const VFX=Object.freeze({
 primary:`${VFX_ROOT}/brush-stroke-01.png`,
 curve:`${VFX_ROOT}/brush-stroke-02.png`,
 impact:`${VFX_ROOT}/brush-stroke-03.png`,
 halo:`${VFX_ROOT}/brush-stroke-04.png`,
 secondary:`${VFX_ROOT}/brush-stroke-05.png`,
 finisher:`${VFX_ROOT}/brush-stroke-06.png`
});
let cinematicRun=0;

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
 const fallback=document.createElement('div');fallback.className='bb-card-back-fallback';fallback.innerHTML='<span>BLAZING</span><b>BATTLE</b>';
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

function syncPhysicalCard(pull,index,total){
 const refs=ensurePhysicalCard();
 const scene=document.getElementById('pullScene')||document.querySelector('#summonPullScreen .pullScene');
 if(!refs||!scene||!pull)return;
 const kind=revealKind(pull),rarity=String(pull.rarity||'rare').toLowerCase(),run=++cinematicRun;
 scene.dataset.bbCinematic='v2';scene.dataset.bbRevealKind=kind;scene.dataset.bbCinematicRarity=rarity;scene.dataset.bbRevealRun=String(run);
 refs.wrap.dataset.bbRevealKind=kind;refs.wrap.dataset.bbRevealRun=String(run);refs.wrap.style.setProperty('--bb-pull-index',String(index||0));
 refs.fx.dataset.bbRevealKind=kind;refs.fx.dataset.bbCinematicRarity=rarity;
 const badge=document.getElementById('pullNewBadge');
 if(badge)badge.textContent=pull.shinyUnlock?'SHINY AWAKENED':pull.isNew?'NEW FIGHTER':pull.progress||'RESONANCE';
 const message=document.getElementById('pullMessage');
 if(message){message.setAttribute('aria-live','polite');message.setAttribute('aria-atomic','true');message.textContent=pull.shinyUnlock?'AWAKENING SIGNATURE DETECTED...':pull.isNew?'NEW FIGHTER SIGNATURE DETECTED...':'RESONANCE SIGNATURE LOCKED...'}
 const counter=document.getElementById('pullCounter')||document.querySelector('#summonPullScreen .largePullCounter');
 if(counter&&Number.isFinite(total)&&total>1)counter.dataset.bbSequence=`${Number(index||0)+1}/${total}`;
}

function decorateResults(pulls){
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
 if(scene){scene.removeAttribute('data-bb-reveal-kind');scene.removeAttribute('data-bb-cinematic-rarity')}
}

function install(){
 ensurePhysicalCard();
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
window.BlazingSummonCinematic=Object.freeze({version:VERSION,refresh:ensurePhysicalCard,vfx:VFX,cardBack:CARD_BACK_SRC,cardFrontFrame:CARD_FRONT_FRAME_SRC});
})();
