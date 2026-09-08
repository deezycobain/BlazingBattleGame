(()=>{
'use strict';
if(window.BlazingMobileShellFixes)return;
const STYLE_ID='bb-mobile-shell-fixes-style';
const VERSION='v1';
const CSS=`
@media(max-width:700px){
 html,body{
  width:100%!important;
  min-width:100%!important;
  height:var(--bb-visual-viewport-height,100dvh)!important;
  min-height:var(--bb-visual-viewport-height,100dvh)!important;
  max-height:var(--bb-visual-viewport-height,100dvh)!important;
  margin:0!important;
  padding:0!important;
  overflow:hidden!important;
  overscroll-behavior:none!important;
 }
 #app,#menuScreen,#battleScreen{
  width:100%!important;
  min-height:var(--bb-visual-viewport-height,100dvh)!important;
  max-height:var(--bb-visual-viewport-height,100dvh)!important;
 }
 #menuScreen,#battleScreen{height:var(--bb-visual-viewport-height,100dvh)!important}
}
`;
function ensureStyle(){
 let style=document.getElementById(STYLE_ID);
 if(!style){style=document.createElement('style');style.id=STYLE_ID;document.head.appendChild(style)}
 if(style.textContent!==CSS)style.textContent=CSS;
 return style;
}
function ensureViewportMeta(){
 let meta=document.querySelector('meta[name="viewport"]');
 if(!meta){meta=document.createElement('meta');meta.name='viewport';document.head.appendChild(meta)}
 const parts=(meta.getAttribute('content')||'').split(',').map(part=>part.trim()).filter(Boolean);
 const values=new Map();
 for(const part of parts){const index=part.indexOf('=');const key=(index<0?part:part.slice(0,index)).trim().toLowerCase();if(key)values.set(key,part)}
 if(!values.has('width'))values.set('width','width=device-width');
 if(!values.has('initial-scale'))values.set('initial-scale','initial-scale=1');
 values.set('viewport-fit','viewport-fit=cover');
 meta.setAttribute('content',[...values.values()].join(','));
 return meta;
}
let frame=0;
function syncViewport(){
 frame=0;
 const viewport=window.visualViewport;
 const height=Math.max(1,Math.round(viewport?.height||window.innerHeight||document.documentElement.clientHeight||1));
 const width=Math.max(1,Math.round(viewport?.width||window.innerWidth||document.documentElement.clientWidth||1));
 const root=document.documentElement;
 root.style.setProperty('--bb-visual-viewport-height',`${height}px`);
 root.style.setProperty('--bb-visual-viewport-width',`${width}px`);
 root.dataset.bbMobileViewport=VERSION;
 root.dataset.bbMobileViewportHeight=String(height);
 return {width,height};
}
function schedule(){if(frame)return;frame=requestAnimationFrame(syncViewport)}
function boot(){
 ensureViewportMeta();
 ensureStyle();
 syncViewport();
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('orientationchange',schedule,{passive:true});
 window.addEventListener('pageshow',schedule,{passive:true});
 if(window.visualViewport){
  window.visualViewport.addEventListener('resize',schedule,{passive:true});
  window.visualViewport.addEventListener('scroll',schedule,{passive:true});
 }
}
window.BlazingMobileShellFixes=Object.freeze({VERSION,syncViewport,ensureViewportMeta});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
