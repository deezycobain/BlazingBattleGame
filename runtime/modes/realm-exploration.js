(()=>{
'use strict';

const STORAGE_KEY='bb_realm_exploration_v1';
const RESUME_KEY='bb_realm_exploration_resume_v1';
const ROOT_ID='bbRealmExplorer';
const ENTRY_ID='bbRealmEntry';
const STYLE_ID='bb-realm-exploration-style';
const VERSION=1;
const MAP_SRC='assets/maps/blazing-road/stage-04-shinobi-overlook.webp';

const REALMS=Object.freeze([
  Object.freeze({id:'shinobi',name:'Shinobi Realm',subtitle:'Verdant Approach',status:'open'}),
  Object.freeze({id:'frozen',name:'Frozen Reach',subtitle:'Rift signature unstable',status:'locked'}),
  Object.freeze({id:'ashen',name:'Ashen Fracture',subtitle:'Coordinates unknown',status:'locked'})
]);

const POIS=Object.freeze([
  Object.freeze({id:'rift_shrine',x:.50,y:.22,zone:'north',kind:'shrine',title:'Ancient Rift Shrine',copy:'A dormant seal hums beneath the stone.'}),
  Object.freeze({id:'supply_cache',x:.23,y:.61,zone:'west',kind:'cache',title:'Hidden Supply Cache',copy:'Something was tucked behind the broken wall.'}),
  Object.freeze({id:'rogue_patrol',x:.73,y:.40,zone:'east',kind:'battle',title:'Rogue Patrol',copy:'A roaming squad blocks the eastern trail.',mapStage:4}),
  Object.freeze({id:'north_gate',x:.84,y:.73,zone:'south',kind:'gate',title:'Sealed North Trail',copy:'The route continues beyond this prototype zone.'})
]);

let pendingEncounter=null;
let root=null;
let stage=null;
let player=null;
let moveFrame=0;
let target=null;
let lastTime=0;
let nearbyPoi=null;
let currentView='nexus';
let keyboardDown=new Set();

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const uniq=list=>[...new Set(Array.isArray(list)?list:[])];

function defaultState(){
  return {version:VERSION,realm:'shinobi',x:.50,y:.82,discovered:['landing','south'],claimed:[],cleared:[],fragments:0,updatedAt:Date.now()};
}
function sanitizeState(raw){
  const base=defaultState(),data=raw&&typeof raw==='object'?raw:{};
  return {
    version:VERSION,
    realm:'shinobi',
    x:clamp(data.x??base.x,.08,.92),
    y:clamp(data.y??base.y,.12,.88),
    discovered:uniq([...base.discovered,...(Array.isArray(data.discovered)?data.discovered:[])]),
    claimed:uniq(data.claimed),
    cleared:uniq(data.cleared),
    fragments:Math.max(0,Math.floor(Number(data.fragments)||0)),
    updatedAt:Number(data.updatedAt)||Date.now()
  };
}
function loadState(){
  try{return sanitizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'))}catch{return defaultState()}
}
function saveState(next){
  const clean=sanitizeState({...next,updatedAt:Date.now()});
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(clean))}catch{}
  return clean;
}
function mutateState(mutator){
  const draft=loadState();
  mutator(draft);
  return saveState(draft);
}
function assetPath(unit,asset){
  if(!asset||String(asset).endsWith('/'))return '';
  if(/^https?:|^data:|^assets\//.test(asset))return asset;
  return `assets/characters/${unit?.id||''}/${asset}`;
}
function leaderArt(){
  try{
    const unit=window.BlazingApprovedHomeCompat?.leaderUnit?.();
    const frame=unit?.animation_standard?.animations?.idle?.frames?.[0];
    return assetPath(unit,frame)||assetPath(unit,unit?.assets?.art)||'assets/characters/crimson/sprites/runtime/idle/frame_01.png';
  }catch{
    return 'assets/characters/crimson/sprites/runtime/idle/frame_01.png';
  }
}

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
#${ENTRY_ID}{position:absolute;z-index:34;left:50%;bottom:164px;transform:translateX(-50%) rotate(-.8deg);display:grid;grid-template-columns:28px auto;grid-template-rows:auto auto;column-gap:8px;align-items:center;min-width:150px;padding:8px 15px 8px 10px;border:1px solid rgba(226,203,155,.48);clip-path:polygon(5% 0,100% 7%,95% 100%,0 92%);background:linear-gradient(110deg,rgba(19,27,42,.96),rgba(31,53,77,.95) 58%,rgba(112,42,46,.86));box-shadow:0 9px 22px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.09);color:#fff8e8;text-align:left;font-family:Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer}
#${ENTRY_ID}>i{grid-row:1/3;display:grid;place-items:center;width:28px;height:28px;border:1px solid rgba(234,213,166,.44);border-radius:50%;font-style:normal;color:#efcf8e;background:radial-gradient(circle,rgba(91,131,171,.34),rgba(21,28,42,.72))}
#${ENTRY_ID}>strong{font-size:10px;line-height:1;letter-spacing:.12em}#${ENTRY_ID}>small{margin-top:3px;font-size:6px;line-height:1;letter-spacing:.18em;color:rgba(236,223,195,.68)}
#${ENTRY_ID}:hover,#${ENTRY_ID}:focus-visible{filter:brightness(1.09);outline:1px solid rgba(244,220,167,.56);outline-offset:2px}
#${ROOT_ID}[hidden]{display:none!important}
#${ROOT_ID}{position:fixed;inset:0;z-index:2147482600;display:grid;place-items:center;overflow:hidden;background:#080d15;color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
#${ROOT_ID} *{box-sizing:border-box}#${ROOT_ID} button{font:inherit}
#${ROOT_ID} .bb-realm-bg{position:absolute;inset:-4%;background:radial-gradient(circle at 50% 38%,rgba(67,116,157,.30),transparent 26%),radial-gradient(circle at 26% 68%,rgba(126,34,47,.23),transparent 28%),linear-gradient(180deg,rgba(8,14,24,.30),rgba(5,8,13,.92)),url("runtime/ui/home/home-wallpaper-hq.png") center/cover no-repeat;filter:saturate(.82) brightness(.55);transform:scale(1.06)}
#${ROOT_ID} .bb-realm-shell{position:relative;z-index:1;width:min(100vw,920px);height:100dvh;max-height:920px;display:flex;flex-direction:column;padding:max(14px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left))}
#${ROOT_ID} .bb-realm-top{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:48px}
#${ROOT_ID} .bb-realm-top button{min-height:36px;padding:0 13px;border:1px solid rgba(230,209,169,.24);background:rgba(10,16,26,.66);color:#f5ead1;border-radius:2px;letter-spacing:.08em;font-size:9px;font-weight:850}
#${ROOT_ID} .bb-realm-heading{text-align:center}#${ROOT_ID} .bb-realm-heading small{display:block;font-size:7px;font-weight:800;letter-spacing:.26em;color:#d5bd8d}#${ROOT_ID} .bb-realm-heading strong{display:block;margin-top:4px;font-size:clamp(18px,4vw,30px);letter-spacing:.08em}
#${ROOT_ID} .bb-nexus{position:relative;flex:1;display:grid;place-items:center;min-height:0}
#${ROOT_ID} .bb-nexus-core{position:relative;width:min(42vw,280px);aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,rgba(205,233,255,.12) 0 20%,rgba(71,129,172,.13) 21% 43%,transparent 44%),conic-gradient(from 30deg,rgba(212,185,126,.18),rgba(61,112,155,.54),rgba(132,41,50,.48),rgba(61,112,155,.54),rgba(212,185,126,.18));border:1px solid rgba(220,203,166,.28);box-shadow:0 0 44px rgba(67,133,184,.18),inset 0 0 32px rgba(0,0,0,.58)}
#${ROOT_ID} .bb-nexus-core:before,#${ROOT_ID} .bb-nexus-core:after{content:"";position:absolute;border-radius:50%;border:1px solid rgba(218,197,154,.23);animation:bbRealmSpin 18s linear infinite}
#${ROOT_ID} .bb-nexus-core:before{inset:9%;border-style:dashed}#${ROOT_ID} .bb-nexus-core:after{inset:23%;animation-direction:reverse;animation-duration:12s}
#${ROOT_ID} .bb-nexus-core span{position:relative;z-index:2;text-align:center}#${ROOT_ID} .bb-nexus-core b{display:block;font-size:clamp(17px,3vw,24px);letter-spacing:.16em}#${ROOT_ID} .bb-nexus-core em{display:block;margin-top:5px;font-size:7px;font-style:normal;letter-spacing:.18em;color:#d5bd8d}
#${ROOT_ID} .bb-realm-list{position:absolute;inset:0;pointer-events:none}
#${ROOT_ID} .bb-realm-card{position:absolute;width:min(37vw,238px);min-height:102px;padding:14px 14px 12px;border:1px solid rgba(232,212,170,.28);background:linear-gradient(140deg,rgba(14,24,38,.94),rgba(29,44,60,.90) 62%,rgba(94,35,43,.72));box-shadow:0 13px 30px rgba(0,0,0,.34);color:#fff;text-align:left;pointer-events:auto;cursor:pointer;clip-path:polygon(3% 0,100% 5%,96% 100%,0 92%)}
#${ROOT_ID} .bb-realm-card[data-status="locked"]{filter:saturate(.35) brightness(.62);cursor:not-allowed}
#${ROOT_ID} .bb-realm-card[data-realm="shinobi"]{left:3%;top:18%}#${ROOT_ID} .bb-realm-card[data-realm="frozen"]{right:3%;top:24%}#${ROOT_ID} .bb-realm-card[data-realm="ashen"]{right:14%;bottom:10%}
#${ROOT_ID} .bb-realm-card small{display:block;font-size:6px;font-weight:850;letter-spacing:.22em;color:#d9c08f}#${ROOT_ID} .bb-realm-card strong{display:block;margin-top:7px;font-size:clamp(13px,2.5vw,20px);letter-spacing:.04em}#${ROOT_ID} .bb-realm-card span{display:block;margin-top:6px;font-size:8px;line-height:1.3;color:rgba(237,239,242,.68)}
#${ROOT_ID} .bb-explore-wrap{position:relative;flex:1;min-height:0;display:grid;place-items:center}
#${ROOT_ID} .bb-explore-stage{position:relative;width:min(100%,520px);height:min(76dvh,700px);aspect-ratio:3/4;max-height:100%;overflow:hidden;border:1px solid rgba(227,207,166,.34);background:linear-gradient(180deg,rgba(10,17,27,.10),rgba(7,11,17,.36)),url("${MAP_SRC}") center/cover no-repeat;box-shadow:0 24px 64px rgba(0,0,0,.50)}
#${ROOT_ID} .bb-explore-stage:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 44px rgba(5,8,13,.76)}
#${ROOT_ID} .bb-fog{position:absolute;z-index:2;background:rgba(7,12,20,.78);backdrop-filter:blur(5px);transition:opacity .45s ease}
#${ROOT_ID} .bb-fog[data-zone="north"]{left:0;right:0;top:0;height:38%}#${ROOT_ID} .bb-fog[data-zone="west"]{left:0;top:34%;bottom:0;width:38%}#${ROOT_ID} .bb-fog[data-zone="east"]{right:0;top:34%;bottom:0;width:38%}
#${ROOT_ID} .bb-fog.revealed{opacity:0;pointer-events:none}
#${ROOT_ID} .bb-poi{position:absolute;z-index:5;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:50%;border:1px solid rgba(246,222,166,.74);background:radial-gradient(circle,#d5bc86 0 17%,rgba(24,39,57,.88) 20% 58%,rgba(9,14,22,.86));box-shadow:0 0 0 5px rgba(214,190,137,.08),0 0 17px rgba(103,163,211,.28);animation:bbRealmPulse 2s ease-in-out infinite}
#${ROOT_ID} .bb-poi[data-cleared="true"]{opacity:.42;animation:none}#${ROOT_ID} .bb-poi[hidden]{display:none}
#${ROOT_ID} .bb-player{position:absolute;z-index:7;width:54px;height:68px;transform:translate(-50%,-86%);pointer-events:none;filter:drop-shadow(0 8px 6px rgba(0,0,0,.56));transition:filter .2s}
#${ROOT_ID} .bb-player:after{content:"";position:absolute;left:50%;bottom:2px;width:32px;height:10px;transform:translateX(-50%);border-radius:50%;background:rgba(0,0,0,.36);filter:blur(3px)}
#${ROOT_ID} .bb-player img{position:relative;z-index:1;width:100%;height:100%;object-fit:contain;object-position:center bottom}
#${ROOT_ID} .bb-explore-hud{position:absolute;z-index:12;left:8px;right:8px;top:8px;display:flex;justify-content:space-between;gap:8px;pointer-events:none}
#${ROOT_ID} .bb-explore-chip{padding:7px 9px;border:1px solid rgba(236,213,169,.24);background:rgba(7,12,19,.74);font-size:7px;font-weight:800;letter-spacing:.11em;color:#f0dfbd;backdrop-filter:blur(7px)}
#${ROOT_ID} .bb-nearby{position:absolute;z-index:12;left:50%;bottom:100px;transform:translateX(-50%);width:min(88%,360px);padding:11px 12px;border:1px solid rgba(230,208,164,.35);background:rgba(8,13,20,.88);box-shadow:0 12px 28px rgba(0,0,0,.4);text-align:center}
#${ROOT_ID} .bb-nearby[hidden]{display:none}#${ROOT_ID} .bb-nearby strong{display:block;font-size:11px;letter-spacing:.05em}#${ROOT_ID} .bb-nearby span{display:block;margin-top:4px;font-size:8px;line-height:1.35;color:rgba(237,235,228,.65)}
#${ROOT_ID} .bb-nearby button{margin-top:8px;min-height:34px;padding:0 16px;border:1px solid rgba(231,204,151,.55);background:linear-gradient(180deg,#9d7138,#6f481f);color:#fff5df;font-size:9px;font-weight:900;letter-spacing:.08em}
#${ROOT_ID} .bb-dpad{position:absolute;z-index:13;right:10px;bottom:10px;display:grid;grid-template-columns:repeat(3,34px);grid-template-rows:repeat(3,34px);gap:2px}
#${ROOT_ID} .bb-dpad button{border:1px solid rgba(236,215,172,.26);background:rgba(9,15,23,.62);color:#efe0c1;border-radius:4px;font-weight:900}.bb-dpad [data-dir="up"]{grid-column:2}.bb-dpad [data-dir="left"]{grid-column:1;grid-row:2}.bb-dpad [data-dir="down"]{grid-column:2;grid-row:2}.bb-dpad [data-dir="right"]{grid-column:3;grid-row:2}
#${ROOT_ID} .bb-toast{position:absolute;z-index:30;left:50%;top:14%;transform:translate(-50%,-12px);opacity:0;max-width:min(82vw,420px);padding:10px 14px;border:1px solid rgba(231,207,160,.32);background:rgba(7,12,19,.93);color:#f5ead4;font-size:9px;font-weight:750;letter-spacing:.03em;transition:.22s;pointer-events:none}.bb-toast.show{opacity:1;transform:translate(-50%,0)}
@keyframes bbRealmSpin{to{transform:rotate(360deg)}}@keyframes bbRealmPulse{50%{box-shadow:0 0 0 9px rgba(214,190,137,.02),0 0 25px rgba(103,163,211,.42)}}
@media(max-width:620px){#${ENTRY_ID}{bottom:148px;min-width:136px;padding:7px 11px 7px 9px}#${ROOT_ID} .bb-realm-shell{padding-left:8px;padding-right:8px}#${ROOT_ID} .bb-realm-card{width:42vw;min-height:92px;padding:11px}#${ROOT_ID} .bb-realm-card[data-realm="shinobi"]{left:1%;top:15%}#${ROOT_ID} .bb-realm-card[data-realm="frozen"]{right:1%;top:23%}#${ROOT_ID} .bb-realm-card[data-realm="ashen"]{right:8%;bottom:8%}#${ROOT_ID} .bb-explore-stage{height:min(78dvh,680px)}}
@media(prefers-reduced-motion:reduce){#${ROOT_ID} .bb-nexus-core:before,#${ROOT_ID} .bb-nexus-core:after,#${ROOT_ID} .bb-poi{animation:none}}
`;
  document.head.appendChild(style);
}

function ensureRoot(){
  ensureStyle();
  if(root&&document.body.contains(root))return root;
  root=document.createElement('section');
  root.id=ROOT_ID;
  root.setAttribute('role','dialog');
  root.setAttribute('aria-modal','true');
  root.hidden=true;
  root.innerHTML='<div class="bb-realm-bg"></div><div class="bb-realm-shell"></div><div class="bb-toast" aria-live="polite"></div>';
  document.body.appendChild(root);
  return root;
}
function shell(){return ensureRoot().querySelector('.bb-realm-shell')}
function toast(message){
  const el=ensureRoot().querySelector('.bb-toast');if(!el)return;
  el.textContent=message;el.classList.add('show');
  clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),1800);
}
function close(){
  cancelAnimationFrame(moveFrame);moveFrame=0;target=null;nearbyPoi=null;currentView='closed';
  if(root)root.hidden=true;
  keyboardDown.clear();
}
function open(view='nexus'){
  ensureRoot().hidden=false;
  view==='explore'?renderExplore():renderNexus();
}
function topBar(title,subtitle,backLabel,backAction){
  const bar=document.createElement('header');
  bar.className='bb-realm-top';
  const back=document.createElement('button');back.textContent=backLabel;back.addEventListener('click',backAction);
  const heading=document.createElement('div');heading.className='bb-realm-heading';heading.innerHTML=`<small>${subtitle}</small><strong>${title}</strong>`;
  const home=document.createElement('button');home.textContent='HOME';home.addEventListener('click',close);
  bar.append(back,heading,home);
  return bar;
}

function renderNexus(){
  currentView='nexus';stage=null;player=null;cancelAnimationFrame(moveFrame);moveFrame=0;target=null;
  const host=shell();host.innerHTML='';host.appendChild(topBar('WORLD NEXUS','REALM NETWORK','BACK',close));
  const nexus=document.createElement('main');nexus.className='bb-nexus';
  nexus.innerHTML='<div class="bb-nexus-core" aria-hidden="true"><span><b>NEXUS</b><em>REALM ANCHOR</em></span></div><div class="bb-realm-list"></div>';
  const list=nexus.querySelector('.bb-realm-list');
  for(const realm of REALMS){
    const button=document.createElement('button');
    button.className='bb-realm-card';button.dataset.realm=realm.id;button.dataset.status=realm.status;
    button.innerHTML=`<small>${realm.status==='open'?'STABLE GATE':'LOCKED SIGNAL'}</small><strong>${realm.name}</strong><span>${realm.subtitle}</span>`;
    button.addEventListener('click',()=>realm.status==='open'?renderExplore():toast('This realm has not stabilized yet.'));
    list.appendChild(button);
  }
  host.appendChild(nexus);
}
function statePoint(){const s=loadState();return {x:s.x,y:s.y}}
function revealZones(state){
  const discovered=new Set(state.discovered);
  if(state.y<.47)discovered.add('north');
  if(state.x<.38)discovered.add('west');
  if(state.x>.64)discovered.add('east');
  if(state.y>.66)discovered.add('south');
  const next=[...discovered];
  if(next.length!==state.discovered.length||next.some(v=>!state.discovered.includes(v))){
    state.discovered=next;saveState(state);
  }
  return discovered;
}
function positionPlayer(state){
  if(!player)return;
  player.style.left=`${(state.x*100).toFixed(2)}%`;player.style.top=`${(state.y*100).toFixed(2)}%`;
}
function updateExplore(){
  if(currentView!=='explore'||!stage||!player)return;
  const state=loadState(),discovered=revealZones(state);
  positionPlayer(state);
  stage.querySelectorAll('.bb-fog').forEach(el=>el.classList.toggle('revealed',discovered.has(el.dataset.zone)));
  stage.querySelectorAll('.bb-poi').forEach(el=>{
    const poi=POIS.find(item=>item.id===el.dataset.poi);
    const visible=poi&&(discovered.has(poi.zone)||poi.zone==='south');
    el.hidden=!visible;
    el.dataset.cleared=String(state.cleared.includes(poi?.id)||state.claimed.includes(poi?.id));
  });
  const candidates=POIS.filter(poi=>!stage.querySelector(`[data-poi="${poi.id}"]`)?.hidden);
  nearbyPoi=candidates.map(poi=>({poi,d:distance(state,poi)})).sort((a,b)=>a.d-b.d)[0];
  if(!nearbyPoi||nearbyPoi.d>.115)nearbyPoi=null;
  const panel=stage.querySelector('.bb-nearby');
  if(panel){
    panel.hidden=!nearbyPoi;
    if(nearbyPoi){
      const {poi}=nearbyPoi;
      panel.querySelector('strong').textContent=poi.title;
      panel.querySelector('span').textContent=poi.copy;
      const action=panel.querySelector('button');
      action.textContent=poi.kind==='battle'?(state.cleared.includes(poi.id)?'CLEARED':'ENGAGE'):poi.kind==='gate'?'INSPECT':'INTERACT';
      action.disabled=poi.kind==='battle'&&state.cleared.includes(poi.id);
    }
  }
  const count=stage.querySelector('[data-discovery-count]');if(count)count.textContent=`${Math.min(4,discovered.size-1)} / 4 REVEALED`;
  const fragments=stage.querySelector('[data-fragments]');if(fragments)fragments.textContent=`✦ ${state.fragments} RIFT FRAGMENTS`;
}
function moveTo(x,y){
  if(currentView!=='explore')return;
  target={x:clamp(x,.08,.92),y:clamp(y,.12,.88)};
  if(!moveFrame){lastTime=performance.now();moveFrame=requestAnimationFrame(stepMove);}
}
function stepMove(now){
  moveFrame=0;if(currentView!=='explore'||!target)return;
  const state=loadState(),dt=Math.min(.05,Math.max(.001,(now-lastTime)/1000));lastTime=now;
  const dx=target.x-state.x,dy=target.y-state.y,len=Math.hypot(dx,dy);
  if(len<.006){state.x=target.x;state.y=target.y;target=null;saveState(state);updateExplore();return;}
  const speed=.29,step=Math.min(len,speed*dt);
  state.x+=dx/len*step;state.y+=dy/len*step;saveState(state);updateExplore();
  moveFrame=requestAnimationFrame(stepMove);
}
function nudge(dx,dy){
  const state=loadState();moveTo(state.x+dx,state.y+dy);
}
function interact(){
  if(!nearbyPoi)return;
  const poi=nearbyPoi.poi,state=loadState();
  if(poi.kind==='cache'){
    if(state.claimed.includes(poi.id))return toast('The cache is empty.');
    mutateState(s=>{s.claimed.push(poi.id);s.fragments+=1;s.discovered.push('west')});
    toast('Found 1 Rift Fragment.');updateExplore();return;
  }
  if(poi.kind==='shrine'){
    const first=!state.claimed.includes(poi.id);
    mutateState(s=>{s.claimed.push(poi.id);s.discovered.push('north');if(first)s.fragments+=1});
    toast(first?'Shrine stabilized. +1 Rift Fragment.':'The shrine is stable.');updateExplore();return;
  }
  if(poi.kind==='gate'){toast('The North Trail is sealed until the next exploration expansion.');return;}
  if(poi.kind==='battle'){
    if(state.cleared.includes(poi.id))return toast('This patrol has already been cleared.');
    queueEncounter(poi.id);
  }
}
function renderExplore(){
  currentView='explore';cancelAnimationFrame(moveFrame);moveFrame=0;target=null;
  const host=shell();host.innerHTML='';host.appendChild(topBar('SHINOBI REALM','VERDANT APPROACH','NEXUS',renderNexus));
  const wrap=document.createElement('main');wrap.className='bb-explore-wrap';
  stage=document.createElement('div');stage.className='bb-explore-stage';stage.setAttribute('aria-label','Explorable Shinobi Realm zone');
  stage.innerHTML=`
    <div class="bb-explore-hud"><span class="bb-explore-chip" data-discovery-count>0 / 4 REVEALED</span><span class="bb-explore-chip" data-fragments>✦ 0 RIFT FRAGMENTS</span></div>
    <div class="bb-fog" data-zone="north"></div><div class="bb-fog" data-zone="west"></div><div class="bb-fog" data-zone="east"></div>
    <div class="bb-player"><img alt="Explorer"></div>
    <div class="bb-nearby" hidden><strong></strong><span></span><button type="button"></button></div>
    <div class="bb-dpad" aria-label="Movement controls"><button data-dir="up">▲</button><button data-dir="left">◀</button><button data-dir="down">▼</button><button data-dir="right">▶</button></div>`;
  for(const poi of POIS){
    const marker=document.createElement('button');marker.type='button';marker.className='bb-poi';marker.dataset.poi=poi.id;
    marker.style.left=`${poi.x*100}%`;marker.style.top=`${poi.y*100}%`;marker.setAttribute('aria-label',poi.title);
    marker.addEventListener('click',event=>{event.stopPropagation();moveTo(poi.x,poi.y+.055)});
    stage.appendChild(marker);
  }
  player=stage.querySelector('.bb-player');player.querySelector('img').src=leaderArt();
  stage.addEventListener('pointerdown',event=>{
    if(event.target.closest('button'))return;
    const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;
    moveTo((event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height);
  });
  stage.querySelector('.bb-nearby button').addEventListener('click',interact);
  const delta={up:[0,-.055],down:[0,.055],left:[-.055,0],right:[.055,0]};
  stage.querySelectorAll('.bb-dpad button').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();const [dx,dy]=delta[button.dataset.dir]||[0,0];nudge(dx,dy)}));
  wrap.appendChild(stage);host.appendChild(wrap);updateExplore();
}

function queueEncounter(id){
  const poi=POIS.find(item=>item.id===id&&item.kind==='battle');if(!poi)return false;
  pendingEncounter={id:poi.id,title:poi.title,realm:'shinobi',mapStage:poi.mapStage||4,stage:poi.mapStage||4};
  close();
  if(typeof window.startBattle!=='function'){pendingEncounter=null;open('explore');toast('Battle entry is unavailable in this build.');return false;}
  setTimeout(()=>window.startBattle('level'),40);
  return true;
}
function consumePendingEncounter(){
  const next=pendingEncounter;pendingEncounter=null;return next;
}
function applyEncounterToBattle(state,encounter){
  const C=window.BlazingRoadContent;if(!state||!encounter||!C?.stageConfig)return null;
  const cfg=C.stageConfig(encounter.stage||4),statMax=C.STAT_MAX||100;
  const stat=value=>Math.max(1,Math.min(statMax,Math.round(Number(value)||1)));
  state.enemies=cfg.enemies.slice(0,4).map((spec,index)=>{
    const stats=spec.stats||{};
    const e={name:spec.name,spriteKey:spec.name,bbBasicEnemyId:spec.spriteId||spec.id,mark:spec.mark,x:spec.x,y:spec.y,r:19,hp:1,maxHp:1,speed:1,attack:1,defense:1,gauge:0,shape:{type:'circle',r:43},archetype:'enemy_basic'};
    window.BlazingBasicEnemySprites?.preload?.(e.bbBasicEnemyId);
    e.maxHp=stat(stats.hp);e.hp=e.maxHp;e.attack=stat(stats.attack);e.defense=stat(stats.defense);e.speed=stat(stats.speed);
    e.bbRoadStage=cfg.stage;e.bbRoadElite=cfg.elite;e.bbRoadAi={...cfg.ai};e.bbRoadIndex=index;
    return e;
  });
  state.bbRoadContent=cfg;state.bbRoadStage=encounter.mapStage||cfg.stage;state.bbRealmEncounter={...encounter};
  state.log=`SHINOBI REALM — ${encounter.title}. Clear the roaming squad.`;
  return cfg;
}
function recordBattleVictory(encounter){
  if(!encounter?.id)return null;
  const before=loadState(),already=before.cleared.includes(encounter.id);
  const next=mutateState(state=>{
    state.cleared.push(encounter.id);state.discovered.push('east');
    if(!already)state.fragments+=2;
  });
  try{sessionStorage.setItem(RESUME_KEY,'1')}catch{}
  return next;
}
function maybeResume(){
  if(root&&!root.hidden)return;
  let resume=false;try{resume=sessionStorage.getItem(RESUME_KEY)==='1'}catch{}
  if(!resume)return;
  const menu=document.getElementById('menuScreen');
  const battle=document.getElementById('battleScreen');
  const menuVisible=menu&&!menu.hidden&&(menu.classList.contains('active')||getComputedStyle(menu).display!=='none');
  const battleVisible=battle&&!battle.hidden&&battle.classList.contains('active');
  const results=document.getElementById('bbMatchResults');
  if(!menuVisible||battleVisible||results?.classList.contains('active'))return;
  try{sessionStorage.removeItem(RESUME_KEY)}catch{}
  open('explore');toast('Returned to the Shinobi Realm.');
}

function ensureEntryButton(){
  ensureStyle();
  const shell=document.getElementById('bbHomeApproved');if(!shell)return null;
  let button=document.getElementById(ENTRY_ID);
  if(!button){
    button=document.createElement('button');button.id=ENTRY_ID;button.type='button';
    button.innerHTML='<i>◎</i><strong>WORLD NEXUS</strong><small>EXPLORE REALMS</small>';
    button.addEventListener('click',()=>open('nexus'));
    shell.appendChild(button);
  }
  return button;
}
function schedule(){
  requestAnimationFrame(()=>{ensureEntryButton();maybeResume();});
}
document.addEventListener('keydown',event=>{
  if(currentView!=='explore'||root?.hidden)return;
  const key=String(event.key||'').toLowerCase();keyboardDown.add(key);
  const map={arrowup:[0,-.045],w:[0,-.045],arrowdown:[0,.045],s:[0,.045],arrowleft:[-.045,0],a:[-.045,0],arrowright:[.045,0],d:[.045,0],e:null,' ':null};
  if(!(key in map))return;
  event.preventDefault();
  if(key==='e'||key===' ')interact();else{const [dx,dy]=map[key];nudge(dx,dy);}
});
document.addEventListener('keyup',event=>keyboardDown.delete(String(event.key||'').toLowerCase()));
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style']});
window.addEventListener('pageshow',schedule);
setTimeout(schedule,0);setTimeout(schedule,300);

window.BlazingRealmExplorer=Object.freeze({
  VERSION,STORAGE_KEY,REALMS,POIS,
  open,close,loadState,saveState,
  queueEncounter,consumePendingEncounter,applyEncounterToBattle,recordBattleVictory,
  renderNexus,renderExplore
});
})();