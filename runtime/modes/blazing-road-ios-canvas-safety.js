(()=>{
const STYLE_ID='bb-road-ios-canvas-safety-style';
function isTouchWebKit(){
 const ua=String(navigator.userAgent||'');
 const iOS=/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 return iOS&&/AppleWebKit/i.test(ua)&&navigator.maxTouchPoints>0;
}
if(!isTouchWebKit())return;
if(!document.getElementById(STYLE_ID)){
 const style=document.createElement('style');style.id=STYLE_ID;
 style.textContent=`#battleScreen.active #game{scale:none!important;transform:none!important;transition:none!important;will-change:auto!important;backface-visibility:visible!important;visibility:visible!important;opacity:1!important}`;
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
