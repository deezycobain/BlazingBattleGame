(()=>{
'use strict';
const SHELL='bbHomeApproved',STYLE='bb-home-sanctuary-entry-style',ASSET='assets/ui/sanctuary/first-bloom/ui/home-button/sanctuary_home_button.png';
function ensureStyle(){if(document.getElementById(STYLE))return;const s=document.createElement('style');s.id=STYLE;s.textContent=`
#${SHELL}.bb-home-v9 .bb-home-v4-dock{height:clamp(176px,24vh,214px)!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-template-rows:repeat(3,minmax(0,1fr))!important;gap:3px 10px!important;bottom:18px!important}
#${SHELL}.bb-home-v9 .bb-home-v4-nav[data-nav="battle"]{grid-column:1!important;grid-row:1!important;transform:rotate(-.5deg)!important}
#${SHELL}.bb-home-v9 .bb-home-v4-nav[data-nav="summon"]{grid-column:2!important;grid-row:1!important;transform:rotate(.3deg)!important}
#${SHELL}.bb-home-v9 .bb-home-v4-nav[data-nav="units"]{grid-column:1!important;grid-row:2!important;transform:rotate(-.2deg)!important}
#${SHELL}.bb-home-v9 .bb-home-v4-nav[data-nav="forge"]{grid-column:2!important;grid-row:2!important;transform:rotate(.25deg)!important}
#${SHELL}.bb-home-v9 .bb-home-v4-nav[data-nav="sanctuary"]{grid-column:1/3!important;grid-row:3!important;width:76%!important;height:100%!important;place-self:center!important;transform:rotate(-.15deg)!important;filter:drop-shadow(0 6px 7px rgba(0,0,0,.42))!important}
#${SHELL}.bb-home-v9 .bb-home-v4-nav[data-nav="sanctuary"] img{width:100%!important;height:100%!important;object-fit:contain!important;transform:none!important}
@media(max-width:430px){#${SHELL}.bb-home-v9 .bb-home-v4-dock{height:180px!important;bottom:22px!important;gap:2px 7px!important}#${SHELL}.bb-home-v9 .bb-home-v4-nav[data-nav="sanctuary"]{width:82%!important}}
@media(max-height:700px) and (max-width:620px){#${SHELL}.bb-home-v9 .bb-home-v4-dock{height:158px!important;bottom:15px!important}}
`;document.head.appendChild(s)}
function apply(){ensureStyle();const shell=document.getElementById(SHELL),dock=shell?.querySelector('.bb-home-v4-dock');if(!dock)return false;let button=dock.querySelector('[data-nav="sanctuary"]');if(!button){button=document.createElement('button');button.className='bb-home-v4-nav bb-home-sanctuary-entry';button.type='button';button.dataset.nav='sanctuary';button.setAttribute('aria-label','Enter Sanctuary');button.innerHTML=`<img src="${ASSET}" alt="" draggable="false"><span class="bb-home-v4-sr">Sanctuary</span>`;button.addEventListener('click',()=>{location.href='sanctuary.html'});dock.appendChild(button)}shell.dataset.bbSanctuaryEntry='first-bloom';return true}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});window.addEventListener('pageshow',schedule);setTimeout(apply,0);setTimeout(apply,300);window.BlazingSanctuaryHome=Object.freeze({apply});
})();
