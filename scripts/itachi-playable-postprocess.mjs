import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=msg=>{throw new Error(`Itachi playable integration: ${msg}`)};
const replaceOne=(from,to,label)=>{
  const hits=html.split(from).length-1;
  if(hits!==1)fail(`expected one ${label}, found ${hits}`);
  html=html.replace(from,to);
};

replaceOne(
  "['crimson','subzero','lebee','senku','tyler','anubis']",
  "['crimson','subzero','lebee','senku','tyler','itachi','anubis']",
  'battle roster id list'
);
replaceOne(
  "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku','Tyler']);",
  "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku','Tyler','Itachi']);",
  'active playable whitelist'
);

const replaceRegexOne=(rx,to,label)=>{
  const matches=html.match(new RegExp(rx.source,rx.flags.includes('g')?rx.flags:rx.flags+'g'))||[];
  if(matches.length!==1)fail(`expected one ${label}, found ${matches.length}`);
  html=html.replace(rx,to);
};

replaceRegexOne(
  /const DEFAULT_ACTIVE_TEAM=Object\.freeze\(\[[^\]]+\]\);/,
  "const DEFAULT_ACTIVE_TEAM=Object.freeze(['Tyler','Itachi','Lebee','Senku','Sub-Zero','Crimson']);",
  'six-unit paired default team'
);
replaceRegexOne(
  /const TEAM_STORAGE_KEY='blazingBattle\.activeTeam\.v\d+';/,
  "const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v5';",
  'six-unit paired team storage version'
);
replaceRegexOne(
  /function validActiveTeam\(team\)\{\s*return Array\.isArray\(team\)\s*&& team\.length===3\s*&& new Set\(team\)\.size===3\s*&& team\.every\(name=>ACTIVE_PLAYABLE_UNITS\.includes\(name\)\);\s*\}/,
  `function validActiveTeam(team){
 return Array.isArray(team)
   && team.length===6
   && new Set(team).size===6
   && team.every(name=>ACTIVE_PLAYABLE_UNITS.includes(name));
}`,
  'six-unit active team validation'
);

const pairBuilderRx=/function buildPlayerPairs\(y\)\{.*?\n\}\nconst ACTIVE_BOSSES/s;
if(!pairBuilderRx.test(html))fail('paired team builder anchor missing');
html=html.replace(pairBuilderRx,`function buildPlayerPairs(y){
 const xs=[95,240,385];
 const team=getActiveTeam();
 const pairNames=[[team[0],team[1]],[team[2],team[3]],[team[4],team[5]]];
 return pairNames.map((names,i)=>{
   const units=names.map(name=>{
     if(!BATTLE_ROSTER[name]){console.error('Team unit "'+name+'" is not registered in BATTLE_ROSTER.');return emptyReserve();}
     return makeRosterUnit(name,teamSpawnOptions(name));
   });
   return {x:xs[i],y,active:0,gauge:0,units};
 });
}
const ACTIVE_BOSSES`);

const oldTeamMarkup=`<div class="teamIntro">
      <b>Choose your active three.</b> Tap a slot, then tap an owned battle-ready fighter.
      Selecting a fighter already in another slot swaps their positions.
    </div>
    <section id="teamSlots" class="teamSlots" aria-label="Active team slots">
      <button class="teamSlot selected" data-team-slot="0" data-slot-label="SLOT 1"><img alt=""><span class="teamSlotName">—</span></button>
      <button class="teamSlot" data-team-slot="1" data-slot-label="SLOT 2"><img alt=""><span class="teamSlotName">—</span></button>
      <button class="teamSlot" data-team-slot="2" data-slot-label="SLOT 3"><img alt=""><span class="teamSlotName">—</span></button>
    </section>`;
const newTeamMarkup=`<div class="teamIntro">
      <b>Build three battle pairs.</b> Each front fighter has one partner who can swap into battle.
      Tap any FRONT or PARTNER slot, then choose a fighter below. Selecting a fighter already assigned swaps their positions.
    </div>
    <section id="teamSlots" class="teamSlots bb-team-pairs" aria-label="Three battle pairs, six fighters">
      <div class="bb-team-pair" data-team-pair="0"><strong>PAIR 1</strong><span>FRONT</span><button class="teamSlot selected" data-team-slot="0" data-slot-label="PAIR 1 FRONT"><img alt=""><span class="teamSlotName">—</span></button><span>PARTNER</span><button class="teamSlot" data-team-slot="1" data-slot-label="PAIR 1 PARTNER"><img alt=""><span class="teamSlotName">—</span></button></div>
      <div class="bb-team-pair" data-team-pair="1"><strong>PAIR 2</strong><span>FRONT</span><button class="teamSlot" data-team-slot="2" data-slot-label="PAIR 2 FRONT"><img alt=""><span class="teamSlotName">—</span></button><span>PARTNER</span><button class="teamSlot" data-team-slot="3" data-slot-label="PAIR 2 PARTNER"><img alt=""><span class="teamSlotName">—</span></button></div>
      <div class="bb-team-pair" data-team-pair="2"><strong>PAIR 3</strong><span>FRONT</span><button class="teamSlot" data-team-slot="4" data-slot-label="PAIR 3 FRONT"><img alt=""><span class="teamSlotName">—</span></button><span>PARTNER</span><button class="teamSlot" data-team-slot="5" data-slot-label="PAIR 3 PARTNER"><img alt=""><span class="teamSlotName">—</span></button></div>
    </section>`;
