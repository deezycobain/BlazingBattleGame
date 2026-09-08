(()=>{
'use strict';
const STYLE_ID='bb-home-scroll-hud-style';
const SHELL_ID='bbHomeApproved';
if(document.getElementById(STYLE_ID))return;
const style=document.createElement('style');
style.id=STYLE_ID;
style.textContent=`
#${SHELL_ID}.bb-home-v9 .bb-home-v5-hud{
  top:max(6px,env(safe-area-inset-top))!important;
  left:max(6px,env(safe-area-inset-left))!important;
  right:max(6px,env(safe-area-inset-right))!important;
  gap:5px!important;
  align-items:flex-start!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile{
  position:relative!important;
  width:min(52vw,218px)!important;
  height:auto!important;
  aspect-ratio:3/1!important;
  display:grid!important;
  grid-template-columns:31% minmax(0,1fr)!important;
  align-items:center!important;
  gap:0!important;
  padding:6% 8% 6% 4%!important;
  box-sizing:border-box!important;
  overflow:visible!important;
  border:0!important;
  border-radius:0!important;
  background:none!important;
  clip-path:none!important;
  box-shadow:none!important;
  filter:drop-shadow(0 6px 8px rgba(0,0,0,.34))!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile:after{display:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-texture{
  display:block!important;
  position:absolute!important;
  inset:0!important;
  z-index:0!important;
  width:100%!important;
  height:100%!important;
  object-fit:fill!important;
  opacity:1!important;
  mix-blend-mode:normal!important;
  filter:none!important;
  pointer-events:none!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-avatar{
  position:relative!important;
  z-index:2!important;
  grid-column:1!important;
  justify-self:center!important;
  width:62%!important;
  aspect-ratio:1!important;
  margin-left:-3%!important;
  border:1px solid rgba(25,15,15,.72)!important;
  border-radius:50%!important;
  background:#1b1012!important;
  box-shadow:0 2px 6px rgba(0,0,0,.36)!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-copy{
  position:relative!important;
  z-index:2!important;
  grid-column:2!important;
  min-width:0!important;
  padding:0 2% 0 1%!important;
  text-align:left!important;
  text-shadow:none!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-copy small{
  font:800 5px/1 ui-sans-serif,system-ui,sans-serif!important;
  letter-spacing:.16em!important;
  color:#8c1f25!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-copy strong{
  margin-top:3px!important;
  font:900 clamp(11px,2.7vw,15px)/.95 ui-sans-serif,system-ui,sans-serif!important;
  letter-spacing:-.02em!important;
  color:#1c1715!important;
  text-shadow:0 1px rgba(255,255,255,.34)!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-meta{
  gap:5px!important;
  margin-top:4px!important;
  font:800 5px/1 ui-sans-serif,system-ui,sans-serif!important;
  letter-spacing:.06em!important;
  color:#4e4037!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-meta b{color:#9c252b!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-xp{display:none!important}

#${SHELL_ID}.bb-home-v9 .bb-home-v5-currencies{
  display:flex!important;
  flex-direction:column!important;
  align-items:flex-end!important;
  gap:1px!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency{
  position:relative!important;
  width:min(38vw,156px)!important;
  height:auto!important;
  aspect-ratio:3/1!important;
  display:block!important;
  padding:0!important;
  overflow:visible!important;
  border:0!important;
  border-radius:0!important;
  background:none!important;
  clip-path:none!important;
  box-shadow:none!important;
  filter:drop-shadow(0 5px 7px rgba(0,0,0,.31))!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency>img{
  display:block!important;
  position:absolute!important;
  inset:0!important;
  z-index:0!important;
  width:100%!important;
  height:100%!important;
  object-fit:fill!important;
  opacity:1!important;
  filter:none!important;
  pointer-events:none!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-icon{display:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-copy{
  position:absolute!important;
  z-index:2!important;
  left:31%!important;
  right:14%!important;
  top:50%!important;
  min-width:0!important;
  transform:translateY(-50%)!important;
  text-align:left!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-copy small{
  display:block!important;
  font:900 4px/1 ui-sans-serif,system-ui,sans-serif!important;
  letter-spacing:.14em!important;
  color:#8f2026!important;
  text-shadow:none!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-copy strong{
  display:block!important;
  margin-top:2px!important;
  font:900 clamp(9px,2.3vw,12px)/1 ui-sans-serif,system-ui,sans-serif!important;
  letter-spacing:.01em!important;
  color:#1d1715!important;
  text-shadow:0 1px rgba(255,255,255,.28)!important;
}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency:after{
  content:'+'!important;
  position:absolute!important;
  z-index:3!important;
  right:8%!important;
  top:50%!important;
  transform:translateY(-50%)!important;
  color:#a51f27!important;
  font:950 10px/1 ui-sans-serif,system-ui,sans-serif!important;
  text-shadow:0 1px #f7e3b8!important;
}
@media(max-width:620px){
  #${SHELL_ID}.bb-home-v9 .bb-home-v5-profile{width:min(52vw,211px)!important}
  #${SHELL_ID}.bb-home-v9 .bb-home-v5-currency{width:min(38vw,154px)!important}
  #${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-copy strong{font-size:12px!important}
  #${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-copy strong{font-size:10px!important}
  #${SHELL_ID} .bb-main-logo-slot{
    top:max(96px,calc(env(safe-area-inset-top) + 88px))!important;
    width:min(68vw,350px)!important;
    height:min(20vh,146px)!important;
  }
}
@media(max-height:700px){
  #${SHELL_ID}.bb-home-v9 .bb-home-v5-profile{width:min(48vw,195px)!important}
  #${SHELL_ID}.bb-home-v9 .bb-home-v5-currency{width:min(35vw,142px)!important}
  #${SHELL_ID} .bb-main-logo-slot{top:max(87px,calc(env(safe-area-inset-top) + 80px))!important;height:min(18vh,125px)!important}
}
`;
document.head.appendChild(style);
const shell=document.getElementById(SHELL_ID);
if(shell)shell.dataset.bbHudSkin='scroll-red-black';
window.BlazingHomeScrollHud=Object.freeze({styleId:STYLE_ID});
})();
