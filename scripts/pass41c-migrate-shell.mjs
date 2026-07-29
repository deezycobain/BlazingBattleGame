import fs from 'node:fs/promises';

const file='index.html';
let html=await fs.readFile(file,'utf8');
const beforeBytes=Buffer.byteLength(html);
const changes={script:0,frames:0,animationMap:0,bomb:0,dispatcher:0};

function replaceOnce(oldText,newText,label){
  const first=html.indexOf(oldText);
  if(first<0)throw new Error(`Pass 4.1c migration anchor missing: ${label}`);
  if(html.indexOf(oldText,first+oldText.length)>=0)throw new Error(`Pass 4.1c migration anchor not unique: ${label}`);
  html=html.slice(0,first)+newText+html.slice(first+oldText.length);
}

if(!html.includes('runtime/movement/retreat-runtime.js')){
  replaceOnce(
    '<script src="runtime/animation/attack-presentation.js"></script>',
    '<script src="runtime/animation/attack-presentation.js"></script>\n<script src="runtime/movement/retreat-runtime.js"></script>',
    'retreat runtime script tag'
  );
  changes.script=1;
}

if(!html.includes('const SENKU_RETREAT_RUN_FRAMES=')){
  replaceOnce(
    'function makeImageFrames(list){return window.BlazingFrameRuntime.loadFrames(list);}',
    `function makeImageFrames(list){return window.BlazingFrameRuntime.loadFrames(list);}\nconst SENKU_RETREAT_RUN_FRAMES=makeImageFrames([\n  'assets/characters/senku/sprites/runtime/movement/retreat_run/frame_01.webp',\n  'assets/characters/senku/sprites/runtime/movement/retreat_run/frame_02.webp',\n  'assets/characters/senku/sprites/runtime/movement/retreat_run/frame_03.webp',\n  'assets/characters/senku/sprites/runtime/movement/retreat_run/frame_04.webp',\n  'assets/characters/senku/sprites/runtime/movement/retreat_run/frame_05.webp',\n  'assets/characters/senku/sprites/runtime/movement/retreat_run/frame_06.webp'\n]);`,
    'Senku retreat frame loader'
  );
  changes.frames=1;
}

if(!html.includes('retreat_run:SENKU_RETREAT_RUN_FRAMES||[]')){
  replaceOnce(
    '      kick:ATTACK_SPRITES.Senku?.kick||[],\n      special:SENKU_CHEM_CAST_FRAMES||[]',
    '      kick:ATTACK_SPRITES.Senku?.kick||[],\n      retreat_run:SENKU_RETREAT_RUN_FRAMES||[],\n      special:SENKU_CHEM_CAST_FRAMES||[]',
    'Senku retreat animation map'
  );
  changes.animationMap=1;
}

const bombRx=/function animateSenkuBomb\(unitName,from,enemy,onImpact,onDone,attackKind='punch'\)\{[\s\S]*?\n\}\n\nfunction setMeteorFullscreenFlash/;
if(!html.includes('function animateSenkuRetreatBomb(')){
  if(!bombRx.test(html))throw new Error('Pass 4.1c migration anchor missing: animateSenkuBomb');
  const replacement=`function animateSenkuBomb(unitName,from,enemy,onImpact,onDone,attackKind='punch',options={}){
 const token=ACTIVE_ACTION_TOKEN;
 const meta=canonicalUnit('senku')?.abilities?.basic?.presentation||{};
 const castDuration=meta.cast_duration_ms||560;
 const flightDuration=meta.flight_duration_ms||620;
 const blastDuration=meta.impact_duration_ms||430;
 const arcHeight=meta.arc_height_px||86;
 const releaseRatio=Number.isFinite(options.releaseRatio)?clamp(options.releaseRatio,0,1):.76;
 const releaseOrigin=typeof options.releaseOrigin==='function'?options.releaseOrigin:()=>from;
 const manageBody=options.manageBody!==false;

 if(manageBody){
  const state=ensureAnimState();
  if(!state.attackPose)state.attackPose={};
  state.attackPose[unitName]={kind:attackKind,start:performance.now(),duration:castDuration};
  if(options.lockFacing!==false)window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 }

 setTimeout(()=>{
   if(!actionTokenAlive(token))return;
   const launch=releaseOrigin()||from;
   const projectile={kind:'senkuBombProjectile',from:{x:launch.x,y:launch.y-31},to:{x:enemy.x,y:enemy.y-12},start:performance.now(),duration:flightDuration,arcHeight,life:1};
   S.floaters.push(projectile);

   setTimeout(()=>{
     if(!actionTokenAlive(token))return;
     S.floaters=S.floaters.filter(x=>x!==projectile);
     const targetGroundY=(enemy.feetY??enemy.groundY??enemy.y);
     const blast={kind:'senkuExplosion',x:enemy.x,y:targetGroundY,layer:'ground',start:performance.now(),duration:360,life:1};
     S.floaters.push(blast);

     try{onImpact&&onImpact();}catch(err){console.error('Senku bomb impact failed:',err);return recoverAction('Senku bomb impact');}

     setTimeout(()=>{
       S.floaters=S.floaters.filter(x=>x!==blast);
       if(manageBody){
        const st=ensureAnimState();
        if(st.attackPose)delete st.attackPose[unitName];
        window.BlazingAttackPresentation.clearFacing(st,unitName);
       }
       if(actionTokenAlive(token)){
         try{onDone&&onDone();}catch(err){recoverAction('Senku bomb completion');}
       }
     },blastDuration);
   },flightDuration);
 },castDuration*releaseRatio);
}

function animateSenkuRetreatBomb(unitName,pair,from,enemy,onImpact,onDone,attackKind='retreat_run'){
 const token=ACTIVE_ACTION_TOKEN;
 const meta=canonicalUnit('senku')?.abilities?.basic?.presentation||{};
 const retreatDuration=meta.close_retreat_duration_ms||540;
 const plan=window.BlazingRetreatRuntime.computeRetreatPlan({
  from,
  threat:enemy,
  minDistance:meta.close_retreat_min_px??48,
  maxDistance:meta.close_retreat_max_px??88,
  bounds:BATTLE_BOUNDS,
  rng:Math.random
 });
 const start=performance.now();
 const state=ensureAnimState();
 if(!state.attackPose)state.attackPose={};
 state.attackPose[unitName]={kind:attackKind,start,duration:retreatDuration};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,plan.destination);

 animateSenkuBomb(unitName,from,enemy,onImpact,onDone,attackKind,{
  releaseRatio:meta.close_bomb_release_ratio??.22,
  releaseOrigin:()=>ensureAnimState().positions?.[unitName]||from,
  manageBody:false,
  lockFacing:false
 });

 function retreat(now){
  if(!actionTokenAlive(token))return;
  const t=clamp((now-start)/retreatDuration,0,1);
  const st=ensureAnimState();
  st.positions[unitName]=window.BlazingRetreatRuntime.interpolate(from,plan.destination,t);
  if(t<1)return requestAnimationFrame(retreat);
  pair.x=plan.destination.x;
  pair.y=plan.destination.y;
  if(st.positions)delete st.positions[unitName];
  if(st.attackPose?.[unitName]?.kind===attackKind)delete st.attackPose[unitName];
  window.BlazingAttackPresentation.clearFacing(st,unitName);
 }
 requestAnimationFrame(retreat);
}

function setMeteorFullscreenFlash`;
  html=html.replace(bombRx,replacement);
  changes.bomb=1;
}

