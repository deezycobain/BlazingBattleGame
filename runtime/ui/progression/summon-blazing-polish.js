(()=>{
'use strict';
const STYLE_ID='bb-summon-blazing-polish-style';
const FONT='Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
const CSS=`
/* Temporary clean-card contract: real element medallion assets will replace these hidden overlays. */
#summonPullScreen .bb-card-rarityplate,
#summonPullScreen .bb-card-elementplate,
#summonPullScreen .bb-card-classplate,
#summonPullScreen .bb-card-originplate{display:none!important;visibility:hidden!important}

/* Keep the approved fighter name plate, but remove the comic/brush typography from the summon shell. */
#summonScreen .shopTitle,#summonPullScreen .shopTitle,
#summonScreen .bb-legacy-banner-copy h1,
#summonScreen .bb-legacy-pool-head strong,
#summonScreen .bb-banner-roster span,
#summonScreen .bb-summon-actions button,
#summonScreen .bb-summon-secondary button,
#summonScreen .bb-banner-details summary,
#summonPullScreen .bb-card-nameplate,
#summonPullScreen .largePullCounter,
#summonPullScreen #pullCounter,
#summonPullScreen #pullResultsTitle{font-family:${FONT}!important}
#summonScreen .shopTitle,#summonPullScreen .shopTitle{font-weight:900!important;font-size:clamp(20px,5.7vw,29px)!important;letter-spacing:.08em!important;text-transform:uppercase!important}

/* Blazing-inspired hierarchy: one featured banner, compact contents strip, strong gold summon actions. */
#summonScreen .bb-summon-lobby.bb-legacy-lobby{display:flex!important;flex-direction:column!important;gap:10px!important;padding:10px 10px 24px!important}
#summonScreen .bb-legacy-banner{min-height:clamp(226px,39vw,292px)!important;border-radius:7px 2px 7px 2px!important;box-shadow:0 9px 20px rgba(35,25,18,.24),inset 0 0 0 1px rgba(255,235,191,.16)!important}
#summonScreen .bb-legacy-banner-copy{width:min(61%,420px)!important;padding:clamp(20px,4vw,29px) clamp(15px,3vw,24px)!important}
#summonScreen .bb-legacy-banner-copy .bb-banner-kicker{display:none!important}
#summonScreen .bb-legacy-banner-copy h1{font-weight:950!important;line-height:.92!important;letter-spacing:-.045em!important;text-transform:uppercase!important;font-size:clamp(28px,6.3vw,48px)!important}
#summonScreen .bb-legacy-banner-copy p{display:none!important}
#summonScreen .bb-legacy-banner-stamp{margin-top:14px!important;font-family:${FONT}!important;font-size:7px!important;letter-spacing:.16em!important;border-radius:2px!important}
#summonScreen .bb-legacy-pool{order:2!important;padding:9px 10px!important;border-radius:5px 2px 5px 2px!important}
#summonScreen .bb-legacy-pool-head{margin-bottom:6px!important}
#summonScreen .bb-legacy-pool-head strong{font-size:10px!important;font-weight:900!important;letter-spacing:.08em!important}
#summonScreen .bb-legacy-pool-head span{font-size:6px!important}
#summonScreen .bb-legacy-pool .bb-banner-roster{display:flex!important;flex-wrap:nowrap!important;gap:5px!important;overflow-x:auto!important;overflow-y:hidden!important;scroll-snap-type:x proximity!important;padding-bottom:2px!important}
#summonScreen .bb-legacy-pool .bb-banner-roster span{flex:0 0 auto!important;min-width:82px!important;padding:6px 8px!important;border:1px solid rgba(110,83,50,.34)!important;border-radius:3px!important;background:rgba(255,248,229,.82)!important;color:#413327!important;font-size:7px!important;font-weight:850!important;letter-spacing:.08em!important;scroll-snap-align:start!important}
#summonScreen .bb-resonance-path{display:none!important}
#summonScreen .bb-summon-actions{order:3!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:9px!important;padding:10px!important;border-radius:6px 2px 6px 2px!important}
#summonScreen .bb-summon-actions>button:not(.bb-itachi-dev-summon){min-height:72px!important;border:1px solid #76511d!important;border-radius:7px 3px 7px 3px!important;background:linear-gradient(180deg,#ffe39a 0%,#e8b950 57%,#c98c2d 100%)!important;color:#3b2918!important;box-shadow:inset 0 2px rgba(255,255,255,.64),inset 0 -3px rgba(104,62,15,.18),0 4px 0 #76511d,0 8px 15px rgba(64,43,19,.20)!important;text-shadow:0 1px rgba(255,248,218,.72)!important;font-weight:950!important;letter-spacing:.035em!important}
#summonScreen .bb-summon-actions>button:not(.bb-itachi-dev-summon) strong{font-family:${FONT}!important;font-weight:950!important;letter-spacing:.02em!important}
#summonScreen .bb-summon-actions>button:not(.bb-itachi-dev-summon) span{font-family:${FONT}!important;font-size:9px!important;font-weight:750!important;letter-spacing:.08em!important}
#summonScreen .bb-itachi-dev-summon{grid-column:1/-1!important;order:4!important;min-height:45px!important;padding:7px 12px!important;border-radius:5px!important;background:linear-gradient(180deg,#2a1515,#160d0e)!important;box-shadow:inset 0 1px rgba(255,230,184,.12),0 3px 0 #5f3426!important}
#summonScreen .bb-itachi-dev-summon strong{font-family:${FONT}!important;font-size:10px!important;font-weight:900!important;letter-spacing:.11em!important;color:#eac77e!important}
#summonScreen .bb-itachi-dev-summon span{display:none!important}
#summonScreen .bb-summon-secondary{order:5!important;padding:8px!important;border-radius:5px 2px 5px 2px!important}
#summonScreen .bb-forge-launch{min-height:38px!important;font-family:${FONT}!important;font-size:9px!important;letter-spacing:.10em!important}

/* Home quick-banner: use live name-free art and make it a compact event strip instead of a floating square. */
#bbHomeApproved.bb-home-v9 .bb-home-v9-legacy-banner{width:clamp(150px,24vw,205px)!important;aspect-ratio:2.15/1!important;bottom:calc(var(--bb-home-v9-dock-h) + 58px)!important;border-radius:5px 2px 5px 2px!important;background-image:linear-gradient(90deg,rgba(9,10,15,.90),rgba(9,10,15,.34) 62%,rgba(9,10,15,.12)),url("assets/characters/kakashi/cards/legacy_summon_art.png")!important;background-position:center 27%!important;background-size:cover!important;box-shadow:0 8px 18px rgba(0,0,0,.36),inset 0 0 0 1px rgba(255,238,197,.10)!important}
#bbHomeApproved.bb-home-v9 .bb-home-v9-legacy-banner:before{font-family:${FONT}!important;font-size:5px!important;letter-spacing:.12em!important;padding:3px 4px!important}
#bbHomeApproved.bb-home-v9 .bb-home-v9-legacy-copy{left:7px!important;right:7px!important;bottom:6px!important}
#bbHomeApproved.bb-home-v9 .bb-home-v9-legacy-copy strong{font-family:${FONT}!important;font-size:9px!important;font-weight:900!important;letter-spacing:.045em!important}
#bbHomeApproved.bb-home-v9 .bb-home-v9-legacy-copy span{font-family:${FONT}!important;font-size:5px!important;letter-spacing:.10em!important}

/* Itachi ring kinetics: keep the approved duration, but visibly bleed rotational speed before the stop/black transition. */
@keyframes bbItachiOrnateExtended{0%{opacity:0;transform:translate3d(-50%,-50%,0) rotate(-8deg) scale(.9)}8.53%{opacity:.58;transform:translate3d(-50%,-50%,0) rotate(-2deg) scale(.92)}18%{opacity:.68;transform:translate3d(-50%,-50%,0) rotate(12deg) scale(.945)}27.47%{opacity:.74;transform:translate3d(-50%,-50%,0) rotate(38deg) scale(.97)}36.95%{opacity:.68;transform:translate3d(-50%,-50%,0) rotate(78deg) scale(.988)}47.37%{opacity:.68;transform:translate3d(-50%,-50%,0) rotate(136deg) scale(1)}73.68%{opacity:.64;transform:translate3d(-50%,-50%,0) rotate(216deg) scale(1)}88%{opacity:.48;transform:translate3d(-50%,-50%,0) rotate(250deg) scale(1)}95%{opacity:.28;transform:translate3d(-50%,-50%,0) rotate(258deg) scale(1)}100%{opacity:0;transform:translate3d(-50%,-50%,0) rotate(262deg) scale(1)}}
@keyframes bbItachiOuterExtended{0%{opacity:0;transform:translate3d(-50%,-50%,0) rotate(8deg) scale(.92)}8.2%{opacity:.52;transform:translate3d(-50%,-50%,0) rotate(1deg) scale(.935)}17.41%{opacity:.66;transform:translate3d(-50%,-50%,0) rotate(-18deg) scale(.952)}26.63%{opacity:.76;transform:translate3d(-50%,-50%,0) rotate(-54deg) scale(.97)}35.85%{opacity:.82;transform:translate3d(-50%,-50%,0) rotate(-108deg) scale(.985)}44.05%{opacity:.78;transform:translate3d(-50%,-50%,0) rotate(-180deg) scale(.996)}51.22%{opacity:.78;transform:translate3d(-50%,-50%,0) rotate(-266deg) scale(1)}75%{opacity:.72;transform:translate3d(-50%,-50%,0) rotate(-393deg) scale(1)}88%{opacity:.50;transform:translate3d(-50%,-50%,0) rotate(-430deg) scale(1)}95%{opacity:.28;transform:translate3d(-50%,-50%,0) rotate(-441deg) scale(1)}100%{opacity:0;transform:translate3d(-50%,-50%,0) rotate(-446deg) scale(1)}}
@keyframes bbItachiEnergyExtended{0%{opacity:0;transform:translate3d(-50%,-50%,0) rotate(-12deg) scale(.9)}7.77%{opacity:.38;transform:translate3d(-50%,-50%,0) rotate(-3deg) scale(.92)}16.41%{opacity:.56;transform:translate3d(-50%,-50%,0) rotate(25deg) scale(.944)}25.05%{opacity:.72;transform:translate3d(-50%,-50%,0) rotate(78deg) scale(.968)}33.68%{opacity:.82;transform:translate3d(-50%,-50%,0) rotate(164deg) scale(.988)}43.18%{opacity:.82;transform:translate3d(-50%,-50%,0) rotate(292deg) scale(1)}65%{opacity:.76;transform:translate3d(-50%,-50%,0) rotate(446deg) scale(1)}82%{opacity:.54;transform:translate3d(-50%,-50%,0) rotate(520deg) scale(1)}92%{opacity:.34;transform:translate3d(-50%,-50%,0) rotate(548deg) scale(1)}100%{opacity:0;transform:translate3d(-50%,-50%,0) rotate(558deg) scale(1)}}

@media(max-width:700px){
 #summonScreen .bb-legacy-banner{min-height:228px!important}
 #summonScreen .bb-legacy-banner-copy{width:65%!important;padding:18px 13px!important}
 #summonScreen .bb-legacy-banner-copy h1{font-size:clamp(26px,8vw,34px)!important}
 #summonScreen .bb-legacy-pool .bb-banner-roster span{min-width:78px!important}
 #summonScreen .bb-summon-actions>button:not(.bb-itachi-dev-summon){min-height:68px!important}
 #bbHomeApproved.bb-home-v9 .bb-home-v9-legacy-banner{width:clamp(142px,39vw,178px)!important;bottom:calc(var(--bb-home-v9-dock-h) + 54px)!important}
}
`;
function ensureStyle(){
 let style=document.getElementById(STYLE_ID);
 if(!style){style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS;document.head.append(style)}
 const itachi=document.querySelector('link[data-bb-itachi-summon]');
 if(itachi&&itachi.compareDocumentPosition(style)&Node.DOCUMENT_POSITION_PRECEDING)document.head.append(style);
}
ensureStyle();
const headObserver=new MutationObserver(()=>ensureStyle());
headObserver.observe(document.head,{childList:true});
window.addEventListener('pageshow',ensureStyle,{passive:true});
})();
