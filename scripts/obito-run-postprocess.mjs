import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Obito run integration: '+message)};

// Expose the authored run sequence through the existing Legacy sprite resolver.
const basicExport="  basic:name=>resolve(name,'basic_attack'),\n  sequence";
const runExport="  basic:name=>resolve(name,'basic_attack'),\n  run:name=>resolve(name,'run'),\n  sequence";
if(html.includes(basicExport))html=html.replace(basicExport,runExport);
else if(!html.includes(runExport))fail('Legacy run resolver export anchor missing');

// Own the held-unit identity explicitly for the whole drag. S.ready.ref is an input helper and
// can change during the gesture; the animation renderer needs a persistent movement state.
const downSource=" S.dragOrigin={x:p.x,y:p.y};\n S.dragGrabOffset={x:p.x-pt.x,y:p.y-pt.y};";
const downTarget=" S.dragOrigin={x:p.x,y:p.y};\n S.dragUnitName=p.name||null;\n S.dragUnitRef=p;\n S.dragGhost={name:p.name||null,x:p.x,y:p.y};\n S.dragGrabOffset={x:p.x-pt.x,y:p.y-pt.y};";
if(html.includes(downSource))html=html.replace(downSource,downTarget);
else if(!html.includes('S.dragUnitName=p.name||null;'))fail('pointerdown persistent held-unit anchor missing');

// While Obito is actively held, the ordinary body renderer consumes his authored run loop.
// Everyone else keeps the existing idle path until their own movement assets are authored.
const idleSource="function unitIdleFrames(name){const legacyShinobiIdle=LEGACY_SHINOBI_BODY_RUNTIME.idle(name);if(legacyShinobiIdle?.length)return LEGACY_SHINOBI_BODY_RUNTIME.sequence(name,'idle',legacyShinobiIdle);";
const idleTarget="function unitIdleFrames(name){const legacyShinobiRun=(name==='Obito'&&typeof S!=='undefined'&&S?.drag&&S?.dragUnitName===name)?LEGACY_SHINOBI_BODY_RUNTIME.run(name):null;if(legacyShinobiRun?.length)return LEGACY_SHINOBI_BODY_RUNTIME.sequence(name,'run',legacyShinobiRun);const legacyShinobiIdle=LEGACY_SHINOBI_BODY_RUNTIME.idle(name);if(legacyShinobiIdle?.length)return LEGACY_SHINOBI_BODY_RUNTIME.sequence(name,'idle',legacyShinobiIdle);";
if(html.includes(idleSource))html=html.replace(idleSource,idleTarget);
else if(!html.includes("S?.drag&&S?.dragUnitName===name"))fail('unitIdleFrames held-run anchor missing');

// Track horizontal drag direction from the real pointer stream. The run art is authored
// facing right and the authoritative body-facing resolver mirrors it when moving left.
const moveSource=" let p=S.ready.ref,pt=inputPoint(latest),v=S.dragVisual;";
const moveTarget=" let p=S.ready.ref,pt=inputPoint(latest),v=S.dragVisual;\n const held=S.dragUnitRef||p;\n const previousDragX=v?.lastX??pt.x;\n if(held?.name==='Obito'&&Math.abs(pt.x-previousDragX)>=1.25)S.dragFacing=pt.x<previousDragX?-1:1;";
if(html.includes(moveSource))html=html.replace(moveSource,moveTarget);
else if(!html.includes('const held=S.dragUnitRef||p;'))fail('pointermove direction anchor missing');

