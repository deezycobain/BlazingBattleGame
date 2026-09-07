(()=>{
'use strict';

const STYLE_ID='bb-home-approved-v4-style';
const SHELL_ID='bbHomeApproved';
const ASSET='assets/ui/home/';
const $=id=>document.getElementById(id);
const copy=el=>String(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
const visible=el=>{if(!el||el.hidden)return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';};

function findHome(){
 const direct=$('menuScreen');
 if(direct&&visible(direct))return direct;
 const candidates=[...document.querySelectorAll('.screen,section,main,[role="main"],body>div')].filter(visible);
 return candidates.find(el=>/SELECT\s+YOUR\s+PATH/i.test(copy(el))&&/(?:LEVEL\s*1|BLAZING\s+ROAD)/i.test(copy(el)))||null;
}

function installStyle(){
 if($(STYLE_ID))return;
 for(const id of ['bb-home-polish-v1','bb-home-polish-v2','bb-home-polish-v3'])$(id)?.remove();
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
#menuScreen.bb-home-theme.bb-home-v4{position:relative!important;isolation:isolate!important;overflow:hidden!important;background:#12131a!important;color:#fff!important}
#menuScreen.bb-home-theme.bb-home-v4:before{content:""!important;position:absolute!important;inset:-2%!important;z-index:0!important;pointer-events:none!important;background-image:linear-gradient(180deg,rgba(10,8,13,.05) 0%,rgba(10,8,13,.04) 44%,rgba(9,7,12,.38) 72%,rgba(7,6,10,.86) 100%),url("${ASSET}backgrounds/home-city-clean-a.webp")!important;background-size:cover!important;background-repeat:no-repeat!important;background-position:center 45%!important;filter:saturate(1.08) contrast(1.04)!important;transform:scale(1.018)!important}
#menuScreen.bb-home-theme.bb-home-v4:after{content:""!important;position:absolute!important;inset:0!important;z-index:0!important;pointer-events:none!important;background:radial-gradient(circle at 51% 34%,transparent 0 28%,rgba(11,7,13,.08) 55%,rgba(8,5,10,.42) 100%),linear-gradient(90deg,rgba(12,5,9,.24),transparent 22%,transparent 77%,rgba(11,6,10,.23))!important}
#menuScreen.bb-home-v4>.menuInner{position:absolute!important;inset:0!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important}
#menuScreen.bb-home-v4 .bb-economy-hud{display:none!important}
#${SHELL_ID}{position:absolute!important;inset:0!important;z-index:40!important;display:grid!important;grid-template-rows:auto 1fr auto!important;box-sizing:border-box!important;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))!important;overflow:hidden!important;font-family:var(--bb-font-animeace,'AnimeAce2',ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif)!important;color:#fff!important}
#${SHELL_ID} button{font:inherit;-webkit-tap-highlight-color:transparent}
#${SHELL_ID} .bb-home-v4-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
#${SHELL_ID} .bb-home-v4-top{position:relative;z-index:4;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;min-height:58px;pointer-events:none}
#${SHELL_ID} .bb-home-v4-profile{width:clamp(150px,31vw,235px);filter:drop-shadow(0 7px 12px rgba(0,0,0,.3))}
#${SHELL_ID} .bb-home-v4-profile img,#${SHELL_ID} .bb-home-v4-money img{display:block;width:100%;height:auto;object-fit:contain}
#${SHELL_ID} .bb-home-v4-money{display:flex;gap:5px;width:clamp(158px,34vw,255px)}
#${SHELL_ID} .bb-home-v4-money span{flex:1;min-width:0;filter:drop-shadow(0 6px 10px rgba(0,0,0,.26))}
#${SHELL_ID} .bb-home-v4-stage{position:relative;z-index:2;min-height:0;display:flex;align-items:flex-end;justify-content:center;padding:14px 62px 8px}
#${SHELL_ID} .bb-home-v4-center{position:relative;width:min(650px,100%);margin-bottom:4px;display:flex;flex-direction:column;align-items:center;text-align:center}
#${SHELL_ID} .bb-home-v4-brand{position:relative;z-index:2;margin-bottom:10px;text-shadow:0 3px 14px rgba(0,0,0,.6)}
#${SHELL_ID} .bb-home-v4-brand span{display:block;margin-bottom:4px;font:900 clamp(7px,1.2vw,10px)/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.32em;color:rgba(255,245,226,.82)}
#${SHELL_ID} .bb-home-v4-brand strong{display:block;font-size:clamp(23px,4.7vw,48px);line-height:.92;letter-spacing:-.045em;color:#fff9ec;text-shadow:0 3px 0 rgba(80,15,25,.55),0 8px 24px rgba(0,0,0,.5)}
#${SHELL_ID} .bb-home-v4-feature{position:relative;width:min(620px,100%);min-height:clamp(92px,17vh,148px);padding:0;border:0;background:transparent;color:#fff;cursor:pointer;filter:drop-shadow(0 13px 22px rgba(0,0,0,.38));transition:transform .14s ease,filter .14s ease}
#${SHELL_ID} .bb-home-v4-feature:hover,#${SHELL_ID} .bb-home-v4-feature:focus-visible{transform:translateY(-2px) scale(1.005);filter:drop-shadow(0 17px 26px rgba(0,0,0,.44)) brightness(1.06);outline:none}
#${SHELL_ID} .bb-home-v4-feature:active{transform:scale(.985)}
#${SHELL_ID} .bb-home-v4-feature-frame{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none}
#${SHELL_ID} .bb-home-v4-feature-copy{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:12px clamp(24px,7vw,62px);text-align:left;box-sizing:border-box}
#${SHELL_ID} .bb-home-v4-feature-copy small{font:950 clamp(7px,1.25vw,10px)/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.23em;color:#ffcfbc;text-shadow:0 2px 5px #321}
#${SHELL_ID} .bb-home-v4-feature-copy strong{margin-top:6px;font-size:clamp(20px,4vw,37px);line-height:.9;letter-spacing:-.03em;color:#fffaf0;text-shadow:0 3px 0 rgba(82,12,22,.65),0 8px 15px rgba(0,0,0,.42)}
#${SHELL_ID} .bb-home-v4-feature-copy span{margin-top:7px;font:850 clamp(7px,1.1vw,9px)/1.2 ui-sans-serif,system-ui,sans-serif;letter-spacing:.09em;color:rgba(255,237,225,.8)}
#${SHELL_ID} .bb-home-v4-tag{position:absolute;z-index:3;right:3.5%;top:-10%;width:clamp(82px,18vw,135px);height:auto;filter:drop-shadow(0 6px 9px rgba(0,0,0,.35));pointer-events:none}
#${SHELL_ID} .bb-home-v4-dots{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:6px}
#${SHELL_ID} .bb-home-v4-dots img{width:9px;height:9px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}
#${SHELL_ID} .bb-home-v4-utility{position:absolute;z-index:5;left:max(7px,env(safe-area-inset-left));top:50%;transform:translateY(-48%);display:flex;flex-direction:column;gap:4px}
#${SHELL_ID} .bb-home-v4-util-btn{position:relative;width:clamp(42px,8vw,63px);height:clamp(49px,9.5vw,73px);padding:0;border:0;background:transparent;cursor:pointer;filter:drop-shadow(0 6px 9px rgba(0,0,0,.32));transition:transform .14s ease,filter .14s ease}
#${SHELL_ID} .bb-home-v4-util-btn img{display:block;width:100%;height:100%;object-fit:contain}
#${SHELL_ID} .bb-home-v4-util-btn:hover,#${SHELL_ID} .bb-home-v4-util-btn:focus-visible{transform:translateX(3px) scale(1.04);filter:drop-shadow(0 7px 11px rgba(0,0,0,.38)) brightness(1.08);outline:none}
#${SHELL_ID} .bb-home-v4-util-btn:active{transform:scale(.96)}
#${SHELL_ID} .bb-home-v4-social{position:absolute;z-index:5;right:max(8px,env(safe-area-inset-right));top:clamp(78px,13vh,118px);display:flex;flex-direction:column;gap:6px}
#${SHELL_ID} .bb-home-v4-social button{width:clamp(38px,7vw,54px);height:clamp(38px,7vw,54px);padding:0;border:0;border-radius:50%;background:transparent;cursor:pointer;filter:drop-shadow(0 6px 9px rgba(0,0,0,.32));transition:transform .14s ease,filter .14s ease}
#${SHELL_ID} .bb-home-v4-social img{display:block;width:100%;height:100%;object-fit:contain}
#${SHELL_ID} .bb-home-v4-social button:hover,#${SHELL_ID} .bb-home-v4-social button:focus-visible{transform:translateX(-2px) scale(1.06);filter:drop-shadow(0 7px 11px rgba(0,0,0,.4)) brightness(1.08);outline:none}
#${SHELL_ID} .bb-home-v4-dock{position:relative;z-index:7;width:min(980px,96vw);justify-self:center;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:7px;border:1px solid rgba(255,236,218,.13);border-radius:16px 5px 16px 5px;background:linear-gradient(180deg,rgba(19,13,18,.58),rgba(7,6,10,.82));box-shadow:0 -3px 0 rgba(151,30,41,.52),0 17px 35px rgba(0,0,0,.32),inset 0 1px rgba(255,255,255,.06);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#${SHELL_ID} .bb-home-v4-nav{position:relative;min-width:0;aspect-ratio:3/1;padding:0;border:0;background:transparent;cursor:pointer;filter:drop-shadow(0 7px 8px rgba(0,0,0,.29));transition:transform .13s ease,filter .13s ease}
#${SHELL_ID} .bb-home-v4-nav img{display:block;width:100%;height:100%;object-fit:fill}
#${SHELL_ID} .bb-home-v4-nav:hover,#${SHELL_ID} .bb-home-v4-nav:focus-visible{transform:translateY(-3px) scale(1.02);filter:drop-shadow(0 9px 11px rgba(0,0,0,.36)) brightness(1.1);outline:none}
#${SHELL_ID} .bb-home-v4-nav:active{transform:translateY(0) scale(.975)}
#${SHELL_ID} .bb-home-v4-battle{position:absolute;z-index:20;inset:0;display:grid;place-items:center;padding:18px;box-sizing:border-box;background:rgba(8,5,10,.58);-webkit-backdrop-filter:blur(9px) saturate(.88);backdrop-filter:blur(9px) saturate(.88);animation:bbHomeV4Fade .18s ease both}
#${SHELL_ID} .bb-home-v4-battle[hidden]{display:none!important}
#${SHELL_ID} .bb-home-v4-battle-card{position:relative;width:min(900px,94vw);padding:clamp(18px,3vw,30px);box-sizing:border-box;border:1px solid rgba(255,232,213,.24);border-radius:23px 7px 23px 7px;background:linear-gradient(160deg,rgba(28,15,21,.97),rgba(11,9,14,.98));box-shadow:0 28px 70px rgba(0,0,0,.54),inset 0 1px rgba(255,255,255,.07);overflow:hidden}
#${SHELL_ID} .bb-home-v4-battle-card:before{content:"";position:absolute;left:-80px;top:-90px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(216,46,58,.28),transparent 67%);pointer-events:none}
#${SHELL_ID} .bb-home-v4-battle-head{position:relative;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px;text-align:left}
#${SHELL_ID} .bb-home-v4-battle-head small{display:block;font:900 8px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.27em;color:#e5a8a8}
#${SHELL_ID} .bb-home-v4-battle-head strong{display:block;margin-top:6px;font-size:clamp(24px,4vw,42px);line-height:.92;letter-spacing:-.04em;color:#fff6e9}
#${SHELL_ID} .bb-home-v4-close{width:38px;height:38px;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:rgba(255,255,255,.05);color:#fff;font:800 20px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer}
#${SHELL_ID} .bb-home-v4-close:hover,#${SHELL_ID} .bb-home-v4-close:focus-visible{background:rgba(255,255,255,.11);outline:2px solid rgba(255,225,207,.5);outline-offset:2px}
#${SHELL_ID} .bb-home-v4-modes{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:12px}
#${SHELL_ID} .bb-home-v4-mode{position:relative;min-height:clamp(145px,25vh,230px);padding:clamp(18px,3vw,27px);overflow:hidden;text-align:left;border:1px solid rgba(255,225,186,.28);border-radius:18px 5px 18px 5px;color:#fff;cursor:pointer;box-shadow:inset 0 1px rgba(255,255,255,.07),0 12px 28px rgba(0,0,0,.26);transition:transform .14s ease,filter .14s ease,border-color .14s ease}
#${SHELL_ID} .bb-home-v4-mode--road{background:radial-gradient(circle at 88% 14%,rgba(244,167,52,.26),transparent 36%),linear-gradient(145deg,#76282d,#28181b 58%,#111014)}
#${SHELL_ID} .bb-home-v4-mode--castle{background:radial-gradient(circle at 84% 12%,rgba(152,91,206,.28),transparent 37%),linear-gradient(145deg,#3e254e,#201827 58%,#101015)}
#${SHELL_ID} .bb-home-v4-mode:before{content:"";position:absolute;right:-56px;bottom:-76px;width:220px;height:220px;border:1px solid rgba(255,255,255,.09);border-radius:50%;box-shadow:0 0 0 25px rgba(255,255,255,.025),0 0 0 54px rgba(255,255,255,.012)}
#${SHELL_ID} .bb-home-v4-mode:hover,#${SHELL_ID} .bb-home-v4-mode:focus-visible{transform:translateY(-3px);filter:brightness(1.08);border-color:rgba(255,231,205,.55);outline:none}
#${SHELL_ID} .bb-home-v4-mode small,#${SHELL_ID} .bb-home-v4-mode strong,#${SHELL_ID} .bb-home-v4-mode span{position:relative;z-index:1;display:block}
#${SHELL_ID} .bb-home-v4-mode small{font:900 8px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.22em;color:#f5c7b1}
#${SHELL_ID} .bb-home-v4-mode--castle small{color:#d8bcf3}
#${SHELL_ID} .bb-home-v4-mode strong{margin-top:9px;font-size:clamp(22px,3.5vw,38px);line-height:.9;letter-spacing:-.04em;color:#fff8eb;text-shadow:0 3px 12px rgba(0,0,0,.4)}
#${SHELL_ID} .bb-home-v4-mode span{margin-top:12px;max-width:28ch;font:750 10px/1.45 ui-sans-serif,system-ui,sans-serif;letter-spacing:.02em;color:rgba(255,239,226,.72)}
#${SHELL_ID} .bb-home-v4-toast{position:absolute;z-index:30;left:50%;bottom:clamp(122px,19vh,170px);transform:translate(-50%,12px);min-width:180px;max-width:min(80vw,430px);padding:11px 16px;border:1px solid rgba(255,219,196,.28);border-radius:999px;background:rgba(20,12,17,.88);box-shadow:0 12px 28px rgba(0,0,0,.34);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font:800 9px/1.25 ui-sans-serif,system-ui,sans-serif;letter-spacing:.08em;text-align:center;color:#fff2e7;opacity:0;pointer-events:none;transition:opacity .16s ease,transform .16s ease}
#${SHELL_ID} .bb-home-v4-toast.show{opacity:1;transform:translate(-50%,0)}
@keyframes bbHomeV4Fade{from{opacity:0}to{opacity:1}}
@media(max-width:620px){
 #menuScreen.bb-home-theme.bb-home-v4:before{background-position:center 43%!important}
 #${SHELL_ID}{padding-top:max(7px,env(safe-area-inset-top))!important;padding-left:max(7px,env(safe-area-inset-left))!important;padding-right:max(7px,env(safe-area-inset-right))!important;padding-bottom:max(7px,env(safe-area-inset-bottom))!important}
 #${SHELL_ID} .bb-home-v4-top{min-height:48px}
 #${SHELL_ID} .bb-home-v4-profile{width:min(42vw,168px)}
 #${SHELL_ID} .bb-home-v4-money{width:min(44vw,176px);gap:3px}
 #${SHELL_ID} .bb-home-v4-stage{padding:7px 49px 5px;align-items:flex-end}
 #${SHELL_ID} .bb-home-v4-brand{margin-bottom:7px}
 #${SHELL_ID} .bb-home-v4-brand strong{font-size:clamp(21px,8vw,32px)}
 #${SHELL_ID} .bb-home-v4-feature{min-height:88px}
 #${SHELL_ID} .bb-home-v4-feature-copy{padding-left:23px;padding-right:23px}
 #${SHELL_ID} .bb-home-v4-feature-copy strong{font-size:clamp(19px,7vw,27px)}
 #${SHELL_ID} .bb-home-v4-tag{right:0;top:-9%;width:min(30vw,110px)}
 #${SHELL_ID} .bb-home-v4-utility{left:max(3px,env(safe-area-inset-left));gap:2px}
 #${SHELL_ID} .bb-home-v4-util-btn{width:43px;height:52px}
 #${SHELL_ID} .bb-home-v4-social{right:max(3px,env(safe-area-inset-right));top:72px;gap:3px}
 #${SHELL_ID} .bb-home-v4-social button{width:38px;height:38px}
 #${SHELL_ID} .bb-home-v4-dock{width:100%;grid-template-columns:1fr 1fr;gap:4px;padding:5px;border-radius:12px 4px 12px 4px}
 #${SHELL_ID} .bb-home-v4-nav{aspect-ratio:3/1}
 #${SHELL_ID} .bb-home-v4-battle{padding:9px}
 #${SHELL_ID} .bb-home-v4-battle-card{width:100%;padding:17px 13px 13px;border-radius:17px 5px 17px 5px}
 #${SHELL_ID} .bb-home-v4-battle-head{margin-bottom:10px}
 #${SHELL_ID} .bb-home-v4-modes{grid-template-columns:1fr;gap:8px}
 #${SHELL_ID} .bb-home-v4-mode{min-height:120px;padding:17px}
 #${SHELL_ID} .bb-home-v4-mode strong{font-size:25px}
 #${SHELL_ID} .bb-home-v4-mode span{margin-top:7px;font-size:9px}
 #${SHELL_ID} .bb-home-v4-toast{bottom:135px}
}
@media(min-width:621px) and (max-height:720px){
 #${SHELL_ID} .bb-home-v4-stage{padding-top:4px;padding-bottom:4px}
 #${SHELL_ID} .bb-home-v4-feature{min-height:100px}
 #${SHELL_ID} .bb-home-v4-util-btn{width:48px;height:58px}
}
@media(prefers-reduced-motion:reduce){#${SHELL_ID} *{transition:none!important;animation:none!important}}
`;
 document.head.appendChild(style);
}

let toastTimer=0;
function showToast(shell,message){
 const toast=shell?.querySelector('.bb-home-v4-toast');
 if(!toast)return;
 toast.textContent=message;
 toast.classList.add('show');
 clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>toast.classList.remove('show'),1700);
}

function clickLegacy(id,shell){
 const el=$(id);
 if(!el){showToast(shell,'That route is not available yet.');return false;}
 try{el.click();return true;}catch(err){console.error('Home route click failed',id,err);showToast(shell,'That route could not open.');return false;}
}

function clickSemantic(root,shell,regex,label){
 const candidates=[...root.querySelectorAll('button,a,[role="button"],[onclick]')].filter(el=>!shell.contains(el));
 const target=candidates.find(el=>regex.test(copy(el)));
 if(target){try{target.click();return true;}catch(_){}}
 showToast(shell,`${label} · coming soon`);
 return false;
}

function openBattle(shell){
 const panel=shell?.querySelector('.bb-home-v4-battle');
 if(!panel)return;
 panel.hidden=false;
 shell.classList.add('battle-open');
 const focus=panel.querySelector('.bb-home-v4-mode');
 requestAnimationFrame(()=>focus?.focus({preventScroll:true}));
}

function closeBattle(shell){
 const panel=shell?.querySelector('.bb-home-v4-battle');
 if(!panel)return;
 panel.hidden=true;
 shell.classList.remove('battle-open');
 shell.querySelector('[data-nav="battle"]')?.focus({preventScroll:true});
}

function utilityButton(key,label,asset){
 return `<button class="bb-home-v4-util-btn" type="button" data-util="${key}" aria-label="${label}"><img src="${ASSET}${asset}" alt="" draggable="false"><span class="bb-home-v4-sr">${label}</span></button>`;
}

function navButton(key,label,asset){
 return `<button class="bb-home-v4-nav" type="button" data-nav="${key}" aria-label="${label}"><img src="${ASSET}${asset}" alt="" draggable="false"><span class="bb-home-v4-sr">${label}</span></button>`;
}

function ensureShell(root){
 let shell=$(SHELL_ID);
 if(shell&&shell.parentElement===root)return shell;
 if(shell)shell.remove();
 installStyle();
 root.classList.add('bb-home-theme','bb-home-v4');
 shell=document.createElement('div');
 shell.id=SHELL_ID;
 shell.setAttribute('data-bb-home-version','approved-v4');
 shell.innerHTML=`
  <header class="bb-home-v4-top" aria-label="Player information">
   <div class="bb-home-v4-profile"><img src="${ASSET}hud/player-profile.webp" alt="Player profile" draggable="false"></div>
   <div class="bb-home-v4-money" aria-label="Currencies"><span><img src="${ASSET}hud/premium-currency.webp" alt="Premium currency" draggable="false"></span><span><img src="${ASSET}hud/gold-currency.webp" alt="Gold" draggable="false"></span></div>
  </header>

  <main class="bb-home-v4-stage">
   <div class="bb-home-v4-center">
    <div class="bb-home-v4-brand"><span>SELECT YOUR PATH</span><strong>BLAZING BATTLE</strong></div>
    <button class="bb-home-v4-feature" type="button" data-open-battle aria-label="Open Battle modes">
     <img class="bb-home-v4-feature-frame" src="${ASSET}banners/promo-frame.webp" alt="" draggable="false">
     <img class="bb-home-v4-tag" src="${ASSET}banners/tag-event.webp" alt="Event" draggable="false">
     <span class="bb-home-v4-feature-copy"><small>FEATURED</small><strong>ENTER THE BATTLE</strong><span>Blazing Road · Phantom Castle</span></span>
    </button>
    <div class="bb-home-v4-dots" aria-hidden="true"><img src="${ASSET}controls/carousel-dot-active.webp" alt=""><img src="${ASSET}controls/carousel-dot-inactive.webp" alt=""><img src="${ASSET}controls/carousel-dot-inactive.webp" alt=""></div>
   </div>
  </main>

  <aside class="bb-home-v4-utility" aria-label="Utility menu">
   ${utilityButton('missions','Missions','utility/missions.webp')}
   ${utilityButton('inbox','Inbox','utility/inbox.webp')}
   ${utilityButton('shop','Shop','utility/shop.webp')}
   ${utilityButton('settings','Settings','utility/settings.webp')}
  </aside>

  <aside class="bb-home-v4-social" aria-label="Social menu">
   ${utilityButton('chat','Chat','utility/chat.webp').replace('bb-home-v4-util-btn','')}
   ${utilityButton('friends','Friends','utility/friends.webp').replace('bb-home-v4-util-btn','')}
   ${utilityButton('menu','Menu','utility/menu.webp').replace('bb-home-v4-util-btn','')}
  </aside>

  <nav class="bb-home-v4-dock" aria-label="Main menu">
   ${navButton('battle','Battle','navigation/battle.webp')}
   ${navButton('summon','Summon','navigation/summon.webp')}
   ${navButton('units','Units','navigation/units.webp')}
   ${navButton('forge','Forge','navigation/forge.webp')}
  </nav>

  <section class="bb-home-v4-battle" hidden aria-label="Battle modes">
   <div class="bb-home-v4-battle-card">
    <div class="bb-home-v4-battle-head"><div><small>CHOOSE YOUR FIGHT</small><strong>BATTLE</strong></div><button class="bb-home-v4-close" type="button" data-close-battle aria-label="Close Battle menu">×</button></div>
    <div class="bb-home-v4-modes">
     <button class="bb-home-v4-mode bb-home-v4-mode--road" type="button" data-mode="road"><small>ENDURANCE MODE</small><strong>BLAZING ROAD</strong><span>Push through sequential stages and build a run across the road.</span></button>
     <button class="bb-home-v4-mode bb-home-v4-mode--castle" type="button" data-mode="castle"><small>CHALLENGE MODE</small><strong>PHANTOM CASTLE</strong><span>Enter focused boss trials built around dangerous encounter rules.</span></button>
    </div>
   </div>
  </section>
  <div class="bb-home-v4-toast" role="status" aria-live="polite"></div>
 `;
 root.appendChild(shell);

 shell.querySelector('[data-open-battle]')?.addEventListener('click',()=>openBattle(shell));
 shell.querySelector('[data-nav="battle"]')?.addEventListener('click',()=>openBattle(shell));
 shell.querySelector('[data-nav="summon"]')?.addEventListener('click',()=>clickLegacy('summonsBtn',shell));
 shell.querySelector('[data-nav="units"]')?.addEventListener('click',()=>clickLegacy('inventoryBtn',shell));
 shell.querySelector('[data-nav="forge"]')?.addEventListener('click',()=>clickLegacy('forgeBtn',shell));
 shell.querySelector('[data-close-battle]')?.addEventListener('click',()=>closeBattle(shell));
 shell.querySelector('[data-mode="road"]')?.addEventListener('click',()=>clickLegacy('level1Btn',shell));
 shell.querySelector('[data-mode="castle"]')?.addEventListener('click',()=>clickLegacy('boss1Btn',shell));
 shell.querySelector('.bb-home-v4-battle')?.addEventListener('click',event=>{if(event.target===event.currentTarget)closeBattle(shell);});
 shell.addEventListener('keydown',event=>{if(event.key==='Escape'&&!shell.querySelector('.bb-home-v4-battle')?.hidden){event.preventDefault();closeBattle(shell);}});

 const utility={
  missions:[/MISSIONS?/i,'Missions'],inbox:[/INBOX|MAIL/i,'Inbox'],shop:[/SHOP/i,'Shop'],settings:[/SETTINGS?/i,'Settings'],
  chat:[/CHAT/i,'Chat'],friends:[/FRIENDS?/i,'Friends'],menu:[/^(?:MENU|MORE)$/i,'Menu']
 };
 for(const button of shell.querySelectorAll('[data-util]')){
  const [rx,label]=utility[button.dataset.util]||[/.^/,'Feature'];
  button.addEventListener('click',()=>clickSemantic(root,shell,rx,label));
 }
 return shell;
}

let homeRoot=null;
function apply(){
 const found=findHome();
 if(found)homeRoot=found;
 const root=homeRoot&&document.body.contains(homeRoot)&&visible(homeRoot)?homeRoot:null;
 if(!root)return false;
 ensureShell(root);
 return true;
}

let queued=false;
function schedule(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;apply();});
}

new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
document.addEventListener('click',()=>setTimeout(apply,0),true);
window.addEventListener('resize',schedule,{passive:true});
setTimeout(apply,0);
window.BlazingHomeSkin=Object.freeze({apply,findHome,openBattle:()=>openBattle($(SHELL_ID)),closeBattle:()=>closeBattle($(SHELL_ID))});
})();