replaceOne(oldTeamMarkup,newTeamMarkup,'six-slot paired team editor markup');
replaceOne('SAVE ACTIVE TEAM','SAVE 3 PAIRS','paired team save label');

const pairStyle=`<style id="bb-team-pair-style">
#teamScreen .bb-team-pairs{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:9px!important;align-items:start!important}
#teamScreen .bb-team-pair{position:relative;display:grid;grid-template-columns:1fr;gap:5px;padding:8px 6px 10px;border:1px solid rgba(115,83,47,.42);border-radius:13px;background:linear-gradient(180deg,rgba(255,251,237,.78),rgba(224,205,168,.62));box-shadow:inset 0 1px rgba(255,255,255,.72),0 4px 10px rgba(64,45,26,.10)}
#teamScreen .bb-team-pair>strong{font:800 10px/1 var(--bb-font-animeace,AnimeAce2,sans-serif);letter-spacing:.05em;text-align:center;color:#4e3825}
#teamScreen .bb-team-pair>span{font:900 7px/1 system-ui,sans-serif;letter-spacing:.13em;text-align:center;color:#876b49}
#teamScreen .bb-team-pair .teamSlot{width:100%!important;min-width:0!important;min-height:112px!important;padding:5px!important}
#teamScreen .bb-team-pair .teamSlot img{width:100%!important;height:78px!important;object-fit:cover!important;object-position:center 22%!important;border-radius:8px 3px 8px 3px}
#teamScreen .bb-team-pair .teamSlotName{display:block!important;margin-top:4px!important;font-size:8px!important;line-height:1.05!important;text-align:center!important}
#teamScreen .bb-team-pair .teamSlot[data-team-slot="1"],#teamScreen .bb-team-pair .teamSlot[data-team-slot="3"],#teamScreen .bb-team-pair .teamSlot[data-team-slot="5"]{transform:scale(.94);transform-origin:center top}
#teamScreen .bb-team-pair .teamSlot.selected{outline:2px solid #44b9e8!important;box-shadow:0 0 0 3px rgba(68,185,232,.18),0 4px 12px rgba(42,89,110,.18)!important}
@media(max-width:430px){#teamScreen .teamBody{padding-left:8px!important;padding-right:8px!important}#teamScreen .bb-team-pairs{gap:6px!important}#teamScreen .bb-team-pair{padding:7px 4px 8px}#teamScreen .bb-team-pair .teamSlot{min-height:100px!important}#teamScreen .bb-team-pair .teamSlot img{height:68px!important}}
</style>`;
html=html.replace(/<\/head>/i,pairStyle+'</head>');

