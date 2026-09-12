(()=>{
'use strict';

const VERSION='4.0.0';
const BRUSH_ROOT='assets/vfx/summon/reveal-brush';
const SPIN_ROOT='assets/vfx/summon/reveal-spin';
const CARD_BACK_SRC='assets/ui/summon/reveal/summon_reveal_card_back.png';
const CARD_FRONT_FRAME_SRC='assets/ui/summon/reveal/summon_reveal_card_front_frame.png';
const VFX=Object.freeze({
 primary:Object.freeze([
  `${BRUSH_ROOT}/brush-stroke-01.png`,
  `${BRUSH_ROOT}/brush-stroke-02.png`,
  `${BRUSH_ROOT}/brush-stroke-04.png`
 ]),
 counter:Object.freeze([
  `${BRUSH_ROOT}/brush-stroke-03.png`,
  `${BRUSH_ROOT}/brush-stroke-05.png`
 ]),
 spinOrbit:`${SPIN_ROOT}/card-spin-orbit.png`,
 resolveRing:`${SPIN_ROOT}/reveal-resolve-ring.png`
});
const TIMELINES=Object.freeze({
 resonance:Object.freeze({circleSlow:700,circleFast:1050,cardEnter:1350,flip:1550,resolve:1950,done:2150}),
 new:Object.freeze({circleSlow:700,circleFast:1050,cardEnter:1350,flip:1550,resolve:1950,done:2150}),
 shiny:Object.freeze({circleSlow:700,circleFast:1050,cardEnter:1350,flip:1550,resolve:1950,done:2150})
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
 node.src=src||'';node.className=className;node.alt=alt;node.decoding='async';node.draggable=false;
 node.addEventListener('error',()=>node.classList.add('bb-vfx-missing'));
 return node;
}
function clearTimeline(){timelineTimers.forEach(clearTimeout);timelineTimers=[]}
function schedule(scene,run,delay,fn){
 const timer=setTimeout(()=>{if(Number(scene.dataset.bbRevealRun)!==run)return;fn()},delay);
 timelineTimers.push(timer);
}
function setStage(scene,stage){scene.dataset.bbPaintStage=stage}
function pick(list,rng,avoid){
 const pool=avoid?list.filter(item=>item!==avoid):list.slice();
 const source=pool.length?pool:list;
 return source[Math.floor(rng()*source.length)]||list[0];
}
function seededRng(seedText){
 let seed=2166136261;
 for(let i=0;i<seedText.length;i++){seed^=seedText.charCodeAt(i);seed=Math.imul(seed,16777619)}
 return ()=>{seed+=0x6D2B79F5;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
}
function between(rng,min,max){return min+(max-min)*rng()}

function ensureCardLabels(front){
 let name=front.querySelector('.bb-card-nameplate');
 if(!name){name=document.createElement('div');name.className='bb-card-nameplate';name.setAttribute('aria-hidden','true');front.append(name)}
 let rarity=front.querySelector('.bb-card-rarityplate');
 if(!rarity){rarity=document.createElement('div');rarity.className='bb-card-rarityplate';rarity.setAttribute('aria-hidden','true');front.append(rarity)}
 return {name,rarity};
}

function buildPaintFx(scene){
 let fx=scene.querySelector('.bb-paint-stage-vfx');
 if(fx?.dataset.bbVfxVersion===VERSION)return fx;
 fx?.remove();
 fx=document.createElement('div');fx.className='bb-paint-stage-vfx';fx.dataset.bbVfxVersion=VERSION;fx.setAttribute('aria-hidden','true');
 fx.append(
  img('','bb-paint-stroke bb-paint-stroke-1 bb-paint-direction-up'),
  img('','bb-paint-stroke bb-paint-stroke-2 bb-paint-direction-counter')
 );
 scene.append(fx);
 return fx;
}

function buildSpinFx(wrap){
 let fx=wrap.querySelector('.bb-card-spin-vfx');
 if(fx?.dataset.bbVfxVersion===VERSION)return fx;
 fx?.remove();
 fx=document.createElement('div');fx.className='bb-card-spin-vfx';fx.dataset.bbVfxVersion=VERSION;fx.setAttribute('aria-hidden','true');
 fx.append(img(VFX.spinOrbit,'bb-spin-orbit'),img(VFX.resolveRing,'bb-resolve-ring'));
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
 const paintFx=buildPaintFx(scene);
 const spinFx=buildSpinFx(wrap);
 return {wrap,scene,flipper,front,back,paintFx,spinFx,...labels};
}

function syncCardLabels(refs,pull){
 const fighterName=String(pull?.name||pull?.fighter||pull?.id||'').trim();
 if(refs.name)refs.name.textContent=fighterName.toUpperCase();
 if(refs.rarity){
  const rarity=String(pull?.rarity||'rare').toLowerCase();
  refs.rarity.textContent=rarity==='legendary'?'LEGENDARY':rarity==='super'?'SUPER RARE':rarity.toUpperCase();
 }
}

function setMotionVars(fx,n,direction,rng){
 const laneX=between(rng,-1.2,1.2),laneY=between(rng,-1.0,1.0);
 const scale=between(rng,.985,1.02),rot=between(rng,-1.2,1.2);
 const reverse=direction==='counter';
 const x0=(reverse?12:-12)+laneX;
 const y0=7+laneY;
 const x1=(reverse?-12:12)+laneX*.35;
 const y1=-7+laneY*.35;
 fx.style.setProperty(`--s${n}-x0`,`${x0.toFixed(2)}vw`);
 fx.style.setProperty(`--s${n}-y0`,`${y0.toFixed(2)}vh`);
 fx.style.setProperty(`--s${n}-x1`,`${x1.toFixed(2)}vw`);
 fx.style.setProperty(`--s${n}-y1`,`${y1.toFixed(2)}vh`);
 fx.style.setProperty(`--s${n}-r0`,`${(rot+(reverse?.8:-.8)).toFixed(2)}deg`);
 fx.style.setProperty(`--s${n}-r1`,`${(rot+(reverse?-.4:.4)).toFixed(2)}deg`);
 fx.style.setProperty(`--s${n}-scale`,scale.toFixed(3));
 fx.dataset[`bbStroke${n}Direction`]=direction;
}

function configureBrushes(refs,pull,index,run){
 const seed=`${pull?.name||pull?.fighter||'fighter'}:${index||0}:${run}:${Date.now()}`;
 const rng=seededRng(seed);
 const sources=[pick(VFX.primary,rng),pick(VFX.counter,rng)];
 const directions=['up','counter'];
 for(let n=1;n<=2;n++){
  const stroke=refs.paintFx.querySelector(`.bb-paint-stroke-${n}`);
  if(stroke)stroke.src=sources[n-1];
  setMotionVars(refs.paintFx,n,directions[n-1],rng);
 }
}

function finishReveal(scene,message,finalMessage){
 setStage(scene,'done');
 if(message)message.textContent=message.dataset.bbFinalMessage||finalMessage;
 scene.classList.remove('bb-cinematic-running');
}

function startPaintTimeline(refs,pull,index,run){
 clearTimeline();
 const {scene}=refs;
 const kind=revealKind(pull),timeline=TIMELINES[kind]||TIMELINES.resonance;
 configureBrushes(refs,pull,index,run);
 scene.classList.remove('bb-cinematic-running');
 scene.removeAttribute('data-bb-paint-stage');
 void scene.offsetWidth;
 scene.classList.add('bb-cinematic-running');
 setStage(scene,'paint');

 const message=document.getElementById('pullMessage');
 const finalMessage=pull.shinyUnlock?'SHINY AWAKENING!':pull.isNew?'NEW FIGHTER!':pull.progress||'RESONANCE';
 if(message){message.dataset.bbFinalMessage=finalMessage;message.textContent=''}

 if(REDUCED_MOTION){
  schedule(scene,run,40,()=>setStage(scene,'resolve'));
  schedule(scene,run,90,()=>finishReveal(scene,message,finalMessage));
  return;
 }
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
 scene.dataset.bbCinematic='v4';scene.dataset.bbRevealKind=kind;scene.dataset.bbCinematicRarity=rarity;scene.dataset.bbRevealRun=String(run);
 refs.wrap.dataset.bbRevealKind=kind;refs.wrap.dataset.bbRevealRun=String(run);refs.wrap.style.setProperty('--bb-pull-index',String(index||0));
 refs.paintFx.dataset.bbRevealKind=kind;refs.spinFx.dataset.bbRevealKind=kind;
 syncCardLabels(refs,pull);
 const badge=document.getElementById('pullNewBadge');
 if(badge)badge.textContent=pull.shinyUnlock?'SHINY AWAKENED':pull.isNew?'NEW FIGHTER':pull.progress||'RESONANCE';
 const counter=document.getElementById('pullCounter')||document.querySelector('#summonPullScreen .largePullCounter');
 if(counter&&Number.isFinite(total)&&total>1)counter.dataset.bbSequence=`${Number(index||0)+1}/${total}`;
 startPaintTimeline(refs,pull,index,run);
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
 const scene=sceneNode();
 if(scene){scene.classList.remove('bb-cinematic-running');scene.removeAttribute('data-bb-paint-stage');scene.removeAttribute('data-bb-reveal-kind');scene.removeAttribute('data-bb-cinematic-rarity')}
}

function installTapGuard(){
 const tap=document.getElementById('pullTapArea');
 if(!tap||tap.dataset.bbCinematicGuard==='1')return;
 tap.dataset.bbCinematicGuard='1';
 tap.addEventListener('click',event=>{
  const scene=sceneNode();
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
