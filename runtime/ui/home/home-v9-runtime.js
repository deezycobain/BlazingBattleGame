(()=>{
'use strict';

const STYLE_ID='bb-home-v9-style';
const SHELL_ID='bbHomeApproved';
const FONT='Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

const COIN_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 5.4c2.3 2.3 4 4.2 4 6.6a4 4 0 0 1-8 0c0-1.7.9-3.2 2.1-4.7.1 1.4.7 2.3 1.5 2.9.1-1.7.2-3.2.4-4.8Z" fill="currentColor"/><path d="M12 11.2c1.2 1 1.9 2 1.9 3a1.9 1.9 0 1 1-3.8 0c0-.8.4-1.6 1.1-2.4.1.7.4 1.2.8 1.5.1-.7 0-1.3 0-2.1Z" fill="#201913" opacity=".58"/></svg>`;
const EMBER_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.8 18.3 9 12 21.2 5.7 9 12 2.8Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m12 6.3 3.3 3.5-3.3 6.8-3.3-6.8L12 6.3Z" fill="currentColor"/><path d="M12 6.3v10.3l3.3-6.8L12 6.3Z" fill="#fff" opacity=".28"/></svg>`;

function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
#${SHELL_ID}.bb-home-v9{--bb-home-v9-ivory:#efe0be;--bb-home-v9-ink:#17151a;--bb-home-v9-red:#7f2730;--bb-home-v9-dock-h:clamp(116px,16.5vh,150px)}
#${SHELL_ID}.bb-home-v9,#${SHELL_ID}.bb-home-v9 button,#${SHELL_ID}.bb-home-v9 input{font-family:${FONT}!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-brand{display:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-center{display:none!important;visibility:hidden!important;pointer-events:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-stage{position:relative!important;padding:0!important;align-items:stretch!important;justify-content:stretch!important}

#${SHELL_ID}.bb-home-v9 .bb-home-v5-hud{top:max(8px,env(safe-area-inset-top))!important;left:max(8px,env(safe-area-inset-left))!important;right:max(8px,env(safe-area-inset-right))!important;gap:8px!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile{width:min(52vw,224px)!important;height:clamp(52px,7.8vh,64px)!important;grid-template-columns:clamp(43px,7vw,52px) 1fr!important;gap:7px!important;padding:4px 12px 4px 4px!important;border:1px solid rgba(239,224,190,.28)!important;background:linear-gradient(106deg,rgba(20,18,21,.95),rgba(40,35,34,.90) 70%,rgba(86,61,46,.25))!important;clip-path:polygon(0 4%,96% 0,100% 76%,92% 100%,4% 95%)!important;filter:drop-shadow(0 7px 11px rgba(0,0,0,.38))!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile:after{background:linear-gradient(90deg,var(--bb-home-v9-ivory),#9f7d55 64%,transparent)!important;opacity:.86}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-avatar{border-color:#d8bf8c!important;box-shadow:0 0 0 2px rgba(45,39,36,.85),0 4px 10px rgba(0,0,0,.38)!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-copy small{font:700 5px/1 ${FONT}!important;letter-spacing:.22em!important;color:#cdbd9b!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-copy strong{font:800 clamp(12px,2vw,17px)/1 ${FONT}!important;letter-spacing:.01em!important;color:#fffaf0!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-meta{font:650 5px/1 ${FONT}!important;letter-spacing:.08em!important;color:rgba(237,224,199,.72)!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-meta b{color:#e4cb98!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-xp{display:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-profile-texture,#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency>img{display:none!important}
#menuScreen.bb-home-theme.bb-home-v5 .bb-economy-hud{display:none!important}

#${SHELL_ID}.bb-home-v9 .bb-home-v5-currencies{flex-direction:column!important;gap:3px!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency{width:min(35vw,142px)!important;height:clamp(26px,3.9vh,31px)!important;grid-template-columns:20px 1fr!important;gap:4px!important;padding:2px 15px 2px 5px!important;border:1px solid rgba(239,224,190,.26)!important;border-radius:1px!important;background:linear-gradient(102deg,rgba(20,18,21,.96),rgba(40,35,34,.92) 73%,rgba(91,63,45,.36))!important;clip-path:polygon(5% 0,100% 4%,95% 100%,0 92%)!important;filter:drop-shadow(0 5px 8px rgba(0,0,0,.34))!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency:after{content:'+'!important;right:6px!important;color:#e7d2a8!important;font:800 11px/1 ${FONT}!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-icon{width:18px!important;height:18px!important;border-radius:50%!important;color:#e4c17f!important;background:#252027!important;box-shadow:0 0 0 1px rgba(228,193,127,.52),inset 0 0 0 2px rgba(0,0,0,.18)!important;font-size:0!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency[data-v5-currency="embers"] .bb-home-v5-currency-icon{border-radius:4px!important;color:#f09c85!important;background:#332128!important;transform:rotate(2deg)}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-icon svg{display:block;width:14px;height:14px}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-copy small{font:700 4px/1 ${FONT}!important;letter-spacing:.16em!important;color:#c8b896!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-currency-copy strong{font:800 10px/1 ${FONT}!important;letter-spacing:.02em!important;color:#fff9ec!important;text-shadow:none!important}

#${SHELL_ID}.bb-home-v9 .bb-home-v5-leader{z-index:7!important;left:52%!important;right:auto!important;bottom:calc(var(--bb-home-v9-dock-h) - 7px)!important;width:min(46vw,300px)!important;height:min(43vh,400px)!important;opacity:1!important;filter:drop-shadow(0 18px 20px rgba(0,0,0,.43))!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-leader:before{left:52%!important;bottom:-1%!important;width:88%!important;height:17%!important;background:radial-gradient(ellipse,rgba(28,23,24,.62),rgba(98,70,48,.22) 42%,transparent 70%)!important;filter:blur(5px)!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-leader:after{content:'';position:absolute;z-index:0;left:48%;bottom:-3px;width:86%;height:27px;transform:translateX(-50%) skewX(-19deg);clip-path:polygon(6% 31%,100% 0,91% 100%,0 78%);background:linear-gradient(90deg,rgba(24,21,23,.92),rgba(126,93,59,.45) 72%,rgba(239,224,190,.18));border-bottom:1px solid rgba(226,201,151,.34);filter:drop-shadow(0 6px 7px rgba(0,0,0,.32))}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-leader img{z-index:1!important;object-fit:contain!important;object-position:center bottom!important;-webkit-mask-image:linear-gradient(180deg,#000 0 90%,rgba(0,0,0,.98) 96%,transparent 100%)!important;mask-image:linear-gradient(180deg,#000 0 90%,rgba(0,0,0,.98) 96%,transparent 100%)!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v5-leader-stamp{display:none!important}

#${SHELL_ID}.bb-home-v9 .bb-home-v4-dock{z-index:15!important;align-self:end!important;justify-self:center!important;width:min(680px,calc(100vw - 18px))!important;height:var(--bb-home-v9-dock-h)!important;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr)!important;grid-template-rows:repeat(3,1fr)!important;gap:2px 5px!important;padding:0 4px 5px!important;background:transparent!important;border:0!important;box-shadow:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-nav{min-height:0!important;height:auto!important;overflow:visible!important;filter:drop-shadow(0 6px 6px rgba(0,0,0,.34))!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-nav[data-nav="battle"]{grid-column:1!important;grid-row:1/4!important;transform:rotate(-1deg) scale(.92)!important;transform-origin:52% 56%!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-nav[data-nav="battle"] img{width:100%!important;height:100%!important;max-height:100%!important;object-fit:contain!important;transform:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-nav[data-nav="summon"]{grid-column:2!important;grid-row:1!important;transform:rotate(.35deg) translateX(-3px)!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-nav[data-nav="units"]{grid-column:2!important;grid-row:2!important;transform:rotate(-.2deg) translateX(2px)!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-nav[data-nav="forge"]{grid-column:2!important;grid-row:3!important;transform:rotate(.3deg) translateX(-1px)!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-nav[data-nav="summon"] img,#${SHELL_ID}.bb-home-v9 .bb-home-v4-nav[data-nav="units"] img,#${SHELL_ID}.bb-home-v9 .bb-home-v4-nav[data-nav="forge"] img{width:94%!important;height:94%!important;object-fit:contain!important;transform:none!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-nav:focus-visible{outline:2px solid rgba(232,211,170,.72)!important;outline-offset:1px!important}

#${SHELL_ID}.bb-home-v9 .bb-home-v4-utility{top:47%!important;gap:2px!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-util-btn{width:clamp(36px,6.1vw,46px)!important;height:clamp(43px,7.1vw,54px)!important;filter:drop-shadow(0 4px 5px rgba(0,0,0,.34)) sepia(.08)!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-social{top:clamp(79px,10.4vh,98px)!important;gap:4px!important}
#${SHELL_ID}.bb-home-v9 .bb-home-v4-social button{width:clamp(31px,5.4vw,40px)!important;height:clamp(31px,5.4vw,40px)!important;filter:sepia(.08) drop-shadow(0 4px 5px rgba(0,0,0,.3))!important}

#bbHomeProfileGate .bb-profile-card{border-color:rgba(232,211,170,.38)!important;background:linear-gradient(145deg,rgba(25,22,24,.98),rgba(53,45,40,.97) 70%,rgba(17,16,19,.99))!important;color:#fffaf1!important}
#bbHomeProfileGate small{font:700 8px/1 ${FONT}!important;letter-spacing:.24em!important;color:#d4c19d!important}
#bbHomeProfileGate h2{font:800 clamp(24px,7vw,36px)/1 ${FONT}!important;letter-spacing:.01em!important;color:#fffaf0!important}
#bbHomeProfileGate p{font:500 11px/1.5 ${FONT}!important;color:rgba(238,224,199,.72)!important}
#bbHomeProfileGate input{border-color:rgba(232,211,170,.28)!important;font:650 16px/1 ${FONT}!important}
#bbHomeProfileGate input:focus{border-color:#d1b77f!important;box-shadow:0 0 0 2px rgba(209,183,127,.14)!important}
#bbHomeProfileGate button{background:linear-gradient(135deg,#9d7a49,#5f4932)!important;font:800 12px/1 ${FONT}!important;letter-spacing:.12em!important}

@media(max-width:620px){
 #${SHELL_ID}.bb-home-v9{--bb-home-v9-dock-h:124px}
 #${SHELL_ID}.bb-home-v9 .bb-home-v5-leader{left:51%!important;bottom:116px!important;width:min(45vw,205px)!important;height:min(39vh,328px)!important}
 #${SHELL_ID}.bb-home-v9 .bb-home-v4-dock{width:calc(100vw - 14px)!important;gap:2px 3px!important;padding-left:2px!important;padding-right:3px!important}
 #${SHELL_ID}.bb-home-v9 .bb-home-v4-nav[data-nav="battle"]{transform:rotate(-.8deg) scale(.9)!important}
 #${SHELL_ID}.bb-home-v9 .bb-home-v4-nav[data-nav="summon"] img,#${SHELL_ID}.bb-home-v9 .bb-home-v4-nav[data-nav="units"] img,#${SHELL_ID}.bb-home-v9 .bb-home-v4-nav[data-nav="forge"] img{width:92%!important;height:92%!important}
 #${SHELL_ID}.bb-home-v9 .bb-home-v4-util-btn{width:37px!important;height:46px!important}
 #${SHELL_ID}.bb-home-v9 .bb-home-v4-social button{width:32px!important;height:32px!important}
}
@media(max-height:700px){
 #${SHELL_ID}.bb-home-v9{--bb-home-v9-dock-h:108px}
 #${SHELL_ID}.bb-home-v9 .bb-home-v5-leader{bottom:101px!important;height:min(36vh,285px)!important}
}
@media(prefers-reduced-motion:reduce){#${SHELL_ID}.bb-home-v9 *{transition:none!important}}
`;
 document.head.appendChild(style);
}

function syncCurrencies(shell){
 const coins=shell?.querySelector('[data-v5-currency="marks"]');
 const embers=shell?.querySelector('[data-v5-currency="embers"]');
 if(coins){
  coins.dataset.v5Currency='blazing-coins';
  coins.dataset.v9Currency='blazing-coins';
  const label=coins.querySelector('.bb-home-v5-currency-copy small');if(label)label.textContent='BLAZING COINS';
  const icon=coins.querySelector('.bb-home-v5-currency-icon');if(icon&&icon.dataset.v9Icon!=='coins'){icon.innerHTML=COIN_ICON;icon.dataset.v9Icon='coins';}
 }
 if(embers){
  embers.dataset.v9Currency='embers';
  const label=embers.querySelector('.bb-home-v5-currency-copy small');if(label)label.textContent='EMBERS';
  const icon=embers.querySelector('.bb-home-v5-currency-icon');if(icon&&icon.dataset.v9Icon!=='embers'){icon.innerHTML=EMBER_ICON;icon.dataset.v9Icon='embers';}
 }
}

function syncStructure(shell){
 if(!shell)return;
 const center=shell.querySelector('.bb-home-v4-center');
 if(center){center.hidden=true;center.setAttribute('aria-hidden','true');}
 syncCurrencies(shell);
}

function apply(){
 ensureStyle();
 const shell=document.getElementById(SHELL_ID);if(!shell)return false;
 shell.classList.add('bb-home-v9');
 shell.dataset.bbHomeLayout='v9-polish';
 shell.dataset.bbHomeCurrency='blazing-coins';
 syncStructure(shell);
 return true;
}

let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});}
window.addEventListener('bb:economy',schedule);
window.addEventListener('bb:player-profile',schedule);
window.addEventListener('bb:unit-progression',schedule);
window.addEventListener('pageshow',schedule);
window.addEventListener('resize',schedule,{passive:true});
document.addEventListener('click',event=>{if(document.getElementById('menuScreen')?.contains(event.target))setTimeout(schedule,0);},true);
new MutationObserver(records=>{
 const relevant=records.some(record=>record.target?.id===SHELL_ID||record.target?.id==='menuScreen'||[...record.addedNodes].some(node=>node?.nodeType===1&&(node.id===SHELL_ID||node.querySelector?.(`#${SHELL_ID}`))));
 if(relevant)schedule();
}).observe(document.body,{subtree:true,childList:true});
setTimeout(apply,0);setTimeout(apply,240);
window.BlazingHomeV9=Object.freeze({apply,syncCurrencies,syncStructure});
})();
