import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const file=path.join(root,'dist','index.html');
const unit=JSON.parse(await fs.readFile(path.join(root,'assets','characters','madara','data','unit.json'),'utf8'));
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Madara archive pilot: '+message)};

const unitTag=/(<script id="blazing-unit-data">window\.BLAZING_UNIT_DATA=)(\{.*?\})(;<\/script>)/s;
const match=html.match(unitTag);
if(!match)fail('embedded unit data tag missing');
const units=JSON.parse(match[2]);
units.madara=unit;
html=html.replace(unitTag,(_,open,_data,close)=>open+JSON.stringify(units)+close);

const rosterRx=/\['crimson','subzero','lebee','senku','tyler','itachi','kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza','anubis'\]/;
if(rosterRx.test(html))html=html.replace(rosterRx,"['crimson','subzero','lebee','senku','tyler','itachi','kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza','madara','anubis']");
else if(!html.includes("'madara','anubis'"))fail('battle roster anchor missing');

const activeRx=/const ACTIVE_PLAYABLE_UNITS=Object\.freeze\(\[([^\]]*)\]\);/;
const active=html.match(activeRx);
if(!active)fail('active playable whitelist missing');
const activeNames=[...active[1].matchAll(/'([^']+)'/g)].map(entry=>entry[1]);
if(!activeNames.includes('Madara'))activeNames.push('Madara');
html=html.replace(activeRx,"const ACTIVE_PLAYABLE_UNITS=Object.freeze(["+activeNames.map(name=>`'${name}'`).join(',')+"]);" );

const runtime=String.raw`
const MADARA_ARCHIVE_BODY_RUNTIME=(()=>{
 const cache=new Map();
 const resolve=kind=>{
  let unit=null;try{unit=canonicalUnit('Madara')}catch(_){return null}
  const rels=unit?.animation_standard?.animations?.[kind]?.frames;
  if(!Array.isArray(rels)||rels.length!==6)return null;
  if(!cache.has(kind))cache.set(kind,makeImageFrames(rels.map(rel=>'assets/characters/'+unit.id+'/'+rel+'?madaraArchivePilot=v1')));
  return cache.get(kind);
 };
 return Object.freeze({idle:()=>resolve('idle'),run:()=>resolve('run'),basic:()=>resolve('basic_attack')});
})();
const MADARA_TRUTH_SEEKING_ORB=new Image();
MADARA_TRUTH_SEEKING_ORB.src='assets/characters/madara/vfx/jutsu/truth_seeking_orb/orb.png';
function animateMadaraTruthSeekingOrb(unitName,from,enemy,onImpact,onDone){
 const token=ACTIVE_ACTION_TOKEN,meta=canonicalUnit('Madara')?.abilities?.jutsu?.presentation||{};
 const cast=Math.max(120,meta.cast_duration_ms||420),flight=Math.max(120,meta.flight_duration_ms||520),impact=Math.max(100,meta.impact_duration_ms||360);
 const state=ensureAnimState();if(!state.attackPose)state.attackPose={};
 state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:cast};
 const facing=window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 setTimeout(()=>{
  if(!actionTokenAlive(token))return;
  const orb={kind:'madaraTruthSeekingOrb',from:{x:from.x+Math.cos(facing)*18,y:from.y-33},to:{x:enemy.x,y:enemy.y-20},start:performance.now(),flightDuration:flight,impactDuration:impact,life:1};
  S.floaters.push(orb);if(state.attackPose)delete state.attackPose[unitName];
  setTimeout(()=>{
   if(!actionTokenAlive(token))return;
   try{onImpact&&onImpact()}catch(error){console.error('Madara Truth-Seeking Orb impact failed:',error);return recoverAction('Madara jutsu impact')}
   setTimeout(()=>{
    S.floaters=S.floaters.filter(item=>item!==orb);const st=ensureAnimState();if(st.attackPose)delete st.attackPose[unitName];
    window.BlazingAttackPresentation.clearFacing(st,unitName);if(actionTokenAlive(token)){try{onDone&&onDone()}catch(_){recoverAction('Madara jutsu completion')}}
   },impact);
  },flight);
 },cast);
}
`;
const idleAnchor='function unitIdleFrames(name){';
const idleAt=html.indexOf(idleAnchor);
if(idleAt<0)fail('idle-frame resolver missing');
if(!html.includes('const MADARA_ARCHIVE_BODY_RUNTIME=(()=>{'))html=html.slice(0,idleAt)+runtime+'\n'+html.slice(idleAt);

const idleSource="function unitIdleFrames(name){const legacyShinobiRun=";
const idleTarget="function unitIdleFrames(name){const madaraArchiveRun=(name==='Madara'&&S?.drag&&S?.dragUnitName===name)?MADARA_ARCHIVE_BODY_RUNTIME.run():null;if(madaraArchiveRun?.length)return madaraArchiveRun;const legacyShinobiRun=";
if(html.includes(idleSource))html=html.replace(idleSource,idleTarget);
else if(!html.includes("const madaraArchiveRun=(name==='Madara'"))fail('held-run resolver anchor missing');

