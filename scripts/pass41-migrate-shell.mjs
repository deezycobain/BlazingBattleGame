import fs from 'node:fs/promises';

const file='index.html';
let html=await fs.readFile(file,'utf8');
const beforeBytes=Buffer.byteLength(html);
const changes={};

function replaceOnce(oldText,newText,label){
  const first=html.indexOf(oldText);
  if(first<0)throw new Error(`${label}: anchor not found`);
  if(html.indexOf(oldText,first+oldText.length)>=0)throw new Error(`${label}: anchor is not unique`);
  html=html.slice(0,first)+newText+html.slice(first+oldText.length);
  changes[label]=1;
}

function functionBounds(name){
  const needle=`function ${name}(`;
  const start=html.indexOf(needle);
  if(start<0)throw new Error(`${name}: function start not found`);
  if(html.indexOf(needle,start+needle.length)>=0)throw new Error(`${name}: function is not unique`);
  const brace=html.indexOf('{',start);
  let depth=0,inS=false,inD=false,inT=false,esc=false;
  for(let i=brace;i<html.length;i++){
    const c=html[i];
    if(esc){esc=false;continue;}
    if(c==='\\\\'){esc=true;continue;}
    if(!inD&&!inT&&c==="'")inS=!inS;
    else if(!inS&&!inT&&c==='"')inD=!inD;
    else if(!inS&&!inD&&c==='`')inT=!inT;
    if(inS||inD||inT)continue;
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return {start,end:i+1};
  }
  throw new Error(`${name}: function end not found`);
}

function replaceFunction(name,newText){
  const {start,end}=functionBounds(name);
  html=html.slice(0,start)+newText+html.slice(end);
  changes[`function ${name}`]=1;
}

function replaceAfter(marker,oldText,newText,label){
  const markerAt=html.indexOf(marker);
  if(markerAt<0)throw new Error(`${label}: marker not found`);
  const at=html.indexOf(oldText,markerAt);
  if(at<0)throw new Error(`${label}: target not found after marker`);
  const nextMarker=html.indexOf('\nfunction ',markerAt+marker.length);
  if(nextMarker>=0&&at>nextMarker)throw new Error(`${label}: target escaped expected function`);
  html=html.slice(0,at)+newText+html.slice(at+oldText.length);
  changes[label]=1;
}

replaceOnce(
  '<script src="runtime/animation/frame-runtime.js"></script>\n<script src="runtime/rendering/vfx-renderer.js"></script>',
  '<script src="runtime/animation/frame-runtime.js"></script>\n<script src="runtime/animation/attack-presentation.js"></script>\n<script src="runtime/rendering/vfx-renderer.js"></script>',
  'attack presentation script tag'
);

replaceFunction('unitAttackFrames',`function unitAttackFrames(name,kind){
  const attackMap=CHARACTER_ANIMATION_MAPS[name]?.attack||{};
  const resolvedKind=window.BlazingAttackPresentation.resolveFrameKind(kind,attackMap);
  return attackMap?.[resolvedKind]||[];
}`);

replaceFunction('updateFacing',`function bodyFacingRotation(actor,pos,isEnemy=false){
  const locked=window.BlazingAttackPresentation.lockedFacing(S.anim,actor?.name);
  if(Number.isFinite(locked))return locked;
  const target=isEnemy?nearestPlayerPoint(pos.x,pos.y):nearestEnemyPoint(pos.x,pos.y);
  return target
    ? window.BlazingAttackPresentation.rotationToward(pos,target,actor?.rotation||0)
    : (actor?.rotation||0);
}

function updateFacing(){
  // Mechanical attack geometry is authored independently from character-body facing.
  function authoredAttackRotation(actor,basicFallbackDeg,jutsuFallbackDeg=basicFallbackDeg){
    let deg=S.action==='jutsu'?jutsuFallbackDeg:basicFallbackDeg;
    try{
      if(actor?.name){
        const combat=canonicalUnit(actor.name)?.combat||{};
        if(S.action==='jutsu'&&Number.isFinite(combat.jutsu_rotation_deg))deg=combat.jutsu_rotation_deg;
        else if(Number.isFinite(combat.basic_rotation_deg))deg=combat.basic_rotation_deg;
      }
    }catch(_){ }
    return deg*Math.PI/180;
  }
  S.pairs.forEach(pair=>{
    (pair.units||[]).forEach(u=>{if(u)u.rotation=authoredAttackRotation(u,-90,-90);});
  });
  (S.enemies||[]).forEach(e=>{if(e)e.rotation=authoredAttackRotation(e,90,90);});
}`);