// Naruto-Blazing-style origin ghost. It is rendered in world space from the original feet
// anchor so it remains attached to the map while the live Obito runs under the pointer.
const shadowMarker='  // VISIBLE WORLD-SPACE CONTACT SHADOW';
const ghostBlock=`  // OBITO PICKUP ORIGIN GHOST\n  if(!isEnemy&&name==='Obito'&&S.drag&&S.dragGhost?.name==='Obito'){\n    const ghostFrames=LEGACY_SHINOBI_BODY_RUNTIME.idle('Obito');\n    const ghostFrame=ghostFrames?.[Math.floor(performance.now()/145)%Math.max(1,ghostFrames?.length||1)];\n    if(ghostFrame?.complete&&ghostFrame.naturalWidth>0&&ghostFrame.naturalHeight>0){\n      const gx=S.dragGhost.x,gy=S.dragGhost.y;\n      const ghostDepth=(S.bbRunMode==='road'&&window.BlazingRoadContent?.visualScaleForY)\n        ? Math.max(.82,Math.min(1.08,Number(window.BlazingRoadContent.visualScaleForY(S.bbRoadContent?.map,gy))||1))\n        : 1;\n      const ghostH=132*ghostDepth,ghostW=ghostH*(ghostFrame.naturalWidth/ghostFrame.naturalHeight);\n      ctx.save();\n      ctx.globalAlpha=.28;\n      ctx.filter='grayscale(.18) brightness(1.12)';\n      ctx.translate(gx,gy+17);\n      ctx.drawImage(ghostFrame,-ghostW/2,-ghostH,ghostW,ghostH);\n      ctx.restore();\n    }\n  }\n\n`;
if(html.includes(shadowMarker)&&!html.includes('// OBITO PICKUP ORIGIN GHOST'))html=html.replace(shadowMarker,ghostBlock+shadowMarker);
else if(!html.includes('// OBITO PICKUP ORIGIN GHOST'))fail('world-space ghost renderer anchor missing');

// Dropping the held Obito back on the original anchor cancels the gesture before normal
// move resolution. No movement is committed and therefore no turn/action is consumed.
const pointerUp="cvs.addEventListener('pointerup',ev=>{";
const cancelBlock=`cvs.addEventListener('pointerup',ev=>{\n const returningObito=(S.drag&&S.dragUnitName==='Obito'&&S.dragUnitRef&&S.dragOrigin)?S.dragUnitRef:null;\n if(returningObito){\n  const returnRadius=28;\n  const returnDistance=Math.hypot(returningObito.x-S.dragOrigin.x,returningObito.y-S.dragOrigin.y);\n  if(returnDistance<=returnRadius){\n   returningObito.x=S.dragOrigin.x;returningObito.y=S.dragOrigin.y;\n   S.drag=false;S.dragVisual=null;S.dragGrabOffset=null;S.dragFacing=null;\n   S.dragGhost=null;S.dragUnitName=null;S.dragUnitRef=null;S.dragOrigin=null;\n   try{if(cvs.hasPointerCapture?.(ev.pointerId))cvs.releasePointerCapture(ev.pointerId)}catch(_e){}\n   S.log='Movement cancelled';\n   return;\n  }\n }`;
if(html.includes(pointerUp)&&!html.includes('const returningObito='))html=html.replace(pointerUp,cancelBlock);
else if(!html.includes('const returningObito='))fail('pointerup no-turn cancel anchor missing');

// Drag-facing itself is resolved by strict-attack-facing-postprocess. Verify that contract
// is present in the generated runtime rather than patching the renderer a second time here.
if(!html.includes("actor.name==='Obito'&&S.drag&&S.dragUnitName===actor.name&&Number.isFinite(S.dragFacing)")){
  fail('authoritative drag-facing contract missing');
}

// Clear all movement-only state after a normal release/cancel so attack facing and idle
// presentation immediately regain authority.
html=html.replaceAll('S.dragVisual=null;S.dragOrigin=null;','S.dragVisual=null;S.dragOrigin=null;S.dragGhost=null;S.dragUnitName=null;S.dragUnitRef=null;');
html=html.replaceAll('S.dragGrabOffset=null;S.dragFacing=null;','S.dragGrabOffset=null;S.dragFacing=null;S.dragGhost=null;S.dragUnitName=null;S.dragUnitRef=null;');
if(!html.includes('S.dragGhost=null;S.dragUnitName=null;S.dragUnitRef=null;'))fail('drag release cleanup anchor missing');

