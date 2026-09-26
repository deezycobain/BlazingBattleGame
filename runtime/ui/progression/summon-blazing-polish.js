(()=>{
'use strict';
const STYLE_ID='bb-summon-blazing-polish-style';
const FONT='"Avenir Next",Avenir,"Helvetica Neue",Arial,sans-serif';
const CSS=`
/* Temporary card footer contract: element/type/origin return only when the real assets arrive. */
#summonPullScreen .bb-card-rarityplate,
#summonPullScreen .bb-card-elementplate,
#summonPullScreen .bb-card-classplate,
#summonPullScreen .bb-card-originplate{display:none!important;visibility:hidden!important}

/* Kill the comic/dev typography on the summon surface. */
#summonScreen,#summonScreen button,#summonScreen summary,#summonPullScreen,#summonPullScreen button,
#summonScreen .shopTitle,#summonPullScreen .shopTitle,#summonScreen .bb-legacy-banner-copy h1,
#summonScreen .bb-legacy-pool-head strong,#summonScreen .bb-banner-roster span,
#summonPullScreen .bb-card-nameplate,#summonPullScreen .largePullCounter,
#summonPullScreen #pullCounter,#summonPullScreen #pullResultsTitle{font-family:${FONT}!important}
#summonScreen .shopTitle,#summonPullScreen .shopTitle{font-size:clamp(23px,6vw,31px)!important;font-weight:900!important;letter-spacing:.12em!important;text-transform:uppercase!important;font-style:normal!important}

/* Warmer Naruto-Blazing-inspired shell without cloning its exact UI. */
#summonScreen .summonShopShell{background:
 linear-gradient(rgba(242,222,177,.86),rgba(228,198,139,.86)),
 linear-gradient(45deg,rgba(150,78,34,.055) 25%,transparent 25%,transparent 75%,rgba(150,78,34,.055) 75%),
 linear-gradient(45deg,rgba(150,78,34,.055) 25%,transparent 25%,transparent 75%,rgba(150,78,34,.055) 75%)!important;background-size:auto,28px 28px,28px 28px!important;background-position:0 0,0 0,14px 14px!important}
#summonScreen .summonShopHeader{border-bottom:3px solid #392516!important;background:linear-gradient(180deg,#f5dfad 0%,#dcaa58 100%)!important;box-shadow:0 3px 0 #8d5324,0 8px 18px rgba(56,30,14,.24)!important}
#summonScreen .emberBox{border:2px solid #54351f!important;background:linear-gradient(180deg,#ffe59a,#d89b38)!important;border-radius:8px!important;box-shadow:inset 0 0 0 2px rgba(255,246,206,.5),0 3px 0 #754216!important}

#summonScreen .bb-summon-lobby.bb-legacy-lobby{display:flex!important;flex-direction:column!important;gap:10px!important;padding:14px 10px 26px!important}

/* Top banner selector, echoing the small summon-carousel cards from Naruto Blazing. */
#summonScreen .bb-banner-switcher{order:0;display:grid;grid-template-columns:1fr 1fr .72fr;gap:7px;padding:0 2px 2px}
#summonScreen .bb-banner-tab{position:relative;min-height:52px;padding:7px 9px;border:2px solid #5b3820;border-radius:7px;background:linear-gradient(180deg,#7d3e28,#351d18);color:#f8e8b8;box-shadow:inset 0 0 0 2px rgba(255,230,168,.1),0 3px 0 #3a2418;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;overflow:hidden}
#summonScreen .bb-banner-tab:before{content:'';position:absolute;inset:0;background:linear-gradient(125deg,rgba(255,207,104,.20),transparent 44%);pointer-events:none}
#summonScreen .bb-banner-tab strong{position:relative;display:block;font-size:10px;line-height:1.05}
#summonScreen .bb-banner-tab span{position:relative;display:block;margin-top:3px;font-size:6px;letter-spacing:.13em;opacity:.72}
#summonScreen .bb-banner-tab.active{border-color:#f3c757;background:linear-gradient(180deg,#c76a2c,#6f271c);box-shadow:inset 0 0 0 2px rgba(255,241,184,.28),0 0 0 2px #2d1d16,0 4px 0 #7b431c,0 7px 12px rgba(76,31,12,.26)}
#summonScreen .bb-banner-tab[disabled]{filter:saturate(.25);opacity:.48}

/* One dominant hero, not a stack of equally loud boxes. */
#summonScreen .bb-legacy-banner{order:1;position:relative;overflow:hidden;min-height:clamp(292px,49vw,365px)!important;border:3px solid #3b2719!important;border-radius:8px!important;background:#171211!important;box-shadow:inset 0 0 0 2px rgba(255,226,158,.30),0 5px 0 #8c4c22,0 12px 22px rgba(52,27,13,.30)!important}
#summonScreen .bb-legacy-banner:after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(4,4,7,.92) 0%,rgba(8,7,10,.72) 34%,rgba(8,7,10,.18) 62%,rgba(8,7,10,.05) 100%),linear-gradient(0deg,rgba(49,10,8,.46),transparent 42%);z-index:2}
#summonScreen .bb-legacy-art-stack{position:absolute!important;inset:0!important;z-index:1!important;display:flex!important;justify-content:flex-end!important;align-items:stretch!important;overflow:hidden!important}
#summonScreen .bb-legacy-art-stack img{position:relative!important;width:34%!important;height:100%!important;object-fit:cover!important;object-position:center 25%!important;margin-left:-7%!important;filter:saturate(.98) contrast(1.04)!important}
#summonScreen .bb-legacy-art-stack img:first-child{margin-left:0!important}
#summonScreen .bb-legacy-banner-copy{position:relative!important;z-index:3!important;width:min(58%,390px)!important;padding:clamp(24px,5vw,36px) clamp(15px,3vw,25px)!important;color:#fff4d6!important;background:none!important;border:0!important;box-shadow:none!important}
#summonScreen .bb-legacy-banner-copy .bb-banner-kicker{display:block!important;margin:0 0 9px!important;color:#f0c467!important;font-size:7px!important;font-weight:900!important;letter-spacing:.20em!important;text-transform:uppercase!important}
#summonScreen .bb-legacy-banner-copy h1{margin:0!important;color:#fff5db!important;font-size:clamp(31px,7vw,52px)!important;font-weight:950!important;line-height:.88!important;letter-spacing:-.045em!important;text-transform:uppercase!important;text-shadow:0 3px 0 rgba(0,0,0,.48),0 0 18px rgba(0,0,0,.42)!important}
#summonScreen .bb-legacy-banner-copy h1 span{color:#df5338!important}
#summonScreen .bb-legacy-banner-copy p{display:none!important}
#summonScreen .bb-legacy-banner-stamp{display:inline-flex!important;margin-top:17px!important;padding:7px 10px!important;border:1px solid rgba(244,205,115,.78)!important;background:rgba(20,13,12,.72)!important;color:#f6daa0!important;font-size:7px!important;font-weight:900!important;letter-spacing:.15em!important;border-radius:2px!important}

/* Itachi becomes a selectable banner instead of a detached black dev button. */
#summonScreen .bb-summon-lobby[data-bb-banner-mode="itachi"] .bb-legacy-banner{background-image:linear-gradient(90deg,rgba(5,1,3,.92),rgba(17,2,5,.38) 58%,rgba(17,2,5,.08)),url("assets/characters/itachi/art/itachi_full_art.png")!important;background-size:cover!important;background-position:center 28%!important}
#summonScreen .bb-summon-lobby[data-bb-banner-mode="itachi"] .bb-legacy-art-stack{display:none!important}
#summonScreen .bb-summon-lobby[data-bb-banner-mode="itachi"] .bb-legacy-banner:after{background:linear-gradient(90deg,rgba(5,1,3,.92),rgba(42,2,12,.56) 43%,rgba(42,2,12,.08) 76%)!important}
#summonScreen .bb-summon-lobby[data-bb-banner-mode="itachi"] .bb-legacy-banner-copy h1 span{color:#ef4250!important}

/* Main screen no longer shows the giant fighter-chip block. It lives inside details. */
#summonScreen .bb-legacy-pool{display:none!important}
#summonScreen .bb-banner-details[open] .bb-legacy-pool{display:block!important;margin-top:8px!important;padding:8px!important;border:1px solid rgba(85,52,28,.28)!important;background:rgba(255,241,204,.45)!important;border-radius:6px!important}
#summonScreen .bb-legacy-pool-head{display:flex!important;justify-content:space-between!important;gap:8px!important;margin-bottom:6px!important}
#summonScreen .bb-legacy-pool-head strong{font-size:8px!important;font-weight:900!important;letter-spacing:.10em!important}
#summonScreen .bb-legacy-pool-head span{font-size:6px!important}
#summonScreen .bb-legacy-pool .bb-banner-roster{display:flex!important;gap:5px!important;overflow-x:auto!important;padding-bottom:2px!important}
#summonScreen .bb-legacy-pool .bb-banner-roster span{flex:0 0 auto!important;min-width:75px!important;padding:5px 7px!important;border:1px solid rgba(95,59,32,.34)!important;border-radius:4px!important;background:rgba(255,249,227,.80)!important;color:#3d2a1d!important;font-size:6px!important;font-weight:850!important;letter-spacing:.07em!important}
#summonScreen .bb-resonance-path{display:none!important}

/* Gold/ink summon controls directly beneath the banner. */
#summonScreen .bb-summon-actions{order:2!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;padding:2px 5px 6px!important;background:none!important;border:0!important;box-shadow:none!important}
#summonScreen .bb-summon-actions>button{position:relative;min-height:78px!important;border:3px solid #3f2918!important;border-radius:18px 18px 13px 13px!important;background:linear-gradient(180deg,#fff0a8 0%,#f6c844 48%,#dd8d20 100%)!important;color:#2f2117!important;box-shadow:inset 0 0 0 2px rgba(255,255,255,.46),0 4px 0 #7b451b,0 8px 14px rgba(61,31,12,.22)!important;text-shadow:0 1px rgba(255,252,221,.7)!important;font-weight:900!important;letter-spacing:.025em!important}
#summonScreen .bb-summon-actions>button strong{font-family:${FONT}!important;font-size:clamp(20px,5.3vw,29px)!important;font-weight:900!important;letter-spacing:.01em!important}
#summonScreen .bb-summon-actions>button span{font-family:${FONT}!important;font-size:8px!important;font-weight:800!important;letter-spacing:.12em!important}
#summonScreen .bb-summon-actions>button em{display:block!important;margin-top:2px!important;font-family:${FONT}!important;font-size:6px!important;font-style:normal!important;letter-spacing:.12em!important;color:#6c3d1b!important}
#summonScreen .bb-summon-lobby[data-bb-banner-mode="legacy"] .bb-itachi-dev-summon{display:none!important}
#summonScreen .bb-summon-lobby[data-bb-banner-mode="itachi"] .bb-summon-actions>button:not(.bb-itachi-dev-summon){display:none!important}
#summonScreen .bb-summon-lobby[data-bb-banner-mode="itachi"] .bb-itachi-dev-summon{display:block!important;grid-column:1/-1!important;min-height:82px!important;background:linear-gradient(180deg,#ffe290,#de8c31 46%,#9f2d25 100%)!important;color:#291713!important}
#summonScreen .bb-summon-lobby[data-bb-banner-mode="itachi"] .bb-itachi-dev-summon strong{font-family:${FONT}!important;font-size:22px!important;font-weight:950!important;color:#291713!important;letter-spacing:.05em!important}
#summonScreen .bb-itachi-dev-summon span{display:block!important;color:#53211b!important}

/* Small Blazing-like detail controls after summon actions. */
#summonScreen .bb-summon-secondary{order:3!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;padding:5px!important;background:none!important;border:0!important;box-shadow:none!important}
#summonScreen .bb-banner-details,#summonScreen .bb-forge-launch{min-height:40px!important;border:2px solid #4b301c!important;border-radius:16px!important;background:linear-gradient(180deg,#eff4d8,#a9d4cf)!important;color:#2e3027!important;box-shadow:0 3px 0 #6b4c2e!important}
#summonScreen .bb-banner-details{grid-column:1/2!important;padding:0!important}
#summonScreen .bb-banner-details summary{display:flex!important;align-items:center!important;justify-content:center!important;min-height:36px!important;padding:0 8px!important;font-size:8px!important;font-weight:900!important;letter-spacing:.10em!important;cursor:pointer!important;list-style:none!important}
#summonScreen .bb-banner-details summary::-webkit-details-marker{display:none!important}
#summonScreen .bb-banner-details>p{padding:0 10px 8px!important;margin:0!important;font-size:8px!important;line-height:1.45!important}
#summonScreen .bb-forge-launch{grid-column:2/3!important;padding:0 10px!important;font-family:${FONT}!important;font-size:8px!important;font-weight:900!important;letter-spacing:.10em!important}

/* Keep Ember Exchange visibly secondary. */
#summonScreen .emberExchange,#summonScreen .bb-ember-exchange{margin-top:22px!important;filter:saturate(.78)!important}

/* Home quick-banner remains a compact event strip. */
#bbHomeApproved.bb-home-v9 .bb-home-v9-legacy-banner{width:clamp(150px,24vw,205px)!important;aspect-ratio:2.15/1!important;bottom:calc(var(--bb-home-v9-dock-h) + 58px)!important;border-radius:5px 2px 5px 2px!important;background-image:linear-gradient(90deg,rgba(9,10,15,.90),rgba(9,10,15,.34) 62%,rgba(9,10,15,.12)),url("assets/characters/kakashi/cards/legacy_summon_art.png")!important;background-position:center 27%!important;background-size:cover!important;box-shadow:0 8px 18px rgba(0,0,0,.36),inset 0 0 0 1px rgba(255,238,197,.10)!important}
#bbHomeApproved.bb-home-v9 .bb-home-v9-legacy-banner:before{font-family:${FONT}!important;font-size:5px!important;letter-spacing:.12em!important;padding:3px 4px!important}
#bbHomeApproved.bb-home-v9 .bb-home-v9-legacy-copy{left:7px!important;right:7px!important;bottom:6px!important}
#bbHomeApproved.bb-home-v9 .bb-home-v9-legacy-copy strong{font-family:${FONT}!important;font-size:9px!important;font-weight:900!important;letter-spacing:.045em!important}
#bbHomeApproved.bb-home-v9 .bb-home-v9-legacy-copy span{font-family:${FONT}!important;font-size:5px!important;letter-spacing:.10em!important}

/* Itachi ring kinetics: approved duration, visible deceleration before blackout. */
@keyframes bbItachiOrnateExtended{0%{opacity:0;transform:translate3d(-50%,-50%,0) rotate(-8deg) scale(.9)}8.53%{opacity:.58;transform:translate3d(-50%,-50%,0) rotate(-2deg) scale(.92)}18%{opacity:.68;transform:translate3d(-50%,-50%,0) rotate(12deg) scale(.945)}27.47%{opacity:.74;transform:translate3d(-50%,-50%,0) rotate(38deg) scale(.97)}36.95%{opacity:.68;transform:translate3d(-50%,-50%,0) rotate(78deg) scale(.988)}47.37%{opacity:.68;transform:translate3d(-50%,-50%,0) rotate(136deg) scale(1)}73.68%{opacity:.64;transform:translate3d(-50%,-50%,0) rotate(216deg) scale(1)}86%{opacity:.56;transform:translate3d(-50%,-50%,0) rotate(246deg) scale(1)}93%{opacity:.40;transform:translate3d(-50%,-50%,0) rotate(255deg) scale(1)}97.5%{opacity:.20;transform:translate3d(-50%,-50%,0) rotate(259deg) scale(1)}100%{opacity:0;transform:translate3d(-50%,-50%,0) rotate(261deg) scale(1)}}
@keyframes bbItachiOuterExtended{0%{opacity:0;transform:translate3d(-50%,-50%,0) rotate(8deg) scale(.92)}8.2%{opacity:.52;transform:translate3d(-50%,-50%,0) rotate(1deg) scale(.935)}17.41%{opacity:.66;transform:translate3d(-50%,-50%,0) rotate(-18deg) scale(.952)}26.63%{opacity:.76;transform:translate3d(-50%,-50%,0) rotate(-54deg) scale(.97)}35.85%{opacity:.82;transform:translate3d(-50%,-50%,0) rotate(-108deg) scale(.985)}44.05%{opacity:.78;transform:translate3d(-50%,-50%,0) rotate(-180deg) scale(.996)}51.22%{opacity:.78;transform:translate3d(-50%,-50%,0) rotate(-266deg) scale(1)}75%{opacity:.72;transform:translate3d(-50%,-50%,0) rotate(-393deg) scale(1)}86%{opacity:.58;transform:translate3d(-50%,-50%,0) rotate(-425deg) scale(1)}93%{opacity:.40;transform:translate3d(-50%,-50%,0) rotate(-437deg) scale(1)}97.5%{opacity:.20;transform:translate3d(-50%,-50%,0) rotate(-442deg) scale(1)}100%{opacity:0;transform:translate3d(-50%,-50%,0) rotate(-444deg) scale(1)}}
@keyframes bbItachiEnergyExtended{0%{opacity:0;transform:translate3d(-50%,-50%,0) rotate(-12deg) scale(.9)}7.77%{opacity:.38;transform:translate3d(-50%,-50%,0) rotate(-3deg) scale(.92)}16.41%{opacity:.56;transform:translate3d(-50%,-50%,0) rotate(25deg) scale(.944)}25.05%{opacity:.72;transform:translate3d(-50%,-50%,0) rotate(78deg) scale(.968)}33.68%{opacity:.82;transform:translate3d(-50%,-50%,0) rotate(164deg) scale(.988)}43.18%{opacity:.82;transform:translate3d(-50%,-50%,0) rotate(292deg) scale(1)}65%{opacity:.76;transform:translate3d(-50%,-50%,0) rotate(446deg) scale(1)}82%{opacity:.58;transform:translate3d(-50%,-50%,0) rotate(520deg) scale(1)}91%{opacity:.42;transform:translate3d(-50%,-50%,0) rotate(545deg) scale(1)}97%{opacity:.22;transform:translate3d(-50%,-50%,0) rotate(553deg) scale(1)}100%{opacity:0;transform:translate3d(-50%,-50%,0) rotate(556deg) scale(1)}}

@media(max-width:700px){
 #summonScreen .bb-summon-lobby.bb-legacy-lobby{padding:12px 8px 24px!important;gap:9px!important}
 #summonScreen .bb-banner-switcher{gap:5px!important}
 #summonScreen .bb-banner-tab{min-height:48px!important;padding:6px!important}
 #summonScreen .bb-legacy-banner{min-height:300px!important}
 #summonScreen .bb-legacy-banner-copy{width:61%!important;padding:24px 13px!important}
 #summonScreen .bb-legacy-banner-copy h1{font-size:clamp(29px,8.4vw,38px)!important}
 #summonScreen .bb-summon-actions>button{min-height:74px!important}
 #bbHomeApproved.bb-home-v9 .bb-home-v9-legacy-banner{width:clamp(142px,39vw,178px)!important;bottom:calc(var(--bb-home-v9-dock-h) + 54px)!important}
}
`;

const BANNERS={
 legacy:{kicker:'FEATURED SUMMON',title:'LEGACY OF THE<br><span>SHINOBI</span>',stamp:'12 UNIT EVENT POOL',label:'Legacy of the Shinobi featured summon banner'},
 itachi:{kicker:'LEGENDARY CINEMATIC',title:'LEGENDARY<br><span>ITACHI</span>',stamp:'SPECIAL FEATURED SUMMON',label:'Legendary Itachi special summon banner'}
};

function ensureStyle(){
 let style=document.getElementById(STYLE_ID);
 if(!style){style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS;document.head.append(style)}
}
function setBannerMode(mode){
 const lobby=document.querySelector('#summonScreen .bb-summon-lobby');if(!lobby)return;
 const config=BANNERS[mode]||BANNERS.legacy;lobby.dataset.bbBannerMode=mode in BANNERS?mode:'legacy';
 lobby.querySelectorAll('.bb-banner-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.banner===lobby.dataset.bbBannerMode));
 const banner=lobby.querySelector('.bb-legacy-banner'),kicker=lobby.querySelector('.bb-banner-kicker'),title=lobby.querySelector('.bb-legacy-banner-copy h1'),stamp=lobby.querySelector('.bb-legacy-banner-stamp');
 if(banner)banner.setAttribute('aria-label',config.label);if(kicker)kicker.textContent=config.kicker;if(title)title.innerHTML=config.title;if(stamp)stamp.textContent=config.stamp;
}
function ensureStructure(){
 const lobby=document.querySelector('#summonScreen .bb-summon-lobby');if(!lobby)return false;
 if(!lobby.querySelector('.bb-banner-switcher')){
  const switcher=document.createElement('nav');switcher.className='bb-banner-switcher';switcher.setAttribute('aria-label','Summon banners');
  switcher.innerHTML='<button class="bb-banner-tab active" type="button" data-banner="legacy"><strong>Legacy Shinobi</strong><span>12 Fighter Event</span></button><button class="bb-banner-tab" type="button" data-banner="itachi"><strong>Legendary Itachi</strong><span>Cinematic Summon</span></button><button class="bb-banner-tab" type="button" disabled><strong>Next Banner</strong><span>Coming Soon</span></button>';
  lobby.prepend(switcher);switcher.addEventListener('click',ev=>{const btn=ev.target.closest('[data-banner]');if(btn&&!btn.disabled)setBannerMode(btn.dataset.banner)});
 }
 const details=lobby.querySelector('.bb-banner-details'),pool=lobby.querySelector('.bb-legacy-pool');
 if(details&&pool&&pool.parentElement!==details)details.append(pool);
 if(!lobby.dataset.bbBannerMode)setBannerMode('legacy');
 return true;
}
function boot(){ensureStyle();if(!ensureStructure()){setTimeout(boot,120);return}}
boot();
window.addEventListener('pageshow',()=>{ensureStyle();ensureStructure()},{passive:true});
})();
