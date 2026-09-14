(()=>{
'use strict';
const STYLE_ID='bb-road-countdown-polish-style';
function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
#bbRoadFightIntro{position:fixed!important;left:var(--bb-vv-left,0px)!important;top:var(--bb-vv-top,0px)!important;right:auto!important;bottom:auto!important;width:var(--bb-vv-width,100vw)!important;height:var(--bb-vv-height,100dvh)!important;display:none!important;place-items:center!important;overflow:visible!important;contain:none!important;clip-path:none!important;-webkit-clip-path:none!important;mask:none!important;-webkit-mask:none!important;transform:none!important;padding:0!important;margin:0!important}
#bbRoadFightIntro.active{display:grid!important}
#bbRoadFightIntro .bb-road-fight-word{position:relative!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;height:auto!important;min-width:0!important;overflow:visible!important;contain:none!important;clip-path:none!important;-webkit-clip-path:none!important;mask:none!important;-webkit-mask:none!important;padding:.16em .2em!important;margin:-.16em -.2em!important;color:inherit!important;-webkit-text-fill-color:initial!important;background:none!important;text-shadow:none!important;line-height:.88!important}
#bbRoadFightIntro .bb-road-fight-word::before{display:none!important;content:none!important}
#bbRoadFightIntro .bb-road-fight-word.bb-brush-text .bb-brush-glyph,#bbRoadFightIntro .bb-road-fight-word.bb-brush-text img{display:block!important;height:1em!important;width:auto!important;max-width:1.15em!important;object-fit:contain!important;overflow:visible!important;opacity:1!important;visibility:visible!important;mix-blend-mode:normal!important;transform-origin:50% 62%!important}
#bbRoadFightIntro[data-word='3'] .bb-brush-glyph{filter:brightness(0) saturate(100%) invert(77%) sepia(74%) saturate(612%) hue-rotate(358deg) brightness(94%) contrast(89%) drop-shadow(.018em .035em .018em rgba(255,244,210,.34)) drop-shadow(.035em .085em .045em rgba(0,0,0,.68))!important}
#bbRoadFightIntro[data-word='2'] .bb-brush-glyph{filter:brightness(0) saturate(100%) invert(49%) sepia(30%) saturate(1322%) hue-rotate(161deg) brightness(90%) contrast(85%) drop-shadow(.018em .035em .018em rgba(235,247,255,.28)) drop-shadow(.035em .085em .045em rgba(0,0,0,.68))!important}
#bbRoadFightIntro[data-word='1'] .bb-brush-glyph{filter:brightness(0) saturate(100%) invert(32%) sepia(38%) saturate(1742%) hue-rotate(318deg) brightness(89%) contrast(92%) drop-shadow(.018em .035em .018em rgba(255,235,229,.24)) drop-shadow(.035em .085em .045em rgba(0,0,0,.68))!important}
`;
 document.head.appendChild(style);
}
function sync(){
 ensureStyle();
 const vv=window.visualViewport,root=document.documentElement;
 const width=vv?.width||window.innerWidth,height=vv?.height||window.innerHeight,left=vv?.offsetLeft||0,top=vv?.offsetTop||0;
 root.style.setProperty('--bb-vv-left',`${left}px`);root.style.setProperty('--bb-vv-top',`${top}px`);root.style.setProperty('--bb-vv-width',`${width}px`);root.style.setProperty('--bb-vv-height',`${height}px`);
 const overlay=document.getElementById('bbRoadFightIntro');if(!overlay)return;
 overlay.style.removeProperty('left');overlay.style.removeProperty('top');overlay.style.removeProperty('right');overlay.style.removeProperty('bottom');overlay.style.removeProperty('width');overlay.style.removeProperty('height');
 window.BlazingBrushText?.syncFightIntro?.();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
window.addEventListener('pageshow',sync,{passive:true});window.addEventListener('resize',sync,{passive:true});
window.visualViewport?.addEventListener('resize',sync,{passive:true});window.visualViewport?.addEventListener('scroll',sync,{passive:true});
setInterval(sync,250);
})();
