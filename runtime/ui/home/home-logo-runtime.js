(()=>{
'use strict';
const SHELL_ID='bbHomeApproved';
const STYLE_ID='bb-main-logo-style';
const SLOT_CLASS='bb-main-logo-slot';
const LOGO='assets/ui/home/branding/blazing-battle-logo.webp';

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
#${SHELL_ID} .bb-home-v4-brand,
#menuScreen.bb-home-theme .bb-home-title,
#menuScreen.bb-home-theme .bb-home-kicker{display:none!important}
#${SHELL_ID} .${SLOT_CLASS}{
  position:absolute;z-index:9;left:50%;top:clamp(64px,9.5vh,92px);
  width:min(68vw,620px);height:min(31vh,285px);transform:translateX(-50%);
  display:grid;place-items:center;pointer-events:none;isolation:isolate;
  filter:drop-shadow(0 13px 18px rgba(0,0,0,.34));
}
#${SHELL_ID} .${SLOT_CLASS}:before{
  content:'';position:absolute;z-index:-1;left:50%;top:50%;width:116%;height:86%;
  transform:translate(-50%,-50%) rotate(-1deg);
  background:radial-gradient(ellipse at center,rgba(235,218,177,.90) 0 34%,rgba(225,202,157,.66) 49%,rgba(42,28,28,.22) 66%,transparent 76%);
  filter:blur(10px);opacity:.93;pointer-events:none;
}
#${SHELL_ID} .${SLOT_CLASS} img{
  display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;
  image-rendering:auto;-webkit-user-drag:none;user-select:none;
}
@media(max-width:620px){
  #${SHELL_ID} .${SLOT_CLASS}{top:max(62px,calc(env(safe-area-inset-top) + 55px));width:min(76vw,390px);height:min(24vh,190px)}
  #${SHELL_ID} .${SLOT_CLASS}:before{width:122%;height:92%}
}
@media(max-height:700px){
  #${SHELL_ID} .${SLOT_CLASS}{top:max(57px,calc(env(safe-area-inset-top) + 50px));height:min(22vh,165px);width:min(62vw,470px)}
}
`;
  document.head.appendChild(style);
}

function install(){
  ensureStyle();
  const shell=document.getElementById(SHELL_ID);
  if(!shell)return false;
  let slot=shell.querySelector('.'+SLOT_CLASS);
  if(!slot){
    slot=document.createElement('div');
    slot.className=SLOT_CLASS;
    slot.setAttribute('aria-label','Blazing Battle');
    slot.innerHTML=`<img src="${LOGO}" alt="Blazing Battle" draggable="false">`;
    shell.appendChild(slot);
  }
  const img=slot.querySelector('img');
  if(img&&img.getAttribute('src')!==LOGO)img.setAttribute('src',LOGO);
  shell.dataset.bbMainLogo='approved-scroll';
  return true;
}

let queued=false;
const queue=()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;install();});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});
else queue();
const observer=new MutationObserver(queue);
observer.observe(document.documentElement,{childList:true,subtree:true});
window.BlazingMainLogo={install,asset:LOGO};
})();