const frameRuntime=String.raw`
const ITACHI_IDLE_FRAMES=makeImageFrames([
 'assets/characters/itachi/sprites/runtime/idle/frame_01.png','assets/characters/itachi/sprites/runtime/idle/frame_02.png','assets/characters/itachi/sprites/runtime/idle/frame_03.png','assets/characters/itachi/sprites/runtime/idle/frame_04.png','assets/characters/itachi/sprites/runtime/idle/frame_05.png','assets/characters/itachi/sprites/runtime/idle/frame_06.png'
]);
const ITACHI_BASIC_FRAMES=makeImageFrames([
 'assets/characters/itachi/sprites/runtime/attack/basic/frame_01.png','assets/characters/itachi/sprites/runtime/attack/basic/frame_02.png','assets/characters/itachi/sprites/runtime/attack/basic/frame_03.png','assets/characters/itachi/sprites/runtime/attack/basic/frame_04.png','assets/characters/itachi/sprites/runtime/attack/basic/frame_05.png','assets/characters/itachi/sprites/runtime/attack/basic/frame_06.png'
]);
const ITACHI_TSUKUYOMI_FRAMES=makeImageFrames([
 'assets/characters/itachi/sprites/runtime/jutsu/tsukuyomi/cast/frame_01.png','assets/characters/itachi/sprites/runtime/jutsu/tsukuyomi/cast/frame_02.png','assets/characters/itachi/sprites/runtime/jutsu/tsukuyomi/cast/frame_03.png','assets/characters/itachi/sprites/runtime/jutsu/tsukuyomi/cast/frame_04.png','assets/characters/itachi/sprites/runtime/jutsu/tsukuyomi/cast/frame_05.png','assets/characters/itachi/sprites/runtime/jutsu/tsukuyomi/cast/frame_06.png'
]);
const ITACHI_TSUKUYOMI_OVERLAY_FRAMES=makeImageFrames([
 'assets/characters/itachi/vfx/jutsu/tsukuyomi/overlay/frame_01.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/overlay/frame_02.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/overlay/frame_03.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/overlay/frame_04.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/overlay/frame_05.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/overlay/frame_06.png'
]);
const ITACHI_TSUKUYOMI_MANDALA_FRAMES=makeImageFrames([
 'assets/characters/itachi/vfx/jutsu/tsukuyomi/mandala/frame_01.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/mandala/frame_02.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/mandala/frame_03.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/mandala/frame_04.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/mandala/frame_05.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/mandala/frame_06.png'
]);
const ITACHI_TSUKUYOMI_TARGET_FRAMES=makeImageFrames([
 'assets/characters/itachi/vfx/jutsu/tsukuyomi/target/frame_01.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/target/frame_02.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/target/frame_03.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/target/frame_04.png','assets/characters/itachi/vfx/jutsu/tsukuyomi/target/frame_05.png'
]);
function ensureItachiTsukuyomiCinematic(){
 let style=document.getElementById('bb-itachi-tsukuyomi-style');
 if(!style){
  style=document.createElement('style');style.id='bb-itachi-tsukuyomi-style';
  style.textContent='.bb-itachi-tsukuyomi-cinematic{position:fixed;inset:0;width:100vw;height:100dvh;z-index:2147483000;pointer-events:none;overflow:hidden;isolation:isolate;visibility:hidden;opacity:0;background:#050002;transition:opacity .12s linear}.bb-itachi-tsukuyomi-cinematic.bb-active{visibility:visible;opacity:1}.bb-itachi-tsukuyomi-cinematic .bb-tsu-shade{position:absolute;inset:-8%;background:radial-gradient(circle at 50% 48%,rgba(105,0,24,.42) 0%,rgba(34,0,10,.76) 46%,rgba(2,0,1,.98) 82%);transform:scale(1.08)}.bb-itachi-tsukuyomi-cinematic img{position:absolute;left:50%;top:50%;display:block;pointer-events:none;user-select:none;-webkit-user-drag:none;transform-origin:50% 50%}.bb-itachi-tsukuyomi-cinematic .bb-tsu-overlay{width:112vw;height:112dvh;object-fit:cover;transform:translate(-50%,-50%) scale(1.02);opacity:.82;mix-blend-mode:screen;filter:saturate(1.22) contrast(1.08)}.bb-itachi-tsukuyomi-cinematic .bb-tsu-mandala{width:min(112vw,96dvh);height:min(112vw,96dvh);object-fit:contain;transform:translate(-50%,-50%) scale(.96);opacity:.96;mix-blend-mode:screen;filter:saturate(1.18) contrast(1.08);animation:bbTsuMandalaPulse 1.5s ease-in-out infinite alternate}.bb-itachi-tsukuyomi-cinematic .bb-tsu-target{width:min(122vw,104dvh);height:min(122vw,104dvh);object-fit:contain;transform:translate(-50%,-50%) scale(.88);opacity:0;mix-blend-mode:screen}.bb-itachi-tsukuyomi-cinematic[data-phase="nightmare"] .bb-tsu-overlay{opacity:.96;filter:saturate(1.48) contrast(1.16)}.bb-itachi-tsukuyomi-cinematic[data-phase="nightmare"] .bb-tsu-mandala{transform:translate(-50%,-50%) scale(1.03);opacity:1}.bb-itachi-tsukuyomi-cinematic[data-phase="impact"] .bb-tsu-overlay{opacity:.9}.bb-itachi-tsukuyomi-cinematic[data-phase="impact"] .bb-tsu-mandala{opacity:.7}.bb-itachi-tsukuyomi-cinematic[data-phase="impact"] .bb-tsu-target{opacity:1;animation:bbTsuTargetImpact .72s cubic-bezier(.12,.76,.18,1) both}@keyframes bbTsuMandalaPulse{0%{filter:saturate(1.08) contrast(1.04) brightness(.88)}100%{filter:saturate(1.42) contrast(1.16) brightness(1.16)}}@keyframes bbTsuTargetImpact{0%{opacity:0;transform:translate(-50%,-50%) scale(.72);filter:brightness(1.7)}18%{opacity:1}62%{opacity:1;transform:translate(-50%,-50%) scale(1.02);filter:brightness(1.12)}100%{opacity:.86;transform:translate(-50%,-50%) scale(1);filter:brightness(.92)}}.bb-itachi-tsukuyomi-cinematic img{will-change:transform,opacity;backface-visibility:hidden;image-rendering:auto}.bb-itachi-tsukuyomi-cinematic .bb-tsu-overlay{width:100vw;height:100dvh;transform:translate3d(-50%,-50%,0);filter:saturate(1.12) contrast(1.04);animation:bbTsuOverlayDrift 2.8s linear infinite alternate}.bb-itachi-tsukuyomi-cinematic .bb-tsu-mandala{width:min(100vw,92dvh);height:min(100vw,92dvh);transform:translate3d(-50%,-50%,0);filter:saturate(1.12) contrast(1.04);animation:bbTsuMandalaSpin 7s linear infinite}.bb-itachi-tsukuyomi-cinematic[data-phase="release"] .bb-tsu-shade{opacity:0;transition:opacity .34s linear}@keyframes bbTsuOverlayDrift{0%{transform:translate3d(-50.4%,-50%,0) scale(1.004)}100%{transform:translate3d(-49.6%,-50%,0) scale(1.008)}}@keyframes bbTsuMandalaSpin{0%{transform:translate3d(-50%,-50%,0) rotate(0deg)}100%{transform:translate3d(-50%,-50%,0) rotate(360deg)}}';
  document.head.append(style);
 }
 let root=document.getElementById('bb-itachi-tsukuyomi-cinematic');
 if(!root){
  root=document.createElement('div');root.id='bb-itachi-tsukuyomi-cinematic';root.className='bb-itachi-tsukuyomi-cinematic';root.dataset.phase='ritual';root.setAttribute('aria-hidden','true');
  const shade=document.createElement('div');shade.className='bb-tsu-shade';
  const overlay=document.createElement('img');overlay.className='bb-tsu-overlay bb-tsu-overlay-a';overlay.alt='';
  const overlayB=document.createElement('img');overlayB.className='bb-tsu-overlay bb-tsu-overlay-b';overlayB.alt='';
  const mandala=document.createElement('img');mandala.className='bb-tsu-mandala bb-tsu-mandala-a';mandala.alt='';
  const mandalaB=document.createElement('img');mandalaB.className='bb-tsu-mandala bb-tsu-mandala-b';mandalaB.alt='';
  const target=document.createElement('img');target.className='bb-tsu-target';target.alt='';
  root.append(shade,overlay,overlayB,mandala,mandalaB,target);document.body.append(root);
 }
 return {root,shade:root.querySelector('.bb-tsu-shade'),overlays:[...root.querySelectorAll('.bb-tsu-overlay')],mandalas:[...root.querySelectorAll('.bb-tsu-mandala')],target:root.querySelector('.bb-tsu-target')};
}
function startItachiTsukuyomiCinematic(totalDuration,nightmareAt,revealAt){
 window.__bbItachiTsukuyomiStop?.();
 const refs=ensureItachiTsukuyomiCinematic(),started=performance.now();
 refs.root.classList.add('bb-active');refs.root.dataset.phase='ritual';
 let raf=0,stopped=false;
 const setSource=(node,img)=>{if(node&&img?.src&&node.src!==img.src)node.src=img.src};
 const blendFrames=(nodes,frames,position,opacity)=>{
  if(!nodes?.length||!frames?.length)return;
  const base=Math.floor(position),mix=position-base,i0=((base%frames.length)+frames.length)%frames.length,i1=(i0+1)%frames.length;
  setSource(nodes[0],frames[i0]);setSource(nodes[1]||nodes[0],frames[i1]);
  nodes[0].style.opacity=String(Math.max(0,opacity*(1-mix)));
  if(nodes[1])nodes[1].style.opacity=String(Math.max(0,opacity*mix));
 };
 const stop=()=>{
  if(stopped)return;stopped=true;if(raf)cancelAnimationFrame(raf);
  refs.root.classList.remove('bb-active');refs.root.dataset.phase='ritual';
  for(const node of [...(refs.overlays||[]),...(refs.mandalas||[])])node.style.opacity='0';
  if(refs.shade)refs.shade.style.opacity='';
  if(window.__bbItachiTsukuyomiStop===stop)window.__bbItachiTsukuyomiStop=null;
 };
 const tick=()=>{
  if(stopped)return;
  const elapsed=performance.now()-started;
  const releaseT=clamp((elapsed-revealAt)/340,0,1),visible=1-releaseT;
  refs.root.dataset.phase=elapsed>=revealAt?'release':elapsed>=nightmareAt?'nightmare':'ritual';
  const phaseBoost=elapsed>=nightmareAt?1:.86;
  blendFrames(refs.overlays,ITACHI_TSUKUYOMI_OVERLAY_FRAMES,elapsed/96,visible*phaseBoost);
  blendFrames(refs.mandalas,ITACHI_TSUKUYOMI_MANDALA_FRAMES,elapsed/112,visible);
  if(refs.shade)refs.shade.style.opacity=String(Math.max(0,visible));
  if(elapsed<totalDuration)raf=requestAnimationFrame(tick);else stop();
 };
 tick();
 window.__bbItachiTsukuyomiStop=stop;
 return stop;
}
const ITACHI_CROW_BURST=new Image();ITACHI_CROW_BURST.src='assets/characters/itachi/vfx/basic/crows/crow_chakra_burst.png';
const ITACHI_CROW_SWARM=new Image();ITACHI_CROW_SWARM.src='assets/characters/itachi/vfx/basic/crows/crow_swarm.png';
const ITACHI_CROW_VORTEX=new Image();ITACHI_CROW_VORTEX.src='assets/characters/itachi/vfx/basic/crows/crow_vortex_ring.png';
const ITACHI_CROW_FEATHERSTORM=new Image();ITACHI_CROW_FEATHERSTORM.src='assets/characters/itachi/vfx/basic/crows/crow_featherstorm.png';
const ITACHI_CROW_FLOCK_SHEET=new Image();ITACHI_CROW_FLOCK_SHEET.src='assets/characters/itachi/vfx/basic/crows/crow_flock_lightning_sheet.png';
`;
const idleAnchor='function unitIdleFrames(name){';
const idleAt=html.indexOf(idleAnchor);
if(idleAt<0)fail('unitIdleFrames anchor missing');
html=html.slice(0,idleAt)+frameRuntime+'\n'+html.slice(idleAt);
html=html.replace(idleAnchor,"function unitIdleFrames(name){if(name==='Itachi')return ITACHI_IDLE_FRAMES;");