const attackSource="function unitAttackFrames(name,kind){const legacyShinobiBasic=";
const attackTarget="function unitAttackFrames(name,kind){const madaraArchiveBasic=name==='Madara'?MADARA_ARCHIVE_BODY_RUNTIME.basic():null;if(madaraArchiveBasic?.length)return madaraArchiveBasic;const legacyShinobiBasic=";
if(html.includes(attackSource))html=html.replace(attackSource,attackTarget);
else if(!html.includes("const madaraArchiveBasic=name==='Madara'"))fail('basic-frame resolver anchor missing');

const dragFacingSource="if(held?.name==='Obito'&&Math.abs(pt.x-previousDragX)>=1.25)S.dragFacing=pt.x<previousDragX?-1:1;";
const dragFacingTarget="if((held?.name==='Obito'||held?.name==='Madara')&&Math.abs(pt.x-previousDragX)>=1.25)S.dragFacing=pt.x<previousDragX?-1:1;";
if(html.includes(dragFacingSource))html=html.replace(dragFacingSource,dragFacingTarget);
else if(!html.includes("held?.name==='Madara'"))fail('drag-facing update anchor missing');

const facingSource="if(actor.name==='Obito'&&S.drag&&S.dragUnitName===actor.name&&Number.isFinite(S.dragFacing)){\n          return S.dragFacing<0?Math.PI:0;\n        }";
const facingTarget="if((actor.name==='Obito'||actor.name==='Madara')&&S.drag&&S.dragUnitName===actor.name&&Number.isFinite(S.dragFacing)){\n          return S.dragFacing<0?Math.PI:0;\n        }";
if(html.includes(facingSource))html=html.replace(facingSource,facingTarget);
else if(!html.includes("actor.name==='Madara'"))fail('body-facing resolver anchor missing');

const jutsuSource="const runActiveJutsu=u.name==='Sub-Zero'?animateFreezeBlast:u.name==='Itachi'?animateItachiTsukuyomi:animateLunge;\n   const activeFrom=from;\n   const activeTarget=(u.name==='Sub-Zero'||u.name==='Itachi')?enemy:to;";
const jutsuTarget="const runActiveJutsu=u.name==='Sub-Zero'?animateFreezeBlast:u.name==='Itachi'?animateItachiTsukuyomi:u.name==='Madara'?animateMadaraTruthSeekingOrb:animateLunge;\n   const activeFrom=from;\n   const activeTarget=(u.name==='Sub-Zero'||u.name==='Itachi'||u.name==='Madara')?enemy:to;";
if(html.includes(jutsuSource))html=html.replace(jutsuSource,jutsuTarget);
else if(!html.includes("u.name==='Madara'?animateMadaraTruthSeekingOrb"))fail('Jutsu dispatcher anchor missing');

const vfxMarker="}else if(f.kind==='obitoFireball'){";
const vfxBlock=String.raw`}else if(f.kind==='madaraTruthSeekingOrb'){
      const age=performance.now()-f.start,flight=Math.max(1,f.flightDuration||520),impact=Math.max(1,f.impactDuration||360),travel=Math.min(1,age/flight),ease=1-Math.pow(1-travel,2.25);
      const x=f.from.x+(f.to.x-f.from.x)*ease,y=f.from.y+(f.to.y-f.from.y)*ease-8*Math.sin(Math.PI*travel);
      if(age<=flight){
       ctx.save();ctx.translate(x,y);ctx.rotate(age/165);ctx.globalCompositeOperation='screen';
       const pulse=1+.12*Math.sin(age/72),size=30*pulse;
       if(MADARA_TRUTH_SEEKING_ORB.complete&&MADARA_TRUTH_SEEKING_ORB.naturalWidth>0)ctx.drawImage(MADARA_TRUTH_SEEKING_ORB,-size/2,-size/2,size,size);
       else{ctx.fillStyle='rgba(18,20,26,.94)';ctx.beginPath();ctx.arc(0,0,size*.46,0,Math.PI*2);ctx.fill()}
       ctx.strokeStyle='rgba(223,230,255,.48)';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,size*.62,0,Math.PI*2);ctx.stroke();ctx.restore();
      }else{
       const t=Math.min(1,(age-flight)/impact),r=16+55*t;ctx.save();ctx.translate(f.to.x,f.to.y);ctx.globalCompositeOperation='screen';ctx.globalAlpha=1-t;
       ctx.strokeStyle='rgba(212,220,255,.78)';ctx.lineWidth=Math.max(1,4*(1-t));ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
     `;
if(!html.includes("f.kind==='madaraTruthSeekingOrb'")){
 const at=html.indexOf(vfxMarker);if(at<0)fail('floater-renderer anchor missing');html=html.slice(0,at)+vfxBlock+html.slice(at);
}

for(const marker of ['MADARA_ARCHIVE_BODY_RUNTIME','madaraArchivePilot=v1','animateMadaraTruthSeekingOrb','madaraTruthSeekingOrb',"'madara','anubis'", "actor.name==='Madara'"])if(!html.includes(marker))fail('final shell missing '+marker);
await fs.writeFile(file,html);
console.log('Madara archive pilot PASS: playable Six Paths Madara has normalized body frames, drag-facing/run support, and a source-orb Jutsu.');
