import fs from 'node:fs/promises';

const file='index.html';
let html=await fs.readFile(file,'utf8');
const beforeBytes=Buffer.byteLength(html);
const changes={};

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
    if(c==='\\'){esc=true;continue;}
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
  changes[name]=1;
}

replaceFunction('unitAttackFrames',`function unitAttackFrames(name,kind){
  if(name==='Senku'&&kind==='allyHealCast')return SENKU_CHEM_CAST_FRAMES||[];
  const attackMap=CHARACTER_ANIMATION_MAPS[name]?.attack||{};
  let unitData=null;
  try{unitData=canonicalUnit(name)}catch(_){}
  return window.BlazingAttackPresentation.resolveFrames(unitData,kind,attackMap);
}`);

replaceFunction('attackProxy',`function attackProxy(u){
  let rotation=u.rotation||0;
  try{
    const pair=S.ready?.kind==='pair'?S.ready.ref:null;
    const pos=pair?actorPos(pair,u):null;
    if(pos){
      rotation=window.BlazingAttackPresentation.resolveActionRotation(
        canonicalUnit(u.name),
        S.action,
        pos,
        (S.enemies||[]).filter(e=>e&&e.hp>0),
        rotation
      );
    }
  }catch(_){}
  return {...u,shape:attackShape(u),rotation}
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
  const facing=window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
  let projectileFrom={x:from.x+10,y:from.y-22};
  try{
    const mode=canonicalUnit(unitName)?.abilities?.jutsu?.presentation?.projectile_origin_mode;
    if(mode==='forward_facing'){
      projectileFrom={x:from.x+Math.cos(facing)*10,y:from.y-22+Math.sin(facing)*6};
    }
  }catch(_){}

  setTimeout(()=>{
    if(!actionTokenAlive(token))return;
    const projectileStart=performance.now();
    const projectile={kind:'iceProjectile',from:projectileFrom,to:{x:enemy.x,y:enemy.y-18},start:projectileStart,duration:flightDuration,life:1};
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

for(const marker of [
  'window.BlazingAttackPresentation.resolveFrames(unitData,kind,attackMap)',
  'window.BlazingAttackPresentation.resolveActionRotation(',
  "projectile_origin_mode",
  "mode==='forward_facing'"
])if(!html.includes(marker))throw new Error(`Pass 4.1b migration marker missing: ${marker}`);

await fs.writeFile(file,html);
const afterBytes=Buffer.byteLength(html);
await fs.mkdir('dev-tools',{recursive:true});
await fs.writeFile('dev-tools/pass41b-migration-report.json',JSON.stringify({status:'success',before_bytes:beforeBytes,after_bytes:afterBytes,changes},null,2));
console.log(JSON.stringify({status:'success',beforeBytes,afterBytes,changes},null,2));