const attackAnchor='function unitAttackFrames(name,kind){';
if(!html.includes(attackAnchor))fail('unitAttackFrames anchor missing');
html=html.replace(attackAnchor,"function unitAttackFrames(name,kind){if(name==='Itachi'){if(kind==='tsukuyomi'||kind==='special'||kind==='jutsu')return ITACHI_TSUKUYOMI_FRAMES;return ITACHI_BASIC_FRAMES;}");

const itachiAnimations=String.raw`
function animateItachiCrowStrike(unitName,from,enemy,onImpact,onDone,attackKind='basic_attack'){
 const token=ACTIVE_ACTION_TOKEN;
 const state=ensureAnimState();if(!state.attackPose)state.attackPose={};
 const releaseDelay=360,flightDuration=560,impactHold=280,totalDuration=releaseDelay+flightDuration+impactHold;
 state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:totalDuration};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  const fx={kind:'itachiCrowStrike',from:{x:from.x,y:from.y-26},to:{x:enemy.x,y:enemy.y-18},start:performance.now(),duration:flightDuration+impactHold,flightDuration,impactHold,life:1};
  S.floaters.push(fx);
  setTimeout(()=>{
   if(!actionTokenAlive(token))return;
   try{onImpact&&onImpact()}catch(err){console.error('Itachi Crow Chakra Strike impact failed:',err);return recoverAction('Itachi basic impact')}
   setTimeout(()=>{
    S.floaters=S.floaters.filter(x=>x!==fx);
    const st=ensureAnimState();if(st.attackPose)delete st.attackPose[unitName];
    window.BlazingAttackPresentation.clearFacing(st,unitName);
    if(actionTokenAlive(token)){try{onDone&&onDone()}catch(err){recoverAction('Itachi basic completion')}}
   },impactHold);
  },flightDuration);
 },releaseDelay);
}

function animateItachiTsukuyomi(unitName,from,enemy,onImpact,onDone){
 const token=ACTIVE_ACTION_TOKEN;
 const state=ensureAnimState();if(!state.attackPose)state.attackPose={};
 const overlayDelay=260,nightmareAt=1180,battlefieldRevealAt=2150,impactAt=2650,impactHold=900,totalDuration=impactAt+impactHold;
 state.attackPose[unitName]={kind:'tsukuyomi',start:performance.now(),duration:900};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 const data=canonicalUnit('itachi'),meta=data?.abilities?.jutsu?.presentation||{};
 S.jutsuDim={start:performance.now(),alpha:Math.min(.36,meta.screen_dim_alpha??.36),end:null};
 let stopCinematic=null;
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  const cinematicDuration=(battlefieldRevealAt-overlayDelay)+360;
  stopCinematic=startItachiTsukuyomiCinematic(cinematicDuration,nightmareAt-overlayDelay,battlefieldRevealAt-overlayDelay);
 },overlayDelay);
 setTimeout(()=>{
  if(!actionTokenAlive(token)){stopCinematic?.();return}
  const liveTargets=(S.enemies||[]).filter(target=>target&&target.hp>0);
  const primaryBefore=Number(enemy?.hp);
  const impactFx={kind:'itachiTsukuyomiImpact',x:enemy.x,y:enemy.y-18,start:performance.now(),duration:780,life:1};
  const secondary=liveTargets.filter(target=>target&&target!==enemy&&target.hp>0);
  const stunFx=secondary.map(target=>({kind:'itachiStunPulse',x:target.x,y:target.y-22,start:performance.now(),duration:900,life:1}));
  S.floaters.push(impactFx,...stunFx);
  try{onImpact&&onImpact()}catch(err){stopCinematic?.();console.error('Itachi Tsukuyomi primary impact failed:',err);return recoverAction('Itachi Tsukuyomi impact')}
  try{
   if(enemy&&enemy.hp>0&&Number(enemy.hp)===primaryBefore){
    const pair=(S.pairs||[]).find(p=>front(p)?.name===unitName),actor=pair?front(pair):null;
    const multiplier=Number(data?.abilities?.jutsu?.damage_multiplier)||1.75;
    const damage=Math.max(1,window.BlazingCombatRuntime.computeScaledDamage(actor?.attack??data?.stats?.attack??40,multiplier));
    window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage});
   }
   const turns=Math.max(1,Number(data?.abilities?.jutsu?.status_turns)||1);
   window.BlazingCombatRuntime.execute('apply_status_targets',{targets:secondary,parameters:{effect:'stun',turns,source:unitName}});
  }catch(err){console.error('Itachi Tsukuyomi status resolution failed:',err)}
  setTimeout(()=>{
   stopCinematic?.();
   S.floaters=S.floaters.filter(x=>x!==impactFx&&!stunFx.includes(x));
   if(S.jutsuDim)S.jutsuDim.end=performance.now();
   const st=ensureAnimState();if(st.attackPose)delete st.attackPose[unitName];
   window.BlazingAttackPresentation.clearFacing(st,unitName);
   if(actionTokenAlive(token)){try{onDone&&onDone()}catch(err){recoverAction('Itachi Tsukuyomi completion')}}
  },impactHold);
 },impactAt);
}

`;
const freezeAnchor='function animateFreezeBlast(unitName,from,enemy,onImpact,onDone){';
const freezeAt=html.indexOf(freezeAnchor);
if(freezeAt<0)fail('Freeze Blast animation anchor missing');
html=html.slice(0,freezeAt)+itachiAnimations+html.slice(freezeAt);

