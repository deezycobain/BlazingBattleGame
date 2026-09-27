(()=>{
const STYLE_ID='bb-road-ios-canvas-safety-style';
function isTouchWebKit(){
 const ua=String(navigator.userAgent||'');
 const iOS=/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 // WebKit's headless iPhone emulation can report zero touch points even when
 // it is using the exact narrow-screen compositor path that needs this guard.
 // A narrow AppleWebKit viewport is therefore treated as mobile-safe too.
 const narrow=window.matchMedia?.('(max-width:700px)').matches===true;
 return (iOS&&/AppleWebKit/i.test(ua)&&navigator.maxTouchPoints>0)||(narrow&&/AppleWebKit/i.test(ua));
}
if(!isTouchWebKit())return;
if(!document.getElementById(STYLE_ID)){
 const style=document.createElement('style');style.id=STYLE_ID;
 style.textContent=`#battleScreen.active #game{scale:1!important;transform:none!important;translate:-50% -50%!important;transform-origin:center center!important;transition:none!important;will-change:auto!important;backface-visibility:visible!important;visibility:visible!important;opacity:1!important}`;
 document.head.appendChild(style);
}
document.documentElement.dataset.bbRoadCanvasMode='ios-static-safe';
let reinforcing=false;
function reinforce(){
 if(reinforcing)return;reinforcing=true;
 try{
  const battle=document.getElementById('battleScreen'),canvas=document.getElementById('game');
  if(!battle?.classList.contains('active')||!(canvas instanceof HTMLCanvasElement))return;
  const camera=window.BlazingRoadCamera?.snapshot?.(),roadActive=!!camera?.active;
  if(!roadActive)return;
  // Clear compositor state left by the desktop camera before a portrait frame
  // is painted. These are presentation-only properties; world coordinates stay
  // in the original 480 x 720 canvas space.
  canvas.style.setProperty('scale','1','important');
  canvas.style.setProperty('transform','none','important');
  canvas.style.setProperty('translate','-50% -50%','important');
  canvas.style.setProperty('transform-origin','center center','important');
  canvas.style.removeProperty('filter');
  canvas.dataset.bbRoadCanvasSafe='true';
  battle.style.removeProperty('filter');battle.style.removeProperty('opacity');battle.style.removeProperty('visibility');
  if(camera?.mode==='combat'&&!window.BlazingRoadCamera?.isCombatLocked?.()){
   const overlay=document.getElementById('bbRoadFightIntro');
   if(overlay?.classList.contains('active'))overlay.classList.remove('active');
   if(overlay){overlay.removeAttribute('data-word');overlay.setAttribute('aria-hidden','true')}
   document.documentElement.dataset.bbRoadPostCountdown='visible';
  }
 }finally{reinforcing=false}
}
const observer=new MutationObserver(()=>queueMicrotask(reinforce));
const start=()=>{reinforce();observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class','style','data-word']});setInterval(reinforce,120)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',reinforce,{passive:true});
})();
