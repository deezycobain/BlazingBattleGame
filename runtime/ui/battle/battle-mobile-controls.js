(()=>{
'use strict';
if(window.BlazingBattleMobileControls)return;

const STYLE_ID='bb-battle-mobile-controls-style';
const VERSION='v1';
const CONTROL_CLASS='bb-battle-mobile-control';
const MATCHERS=Object.freeze({
 reset:/^reset$/i,
 basic:/\bbasic\b/i,
 jutsu:/\bjutsu\b/i
});
const CSS=`
@media(max-width:700px){
 #battleScreen{
  --bb-battle-safe-top:max(10px,env(safe-area-inset-top));
  --bb-battle-safe-right:max(10px,env(safe-area-inset-right));
  --bb-battle-safe-bottom:max(12px,env(safe-area-inset-bottom));
  --bb-battle-safe-left:max(10px,env(safe-area-inset-left));
 }
 #battleScreen .${CONTROL_CLASS},
 #battleScreen .bb-battle-pause-button{
  position:absolute!important;
  z-index:9300!important;
  box-sizing:border-box!important;
  touch-action:manipulation!important;
  -webkit-tap-highlight-color:transparent;
 }
 #battleScreen .bb-battle-control-reset{
  top:var(--bb-battle-safe-top)!important;
  right:var(--bb-battle-safe-right)!important;
  bottom:auto!important;
  left:auto!important;
  min-width:72px!important;
  min-height:44px!important;
  max-width:34vw!important;
 }
 #battleScreen .bb-battle-pause-button{
  top:calc(var(--bb-battle-safe-top) + 52px)!important;
  right:var(--bb-battle-safe-right)!important;
  bottom:auto!important;
  left:auto!important;
  width:44px!important;
  height:44px!important;
  min-width:44px!important;
  min-height:44px!important;
 }
 #battleScreen .bb-battle-control-basic,
 #battleScreen .bb-battle-control-jutsu{
  top:auto!important;
  bottom:var(--bb-battle-safe-bottom)!important;
  min-width:104px!important;
  min-height:48px!important;
  max-width:calc(50% - 22px)!important;
 }
 #battleScreen .bb-battle-control-basic{
  left:var(--bb-battle-safe-left)!important;
  right:auto!important;
 }
 #battleScreen .bb-battle-control-jutsu{
  right:var(--bb-battle-safe-right)!important;
  left:auto!important;
 }
}
`;

function battle(){return document.getElementById('battleScreen')}
function normalizeText(button){return String(button?.textContent||'').replace(/\s+/g,' ').trim()}
function isRendered(button){
 if(!button)return false;
 const style=getComputedStyle(button),rect=button.getBoundingClientRect();
 return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)>0&&rect.width>0&&rect.height>0;
}
function ensureStyle(){
 let style=document.getElementById(STYLE_ID);
 if(!style){style=document.createElement('style');style.id=STYLE_ID;document.head.appendChild(style)}
 if(style.textContent!==CSS)style.textContent=CSS;
 return style;
}
function tagControls(){
 const root=battle();
 if(!root)return {};
 const buttons=[...root.querySelectorAll('button')];
 const result={};
 for(const [kind,matcher] of Object.entries(MATCHERS)){
  const matches=buttons.filter(button=>matcher.test(normalizeText(button)));
  for(const button of matches){
   button.classList.add(CONTROL_CLASS,`bb-battle-control-${kind}`);
   button.dataset.bbBattleControl=kind;
  }
  result[kind]=matches.find(isRendered)||matches[0]||null;
 }
 const pause=document.getElementById('bbBattlePauseButton');
 if(pause&&root.contains(pause))pause.dataset.bbBattleControl='pause';
 return {...result,pause:pause&&root.contains(pause)?pause:null};
}
function rect(button){
 if(!button)return null;
 const r=button.getBoundingClientRect();
 return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
}
function snapshot(){
 const root=battle();
 const controls=tagControls();
 const rendered={};
 for(const [kind,button] of Object.entries(controls))rendered[kind]=button?{rect:rect(button),visible:isRendered(button),disabled:!!button.disabled,text:normalizeText(button)}:null;
 const viewport=window.visualViewport;
 return Object.freeze({
  version:VERSION,
  active:!!root?.classList.contains('active'),
  battle:rect(root),
  viewport:Object.freeze({left:viewport?.offsetLeft||0,top:viewport?.offsetTop||0,width:viewport?.width||innerWidth,height:viewport?.height||innerHeight}),
  controls:Object.freeze(rendered)
 });
}
function sync(){ensureStyle();tagControls()}
let frame=0;
function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;sync()})}
function boot(){
 sync();
 const root=battle();
 if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
 window.addEventListener('resize',schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});
 document.addEventListener('click',schedule,true);
 setInterval(sync,240);
}
window.BlazingBattleMobileControls=Object.freeze({VERSION,sync,snapshot});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
