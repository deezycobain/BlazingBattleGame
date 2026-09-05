(()=>{
'use strict';
const STYLE_ID='bb-home-polish-v1';
const copy=el=>String(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
const visible=el=>{if(!el||el.hidden)return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';};
function score(el){const text=copy(el);let n=0;if(/SELECT\s+YOUR\s+PATH/i.test(text))n+=6;if(/\bINVENTORY\b/i.test(text))n+=2;if(/OWNED\s+FIGHTERS/i.test(text))n+=2;if(/\bLEVEL\b/i.test(text))n+=1;if(/\bBOSS\b/i.test(text))n+=1;if(/\bSUMMONS?\b/i.test(text))n+=1;return n;}
function findHome(){const candidates=[...new Set(document.querySelectorAll('.screen,section,main,[role="main"],body>div'))].filter(el=>el.id!=='bbInventory'&&el.id!=='bbUnitDetails'&&visible(el));return candidates.map(el=>({el,score:score(el)})).filter(x=>x.score>=8).sort((a,b)=>b.score-a.score||a.el.querySelectorAll('*').length-b.el.querySelectorAll('*').length)[0]?.el||null;}
function hideLegacyWallpaper(root){if(!root)return;const rr=root.getBoundingClientRect();for(const img of root.querySelectorAll('img')){const r=img.getBoundingClientRect(),s=getComputedStyle(img);if(r.width>=rr.width*.78&&r.height>=rr.height*.55&&(s.position==='absolute'||s.position==='fixed'))img.classList.add('bb-home-old-wallpaper');}}
function removeLeakedLegacyText(root){if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const doomed=[];while(walker.nextNode()){const n=walker.currentNode,t=n.nodeValue||'';if(/bindLegacyTakeover|findInventoryReturn|legacyScreen|inventoryReturn/i.test(t)&&/[{};=]/.test(t))doomed.push(n);}doomed.forEach(n=>n.remove());}
function removeLiteralNewlineArtifacts(root=document.body){if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const doomed=[];while(walker.nextNode()){const n=walker.currentNode,p=n.parentElement;if(p?.closest('script,style,pre,code,textarea'))continue;if(String(n.nodeValue||'').trim()==='\\n')doomed.push(n);}doomed.forEach(n=>n.remove());}
function semanticNode(root,rx,{interactive=false}={}){
 const candidates=[...root.querySelectorAll('button,a,[role="button"],h1,h2,h3,h4,div,section,span')].filter(visible).filter(el=>rx.test(copy(el)));
 let best=null,bestScore=-1e9;
 for(const el of candidates){
  const text=copy(el),r=el.getBoundingClientRect(),tag=el.tagName;
  let s=0;
  if(tag==='BUTTON'||tag==='A')s+=interactive?80:18;
  if(el.getAttribute('role')==='button')s+=interactive?65:12;
  if(typeof el.onclick==='function'||el.hasAttribute('onclick'))s+=interactive?35:4;
  try{if(getComputedStyle(el).cursor==='pointer')s+=interactive?24:3;}catch(_){}
  if(interactive&&r.width>=86&&r.height>=38)s+=18;
  if(!interactive&&/^H[1-4]$/.test(tag))s+=30;
  const descendants=el.querySelectorAll('*').length;s+=Math.max(0,12-Math.min(12,descendants));
  s-=Math.max(0,text.length-24)*.35;
  if(s>bestScore){bestScore=s;best=el;}
 }
 return best;
}
function commonAncestor(nodes,root){if(nodes.length<2)return nodes[0]?.parentElement||null;let n=nodes[0]?.parentElement||null;while(n&&n!==root){if(nodes.every(x=>n.contains(x)))return n;n=n.parentElement;}return null;}
function installStyle(){if(document.getElementById(STYLE_ID))return;const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
.bb-home-theme{--bb-home-gold:#f3c969;--bb-home-ink:#10131c;--bb-home-cream:#fff3d3;--bb-home-violet:#8d65d8;min-height:100dvh!important;color:var(--bb-home-cream)!important;font-family:var(--bb-font-animeace,'AnimeAce2',system-ui,sans-serif)!important}
.bb-home-theme::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background:linear-gradient(180deg,rgba(6,9,17,.38) 0%,rgba(8,11,20,.07) 28%,rgba(8,9,16,.05) 48%,rgba(6,7,13,.56) 78%,rgba(4,5,10,.82) 100%),radial-gradient(ellipse 82% 48% at 50% 46%,transparent 45%,rgba(4,5,10,.22) 100%)}
.bb-home-theme .bb-home-title{color:#fff8e5!important;font-family:var(--bb-font-animeace,'AnimeAce2',system-ui,sans-serif)!important;font-size:clamp(34px,8.5vw,58px)!important;line-height:.96!important;letter-spacing:.025em!important;text-align:center!important;text-shadow:0 3px 0 rgba(31,18,10,.72),0 8px 22px rgba(0,0,0,.48),0 0 20px rgba(248,195,91,.22)!important;filter:drop-shadow(0 1px 0 rgba(255,237,190,.32))}
.bb-home-theme .bb-home-kicker{color:#f8e8bd!important;font-family:var(--bb-font-animeace,'AnimeAce2',system-ui,sans-serif)!important;font-size:clamp(12px,3.2vw,17px)!important;letter-spacing:.16em!important;text-transform:uppercase!important;text-align:center!important;text-shadow:0 2px 8px rgba(0,0,0,.7)!important}
.bb-home-theme .bb-home-kicker::before,.bb-home-theme .bb-home-kicker::after{content:"";display:inline-block;width:clamp(22px,7vw,52px);height:1px;margin:0 10px 4px;background:linear-gradient(90deg,transparent,var(--bb-home-gold))}
.bb-home-theme .bb-home-kicker::after{background:linear-gradient(90deg,var(--bb-home-gold),transparent)}
.bb-home-theme .bb-home-actions{position:relative!important;z-index:2!important;gap:clamp(9px,2.2vw,14px)!important}
.bb-home-theme .bb-home-action{position:relative!important;isolation:isolate!important;overflow:hidden!important;box-sizing:border-box!important;min-height:64px!important;border:1px solid rgba(255,222,145,.72)!important;border-radius:18px 7px 18px 7px!important;background:linear-gradient(145deg,rgba(28,29,42,.92),rgba(10,12,22,.91))!important;color:#fff4d5!important;font-family:var(--bb-font-animeace,'AnimeAce2',system-ui,sans-serif)!important;font-weight:900!important;letter-spacing:.055em!important;text-shadow:0 2px 8px rgba(0,0,0,.64)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 -1px 0 rgba(0,0,0,.38),0 8px 20px rgba(0,0,0,.28),0 0 0 1px rgba(255,204,110,.05)!important;backdrop-filter:blur(9px) saturate(1.08);-webkit-backdrop-filter:blur(9px) saturate(1.08);transition:transform .13s ease,filter .13s ease,box-shadow .13s ease,border-color .13s ease!important;-webkit-tap-highlight-color:transparent}
.bb-home-theme .bb-home-action::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(112deg,transparent 8%,rgba(255,255,255,.08) 42%,transparent 58%);transform:translateX(-70%);transition:transform .45s ease}
.bb-home-theme .bb-home-action:hover::before,.bb-home-theme .bb-home-action:focus-visible::before{transform:translateX(70%)}
.bb-home-theme .bb-home-action:hover,.bb-home-theme .bb-home-action:focus-visible{border-color:rgba(255,228,158,.96)!important;filter:brightness(1.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 10px 24px rgba(0,0,0,.34),0 0 18px rgba(236,189,90,.2)!important;outline:none!important}
.bb-home-theme .bb-home-action:active{transform:scale(.976)!important;filter:brightness(1.13)!important}
.bb-home-theme .bb-home-action--level{min-height:82px!important;border-color:rgba(255,222,127,.96)!important;background:linear-gradient(145deg,rgba(111,63,26,.96),rgba(48,29,22,.95) 58%,rgba(20,17,24,.94))!important;box-shadow:inset 0 1px 0 rgba(255,245,202,.25),0 10px 26px rgba(0,0,0,.36),0 0 22px rgba(245,188,70,.23)!important}
.bb-home-theme .bb-home-action--level::after{content:"PLAY";position:absolute;right:10px;top:8px;padding:4px 7px;border:1px solid rgba(255,238,177,.64);border-radius:999px;background:rgba(20,13,10,.5);color:#ffe59a;font:900 8px/1 system-ui,sans-serif;letter-spacing:.16em;text-shadow:none}
.bb-home-theme .bb-home-action--boss{border-color:rgba(235,171,130,.72)!important;background:linear-gradient(145deg,rgba(72,31,31,.93),rgba(18,16,24,.92))!important}
.bb-home-theme .bb-home-action--summon{--bb-action-glow:rgba(112,174,255,.18)}
.bb-home-theme .bb-home-action--inventory{--bb-action-glow:rgba(109,220,196,.16)}
.bb-home-theme .bb-home-action--forge{border-color:rgba(193,145,255,.72)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 8px 20px rgba(0,0,0,.28),0 0 18px rgba(151,85,235,.12)!important}
.bb-home-theme .bb-home-ambient{position:absolute!important;inset:0!important;z-index:0!important;overflow:hidden!important;pointer-events:none!important}
.bb-home-theme .bb-home-ambient i{position:absolute;width:10px;height:10px;border-radius:50%;opacity:.22;background:radial-gradient(circle,#fff8d8 0 16%,#f3c969 18% 36%,rgba(243,201,105,0) 68%);filter:blur(.2px);animation:bbHomeDrift 8s ease-in-out infinite alternate}
.bb-home-theme .bb-home-ambient i:nth-child(1){left:10%;top:35%;animation-duration:7s}.bb-home-theme .bb-home-ambient i:nth-child(2){right:12%;top:28%;width:8px;height:8px;animation-duration:9s;animation-delay:-3s}.bb-home-theme .bb-home-ambient i:nth-child(3){left:72%;top:57%;width:12px;height:12px;animation-duration:11s;animation-delay:-6s}
@keyframes bbHomeDrift{from{transform:translate3d(0,0,0) scale(.8);opacity:.10}to{transform:translate3d(5px,-18px,0) scale(1.2);opacity:.30}}
@media(max-width:700px){.bb-home-theme .bb-home-title{font-size:clamp(32px,10vw,46px)!important}.bb-home-theme .bb-home-kicker{font-size:11px!important;letter-spacing:.13em!important}.bb-home-theme .bb-home-action{min-height:60px!important;border-radius:16px 6px 16px 6px!important}.bb-home-theme .bb-home-action--level{min-height:76px!important}}
@media(prefers-reduced-motion:reduce){.bb-home-theme .bb-home-action,.bb-home-theme .bb-home-action::before,.bb-home-theme .bb-home-ambient i{animation:none!important;transition:none!important}}
`;
document.head.appendChild(style);}
function decorate(root){
 const old=[...root.querySelectorAll('.bb-home-title,.bb-home-kicker,.bb-home-action,.bb-home-actions')];old.forEach(el=>{if(!root.contains(el))return;});
 const title=semanticNode(root,/^BLAZING\s+BATTLE$/i);if(title)title.classList.add('bb-home-title');
 const kicker=semanticNode(root,/^SELECT\s+YOUR\s+PATH$/i);if(kicker)kicker.classList.add('bb-home-kicker');
 const specs=[
  ['level',/^LEVEL\s*1$/i],['boss',/^BOSS\s*1$/i],['summon',/^SUMMONS?\s*[✦★◆◇]?$/i],['inventory',/^INVENTORY\s*[✦★◆◇]?$/i],['forge',/^FORGE\s*[✦★◆◇]?$/i]
 ];
 const actions=[];
 for(const [key,rx] of specs){const el=semanticNode(root,rx,{interactive:true});if(!el)continue;el.classList.add('bb-home-action',`bb-home-action--${key}`);el.dataset.bbHomeAction=key;actions.push(el);}
 const group=commonAncestor(actions,root);if(group&&group!==root)group.classList.add('bb-home-actions');
 let ambient=root.querySelector(':scope > .bb-home-ambient');if(!ambient){ambient=document.createElement('div');ambient.className='bb-home-ambient';ambient.setAttribute('aria-hidden','true');ambient.innerHTML='<i></i><i></i><i></i>';root.prepend(ambient);}
 return actions.length;
}
function apply(){removeLiteralNewlineArtifacts(document.body);const root=findHome();document.querySelectorAll('.bb-home-theme').forEach(el=>{if(el!==root)el.classList.remove('bb-home-theme');});if(!root)return false;installStyle();root.classList.add('bb-home-theme');hideLegacyWallpaper(root);removeLeakedLegacyText(root);decorate(root);return true;}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});}
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});document.addEventListener('click',()=>setTimeout(apply,0),true);document.addEventListener('pointerup',()=>setTimeout(apply,0),true);window.addEventListener('resize',schedule,{passive:true});setTimeout(apply,0);window.BlazingHomeSkin=Object.freeze({apply,findHome,decorate});
})();
