(()=>{
'use strict';

const DEFAULT_COMBAT_SCALE=1.12;
const DEFAULT_POSITION='center 53%';
const DEFAULT_COUNTDOWN_STEP_MS=720;
const DEFAULT_FIGHT_HOLD_MS=900;
const DEFAULT_TRANSITION_MS=1450;
const OVERLAY_ID='bbRoadFightIntro';
const STYLE_ID='bb-road-fight-intro-style';
let activeKey='';
let introStartedAt=0;
let fightStartedAt=0;
let introPhase='none';
let mode='idle';
let targetScale=1;
let targetPosition=DEFAULT_POSITION;
let currentCanvas=null;
let combatLocked=false;
let overlayWord='';
let timer=0;
let activeCountdownStepMs=DEFAULT_COUNTDOWN_STEP_MS;
let activeFightHoldMs=DEFAULT_FIGHT_HOLD_MS;
let activeTransitionMs=DEFAULT_TRANSITION_MS;
const originalStyles=new WeakMap();

function liveState(){try{return globalThis.eval('S')}catch{return null}}
function visible(el){
  if(!el)return false;
  const r=el.getBoundingClientRect();
  const style=getComputedStyle(el);
  return r.width>120&&r.height>180&&style.display!=='none'&&style.visibility!=='hidden';
}
function battleCanvas(){
  const root=document.getElementById('battleScreen');
  if(!root?.classList.contains('active'))return null;
  const game=document.getElementById('game');
  if(game instanceof HTMLCanvasElement&&root.contains(game)&&visible(game))return game;
  const canvases=[...root.querySelectorAll('canvas')].filter(visible);
  canvases.sort((a,b)=>{
    const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
    return br.width*br.height-ar.width*ar.height;
  });
  return canvases[0]||null;
}
function ensureIntroUi(){
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
#${OVERLAY_ID}{position:fixed;inset:0;z-index:12000;display:none;place-items:center;pointer-events:none;background:transparent;contain:layout paint}
#${OVERLAY_ID}.active{display:grid}
#${OVERLAY_ID} .bb-road-fight-word{font-family:'AnimeAce2',Impact,'Arial Black',sans-serif;font-size:clamp(82px,23vw,176px);font-style:italic;font-weight:900;font-stretch:condensed;line-height:.78;letter-spacing:-.035em;color:#fff7df;-webkit-text-stroke:clamp(2px,.72vw,5px) #121016;paint-order:stroke fill;text-shadow:.025em .025em 0 #2a1517,0 .065em 0 #a50f19,0 .13em .11em rgba(0,0,0,.62),0 0 .19em rgba(255,191,73,.46);transform-origin:50% 56%;transform:rotate(-6deg) skewX(-6deg) scale(.62);opacity:0;filter:drop-shadow(0 .09em .07em rgba(0,0,0,.62));user-select:none}
#${OVERLAY_ID}[data-word='FIGHT'] .bb-road-fight-word{font-size:clamp(76px,21vw,164px);letter-spacing:-.055em;color:#ffd34f;-webkit-text-stroke-color:#1b1113;text-shadow:.025em .025em 0 #321417,0 .065em 0 #c51c17,0 .13em .11em rgba(0,0,0,.66),0 0 .24em rgba(255,86,36,.54)}
#${OVERLAY_ID} .bb-road-fight-word.pop{animation:bbRoadFightPop .68s cubic-bezier(.16,.84,.18,1) both}
#${OVERLAY_ID}[data-word='FIGHT'] .bb-road-fight-word.pop{animation-name:bbRoadFightStrike;animation-duration:.98s;animation-timing-function:cubic-bezier(.12,.86,.16,1)}
@keyframes bbRoadFightPop{0%{opacity:0;transform:translateY(.06em) rotate(-11deg) skewX(-10deg) scale(.34);filter:blur(1.5px) drop-shadow(0 .09em .07em rgba(0,0,0,.62))}22%{opacity:1;transform:translateY(0) rotate(-4deg) skewX(-6deg) scale(1.16);filter:blur(0) drop-shadow(0 .09em .07em rgba(0,0,0,.62))}44%{opacity:1;transform:rotate(-6deg) skewX(-5deg) scale(.96)}67%{opacity:1;transform:rotate(-4deg) skewX(-5deg) scale(1.035)}82%{opacity:1;transform:rotate(-5deg) skewX(-5deg) scale(1)}100%{opacity:0;transform:translateY(-.045em) rotate(-3deg) skewX(-4deg) scale(1.09)}}
@keyframes bbRoadFightStrike{0%{opacity:0;transform:translateX(-.11em) rotate(-12deg) skewX(-12deg) scale(.42);filter:blur(2px) drop-shadow(0 .09em .07em rgba(0,0,0,.62))}18%{opacity:1;transform:translateX(0) rotate(-3deg) skewX(-7deg) scale(1.22);filter:blur(0) drop-shadow(0 .09em .07em rgba(0,0,0,.62))}40%{opacity:1;transform:rotate(-6deg) skewX(-5deg) scale(.98)}63%{opacity:1;transform:rotate(-3deg) skewX(-5deg) scale(1.055)}78%{opacity:1;transform:rotate(-4deg) skewX(-5deg) scale(1.015)}100%{opacity:0;transform:translateX(.055em) translateY(-.035em) rotate(-2deg) skewX(-4deg) scale(1.12)}}
@media(prefers-reduced-motion:reduce){#${OVERLAY_ID} .bb-road-fight-word.pop{animation:none;opacity:1;transform:none}}
`;
    document.head.appendChild(style);
  }
  let overlay=document.getElementById(OVERLAY_ID);
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id=OVERLAY_ID;
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<span class="bb-road-fight-word"></span>';
    document.body.appendChild(overlay);
  }
  return overlay;
}
function showWord(word){
  const overlay=ensureIntroUi();
  if(!word){
    overlay.classList.remove('active');
    overlay.dataset.word='';
    overlayWord='';
    return;
  }
  overlay.classList.add('active');
  if(overlayWord===word)return;
  overlayWord=word;
  overlay.dataset.word=word;
  const span=overlay.querySelector('.bb-road-fight-word');
  if(span){
    span.textContent=word;
    span.classList.remove('pop');
    void span.offsetWidth;
    span.classList.add('pop');
  }
}
function remember(canvas){
  if(originalStyles.has(canvas))return;
  originalStyles.set(canvas,{
    scale:canvas.style.scale,
    transform:canvas.style.transform,
    transformOrigin:canvas.style.transformOrigin,
    transition:canvas.style.transition,
    willChange:canvas.style.willChange
  });
}
function restore(canvas){
  if(!canvas)return;
  const saved=originalStyles.get(canvas);
  if(!saved)return;
  canvas.style.scale=saved.scale;
  canvas.style.transform=saved.transform;
  canvas.style.transformOrigin=saved.transformOrigin;
  canvas.style.transition=saved.transition;
  canvas.style.willChange=saved.willChange;
  originalStyles.delete(canvas);
}
function applyCamera(canvas,scale,position,transitionMs){
  if(!canvas)return;
  if(currentCanvas&&currentCanvas!==canvas)restore(currentCanvas);
  currentCanvas=canvas;
  remember(canvas);
  const value=Math.max(1,Number(scale)||1);
  canvas.style.transformOrigin=position||DEFAULT_POSITION;
  canvas.style.willChange='scale';
  const easing='cubic-bezier(.16,.82,.18,1)';
  if('scale' in canvas.style){
    canvas.style.transition=`scale ${Math.max(0,transitionMs)}ms ${easing}`;
    canvas.style.scale=String(value);
  }else{
    canvas.style.transition=`transform ${Math.max(0,transitionMs)}ms ${easing}`;
    canvas.style.transform=`scale(${value})`;
  }
  targetScale=value;
  targetPosition=position||DEFAULT_POSITION;
}
function fightersAlive(state){
  const units=(state?.pairs||[]).flatMap(pair=>Array.isArray(pair?.units)?pair.units:[])
    .filter(unit=>unit&&Number(unit.maxHp)>0);
  return !units.length||units.some(unit=>Number(unit.hp)>0);
}
function battleEnding(state){
  if(document.getElementById('bbMatchResults')?.classList.contains('active'))return true;
  if(state?.victoryFX)return true;
  if(Array.isArray(state?.enemies)&&state.enemies.length&&state.enemies.every(enemy=>Number(enemy.hp)<=0))return true;
  return !fightersAlive(state);
}
function mapFor(state){
  return state?.bbRoadContent?.map||window.BlazingRoadContent?.mapForStage?.(state?.bbRoadStage||1)||null;
}
function runIdFor(state){
  return state?.bbRoadRun?.run_id||window.BlazingRoadRun?.loadRun?.()?.run_id||'session';
}
function introStorageKey(state,map,stage){return `bbRoadIntroSeen:${runIdFor(state)}:${stage}:${String(map?.key||'road')}`}
function introSeen(key){try{return sessionStorage.getItem(key)==='1'}catch{return false}}
function markIntroSeen(key){try{sessionStorage.setItem(key,'1')}catch{}}
function reset(){
  if(currentCanvas)restore(currentCanvas);
  currentCanvas=null;
  activeKey='';
  introStartedAt=0;
  fightStartedAt=0;
  introPhase='none';
  mode='idle';
  targetScale=1;
  targetPosition=DEFAULT_POSITION;
  combatLocked=false;
  activeCountdownStepMs=DEFAULT_COUNTDOWN_STEP_MS;
  activeFightHoldMs=DEFAULT_FIGHT_HOLD_MS;
  activeTransitionMs=DEFAULT_TRANSITION_MS;
  showWord('');
}
function sync(now=performance.now()){
  const state=liveState();
  const canvas=battleCanvas();
  if(!canvas||state?.bbRunMode!=='road'){
    reset();
    return;
  }
  const map=mapFor(state);
  const presentation=map?.presentation||{};
  const stage=Math.max(1,Number(state?.bbRoadStage)||1);
  const key=`${runIdFor(state)}:${stage}:${String(map?.key||'road')}`;
  const seenKey=introStorageKey(state,map,stage);
  const introScale=Number(presentation.introScale)||1;
  const combatScale=Math.max(1,Number(presentation.combatScale??presentation.scale??DEFAULT_COMBAT_SCALE)||DEFAULT_COMBAT_SCALE);
  const position=String(presentation.position||DEFAULT_POSITION);
  const transitionMs=Math.max(DEFAULT_TRANSITION_MS,Number(presentation.transitionMs)||DEFAULT_TRANSITION_MS);
  const stepMs=Math.max(DEFAULT_COUNTDOWN_STEP_MS,Number(presentation.countdownStepMs)||DEFAULT_COUNTDOWN_STEP_MS);
  const fightHoldMs=Math.max(DEFAULT_FIGHT_HOLD_MS,Number(presentation.fightHoldMs)||DEFAULT_FIGHT_HOLD_MS);
  activeCountdownStepMs=stepMs;
  activeFightHoldMs=fightHoldMs;
  activeTransitionMs=transitionMs;

  if(key!==activeKey){
    activeKey=key;
    introStartedAt=now;
    fightStartedAt=0;
    introPhase='none';
    showWord('');
    if(battleEnding(state)){
      combatLocked=false;
      mode='outro';
      applyCamera(canvas,introScale,position,transitionMs);
      return;
    }
    if(introSeen(seenKey)){
      combatLocked=false;
      mode='combat';
      applyCamera(canvas,combatScale,position,0);
      return;
    }
    markIntroSeen(seenKey);
    combatLocked=true;
    mode='intro';
    introPhase='countdown';
    applyCamera(canvas,introScale,position,0);
    showWord('3');
    return;
  }

  if(battleEnding(state)){
    combatLocked=false;
    mode='outro';
    introPhase='none';
    showWord('');
    applyCamera(canvas,introScale,position,transitionMs);
    return;
  }

  if(mode==='intro'){
    const elapsed=Math.max(0,now-introStartedAt);
    if(introPhase==='countdown'){
      if(elapsed<stepMs){showWord('3');return;}
      if(elapsed<stepMs*2){showWord('2');return;}
      if(elapsed<stepMs*3){showWord('1');return;}
      introPhase='fight';
      fightStartedAt=now;
      showWord('FIGHT');
      applyCamera(canvas,combatScale,position,transitionMs);
      return;
    }
    showWord('FIGHT');
    if(now-fightStartedAt<Math.max(fightHoldMs,transitionMs))return;
    combatLocked=false;
    mode='combat';
    introPhase='none';
    showWord('');
    applyCamera(canvas,combatScale,position,0);
    return;
  }

  combatLocked=false;
  mode='combat';
  introPhase='none';
  showWord('');
  applyCamera(canvas,combatScale,position,transitionMs);
}
function snapshot(){
  const state=liveState();
  const map=mapFor(state);
  const rect=currentCanvas?.getBoundingClientRect?.()||null;
  const now=performance.now();
  return Object.freeze({
    active:!!currentCanvas,
    mode,
    introPhase,
    locked:combatLocked,
    word:overlayWord||null,
    stage:Number(state?.bbRoadStage)||null,
    mapKey:map?.key||null,
    introScale:Number(map?.presentation?.introScale)||1,
    combatScale:Number(map?.presentation?.combatScale??map?.presentation?.scale)||DEFAULT_COMBAT_SCALE,
    targetScale,
    position:targetPosition,
    countdownStepMs:activeCountdownStepMs,
    fightHoldMs:activeFightHoldMs,
    transitionMs:activeTransitionMs,
    introElapsedMs:introStartedAt?Math.max(0,now-introStartedAt):0,
    fightElapsedMs:fightStartedAt?Math.max(0,now-fightStartedAt):0,
    canvasId:currentCanvas?.id||null,
    rect:rect?Object.freeze({left:rect.left,top:rect.top,width:rect.width,height:rect.height}):null
  });
}
function isCombatLocked(){return !!currentCanvas&&mode==='intro'&&combatLocked}

window.BlazingRoadCamera=Object.freeze({sync:()=>sync(),snapshot,reset,isCombatLocked});
window.addEventListener('pageshow',()=>sync(),{passive:true});
window.addEventListener('resize',()=>sync(),{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
timer=window.setInterval(()=>sync(),50);
window.addEventListener('pagehide',()=>{window.clearInterval(timer);reset();},{once:true});
ensureIntroUi();
sync();
})();
