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
function reinforce(){
 const battle=document.getElementById('battleScreen'),canvas=document.getElementById('game');
 if(!battle?.classList.contains('active')||!(canvas instanceof HTMLCanvasElement))return;
 canvas.style.removeProperty('filter');
 canvas.dataset.bbRoadCanvasSafe='true';
}
const observer=new MutationObserver(reinforce);
const start=()=>{reinforce();observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class','style']})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',reinforce,{passive:true});
})();