// Obito's basic is a compact Uchiha fireball cast. Mechanics remain owned by the normal
// Basic callback; this driver changes only body timing, projectile travel, and impact VFX.
const obitoFireballRuntime=String.raw`
function animateObitoFireball(unitName,from,enemy,onImpact,onDone,attackKind='basic_attack'){
 const token=ACTIVE_ACTION_TOKEN;
 const state=ensureAnimState();if(!state.attackPose)state.attackPose={};
 const releaseDelay=360,flightDuration=560,impactHold=300,totalDuration=releaseDelay+flightDuration+impactHold;
 state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:720};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  const dir=enemy.x>=from.x?1:-1;
  const fx={kind:'obitoFireball',from:{x:from.x+dir*18,y:from.y-27},to:{x:enemy.x,y:enemy.y-18},start:performance.now(),duration:flightDuration+impactHold,flightDuration,impactHold,life:1};
  S.floaters.push(fx);
  const castState=ensureAnimState();if(castState.attackPose)delete castState.attackPose[unitName];
  setTimeout(()=>{
   if(!actionTokenAlive(token))return;
   try{onImpact&&onImpact()}catch(err){console.error('Obito Great Fireball impact failed:',err);return recoverAction('Obito basic impact')}
   setTimeout(()=>{
    S.floaters=S.floaters.filter(x=>x!==fx);
    const st=ensureAnimState();if(st.attackPose)delete st.attackPose[unitName];
    window.BlazingAttackPresentation.clearFacing(st,unitName);
    if(actionTokenAlive(token)){try{onDone&&onDone()}catch(err){recoverAction('Obito basic completion')}}
   },impactHold);
  },flightDuration);
 },releaseDelay);
}
`;
const freezeAnchor='function animateFreezeBlast(unitName,from,enemy,onImpact,onDone){';
const freezeAt=html.indexOf(freezeAnchor);
if(freezeAt<0)fail('Obito fireball animation anchor missing');
if(!html.includes('function animateObitoFireball('))html=html.slice(0,freezeAt)+obitoFireballRuntime+html.slice(freezeAt);

// Procedural fire rendering avoids reusing the green/electric Legacy effect. It uses a hot
// yellow-white core, orange/red flame shell, ember wake, and a short impact bloom. Itachi's
// postprocess runs first, so insert immediately before the surviving Lebee branch instead of
// replacing the original pre-Itachi branch text.
const lebeeVfxMarker="}else if(f.kind==='lebeeStarProjectile')";
const obitoFireVfx=String.raw`}else if(f.kind==='obitoFireball'){
      const age=performance.now()-f.start,flight=Math.max(1,f.flightDuration||560),impact=Math.max(1,f.impactHold||300);
      const travelT=clamp(age/flight,0,1),impactT=clamp((age-flight)/impact,0,1),ease=1-Math.pow(1-travelT,2.35);
      const x=f.from.x+(f.to.x-f.from.x)*ease,y=f.from.y+(f.to.y-f.from.y)*ease-7*Math.sin(Math.PI*travelT);
      const angle=Math.atan2(f.to.y-f.from.y,f.to.x-f.from.x),dir=f.to.x>=f.from.x?1:-1;
      if(age<=flight){
       ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalCompositeOperation='screen';
       const tail=24+8*Math.sin(age/55),tailGrad=ctx.createLinearGradient(-dir*tail,0,dir*10,0);
       tailGrad.addColorStop(0,'rgba(180,24,0,0)');tailGrad.addColorStop(.42,'rgba(255,54,0,.38)');tailGrad.addColorStop(1,'rgba(255,206,52,.72)');
       ctx.fillStyle=tailGrad;ctx.beginPath();ctx.moveTo(-dir*tail,-7);ctx.quadraticCurveTo(-dir*8,-14,dir*8,0);ctx.quadraticCurveTo(-dir*8,14,-dir*tail,7);ctx.closePath();ctx.fill();
       const outer=ctx.createRadialGradient(0,0,3,0,0,23);outer.addColorStop(0,'rgba(255,252,212,.98)');outer.addColorStop(.23,'rgba(255,216,78,.98)');outer.addColorStop(.58,'rgba(255,91,8,.94)');outer.addColorStop(.84,'rgba(184,18,0,.72)');outer.addColorStop(1,'rgba(88,0,0,0)');
       ctx.fillStyle=outer;ctx.beginPath();ctx.arc(0,0,23,0,Math.PI*2);ctx.fill();
       ctx.globalCompositeOperation='source-over';ctx.strokeStyle='rgba(255,126,20,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,14+2*Math.sin(age/45),0,Math.PI*2);ctx.stroke();
       for(let i=0;i<4;i++){const phase=age/95+i*1.7,ex=-dir*(19+i*7),ey=Math.sin(phase)*7;ctx.fillStyle='rgba(255,108,18,'+(0.55-i*.09)+')';ctx.beginPath();ctx.arc(ex,ey,2.4-i*.25,0,Math.PI*2);ctx.fill()}
       ctx.restore();
      }else{
       const t=Math.min(1,impactT),fade=1-t,radius=24+42*(1-Math.pow(1-t,2));
       ctx.save();ctx.translate(f.to.x,f.to.y);ctx.globalCompositeOperation='screen';
       const burst=ctx.createRadialGradient(0,0,0,0,0,radius);burst.addColorStop(0,'rgba(255,255,224,'+(fade*.96)+')');burst.addColorStop(.2,'rgba(255,212,66,'+(fade*.92)+')');burst.addColorStop(.5,'rgba(255,76,4,'+(fade*.72)+')');burst.addColorStop(1,'rgba(112,0,0,0)');ctx.fillStyle=burst;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();
       ctx.globalCompositeOperation='source-over';ctx.strokeStyle='rgba(255,104,12,'+(fade*.72)+')';ctx.lineWidth=Math.max(1,4*(1-t));ctx.beginPath();ctx.arc(0,0,18+32*t,0,Math.PI*2);ctx.stroke();
       for(let i=0;i<7;i++){const a=(Math.PI*2*i/7)+.35,toss=18+34*t;ctx.fillStyle='rgba(255,132,20,'+(fade*.75)+')';ctx.beginPath();ctx.arc(Math.cos(a)*toss,Math.sin(a)*toss*.62,2.5*(1-t*.55),0,Math.PI*2);ctx.fill()}
       ctx.restore();
      }
     `;