const vfxAnchor="}else if(f.kind==='lebeeStarProjectile'){window.BlazingVfxRenderer.drawLebeeStarProjectile(ctx,f,LEBEE_STAR_PROJECTILE);}";
if(!html.includes(vfxAnchor))fail('floater VFX renderer anchor missing');
const itachiVfx=String.raw`}else if(f.kind==='itachiCrowStrike'){
      const age=performance.now()-f.start,flight=Math.max(1,f.flightDuration||560),impact=Math.max(1,f.impactHold||280);
      const travelT=clamp(age/flight,0,1),impactT=clamp((age-flight)/impact,0,1),ease=1-Math.pow(1-travelT,2.12);
      const x=f.from.x+(f.to.x-f.from.x)*ease,y=f.from.y+(f.to.y-f.from.y)*ease-8*Math.sin(Math.PI*travelT);
      const dir=f.to.x>=f.from.x?1:-1,tilt=clamp(Math.atan2(f.to.y-f.from.y,Math.max(1,Math.abs(f.to.x-f.from.x))),-.16,.16);
      const drawItachiCrowSheetFrame=(frame,cx,cy,width,alpha=1)=>{
       const img=ITACHI_CROW_FLOCK_SHEET;
       if(!img?.complete||!img.naturalWidth||!img.naturalHeight)return false;
       const cols=4,rows=2,sw=img.naturalWidth/cols,sh=img.naturalHeight/rows,index=Math.max(0,Math.min(7,frame|0));
       const sx=(index%cols)*sw,sy=Math.floor(index/cols)*sh,height=width*(sh/sw);
       ctx.save();ctx.translate(cx,cy);ctx.rotate(tilt);ctx.scale(dir,1);ctx.globalAlpha*=alpha;
       ctx.shadowColor='rgba(176,8,38,.26)';ctx.shadowBlur=5;
       ctx.drawImage(img,sx,sy,sw,sh,-width*.5,-height*.5,width,height);
       ctx.restore();return true;
      };
      if(age<=flight){
       ctx.save();ctx.globalCompositeOperation='source-over';
       for(let i=0;i<6;i++){
        const sx=x-dir*(10+i*11),sy=y+Math.sin(i*1.31+travelT*7)*4.5,r=7+i*1.6,alpha=(.105-i*.011)*(1-travelT*.24);
        const smoke=ctx.createRadialGradient(sx,sy,0,sx,sy,r);smoke.addColorStop(0,'rgba(150,8,32,'+alpha+')');smoke.addColorStop(.52,'rgba(88,0,20,'+(alpha*.66)+')');smoke.addColorStop(1,'rgba(35,0,8,0)');ctx.fillStyle=smoke;ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();
       }
       ctx.restore();
       const frame=Math.min(5,Math.floor(travelT*6)),width=111+19.5*travelT;
       if(!drawItachiCrowSheetFrame(frame,x,y,width,.98)){
        ctx.save();ctx.translate(x,y);ctx.scale(dir,1);ctx.fillStyle='rgba(5,5,9,.94)';ctx.shadowColor='rgba(190,8,38,.55)';ctx.shadowBlur=5;
        for(let i=0;i<4;i++){ctx.save();ctx.translate(-i*17,(i%2?8:-7));ctx.beginPath();ctx.moveTo(-10,1);ctx.quadraticCurveTo(-2,-10,9,-5);ctx.lineTo(15,-1);ctx.lineTo(9,2);ctx.quadraticCurveTo(-2,9,-10,3);ctx.closePath();ctx.fill();ctx.restore();}
        ctx.restore();
       }
      }else{
       const frame=6+Math.min(1,Math.floor(impactT*2)),fade=Math.max(.18,1-impactT*.62),width=136+23*impactT;
       drawItachiCrowSheetFrame(frame,f.to.x,f.to.y,width,fade);
       ctx.save();ctx.translate(f.to.x,f.to.y);ctx.globalCompositeOperation='screen';
       const flash=ctx.createRadialGradient(0,0,0,0,0,26+28*impactT);flash.addColorStop(0,'rgba(235,36,63,'+(.20*(1-impactT))+')');flash.addColorStop(.45,'rgba(148,5,36,'+(.12*(1-impactT))+')');flash.addColorStop(1,'rgba(40,0,8,0)');ctx.fillStyle=flash;ctx.beginPath();ctx.arc(0,0,58,0,Math.PI*2);ctx.fill();ctx.restore();
      }else if(f.kind==='itachiTsukuyomiImpact'){
       const age=performance.now()-f.start,duration=Math.max(1,f.duration||780),t=clamp(age/duration,0,1),frames=ITACHI_TSUKUYOMI_TARGET_FRAMES;
       const pos=t*Math.max(0,frames.length-1),i0=Math.floor(pos),i1=Math.min(frames.length-1,i0+1),mix=pos-i0;
       const drawImpactFrame=(img,alpha)=>{
        if(!img?.complete||!img.naturalWidth||alpha<=0)return;
        const width=132+46*t,height=width*(img.naturalHeight/img.naturalWidth);
        ctx.save();ctx.translate(f.x,f.y);ctx.globalCompositeOperation='screen';ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=true;ctx.drawImage(img,-width/2,-height/2,width,height);ctx.restore();
       };
       drawImpactFrame(frames[i0],1-mix);drawImpactFrame(frames[i1],mix);
       ctx.save();ctx.translate(f.x,f.y);ctx.globalCompositeOperation='screen';
       const flash=ctx.createRadialGradient(0,0,0,0,0,34+42*t);flash.addColorStop(0,'rgba(255,228,235,'+(.42*(1-t))+')');flash.addColorStop(.28,'rgba(225,26,62,'+(.34*(1-t))+')');flash.addColorStop(1,'rgba(70,0,18,0)');ctx.fillStyle=flash;ctx.beginPath();ctx.arc(0,0,78,0,Math.PI*2);ctx.fill();ctx.restore();
      }else if(f.kind==='itachiStunPulse'){
       const age=performance.now()-f.start,duration=Math.max(1,f.duration||900),t=clamp(age/duration,0,1),pulse=.5+.5*Math.sin(age/75);
       ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha*=Math.max(0,1-t);
       ctx.strokeStyle='rgba(236,55,88,.88)';ctx.shadowColor='rgba(170,10,48,.72)';ctx.shadowBlur=7+5*pulse;ctx.lineWidth=1.6;
       ctx.beginPath();ctx.ellipse(0,-18,18+5*pulse,7+2*pulse,0,0,Math.PI*2);ctx.stroke();
       ctx.fillStyle='rgba(255,224,231,.92)';ctx.font='700 9px system-ui';ctx.textAlign='center';ctx.fillText('STUN',0,-31);ctx.restore();
      }
        `+vfxAnchor;
