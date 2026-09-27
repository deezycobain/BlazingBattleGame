import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const file=path.join(root,'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('September 27 asset integration: '+message)};
const unit=async id=>JSON.parse(await fs.readFile(path.join(root,'assets','characters',id,'data','unit.json'),'utf8'));
const [gaara,naruto,itachi]=await Promise.all([unit('gaara'),unit('naruto_solar'),unit('itachi')]);

const unitTag=/(<script id="blazing-unit-data">window\.BLAZING_UNIT_DATA=)(\{.*?\})(;<\/script>)/s;
const matched=html.match(unitTag);
if(!matched)fail('embedded unit data tag missing');
const units=JSON.parse(matched[2]);
Object.assign(units,{gaara,naruto_solar:naruto,itachi});
html=html.replace(unitTag,(_,open,_data,close)=>open+JSON.stringify(units)+close);

const rosterSource="'madara','anubis'";
const rosterTarget="'madara','gaara','naruto_solar','anubis'";
if(html.includes(rosterSource))html=html.replace(rosterSource,rosterTarget);
else if(!html.includes(rosterTarget))fail('battle roster anchor missing');

const activeRx=/const ACTIVE_PLAYABLE_UNITS=Object\.freeze\(\[([^\]]*)\]\);/;
const active=html.match(activeRx);
if(!active)fail('active playable whitelist missing');
const activeNames=[...active[1].matchAll(/'([^']+)'/g)].map(entry=>entry[1]);
for(const name of ['Egyptian Gaara','Solar Pharaoh Naruto'])if(!activeNames.includes(name))activeNames.push(name);
html=html.replace(activeRx,"const ACTIVE_PLAYABLE_UNITS=Object.freeze(["+activeNames.map(name=>`'${name}'`).join(',')+"]);" );