const dispatcherRx=/    const basicPresentation=window\.BlazingAttackPresentation\.selectBasicPresentation\(canonicalUnit\(au\.name\),from,enemy,requestedBasicKind\);\n    const runBasicAttack=\(au\.name==='Lebee'\)\n      \? animateLebeeStarBlast\n      : \(basicPresentation\.runtimeDriver==='animateSenkuBomb'\?animateSenkuBomb:animateLunge\);\n    const basicTarget=\(au\.name==='Lebee'\|\|basicPresentation\.runtimeDriver==='animateSenkuBomb'\)\?enemy:to;\n   runBasicAttack\(au\.name,from,basicTarget,/;
if(!html.includes('const wantsRetreat=basicPresentation.runtimeDriver')){
  if(!dispatcherRx.test(html))throw new Error('Pass 4.1c migration anchor missing: basic dispatcher');
  html=html.replace(dispatcherRx,`    const basicPresentation=window.BlazingAttackPresentation.selectBasicPresentation(canonicalUnit(au.name),from,enemy,requestedBasicKind);
    const isPrimaryAttacker=attackIndex===1;
    const wantsRetreat=basicPresentation.runtimeDriver==='animateSenkuRetreatBomb'
      && (basicPresentation.repositionScope!=='primary_attacker'||isPrimaryAttacker);
    const basicMeta=canonicalUnit(au.name)?.abilities?.basic?.presentation||{};
    const effectiveAnimationKind=(basicPresentation.runtimeDriver==='animateSenkuRetreatBomb'&&!wantsRetreat)
      ? (basicMeta.far_animation_kind||requestedBasicKind)
      : basicPresentation.animationKind;
    let runBasicAttack,basicTarget;
    if(au.name==='Lebee'){
      runBasicAttack=animateLebeeStarBlast;basicTarget=enemy;
    }else if(au.name==='Senku'){
      runBasicAttack=wantsRetreat
        ? (unitName,startPos,target,onHit,onFinish,kind)=>animateSenkuRetreatBomb(unitName,ap,startPos,target,onHit,onFinish,kind)
        : animateSenkuBomb;
      basicTarget=enemy;
    }else{
      runBasicAttack=animateLunge;basicTarget=to;
    }
   runBasicAttack(au.name,from,basicTarget,`);
  const kindAnchor='},()=>setTimeout(runAttacker,85),basicPresentation.animationKind)';
  if(!html.includes(kindAnchor))throw new Error('Pass 4.1c migration anchor missing: basic animation kind');
  html=html.replace(kindAnchor,'},()=>setTimeout(runAttacker,85),effectiveAnimationKind)');
  changes.dispatcher=1;
}

await fs.writeFile(file,html);
console.log(JSON.stringify({status:'success',before_bytes:beforeBytes,after_bytes:Buffer.byteLength(html),changes},null,2));