html=html.replace(vfxAnchor,itachiVfx);

const basicNeedle=`    if(au.name==='Lebee'){
      runBasicAttack=animateLebeeStarBlast;basicTarget=enemy;
    }else if(au.name==='Senku'){`;
const basicReplacement=`    if(au.name==='Lebee'){
      runBasicAttack=animateLebeeStarBlast;basicTarget=enemy;
    }else if(au.name==='Itachi'){
      runBasicAttack=animateItachiCrowStrike;basicTarget=enemy;
    }else if(au.name==='Senku'){`;
replaceOne(basicNeedle,basicReplacement,'Basic dispatcher');

replaceOne(
  `   const runActiveJutsu=(u.name==='Sub-Zero')?animateFreezeBlast:animateLunge;\n   const activeFrom=(u.name==='Sub-Zero')?from:from;\n   const activeTarget=(u.name==='Sub-Zero')?enemy:to;`,
  `   const runActiveJutsu=u.name==='Sub-Zero'?animateFreezeBlast:u.name==='Itachi'?animateItachiTsukuyomi:animateLunge;\n   const activeFrom=from;\n   const activeTarget=(u.name==='Sub-Zero'||u.name==='Itachi')?enemy:to;`,
  'Jutsu dispatcher'
);
replaceOne(
  "if(enemy.hp<=0)handleEnemyKO(enemy,jDir); else if(u.name!=='Sub-Zero')recoil(enemy,()=>{},jDir,true);",
  "if(enemy.hp<=0)handleEnemyKO(enemy,jDir); else if(u.name!=='Sub-Zero'&&u.name!=='Itachi')recoil(enemy,()=>{},jDir,true);",
  'Jutsu recoil exception'
);