const runtime=String.raw`
const SEPTEMBER27_BODY_RUNTIME=(()=>{
 const ids=Object.freeze({'Egyptian Gaara':'gaara','Solar Pharaoh Naruto':'naruto_solar'}),cache=new Map();
 const resolve=(name,kind)=>{
  const id=ids[name];if(!id)return null;
  let data=null;try{data=canonicalUnit(id)}catch(_){return null}
  const animation=data?.animation_standard?.animations?.[kind];
  const rels=animation?.frames;if(!Array.isArray(rels)||![6,8,10,12].includes(rels.length))return null;
  const key=name+':'+kind;
  if(!cache.has(key))cache.set(key,makeImageFrames(rels.map(rel=>'assets/characters/'+id+'/'+rel+'?september27=v1')));
  return cache.get(key);
 };
 return Object.freeze({has:name=>Object.prototype.hasOwnProperty.call(ids,name),idle:name=>resolve(name,'idle'),run:name=>resolve(name,'run'),basic:name=>resolve(name,'basic_attack'),recoil:name=>resolve(name,'recoil')});
})();
const SEPTEMBER27_VFX=Object.freeze({
 fireballProjectile:{root:'assets/vfx/uploaded-v3/fireball/projectile',count:8},
 fireballImpact:{root:'assets/vfx/uploaded-v3/fireball/impact',count:8},
 sandBlast:{root:'assets/vfx/uploaded-v3/sand/blast',count:12},
 groundDust:{root:'assets/vfx/uploaded-v3/common/ground_dust_slash',count:12},
 rasenganProjectile:{root:'assets/vfx/uploaded-v3/rasengan/projectile',count:6},
 rasenganImpact:{root:'assets/vfx/uploaded-v3/rasengan/impact',count:6}
});
const SEPTEMBER27_VFX_CACHE=new Map();
function september27VfxFrames(key){
 const descriptor=SEPTEMBER27_VFX[key];if(!descriptor)return [];
 if(!SEPTEMBER27_VFX_CACHE.has(key))SEPTEMBER27_VFX_CACHE.set(key,makeImageFrames(Array.from({length:descriptor.count},(_,index)=>descriptor.root+'/frame_'+String(index+1).padStart(2,'0')+'.png?september27=v3')));
 return SEPTEMBER27_VFX_CACHE.get(key);
}
function drawSeptember27VfxFrame(ctx,key,progress,x,y,height,{filter='',alpha=1,flip=1,rotation=0}={}){
 const frames=september27VfxFrames(key),index=Math.min(Math.max(0,frames.length-1),Math.floor(Math.max(0,Math.min(.9999,progress))*frames.length)),img=frames[index];
 if(!(img?.complete&&img.naturalWidth>0&&img.naturalHeight>0))return false;
 const h=Math.max(1,height),w=h*(img.naturalWidth/img.naturalHeight);
 ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(flip,1);ctx.globalAlpha*=alpha;if(filter)ctx.filter=filter;ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();return true;
}
function animateSeptember27Projectile(unitName,from,enemy,onImpact,onDone,{kind,cast=340,flight=520,impact=420,dim=0}={}){
 const token=ACTIVE_ACTION_TOKEN,state=ensureAnimState();if(!state.attackPose)state.attackPose={};
 state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:cast};
 const facing=window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 if(dim)S.jutsuDim={start:performance.now(),alpha:dim,end:null};
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  const fx={kind,from:{x:from.x+Math.cos(facing)*18,y:from.y-29+Math.sin(facing)*5},to:{x:enemy.x,y:enemy.y-18},start:performance.now(),flightDuration:flight,impactDuration:impact,life:1};
  S.floaters.push(fx);if(state.attackPose)delete state.attackPose[unitName];
  setTimeout(()=>{
   if(!actionTokenAlive(token))return;
   try{onImpact&&onImpact()}catch(error){console.error(kind+' impact failed:',error);return recoverAction(kind+' impact')}
   setTimeout(()=>{
    S.floaters=S.floaters.filter(item=>item!==fx);const active=ensureAnimState();if(active.attackPose)delete active.attackPose[unitName];
    if(S.jutsuDim)S.jutsuDim.end=performance.now();window.BlazingAttackPresentation.clearFacing(active,unitName);
    if(actionTokenAlive(token))try{onDone&&onDone()}catch(error){recoverAction(kind+' completion')}
   },impact);
  },flight);
 },cast);
}
function animateItachiAmaterasu(unitName,from,enemy,onImpact,onDone){return animateSeptember27Projectile(unitName,from,enemy,onImpact,onDone,{kind:'itachiAmaterasu',cast:340,flight:520,impact:520,dim:.14})}
function animateGaaraSandBlast(unitName,from,enemy,onImpact,onDone){return animateSeptember27Projectile(unitName,from,enemy,onImpact,onDone,{kind:'gaaraSandBlast',cast:360,flight:560,impact:420})}
function animateSolarNarutoRasengan(unitName,from,enemy,onImpact,onDone){return animateSeptember27Projectile(unitName,from,enemy,onImpact,onDone,{kind:'solarNarutoRasengan',cast:350,flight:520,impact:440,dim:.08})}
`;
const idleAnchor='function unitIdleFrames(name){';
const idleAt=html.indexOf(idleAnchor);
if(idleAt<0)fail('idle frame resolver missing');
if(!html.includes('const SEPTEMBER27_BODY_RUNTIME=(()=>{'))html=html.slice(0,idleAt)+runtime+'\n'+html.slice(idleAt);

const idleSource='function unitIdleFrames(name){const uploadedRun=';
const idleTarget="function unitIdleFrames(name){const septemberRun=SEPTEMBER27_BODY_RUNTIME.has(name)&&S?.drag&&S?.dragUnitName===name?SEPTEMBER27_BODY_RUNTIME.run(name):null;const septemberIdle=SEPTEMBER27_BODY_RUNTIME.has(name)?SEPTEMBER27_BODY_RUNTIME.idle(name):null;if(septemberRun?.length)return septemberRun;if(septemberIdle?.length)return septemberIdle;const uploadedRun=";
if(html.includes(idleSource))html=html.replace(idleSource,idleTarget);
else if(!html.includes('const septemberRun=SEPTEMBER27_BODY_RUNTIME'))fail('idle runtime anchor missing');