replaceFunction('animateLunge',`function animateLunge(unitName,from,to,onImpact,onDone,attackKind='punch'){
 const token=ACTIVE_ACTION_TOKEN;
 let start=performance.now(),dur=175,backDur=145;
 let anim=ensureAnimState();
 if(!anim.attackPose)anim.attackPose={};
 anim.attackPose[unitName]={kind:attackKind,start,duration:dur+150};
 window.BlazingAttackPresentation.lockFacing(anim,unitName,from,to);
 function go(now){
  if(!actionTokenAlive(token))return;
  let state=ensureAnimState();
  let t=Math.min(1,(now-start)/dur),ease=1-Math.pow(1-t,3);
  state.positions[unitName]={x:from.x+(to.x-from.x)*ease,y:from.y+(to.y-from.y)*ease};
  if(t<1)return requestAnimationFrame(go);
  try{onImpact&&onImpact()}catch(err){console.error('Attack impact callback failed:',err);return recoverAction('impact callback')}
  setTimeout(()=>{
   if(!actionTokenAlive(token))return;
   let bs=performance.now();
   function ret(n){
    if(!actionTokenAlive(token))return;
    let st=ensureAnimState();
    let q=Math.min(1,(n-bs)/backDur),e=1-Math.pow(1-q,3);
    st.positions[unitName]={x:to.x+(from.x-to.x)*e,y:to.y+(from.y-to.y)*e};
    if(q<1)return requestAnimationFrame(ret);
    delete st.positions[unitName];
    if(st.attackPose)delete st.attackPose[unitName];
    window.BlazingAttackPresentation.clearFacing(st,unitName);
    try{onDone&&onDone()}catch(err){console.error('Attack completion callback failed:',err);recoverAction('completion callback')}
   }
   requestAnimationFrame(ret)
  },65)
 }
 requestAnimationFrame(go)
}`);

replaceFunction('animateFreezeBlast',`function animateFreezeBlast(unitName,from,enemy,onImpact,onDone){
 const token=ACTIVE_ACTION_TOKEN;
 const castDuration=340;
 const flightDuration=420;
 const freezeHold=520;
 const castStart=performance.now();
 const state=ensureAnimState();
 if(!state.attackPose)state.attackPose={};
 state.attackPose[unitName]={kind:'freeze',start:castStart,duration:castDuration+flightDuration};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);

 setTimeout(()=>{
   if(!actionTokenAlive(token))return;
   const projectileStart=performance.now();
   const projectile={kind:'iceProjectile',from:{x:from.x+10,y:from.y-22},to:{x:enemy.x,y:enemy.y-18},start:projectileStart,duration:flightDuration,life:1};
   S.floaters.push(projectile);
   function fly(now){
     if(!actionTokenAlive(token))return;
     const t=Math.min(1,(now-projectileStart)/flightDuration);
     if(t<1)return requestAnimationFrame(fly);
     S.floaters=S.floaters.filter(x=>x!==projectile);
     try{onImpact&&onImpact()}catch(err){console.error('Freeze Blast impact failed:',err);return recoverAction('freeze blast impact')}
     const ice={kind:'frozenTarget',x:enemy.x,y:enemy.y,start:performance.now(),life:1};
     S.floaters.push(ice);
     setTimeout(()=>{
       if(!actionTokenAlive(token))return;
       S.floaters=S.floaters.filter(x=>x!==ice);
       const st=ensureAnimState();
       if(st.attackPose)delete st.attackPose[unitName];
       window.BlazingAttackPresentation.clearFacing(st,unitName);
       try{onDone&&onDone()}catch(err){console.error('Freeze Blast completion failed:',err);recoverAction('freeze blast completion')}
     },freezeHold);
   }
   requestAnimationFrame(fly);
 },castDuration);
}`);

