import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

const unitTag=/(<script id="blazing-unit-data">window\.BLAZING_UNIT_DATA=)(\{.*?\})(;<\/script>)/s;
const unitMatch=html.match(unitTag);
if(!unitMatch)throw new Error('Road PvE tuning: embedded unit data tag missing');
const units=JSON.parse(unitMatch[2]);
if(!units.senku||!units.subzero)throw new Error('Road PvE tuning: Senku/Sub-Zero canonical data missing');

units.subzero.combat.basic_shape={type:'circle',r:58};
units.subzero.abilities.basic.presentation={...(units.subzero.abilities.basic.presentation||{}),range_visual_scale:1};
units.subzero.readiness={...(units.subzero.readiness||{}),notes:'Road/PvE tuning: Basic uses a compact 58 px close-range circle with matching visual/mechanical radius. Freeze Blast presentation is unchanged.'};
units.senku.combat.basic_shape={type:'circle',r:66};
units.senku.abilities.basic.delivery='hide_retreat_projectile';
units.senku.abilities.basic.range_presentation='circular_bomb_range';
units.senku.abilities.basic.presentation={
 ...(units.senku.abilities.basic.presentation||{}),
 runtime_driver:'animateSenkuRetreatBomb',
 animation_kind:'retreat_run',
 reposition_scope:'primary_attacker',
 hide_distance_px:44,
 hide_lateral_px:8,
 hide_duration_ms:480,
 hide_release_delay_ms:300
};
delete units.senku.abilities.basic.presentation.range_rotation_mode;
delete units.senku.abilities.basic.presentation.close_retreat_min_px;
delete units.senku.abilities.basic.presentation.close_retreat_max_px;
delete units.senku.abilities.basic.presentation.close_retreat_duration_ms;
delete units.senku.abilities.basic.presentation.close_retreat_frame_ms;
delete units.senku.abilities.basic.presentation.close_bomb_release_ratio;
units.senku.readiness={...(units.senku.readiness||{}),notes:'Road/PvE tuning: Explosive Bomb uses a 66 px circular range. After throwing, Senku retreats behind the nearest ally relative to the enemy he attacked and remains clamped to legal terrain.'};
html=html.replace(unitTag,(_,a,_json,c)=>a+JSON.stringify(units)+c);