const attackSource='function unitAttackFrames(name,kind){const uploadedBasic=';
const attackTarget="function unitAttackFrames(name,kind){const septemberBasic=SEPTEMBER27_BODY_RUNTIME.has(name)&&kind!=='jutsu'&&kind!=='special'?SEPTEMBER27_BODY_RUNTIME.basic(name):null;if(septemberBasic?.length)return septemberBasic;const uploadedBasic=";
if(html.includes(attackSource))html=html.replace(attackSource,attackTarget);
else if(!html.includes('const septemberBasic=SEPTEMBER27_BODY_RUNTIME'))fail('attack runtime anchor missing');

const cadenceSource=' const uploadedRunning=UPLOADED_CHARACTER_MOTION.has(name)&&S?.drag&&S?.dragUnitName===name;\n const idleMs=(obitoRunning||itachiRunning||uploadedRunning)?85:';
const cadenceTarget=' const uploadedRunning=UPLOADED_CHARACTER_MOTION.has(name)&&S?.drag&&S?.dragUnitName===name;\n const septemberRunning=SEPTEMBER27_BODY_RUNTIME.has(name)&&S?.drag&&S?.dragUnitName===name;\n const idleMs=(obitoRunning||itachiRunning||uploadedRunning||septemberRunning)?85:';
if(html.includes(cadenceSource))html=html.replace(cadenceSource,cadenceTarget);
else if(!html.includes('const septemberRunning=SEPTEMBER27_BODY_RUNTIME'))fail('run cadence anchor missing');

const recoilSource="if(!visual&&fx?.kind==='hit'&&UPLOADED_CHARACTER_MOTION.has(name)){\n   const recoilFrames=UPLOADED_CHARACTER_MOTION.recoil(name);";
const recoilTarget="if(!visual&&fx?.kind==='hit'&&(UPLOADED_CHARACTER_MOTION.has(name)||SEPTEMBER27_BODY_RUNTIME.has(name))){\n   const recoilFrames=UPLOADED_CHARACTER_MOTION.has(name)?UPLOADED_CHARACTER_MOTION.recoil(name):SEPTEMBER27_BODY_RUNTIME.recoil(name);";
if(html.includes(recoilSource))html=html.replace(recoilSource,recoilTarget);
else if(!html.includes('SEPTEMBER27_BODY_RUNTIME.recoil(name)'))fail('recoil runtime anchor missing');

const ghostSource="const ghostFrames=name==='Itachi'?ITACHI_IDLE_FRAMES:unitIdleFrames(name);";
const ghostTarget="const ghostFrames=name==='Itachi'?ITACHI_IDLE_FRAMES:(SEPTEMBER27_BODY_RUNTIME.has(name)?SEPTEMBER27_BODY_RUNTIME.idle(name):unitIdleFrames(name));";
if(html.includes(ghostSource))html=html.replace(ghostSource,ghostTarget);
else if(!html.includes('SEPTEMBER27_BODY_RUNTIME.has(name)?SEPTEMBER27_BODY_RUNTIME.idle(name)'))fail('origin ghost anchor missing');

const dragSource="if((heldName==='Obito'||heldName==='Madara'||heldName==='Itachi')&&Math.abs(pt.x-previousDragX)>=1.25)S.dragFacing=pt.x<previousDragX?-1:1;";
const dragTarget="if((heldName==='Obito'||heldName==='Madara'||heldName==='Itachi'||heldName==='Egyptian Gaara'||heldName==='Solar Pharaoh Naruto')&&Math.abs(pt.x-previousDragX)>=1.25)S.dragFacing=pt.x<previousDragX?-1:1;";
if(html.includes(dragSource))html=html.replace(dragSource,dragTarget);
else if(!html.includes("heldName==='Egyptian Gaara'"))fail('drag-facing anchor missing');

const facingSource="if((actor.name==='Obito'||actor.name==='Madara'||actor.name==='Itachi')&&S.drag&&S.dragUnitName===actor.name&&Number.isFinite(S.dragFacing)){";
const facingTarget="if((actor.name==='Obito'||actor.name==='Madara'||actor.name==='Itachi'||actor.name==='Egyptian Gaara'||actor.name==='Solar Pharaoh Naruto')&&S.drag&&S.dragUnitName===actor.name&&Number.isFinite(S.dragFacing)){";
if(html.includes(facingSource))html=html.replace(facingSource,facingTarget);
else if(!html.includes("actor.name==='Egyptian Gaara'"))fail('body facing anchor missing');

