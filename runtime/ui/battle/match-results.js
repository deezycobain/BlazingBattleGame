(()=>{
'use strict';
const RESULTS='bbMatchResults';
const NAV_STYLE='bb-official-nav-runtime-style';
let victoryToken=null,defeatToken=null,showTimer=0;

function state(){try{return typeof S!=='undefined'?S:null}catch{return null}}
function menu(){return document.getElementById('menuScreen')}
function battle(){return document.getElementById('battleScreen')}
function battleActive(){return !!battle()?.classList.contains('active')}
function fighters(s){return (Array.isArray(s?.pairs)?s.pairs:[]).flatMap(pair=>Array.isArray(pair?.units)?pair.units:[]).filter(unit=>unit&&unit.name&&unit.name!=='—'&&Number(unit.maxHp)>0)}
function allDefeated(s){const list=fighters(s);return !!list.length&&list.every(unit=>Number(unit.hp)<=0)}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function normalizeUnitId(value){return String(value??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function roadFighterName(s,id){
 const wanted=normalizeUnitId(id);
 const runtime=fighters(s).find(unit=>[unit?.id,unit?.unit_id,unit?.name].some(value=>normalizeUnitId(value)===wanted));
 if(runtime?.name)return runtime.name;
 const canonical=Object.values(window.BLAZING_UNIT_DATA||{}).find(unit=>[unit?.id,unit?.unit_id,unit?.display_name].some(value=>normalizeUnitId(value)===wanted));
 if(canonical?.display_name)return canonical.display_name;
 return String(id||'Fighter').split(/[-_\s]+/).filter(Boolean).map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ');
}

function ensureOfficialNavStyle(){
 if(document.getElementById(NAV_STYLE))return;
 const style=document.createElement('style');style.id=NAV_STYLE;
 style.textContent='#menuScreen.bb-home-theme .menuActions.bb-home-actions>#summonsBtn,#menuScreen.bb-home-theme .menuActions.bb-home-actions>#inventoryBtn,#menuScreen.bb-home-theme .menuActions.bb-home-actions>#forgeBtn{display:flex!important;inline-size:100%!important;width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box!important;overflow:hidden!important}#menuScreen.bb-home-theme .menuActions.bb-home-actions>#summonsBtn::before,#menuScreen.bb-home-theme .menuActions.bb-home-actions>#summonsBtn::after,#menuScreen.bb-home-theme .menuActions.bb-home-actions>#inventoryBtn::before,#menuScreen.bb-home-theme .menuActions.bb-home-actions>#inventoryBtn::after,#menuScreen.bb-home-theme .menuActions.bb-home-actions>#forgeBtn::before,#menuScreen.bb-home-theme .menuActions.bb-home-actions>#forgeBtn::after{content:none!important;display:none!important;width:0!important;height:0!important;inset:auto!important}';
 document.head.appendChild(style);
}

function labelSecondaryButtons(){
 ensureOfficialNavStyle();
 const defs=[['summonsBtn','summon','SUMMONS','RECRUIT'],['inventoryBtn','inventory','INVENTORY','ROSTER'],['forgeBtn','forge','FORGE','AWAKEN']];
 for(const [id,key,label,sub] of defs){
  const btn=document.getElementById(id);if(!btn)continue;
  btn.classList.remove('bb-home-grid-shell');
  btn.classList.add('bb-home-action',`bb-home-action--${key}`);
  btn.dataset.bbHomeAction=key;
  if(btn.dataset.bbOfficialNav==='1')continue;
  btn.dataset.bbOfficialNav='1';btn.replaceChildren();
  const a=document.createElement('span'),b=document.createElement('span');
  a.className='bb-nav-label';a.textContent=label;b.className='bb-nav-sub';b.textContent=sub;btn.append(a,b);
 }
}

function ensureHud(){
 const root=menu();if(!root)return null;
 let hud=document.getElementById('bbEconomyHud');
 if(!hud){hud=document.createElement('div');hud.id='bbEconomyHud';hud.className='bb-economy-hud';hud.setAttribute('aria-label','Blazing Coins balance');hud.innerHTML='<i>◈</i><span>0</span>';root.appendChild(hud)}
 return hud;
}
function syncHud(){const hud=ensureHud();if(hud)hud.querySelector('span').textContent=String(window.BlazingEconomy?.balance?.()??0)}

function ensureResults(){
 let root=document.getElementById(RESULTS);if(root)return root;
 root=document.createElement('div');root.id=RESULTS;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','bbResultsTitle');
 root.innerHTML='<section class="bb-results-card"><div class="bb-results-kicker" id="bbResultsKicker"></div><div class="bb-results-title" id="bbResultsTitle"></div><div class="bb-results-sub" id="bbResultsSub"></div><div class="bb-results-reward" id="bbResultsReward"></div><div class="bb-results-xp" id="bbResultsXp" hidden></div><div class="bb-results-road" id="bbResultsRoad" hidden></div><div class="bb-results-balance" id="bbResultsBalance"></div><div class="bb-results-actions" id="bbResultsActions"></div></section>';
 document.body.appendChild(root);return root;
}
function hideResults(){document.getElementById(RESULTS)?.classList.remove('active')}

function returnHome(){
 hideResults();battle()?.classList.remove('active');
 document.querySelectorAll('.screen.active').forEach(screen=>{if(screen.id!=='menuScreen')screen.classList.remove('active')});
 const m=menu();if(m){m.style.display='grid';m.classList.remove('leaving')}
 try{menuTransitioning=false}catch{}
 try{roadSyncCard(window.BlazingRoadRun?.loadRun?.())}catch{}
 try{window.BlazingHomeSkin?.apply?.()}catch{}
 labelSecondaryButtons();syncHud();window.scrollTo(0,0);
}
function returnJourney(s,kind){
 const encounter=s?.bbRealmEncounter||null;
 returnHome();
 window.BlazingRealmExplorer?.resumeAfterBattle?.(kind,encounter);
 setTimeout(()=>window.BlazingRealmExplorer?.open?.('run'),120);
}
function launch(mode){returnHome();setTimeout(()=>document.getElementById(mode==='road'?'level1Btn':'boss1Btn')?.click(),180)}

function renderXp(s,victory){
 const box=document.getElementById('bbResultsXp'),xp=s?.bbVictoryXp;
 if(!box)return;
 if(!victory||!xp||!Number(xp.amount)){box.hidden=true;box.innerHTML='';return}
 const leveled=(Array.isArray(xp.units)?xp.units:[]).filter(item=>Number(item?.levelsGained)>0);
 const locked=(Array.isArray(xp.units)?xp.units:[]).filter(item=>item?.locked);
 const notes=[];
 if(leveled.length)notes.push(leveled.map(item=>`${escapeHtml(item.name)} → LV.${escapeHtml(item.level)}`).join(' • '));
 if(locked.length)notes.push(locked.map(item=>`${escapeHtml(item.name)} reached Awakening gate`).join(' • '));
 box.hidden=false;
 box.innerHTML=`<strong>+${escapeHtml(xp.amount)} XP</strong><span>DEPLOYED TEAM BATTLE XP</span>${notes.length?`<small>${notes.join('<br>')}</small>`:''}`;
}

function renderRoadIntermission(s,{victory=false,roadComplete=false,stage=1}={}){
 const box=document.getElementById('bbResultsRoad');if(!box)return;
 if(!victory||s?.bbRunMode!=='road'){
  box.hidden=true;box.innerHTML='';delete box.dataset.clearedStage;delete box.dataset.nextStage;return;
 }
 const content=window.BlazingRoadContent,max=Math.max(1,Math.floor(Number(content?.MAX_STAGE)||10));
 const run=s?.bbRoadRun||window.BlazingRoadRun?.loadRun?.()||null;
 const cleared=Math.max(1,Math.min(max,Math.floor(Number(stage)||1)));
 const nextStage=!roadComplete&&run?.status==='active'?Math.max(1,Math.min(max,Math.floor(Number(run.stage)||cleared+1))):null;
 const next=nextStage?content?.stageConfig?.(nextStage):null;
 const nodes=Array.from({length:max},(_,index)=>{
  const n=index+1,state=roadComplete||n<=cleared?'done':n===nextStage?'next':'locked';
  const label=state==='done'?'cleared':state==='next'?'next':'locked';
  return `<i class="${state}" data-road-node="${n}" aria-label="Stage ${n} ${label}"></i>`;
 }).join('');
 const runFighters=Array.isArray(run?.fighters)?run.fighters:[];
 const carry=runFighters.map(fighter=>{
  const hp=Math.max(0,Number(fighter?.hp)||0),maxHp=Math.max(1,Number(fighter?.max_hp)||1),hpPct=Math.max(0,Math.min(100,Math.round(hp/maxHp*100)));
  const chakra=Math.max(0,Math.floor(Number(fighter?.chakra)||0)),maxChakra=Math.max(0,Math.floor(Number(fighter?.max_chakra)||0));
  const name=roadFighterName(s,fighter?.unit_id);
  return `<span class="bb-road-carry-unit${hp<=0?' ko':''}"><b>${escapeHtml(name)}</b><small>HP ${hpPct}%${maxChakra?` • CHAKRA ${chakra}/${maxChakra}`:''}</small></span>`;
 }).join('');
 const nextCopy=roadComplete
  ?`<div class="bb-road-next complete"><small>RUN COMPLETE</small><strong>ALL ${max} STAGES CLEARED</strong><span>Road rewards secured. Restart for a fresh run.</span></div>`
  :`<div class="bb-road-next"><small>NEXT ENCOUNTER</small><strong>STAGE ${nextStage} · ${escapeHtml(next?.name||`Stage ${nextStage}`)}</strong><span>${Number(next?.enemies?.length)||0} ENEMIES${next?.elite?' • ELITE NODE':''}${next?.route?` • ROUTE ${next.route}`:''}</span></div>`;
 box.hidden=false;box.dataset.clearedStage=String(cleared);box.dataset.nextStage=nextStage?String(nextStage):'';
 box.innerHTML=`<div class="bb-road-progress-head"><span>ROAD PROGRESS</span><strong>${roadComplete?max:cleared} / ${max}</strong></div><div class="bb-road-node-track" aria-label="Blazing Road stage progress">${nodes}</div>${nextCopy}${carry?`<div class="bb-road-carry"><small>RUN RESOURCES CARRY FORWARD</small><div class="bb-road-carry-grid">${carry}</div></div>`:''}`;
}

function showResult(kind,s){
 if(!battleActive())return;
 const root=ensureResults(),reward=s?.bbVictoryReward||null,mode=s?.bbRunMode||'battle',victory=kind==='victory';
 const stage=Math.max(1,Number(s?.bbVictoryStage||s?.bbRoadStage||1));
 const boss=Math.max(1,Number(s?.bbVictoryBoss||s?.bbCastleBoss||1));
 const roadComplete=victory&&mode==='road'&&s?.bbRoadRun?.status==='complete';
 root.dataset.result=kind;
 root.dataset.roadComplete=roadComplete?'1':'0';
 document.getElementById('bbResultsKicker').textContent=mode==='road'?'BLAZING ROAD':mode==='castle'?'PHANTOM CASTLE':mode==='exploration'?'SHINOBI JOURNEY':'BATTLE COMPLETE';
 document.getElementById('bbResultsTitle').textContent=roadComplete?'ROAD COMPLETE':victory?'VICTORY':'DEFEAT';
 document.getElementById('bbResultsSub').textContent=roadComplete?`All ${window.BlazingRoadContent?.MAX_STAGE||10} stages cleared`:mode==='road'?(victory?'Stage '+stage+' cleared':'Run ended'):(mode==='castle'?(victory?'Boss '+boss+' defeated':'Boss '+boss+' stands'):mode==='exploration'?(victory?'The route ahead is open':'The patrol still controls the bridge'):'Match complete');
 const rewardBox=document.getElementById('bbResultsReward'),balance=document.getElementById('bbResultsBalance');
 const journeyReward=mode==='exploration'?s?.bbRealmEncounter?.reward:null;
 if(victory&&journeyReward){rewardBox.hidden=false;rewardBox.innerHTML='<strong>◈ +'+escapeHtml(journeyReward.amount||0)+'</strong><span>'+escapeHtml(String(journeyReward.resource||'route reward').replaceAll('_',' '))+'</span>';balance.textContent='JOURNEY REWARD SECURED'}
 else if(victory&&reward){rewardBox.hidden=false;rewardBox.innerHTML='<strong>'+escapeHtml(reward.symbol)+' +'+escapeHtml(reward.amount)+'</strong><span>'+escapeHtml(reward.currency)+'</span>';balance.textContent='BALANCE '+reward.balance+' '+reward.currency}
 else{rewardBox.hidden=true;rewardBox.innerHTML='';balance.textContent=victory?'':'NO BLAZING COINS EARNED'}
 renderXp(s,victory);
 renderRoadIntermission(s,{victory,roadComplete,stage});
 const actions=document.getElementById('bbResultsActions');actions.replaceChildren();actions.className='bb-results-actions';
 const add=(label,cls,fn)=>{const btn=document.createElement('button');btn.type='button';btn.textContent=label;if(cls)btn.className=cls;btn.addEventListener('click',fn);actions.appendChild(btn)};
 if(roadComplete){actions.classList.add('two');add('RESTART ROAD','primary',()=>launch('road'));add('MAIN MENU','',returnHome)}
 else if(victory&&mode==='road'){actions.classList.add('two');add('CONTINUE ROAD','primary',()=>launch('road'));add('MAIN MENU','',returnHome)}
 else if(!victory&&mode==='road'){actions.classList.add('two');add('RESTART ROAD','primary',()=>launch('road'));add('MAIN MENU','',returnHome)}
 else if(!victory&&mode==='castle'){actions.classList.add('two');add('RETRY BOSS','primary',()=>launch('castle'));add('MAIN MENU','',returnHome)}
 else if(mode==='exploration'){actions.classList.add('two');add(victory?'CONTINUE JOURNEY':'RETURN TO ROUTE','primary',()=>returnJourney(s,kind));add('MAIN MENU','',returnHome)}
 else add('RETURN TO MENU','primary',returnHome);
 root.classList.add('active');syncHud();
}

function persistRoadDefeat(s){
 if(s?.bbRunMode!=='road'||s.bbRoadDefeatRecorded)return;
 const R=window.BlazingRoadRun;if(!R)return;
 const list=fighters(s);let run=s.bbRoadRun||R.loadRun();if(!run||!list.length)return;
 try{run=R.recordBattleResult(run,list);R.saveRun(run);s.bbRoadRun=run;s.bbRoadDefeatRecorded=true;roadSyncCard(run)}catch(error){console.warn('Road defeat persistence failed',error)}
}
function schedule(kind,s,token){clearTimeout(showTimer);showTimer=setTimeout(()=>{const current=state();if(!battleActive()||current!==s)return;if(kind==='victory'&&current.victoryFX!==token)return;showResult(kind,current)},850)}

function tick(){
 labelSecondaryButtons();syncHud();
 const s=state();if(!s||!battleActive()){hideResults();return}
 if(s.victoryFX){if(s.victoryFX!==victoryToken){victoryToken=s.victoryFX;defeatToken=null;schedule('victory',s,s.victoryFX)}return}
 if(allDefeated(s)){
  persistRoadDefeat(s);
  const token=s.bbRoadDefeatRecorded||s.defeatFX||s.phase||'defeat';
  if(token!==defeatToken){defeatToken=token;victoryToken=null;schedule('defeat',s,token)}
 }
}

function auditHomeWallpaper(){
 const image=new Image();
 image.onload=()=>{window.BlazingHdAudit=Object.freeze({homeWallpaper:{src:image.src,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,hd:image.naturalWidth>=1080&&image.naturalHeight>=1080}})};
 image.src='runtime/ui/home/home-wallpaper-hq.png';
}

window.addEventListener('bb:economy',syncHud);
window.BlazingMatchResults=Object.freeze({returnHome,launch,syncHud,renderRoadIntermission});
labelSecondaryButtons();syncHud();auditHomeWallpaper();setInterval(tick,180);
})();
