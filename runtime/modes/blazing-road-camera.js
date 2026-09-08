(()=>{
'use strict';

const DEFAULT_COMBAT_SCALE=1.12;
const DEFAULT_POSITION='center 53%';
const DEFAULT_COUNTDOWN_STEP_MS=520;
const DEFAULT_FIGHT_HOLD_MS=680;
const DEFAULT_TRANSITION_MS=760;
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
#${OVERLAY_ID}{position:fixed;inset:0;z-index:12000;display:none;place-items:center;pointer-events:auto;background:transparent;contain:layout paint}
#${OVERLAY_ID}.active{display:grid}
#${OVERLAY_ID} .bb-road-fight-word{font-family:'AnimeAce2','Arial Black',Impact,sans-serif;font-size:clamp(78px,22vw,170px);font-weight:900;line-height:.82;letter-spacing:.03em;color:#fff7df;-webkit-text-stroke:clamp(2px,.7vw,5px) #121016;text-shadow:0 .055em 0 #a50f19,0 .11em .10em rgba(0,0,0,.56),0 0 .18em rgba(255,191,73,.42);transform:rotate(-4deg) scale(.72);opacity:0;filter:drop-shadow(0 .08em .06em rgba(0,0,0,.58));user-select:none}
#${OVERLAY_ID}[data-word='FIGHT'] .bb-road-fight-word{font-size:clamp(72px,20vw,156px);color:#ffd34f;-webkit-text-stroke-color:#1b1113;text-shadow:0 .06em 0 #c51c17,0 .12em .10em rgba(0,0,0,.62),0 0 .22em rgba(255,86,36,.48)}
#${OVERLAY_ID} .bb-road-fight-word.pop{animation:bbRoadFightPop .52s cubic-bezier(.18,.78,.17,1) both}
#${OVERLAY_ID}[data-word='FIGHT'] .bb-road-fight-word.pop{animation-duration:.72s}
@keyframes bbRoadFightPop{0%{opacity:0;transform:rotate(-7deg) scale(.54)}28%{opacity:1;transform:rotate(-2deg) scale(1.08)}68%{opacity:1;transform:rotate(-3deg) scale(.99)}100%{opacity:0;transform:rotate(-2deg) scale(1.07)}}
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
  if('scale' in canvas.style){
    canvas.style.transition=`scale ${Math.max(0,transitionMs)}ms cubic-bezier(.2,.72,.2,1)`;
    canvas.style.scale=String(value);
  }else{
    canvas.style.transition=`transform ${Math.max(0,transitionMs)}ms cubic-bezier(.2,.72,.2,1)`;
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
  const transitionMs=Math.max(0,Number(presentation.transitionMs)||DEFAULT_TRANSITION_MS);
  const stepMs=Math.max(260,Number(presentation.countdownStepMs)||DEFAULT_COUNTDOWN_STEP_MS);
  const fightHoldMs=Math.max(360,Number(presentation.fightHoldMs)||DEFAULT_FIGHT_HOLD_MS);

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