const obitoSource="const fx={kind:'obitoFireball',from:{x:from.x+dir*18,y:from.y-27},to:{x:enemy.x,y:enemy.y-18},start:performance.now(),duration:flightDuration+impactHold,flightDuration,impactHold,life:1};";
const obitoTarget="const fx={kind:'uploadedFireball',from:{x:from.x+dir*18,y:from.y-27},to:{x:enemy.x,y:enemy.y-18},start:performance.now(),duration:flightDuration+impactHold,flightDuration,impactHold,life:1};";
if(html.includes(obitoSource))html=html.replace(obitoSource,obitoTarget);
else if(!html.includes("kind:'uploadedFireball'"))fail('Obito fireball source anchor missing');

const vfxMarker="}else if(f.kind==='obitoFireball'){";
const vfx=`}else if(f.kind==='uploadedFireball'){
     const age=performance.now()-f.start,flight=Math.max(1,f.flightDuration||560),impact=Math.max(1,f.impactHold||300),travel=Math.min(1,age/flight),ease=1-Math.pow(1-travel,2.25),x=f.from.x+(f.to.x-f.from.x)*ease,y=f.from.y+(f.to.y-f.from.y)*ease-7*Math.sin(Math.PI*travel);
     if(age<=flight){if(!drawSeptember27VfxFrame(ctx,'fireballProjectile',travel,x,y,70,{rotation:Math.atan2(f.to.y-f.from.y,f.to.x-f.from.x)})){ctx.fillStyle='#ff7020';ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.fill();}}
     else{const t=Math.min(1,(age-flight)/impact);if(!drawSeptember27VfxFrame(ctx,'fireballImpact',t,f.to.x,f.to.y,104,{alpha:1-t})){ctx.strokeStyle='rgba(255,130,20,'+(1-t)+')';ctx.lineWidth=4;ctx.beginPath();ctx.arc(f.to.x,f.to.y,18+42*t,0,Math.PI*2);ctx.stroke();}}
    }else if(f.kind==='itachiAmaterasu'){
     const age=performance.now()-f.start,flight=Math.max(1,f.flightDuration||520),impact=Math.max(1,f.impactDuration||520),travel=Math.min(1,age/flight),ease=1-Math.pow(1-travel,2.35),x=f.from.x+(f.to.x-f.from.x)*ease,y=f.from.y+(f.to.y-f.from.y)*ease-9*Math.sin(Math.PI*travel);
     const filter='grayscale(1) contrast(1.95) brightness(.30) drop-shadow(0 0 7px rgba(110,34,180,.95))';
     if(age<=flight){if(!drawSeptember27VfxFrame(ctx,'fireballProjectile',travel,x,y,68,{filter,rotation:Math.atan2(f.to.y-f.from.y,f.to.x-f.from.x)})){ctx.fillStyle='#18051f';ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.fill();}}
     else{const t=Math.min(1,(age-flight)/impact);drawSeptember27VfxFrame(ctx,'fireballImpact',t,f.to.x,f.to.y,112,{filter,alpha:1-t});ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle='rgba(164,68,255,'+(1-t)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.to.x,f.to.y,20+40*t,0,Math.PI*2);ctx.stroke();ctx.restore();}
    }else if(f.kind==='gaaraSandBlast'){
     const age=performance.now()-f.start,flight=Math.max(1,f.flightDuration||560),impact=Math.max(1,f.impactDuration||420),travel=Math.min(1,age/flight),ease=1-Math.pow(1-travel,2.1),x=f.from.x+(f.to.x-f.from.x)*ease,y=f.from.y+(f.to.y-f.from.y)*ease-5*Math.sin(Math.PI*travel),direction=f.to.x>=f.from.x?1:-1;
     if(age<=flight)drawSeptember27VfxFrame(ctx,'sandBlast',travel,x,y,78,{flip:direction,rotation:Math.atan2(f.to.y-f.from.y,f.to.x-f.from.x)});
     else{const t=Math.min(1,(age-flight)/impact);drawSeptember27VfxFrame(ctx,'sandBlast',Math.min(.999,t*.32+.72),f.to.x,f.to.y,118,{flip:direction,alpha:1-t});drawSeptember27VfxFrame(ctx,'groundDust',t,f.to.x,f.to.y+12,102,{flip:direction,alpha:1-t});}
    }else if(f.kind==='solarNarutoRasengan'){
     const age=performance.now()-f.start,flight=Math.max(1,f.flightDuration||520),impact=Math.max(1,f.impactDuration||440),travel=Math.min(1,age/flight),ease=1-Math.pow(1-travel,2.35),x=f.from.x+(f.to.x-f.from.x)*ease,y=f.from.y+(f.to.y-f.from.y)*ease-8*Math.sin(Math.PI*travel),gold='sepia(1) saturate(2.35) hue-rotate(332deg) brightness(1.45)';
     if(age<=flight)drawSeptember27VfxFrame(ctx,'rasenganProjectile',travel,x,y,76,{filter:gold,rotation:age/145});
     else{const t=Math.min(1,(age-flight)/impact);drawSeptember27VfxFrame(ctx,'rasenganImpact',t,f.to.x,f.to.y,122,{filter:gold,alpha:1-t,rotation:age/180});}
    `;