replaceFunction('animateSenkuBomb',`function animateSenkuBomb(unitName,from,enemy,onImpact,onDone,attackKind='punch'){
 const token=ACTIVE_ACTION_TOKEN;
 const meta=canonicalUnit('senku')?.abilities?.basic?.presentation||{};
 const castDuration=meta.cast_duration_ms||560;
 const flightDuration=meta.flight_duration_ms||620;
 const blastDuration=meta.impact_duration_ms||430;
 const arcHeight=meta.arc_height_px||86;

 const state=ensureAnimState();
 if(!state.attackPose)state.attackPose={};
 state.attackPose[unitName]={kind:attackKind,start:performance.now(),duration:castDuration};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);

 setTimeout(()=>{
   if(!actionTokenAlive(token))return;
   const projectile={kind:'senkuBombProjectile',from:{x:from.x,y:from.y-31},to:{x:enemy.x,y:enemy.y-12},start:performance.now(),duration:flightDuration,arcHeight,life:1};
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
       const st=ensureAnimState();
       if(st.attackPose)delete st.attackPose[unitName];
       window.BlazingAttackPresentation.clearFacing(st,unitName);
       if(actionTokenAlive(token)){
         try{onDone&&onDone();}catch(err){recoverAction('Senku bomb completion');}
       }
     },blastDuration);
   },flightDuration);
 },castDuration*.76);
}`);

replaceOnce(
  "vis,u.name,false,facingFlip(u.rotation,u.name),(u.renderScale||1)",
  "vis,u.name,false,facingFlip(bodyFacingRotation(u,pos,false),u.name),(u.renderScale||1)",
  'player body-facing call'
);
replaceOnce(
  "null,(e.spriteKey||e.name),true,facingFlip(e.rotation,(e.spriteKey||e.name)),(e.sizeScale||1)",
  "null,(e.spriteKey||e.name),true,facingFlip(bodyFacingRotation(e,pos,true),(e.spriteKey||e.name)),(e.sizeScale||1)",
  'enemy body-facing call'
);

replaceOnce(
  "const runBasicAttack=(au.name==='Lebee')?animateLebeeStarBlast:(au.name==='Senku'?animateSenkuBomb:animateLunge);\n    const basicTarget=(au.name==='Lebee'||au.name==='Senku')?enemy:to;",
  "const requestedBasicKind=attackIndex%2===1?'punch':'kick';\n    const basicPresentation=window.BlazingAttackPresentation.selectBasicPresentation(canonicalUnit(au.name),from,enemy,requestedBasicKind);\n    const runBasicAttack=(au.name==='Lebee')\n      ? animateLebeeStarBlast\n      : (basicPresentation.runtimeDriver==='animateSenkuBomb'?animateSenkuBomb:animateLunge);\n    const basicTarget=(au.name==='Lebee'||basicPresentation.runtimeDriver==='animateSenkuBomb')?enemy:to;",
  'basic presentation selection'
);
replaceAfter(
  'const requestedBasicKind=',
  "},()=>setTimeout(runAttacker,85),attackIndex%2===1?'punch':'kick')",
  "},()=>setTimeout(runAttacker,85),basicPresentation.animationKind)",
  'basic animation-kind dispatch'
);

await fs.writeFile(file,html);
const afterBytes=Buffer.byteLength(html);
await fs.mkdir('dev-tools',{recursive:true});
await fs.writeFile('dev-tools/pass41-migration-report.json',JSON.stringify({status:'success',before_bytes:beforeBytes,after_bytes:afterBytes,changes},null,2));
console.log(JSON.stringify({status:'success',beforeBytes,afterBytes,changes},null,2));