for(const marker of [
  "['crimson','subzero','lebee','senku','tyler','itachi','anubis']",
  "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku','Tyler','Itachi']);",
  'ITACHI_IDLE_FRAMES','ITACHI_BASIC_FRAMES','ITACHI_TSUKUYOMI_FRAMES','ITACHI_TSUKUYOMI_OVERLAY_FRAMES','ITACHI_TSUKUYOMI_MANDALA_FRAMES','ITACHI_TSUKUYOMI_TARGET_FRAMES',
  'crow_chakra_burst.png','crow_swarm.png','crow_vortex_ring.png','crow_featherstorm.png','crow_flock_lightning_sheet.png','ITACHI_CROW_FLOCK_SHEET','drawItachiCrowSheetFrame',
  "if(name==='Itachi')return ITACHI_IDLE_FRAMES",
  "if(name==='Itachi'){if(kind==='tsukuyomi'",
  'function animateItachiCrowStrike(','function animateItachiTsukuyomi(','function ensureItachiTsukuyomiCinematic(','function startItachiTsukuyomiCinematic(',
  "f.kind==='itachiCrowStrike'","f.kind==='itachiTsukuyomiImpact'","f.kind==='itachiStunPulse'","bb-itachi-tsukuyomi-cinematic","bb-tsu-overlay","bb-tsu-mandala","bb-tsu-target","apply_status_targets","battlefieldRevealAt",
  "au.name==='Itachi'",
  "u.name==='Itachi'?animateItachiTsukuyomi"
])if(!html.includes(marker))fail(`final shell missing ${marker}`);

if(html.includes("\\`")||html.includes("\\${"))fail("generated runtime contains escaped template syntax");
await fs.writeFile(file,html);
console.log('Itachi playable integration PASS: smooth full-screen Tsukuyomi takeover, battlefield impact VFX, one primary hit, and reusable secondary stun are wired.');