if(!html.includes("f.kind==='uploadedFireball'")){
 const at=html.indexOf(vfxMarker);if(at<0)fail('floater renderer insertion anchor missing');html=html.slice(0,at)+vfx+html.slice(at);
}

const jutsuSource="const runActiveJutsu=u.name==='Sub-Zero'?animateFreezeBlast:u.name==='Itachi'?animateItachiTsukuyomi:u.name==='Madara'?animateMadaraTruthSeekingOrb:animateLunge;\n   const activeFrom=from;\n   const activeTarget=(u.name==='Sub-Zero'||u.name==='Itachi'||u.name==='Madara')?enemy:to;";
const jutsuTarget="const runActiveJutsu=u.name==='Sub-Zero'?animateFreezeBlast:u.name==='Itachi'?animateItachiAmaterasu:u.name==='Egyptian Gaara'?animateGaaraSandBlast:u.name==='Solar Pharaoh Naruto'?animateSolarNarutoRasengan:u.name==='Madara'?animateMadaraTruthSeekingOrb:animateLunge;\n   const activeFrom=from;\n   const activeTarget=(u.name==='Sub-Zero'||u.name==='Itachi'||u.name==='Egyptian Gaara'||u.name==='Solar Pharaoh Naruto'||u.name==='Madara')?enemy:to;";
if(html.includes(jutsuSource))html=html.replace(jutsuSource,jutsuTarget);
else if(!html.includes("u.name==='Itachi'?animateItachiAmaterasu"))fail('Jutsu dispatcher anchor missing');

const recoilJutsuSource="if(enemy.hp<=0)handleEnemyKO(enemy,jDir); else if(u.name!=='Sub-Zero'&&u.name!=='Itachi')recoil(enemy,()=>{},jDir,true);";
const recoilJutsuTarget="if(enemy.hp<=0)handleEnemyKO(enemy,jDir); else if(u.name!=='Sub-Zero')recoil(enemy,()=>{},jDir,true);";
if(html.includes(recoilJutsuSource))html=html.replace(recoilJutsuSource,recoilJutsuTarget);
else if(!html.includes(recoilJutsuTarget))fail('Jutsu recoil anchor missing');

for(const marker of ['SEPTEMBER27_BODY_RUNTIME','SEPTEMBER27_VFX','animateItachiAmaterasu','animateGaaraSandBlast','animateSolarNarutoRasengan',"kind:'uploadedFireball'","f.kind==='uploadedFireball'","f.kind==='itachiAmaterasu'","f.kind==='gaaraSandBlast'","f.kind==='solarNarutoRasengan",'Egyptian Gaara','Solar Pharaoh Naruto',"u.name==='Itachi'?animateItachiAmaterasu"]){if(!html.includes(marker))fail('missing final marker '+marker)}
await fs.writeFile(file,html);
console.log('September 27 asset integration PASS: Egyptian Gaara, Solar Pharaoh Naruto, new fireball, Amaterasu, Sand Blast, and Sun Rasengan are test-ready with lazy VFX decoding.');