const retreatStart=html.indexOf('function animateSenkuRetreatBomb(');
if(retreatStart<0)throw new Error('Road PvE tuning: animateSenkuRetreatBomb() not found');
const retreatEnd=html.indexOf('\nfunction ',retreatStart+1);
if(retreatEnd<0)throw new Error('Road PvE tuning: animateSenkuRetreatBomb() end not found');
const hideRetreat=`function animateSenkuRetreatBomb(unitName,pair,from,enemy,onHit,onFinish,kind){
 const token=ACTIVE_ACTION_TOKEN;
 let moveStarted=false,moveDone=false,bombDone=false;
 const meta=canonicalUnit('senku')?.abilities?.basic?.presentation||{};
 const finishIfReady=()=>{
  if(bombDone&&(!moveStarted||moveDone)&&actionTokenAlive(token)){
   try{onFinish&&onFinish()}catch(err){recoverAction('Senku hide retreat completion')}
  }
 };
 const startHide=()=>{
  if(moveStarted||!actionTokenAlive(token)||!pair)return;
  moveStarted=true;
  const allies=(S.pairs||[]).filter(candidate=>candidate&&candidate!==pair&&front(candidate)?.name&&front(candidate).name!=='—');
  if(!allies.length){moveDone=true;finishIfReady();return;}
  const ally=[...allies].sort((a,b)=>d(pair,a)-d(pair,b))[0];
  const threats=(S.enemies||[]).filter(target=>target&&target.hp>0);
  const threat=enemy|| (threats.length?[...threats].sort((a,b)=>d(ally,a)-d(ally,b))[0]:null);
  let vx=threat?ally.x-threat.x:ally.x-pair.x;
  let vy=threat?ally.y-threat.y:ally.y-pair.y;
  let len=Math.hypot(vx,vy);
  if(len<.001){vx=0;vy=1;len=1;}
  const ux=vx/len,uy=vy/len,hideDistance=Number(meta.hide_distance_px)||44,lateral=Number(meta.hide_lateral_px)||8;
  let destination={x:ally.x+ux*hideDistance-uy*lateral,y:ally.y+uy*hideDistance+ux*lateral};
  try{
   const map=S.bbRoadContent?.map||window.BlazingRoadContent?.mapForStage?.(S.bbRoadStage||1);
   if(map&&window.BlazingRoadContent?.constrainMovementPoint){
    destination=window.BlazingRoadContent.constrainMovementPoint(map,destination,{x:pair.x,y:pair.y},{padding:window.BlazingRoadContent.PLAYER_FOOT_PADDING||4})||destination;
   }
   if(map&&window.BlazingRoadContent?.nearestWalkable&&!window.BlazingRoadContent.isWalkablePoint?.(map,destination,{padding:window.BlazingRoadContent.PLAYER_FOOT_PADDING||4})){
    destination=window.BlazingRoadContent.nearestWalkable(map,destination,{padding:window.BlazingRoadContent.PLAYER_FOOT_PADDING||4,maxRadius:150})||destination;
   }
  }catch(_){}
  if(typeof BATTLE_BOUNDS==='object'&&BATTLE_BOUNDS){
   destination.x=clamp(destination.x,BATTLE_BOUNDS.left??0,BATTLE_BOUNDS.right??W);
   destination.y=clamp(destination.y,BATTLE_BOUNDS.top??0,BATTLE_BOUNDS.bottom??H);
  }
  const start={x:pair.x,y:pair.y},duration=Math.max(240,Number(meta.hide_duration_ms)||480),started=performance.now();
  const step=now=>{
   if(!actionTokenAlive(token)){moveDone=true;return;}
   const t=clamp((now-started)/duration,0,1),ease=1-Math.pow(1-t,3);
   pair.x=start.x+(destination.x-start.x)*ease;pair.y=start.y+(destination.y-start.y)*ease;
   const st=ensureAnimState();if(!st.attackPose)st.attackPose={};st.attackPose[unitName]={kind:'retreat_run',start:started,duration};
   if(t<1)return requestAnimationFrame(step);
   pair.x=destination.x;pair.y=destination.y;moveDone=true;
   const doneState=ensureAnimState();if(doneState.attackPose?.[unitName]?.kind==='retreat_run')delete doneState.attackPose[unitName];
   finishIfReady();
  };
  requestAnimationFrame(step);
 };
 setTimeout(startHide,Math.max(150,Number(meta.hide_release_delay_ms)||300));
 animateSenkuBomb(unitName,from,enemy,()=>{
  try{onHit&&onHit()}catch(err){console.error('Senku hide retreat impact failed:',err);return recoverAction('Senku hide retreat impact')}
 },()=>{bombDone=true;finishIfReady()},kind);
}`;
html=html.slice(0,retreatStart)+hideRetreat+html.slice(retreatEnd);

const tickNeedle='function tick(){';
const tickCount=html.split(tickNeedle).length-1;
if(tickCount!==1)throw new Error(`Road PvE tuning: expected one tick() anchor, found ${tickCount}`);
html=html.replace(tickNeedle,"function tick(){\n window.BlazingRoadTurns?.beforeEngineTick?.(S);");

// A delayed enemy-range cleanup can outlive battle teardown on slower WebKit frames.
// Keep the cleanup idempotent instead of dereferencing a cleared animation state.
const staleRangeNeedle='S.anim.showEnemyRange=null';
const staleRangeCount=html.split(staleRangeNeedle).length-1;
if(staleRangeCount<1)throw new Error('Road PvE tuning: enemy-range teardown anchor missing');
html=html.split(staleRangeNeedle).join('(S?.anim&&(S.anim.showEnemyRange=null))');

for(const marker of ["basic_shape\":{\"type\":\"circle\",\"r\":58","basic_shape\":{\"type\":\"circle\",\"r\":66",'range_visual_scale":1','hide_distance_px','const threat=enemy||','function animateSenkuRetreatBomb(unitName,pair,from,enemy,onHit,onFinish,kind)','BlazingRoadTurns?.beforeEngineTick?.(S)','S?.anim&&(S.anim.showEnemyRange=null)'])if(!html.includes(marker))throw new Error(`Road PvE tuning marker missing: ${marker}`);

await fs.writeFile(file,html);
console.log(`Road PvE tuning PASS: speed-sorted round hook + compact aligned Sub-Zero range + circular Senku bomb + hide-behind-nearest-ally retreat installed; guarded ${staleRangeCount} stale enemy-range cleanup callback(s).`);
