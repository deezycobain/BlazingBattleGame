(()=>{
'use strict';
const STYLE_ID='bb-road-countdown-polish-style';
function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
#bbRoadFightIntro{position:fixed!important;inset:0!important;left:0!important;top:0!important;right:0!important;bottom:0!important;width:100vw!important;height:100dvh!important;display:none!important;place-items:center!important;overflow:visible!important;contain:none!important;clip-path:none!important;-webkit-clip-path:none!important;mask:none!important;-webkit-mask:none!important;transform:none!important;padding:0!important;margin:0!important}
#bbRoadFightIntro.active{display:grid!important}
#bbRoadFightIntro .bb-road-fight-word{position:relative!important;display:block!important;overflow:visible!important;contain:none!important;clip-path:none!important;-webkit-clip-path:none!important;mask:none!important;-webkit-mask:none!important;padding:.24em .34em!important;margin:-.24em -.34em!important;color:transparent!important;-webkit-text-fill-color:transparent!important;-webkit-background-clip:text!important;background-clip:text!important;background-repeat:no-repeat!important;background-size:100% 100%!important;text-shadow:.025em .025em 0 #21171a,0 .12em .10em rgba(0,0,0,.72),0 0 .18em rgba(255,255,255,.16)!important}
#bbRoadFightIntro[data-word='3'] .bb-road-fight-word{background-image:linear-gradient(180deg,#fff4ad 0%,#ffd84d 48%,#d69b22 68%,#17110a 100%)!important}
#bbRoadFightIntro[data-word='2'] .bb-road-fight-word{background-image:linear-gradient(180deg,#e8f8ff 0%,#42b8ff 48%,#1678bd 68%,#08131c 100%)!important}
#bbRoadFightIntro[data-word='1'] .bb-road-fight-word{background-image:linear-gradient(180deg,#ffdede 0%,#ff4a4a 48%,#ba202b 68%,#1a080b 100%)!important}
#bbRoadFightIntro[data-word='FIGHT'] .bb-road-fight-word{background-image:linear-gradient(180deg,#ffffff 0%,#ffffff 48%,#cfcfcf 68%,#111111 100%)!important;text-shadow:.025em .025em 0 #171717,0 .12em .10em rgba(0,0,0,.72),0 0 .20em rgba(255,255,255,.22)!important}
`;
 document.head.appendChild(style);
}
function sync(){
 ensureStyle();
 const overlay=document.getElementById('bbRoadFightIntro');if(!overlay)return;
 overlay.style.removeProperty('left');overlay.style.removeProperty('top');overlay.style.removeProperty('right');overlay.style.removeProperty('bottom');overlay.style.removeProperty('width');overlay.style.removeProperty('height');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
window.addEventListener('pageshow',sync,{passive:true});window.addEventListener('resize',sync,{passive:true});
window.visualViewport?.addEventListener('resize',sync,{passive:true});window.visualViewport?.addEventListener('scroll',sync,{passive:true});
setInterval(sync,250);
})();