if(!html.includes("f.kind==='obitoFireball'")){
 const lebeeVfxAt=html.indexOf(lebeeVfxMarker);
 if(lebeeVfxAt<0)fail('Obito fireball renderer insertion marker missing');
 html=html.slice(0,lebeeVfxAt)+obitoFireVfx+html.slice(lebeeVfxAt);
}

// Route Obito through the dedicated cast after Itachi's custom basic and before Senku's
// specialized bomb/melee branch. This avoids the generic Legacy melee controller entirely.
const dispatchSource=`    }else if(au.name==='Itachi'){
      runBasicAttack=animateItachiCrowStrike;basicTarget=enemy;
    }else if(au.name==='Senku'){`;
const dispatchTarget=`    }else if(au.name==='Itachi'){
      runBasicAttack=animateItachiCrowStrike;basicTarget=enemy;
    }else if(au.name==='Obito'){
      runBasicAttack=animateObitoFireball;basicTarget=enemy;
    }else if(au.name==='Senku'){`;
if(html.includes(dispatchSource))html=html.replace(dispatchSource,dispatchTarget);
else if(!html.includes("au.name==='Obito'"))fail('Obito basic dispatcher anchor missing');

for(const marker of [
  "run:name=>resolve(name,'run')",
  "S?.drag&&S?.dragUnitName===name",
  'S.dragUnitName=p.name||null;',
  'S.dragGhost={name:p.name||null,x:p.x,y:p.y};',
  'const held=S.dragUnitRef||p;',
  '// OBITO PICKUP ORIGIN GHOST',
  'const returnRadius=28;',
  "actor.name==='Obito'&&S.drag&&S.dragUnitName===actor.name",
  'function animateObitoFireball(',
  "f.kind==='obitoFireball'",
  "au.name==='Obito'"
])if(!html.includes(marker))fail('missing final marker '+marker);

await fs.writeFile(file,html);
console.log('Obito integration PASS: held run/ghost/cancel plus dedicated red-orange Great Fireball presentation are wired without changing Basic combat values.');