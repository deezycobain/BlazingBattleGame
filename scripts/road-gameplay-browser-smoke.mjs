import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingRoadContent==='object'&&typeof window.BlazingRoadCamera==='object'&&typeof window.BlazingRoadTurns==='object'&&typeof window.BlazingMatchResults==='object'&&typeof window.BlazingApprovedHomeCompat==='object',{timeout:30000});
 await page.waitForTimeout(120);
}
async function waitRoad(page,stage){
 await page.waitForFunction(expected=>{
  try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'&&s?.bbRoadStage===expected}catch{return false}
 },stage,{timeout:15000});
}
async function enterRoad(page,stage){
 const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
 if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
 await panel.waitFor({state:'visible',timeout:5000});
 await page.locator('#bbHomeApproved [data-mode="road"]').click();
 await waitRoad(page,stage);
}
async function waitCamera(page,mode,stage){
 await page.waitForFunction(({mode,stage})=>{
  const snap=window.BlazingRoadCamera?.snapshot?.();
  return snap?.active&&snap.mode===mode&&snap.stage===stage;
 },{mode,stage},{timeout:6000});
 return page.evaluate(()=>{
  const snap=window.BlazingRoadCamera.snapshot();
  const canvas=document.getElementById(snap.canvasId||'game');
  return {...snap,inlineScale:canvas?.style?.scale||'',inlineTransform:canvas?.style?.transform||''};
 });
}
async function waitRoadCombatReady(page){
 await page.waitForFunction(()=>!window.BlazingRoadCamera?.isCombatLocked?.(),null,{timeout:12000});
}

async function advanceInitiativeTo(page,{name=null,kind=null}={}){
 return page.evaluate(({name,kind})=>{
  const s=globalThis.eval('S'),front=globalThis.eval('front'),R=window.BlazingRoadTurns;
  const resolveRef=current=>current?.kind==='pair'
   ? s.pairs.find(pair=>front(pair)?.name===current.name)
   : s.enemies.find(enemy=>enemy?.name===current?.name&&enemy.hp>0);
  const trace=[];
  for(let step=0;step<24;step++){
   const snap=R.snapshot({limit:20}),current=snap.current;
   trace.push(current?{name:current.name,kind:current.kind,speed:current.speed}:null);
   if(current&&(!name||current.name===name)&&(!kind||current.kind===kind))return {ok:true,current,trace,round:snap.round};
   const ref=resolveRef(current);if(!current||!ref)return {ok:false,error:'initiative current actor could not be resolved',trace,snap};
   ref.gauge=100;s.ready={kind:current.kind,ref,g:100};s.phase=current.kind==='pair'?'player':'cpu';R.sync();
   ref.gauge=0;s.ready=null;s.phase='charge';R.sync();
  }
  return {ok:false,error:'initiative target not reached within one traversal',trace,snap:R.snapshot({limit:20})};
 },{name,kind});
}

async function dragLebeeAcrossOpenLane(page){
 await waitRoadCombatReady(page);
 const slot=await page.evaluate(()=>{
  const s=globalThis.eval('S'),front=globalThis.eval('front');
  const roster=s.pairs.flatMap(pair=>(pair.units||[]).filter(unit=>unit&&unit.name&&unit.name!=='—').map(unit=>unit.name));
  for(let pairIndex=0;pairIndex<s.pairs.length;pairIndex++){
   const pair=s.pairs[pairIndex],index=(pair.units||[]).findIndex(unit=>unit?.name==='Lebee');
   if(index>=0)return {pairIndex,index,scheduledName:front(pair)?.name||null,roster};
  }
  return {error:'Lebee is not present in the Road battle roster',roster};
 });
 if(slot.error)return slot;
 if(!slot.scheduledName)return {error:'Lebee pair has no active fighter for round initiative',slot};
 const advance=await advanceInitiativeTo(page,{name:slot.scheduledName,kind:'pair'});
 if(!advance.ok)return {error:'Could not advance Road initiative to Lebee pair',slot,advance};
 return page.evaluate(async({pairIndex,index})=>{
  const s=globalThis.eval('S'),front=globalThis.eval('front'),inputPoint=globalThis.eval('inputPoint'),C=window.BlazingRoadContent;
  const roster=s.pairs.flatMap(pair=>(pair.units||[]).filter(unit=>unit&&unit.name&&unit.name!=='—').map(unit=>unit.name));
  const pair=s.pairs[pairIndex];
  if(!pair)return {error:'Lebee pair disappeared before drag setup',roster,pairIndex};
  pair.active=index;
  const lebee=front(pair),start={x:90,y:300},end={x:390,y:300},padding=C.PLAYER_FOOT_PADDING;
  if(!lebee||lebee.name!=='Lebee')return {error:'Lebee could not become the active pair fighter',roster,pairIndex,index,active:lebee?.name||null};
  if(!C.isWalkablePoint(s.bbRoadContent?.map,start,{padding})||!C.isWalkablePoint(s.bbRoadContent?.map,end,{padding}))return {error:'authored Stage 1 lane endpoints are not walkable',start,end,padding};
  lebee.hp=Math.max(1,Number(lebee.hp)||Number(lebee.maxHp)||1);pair.x=start.x;pair.y=start.y;
  s.drag=false;s.dragOrigin=null;s.dragVisual=null;s.dragGrabOffset=null;
  pair.gauge=100;s.ready={kind:'pair',ref:pair,g:100};s.phase='player';
  window.BlazingRoadTurns.sync();
  const readyShape={phase:s.phase,kind:s.ready?.kind||null,refIsPair:s.ready?.ref===pair,pairX:pair.x,pairY:pair.y};
  if(s.phase!=='player'||s.ready?.kind!=='pair'||s.ready?.ref!==pair)return {error:'scheduled pair turn was lost while activating Lebee',roster,readyShape,round:window.BlazingRoadTurns.snapshot({limit:20})};

  const cvs=document.getElementById('game');if(!(cvs instanceof HTMLCanvasElement))return {error:'battle canvas #game missing'};
  const rect=cvs.getBoundingClientRect();if(!(rect.width>0&&rect.height>0))return {error:'battle canvas has no visible bounds',rect:{width:rect.width,height:rect.height}};
  const logicalTL=inputPoint({clientX:rect.left,clientY:rect.top}),logicalBR=inputPoint({clientX:rect.right,clientY:rect.bottom});
  const spanX=logicalBR.x-logicalTL.x,spanY=logicalBR.y-logicalTL.y;if(!(Math.abs(spanX)>1&&Math.abs(spanY)>1))return {error:'inputPoint transform is degenerate',logicalTL,logicalBR};
  const toClient=point=>({x:rect.left+(point.x-logicalTL.x)/spanX*rect.width,y:rect.top+(point.y-logicalTL.y)/spanY*rect.height});
  const pointerId=731;
  const dispatch=(type,point,buttons)=>{const client=toClient(point);cvs.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,composed:true,pointerId,pointerType:'touch',isPrimary:true,width:10,height:10,pressure:buttons?.5:0,button:0,buttons,clientX:client.x,clientY:client.y}));return client};
  let captureShim=false;try{Object.defineProperty(cvs,'setPointerCapture',{configurable:true,value:()=>{}});Object.defineProperty(cvs,'releasePointerCapture',{configurable:true,value:()=>{}});Object.defineProperty(cvs,'hasPointerCapture',{configurable:true,value:()=>false});captureShim=true}catch(_){}
  const startClient=dispatch('pointerdown',start,1),dragStarted=s.drag===true&&s.ready?.ref===pair,samples=[];
  for(let i=1;i<=30;i++){const t=i/30,point={x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t};dispatch('pointermove',point,1);if(i%5===0)samples.push({x:pair.x,y:pair.y});await new Promise(resolve=>setTimeout(resolve,6))}
  const endClient=dispatch('pointerup',end,0);await new Promise(resolve=>setTimeout(resolve,20));
  if(captureShim){try{delete cvs.setPointerCapture;delete cvs.releasePointerCapture;delete cvs.hasPointerCapture}catch(_){}}
  return {name:lebee.name,start,end,startClient,endClient,logicalTL,logicalBR,readyShape,dragStarted,dragEnded:s.drag===false,final:{x:pair.x,y:pair.y},samples,padding,endpointWalkable:C.isWalkablePoint(s.bbRoadContent?.map,{x:pair.x,y:pair.y},{padding})};
 },slot);
}

async function run(name,type){
 let browser;
 try{
  console.log(`Road gameplay smoke START (${name}) -> ${BASE}`);
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
  await page.evaluate(()=>window.BlazingRoadRun.clearRun());

  await enterRoad(page,1);
  const intro1=await waitCamera(page,'intro',1);if(intro1.mapKey!=='south-sac'||intro1.targetScale!==1)throw new Error(`Stage 1 intro camera should show full map: ${JSON.stringify(intro1)}`);
  const camera1=await waitCamera(page,'combat',1);if(Math.abs(camera1.targetScale-1.16)>.001||camera1.combatScale!==camera1.targetScale||camera1.transitionMs!==1650)throw new Error(`Stage 1 combat camera zoom invalid: ${JSON.stringify(camera1)}`);
  if(!/center/i.test(camera1.position||''))throw new Error(`Stage 1 camera focus is not centered: ${JSON.stringify(camera1)}`);

  const initiative=await page.evaluate(()=>{
   const s=globalThis.eval('S'),front=globalThis.eval('front'),snap=window.BlazingRoadTurns.snapshot({limit:20});
   const sub=globalThis.eval('canonicalUnit')('Sub-Zero'),senku=globalThis.eval('canonicalUnit')('Senku');
   const chakraRings=[...document.querySelectorAll('#bbBattleDock .bb-dock-portrait')].map(el=>({background:el.style.backgroundImage,text:el.parentElement?.querySelector('em')?.textContent||''}));
   return {snap,actors:s.pairs.filter(p=>front(p)?.name&&front(p).name!=='—').length+s.enemies.filter(e=>e.hp>0).length,subRange:sub.combat.basic_shape,subVisual:sub.abilities.basic.presentation?.range_visual_scale,senkuRange:senku.combat.basic_shape,senkuPresentation:senku.abilities.basic.presentation,chakraRings};
  });
  if(!initiative.snap?.active||initiative.snap.mode!=='round'||initiative.snap.round!==1)throw new Error(`Road round initiative missing: ${JSON.stringify(initiative.snap)}`);
  if(initiative.snap.queue.length!==initiative.actors)throw new Error(`Round 1 should contain each living actor exactly once: ${JSON.stringify(initiative)}`);
  const ids=initiative.snap.queue.map(x=>x.id);if(new Set(ids).size!==ids.length)throw new Error(`Round initiative duplicated an actor: ${JSON.stringify(ids)}`);
  const speeds=initiative.snap.queue.map(x=>x.speed);if(speeds.some((value,i)=>i&&value>speeds[i-1]))throw new Error(`Round initiative is not highest-Speed first: ${JSON.stringify(speeds)}`);
  if(initiative.subRange?.type!=='circle'||initiative.subRange.r!==58||initiative.subVisual!==1)throw new Error(`Sub-Zero compact range tuning missing: ${JSON.stringify(initiative)}`);
  if(initiative.senkuRange?.type!=='circle'||initiative.senkuRange.r!==66||initiative.senkuPresentation?.hide_distance_px!==44||'close_retreat_min_px' in initiative.senkuPresentation)throw new Error(`Senku circular hide-retreat tuning missing: ${JSON.stringify(initiative)}`);
  if(initiative.chakraRings.some(r=>!/conic-gradient/i.test(r.background)||r.text.trim()))throw new Error(`segmented chakra portrait ring missing or numeric chakra survived: ${JSON.stringify(initiative.chakraRings)}`);

  const lebeeDrag=await dragLebeeAcrossOpenLane(page);if(lebeeDrag.error)throw new Error(`Lebee touch drag setup failed: ${JSON.stringify(lebeeDrag)}`);
  if(!lebeeDrag.dragStarted||!lebeeDrag.dragEnded)throw new Error(`Lebee native touch drag lifecycle failed: ${JSON.stringify(lebeeDrag)}`);
  if(Math.hypot(lebeeDrag.final.x-lebeeDrag.end.x,lebeeDrag.final.y-lebeeDrag.end.y)>12)throw new Error(`Lebee hit an invisible blocker in clear Stage 1 lane: ${JSON.stringify(lebeeDrag)}`);
  if(!lebeeDrag.endpointWalkable)throw new Error(`Lebee finished outside authored walkable terrain: ${JSON.stringify(lebeeDrag)}`);

  const stage1=await page.evaluate(()=>{
   const s=globalThis.eval('S'),front=globalThis.eval('front'),C=window.BlazingRoadContent;
   const players=s.pairs.filter(p=>front(p)?.name&&front(p).name!=='—').map(p=>front(p)),broadPoints=[{x:90,y:300},{x:240,y:300},{x:390,y:300}];
   return {stage:s.bbRoadContent?.stage,name:s.bbRoadContent?.name,elite:s.bbRoadContent?.elite,map:s.bbRoadContent?.map?.src,mapSource:s.bbRoadMapSource,mapAudit:window.BlazingRoadMapAudit||null,enemies:s.enemies.map(e=>({hp:e.maxHp,attack:e.attack,defense:e.defense,ai:!!e.bbRoadAi})),chakra:players.map(u=>({name:u.name,chakra:u.chakra,max:u.maxChakra})),playerFootPadding:C.PLAYER_FOOT_PADDING,enemyTerrainPadding:C.ENEMY_TERRAIN_PADDING,broadWalkable:broadPoints.map(point=>C.isWalkablePoint(s.bbRoadContent?.map,point,{padding:C.PLAYER_FOOT_PADDING}))};
  });
  if(stage1.stage!==1||stage1.elite)throw new Error(`Stage 1 content wrong: ${JSON.stringify(stage1)}`);
  if(!/stage-01-south-sac\.webp$/.test(stage1.map||'')||stage1.mapSource!==stage1.map)throw new Error(`Stage 1 map routing wrong: ${JSON.stringify(stage1)}`);
  if(stage1.enemies.length<3||stage1.enemies.some(e=>e.attack<=0||e.attack>18||!e.ai))throw new Error(`Stage 1 opening balance/combat readiness regressed: ${JSON.stringify(stage1.enemies)}`);
  if(stage1.chakra.some(u=>u.chakra>Math.min(2,u.max)))throw new Error(`development full-chakra shortcut survived: ${JSON.stringify(stage1.chakra)}`);
  if(stage1.playerFootPadding!==4||stage1.enemyTerrainPadding!==18||stage1.broadWalkable.some(value=>!value))throw new Error(`Road terrain footprint/broad field regressed: ${JSON.stringify(stage1)}`);

  await page.evaluate(()=>window.BlazingMatchResults.returnHome());await page.reload({waitUntil:'domcontentloaded'});await waitHome(page);await enterRoad(page,1);await waitCamera(page,'combat',1);
  const enemyAdvance=await advanceInitiativeTo(page,{kind:'enemy'});if(!enemyAdvance.ok)throw new Error(`Could not advance Road initiative to enemy: ${JSON.stringify(enemyAdvance)}`);
  const evadeStarted=await page.evaluate(()=>{
   const s=globalThis.eval('S'),cpuTurn=globalThis.eval('cpuTurn'),front=globalThis.eval('front'),snap=window.BlazingRoadTurns.snapshot({limit:20}),current=snap.current;
   const e=s.enemies.find(enemy=>enemy.name===current?.name&&enemy.hp>0);if(!e)return {error:'initiative enemy missing',snap};e.hp=1;e.gauge=100;s.ready={kind:'enemy',ref:e,g:100};s.phase='cpu';window.BlazingRoadTurns.sync();
   const random=Math.random;Math.random=()=>0;try{cpuTurn()}finally{Math.random=random}return {name:e.name,log:s.log};
  });
  if(evadeStarted.error)throw new Error(`enemy evade setup failed: ${JSON.stringify(evadeStarted)}`);
  await page.waitForFunction(()=>{try{const s=globalThis.eval('S');return /repositioned out of danger/i.test(s?.log||'')}catch{return false}},null,{timeout:3500});
  const evadeEnded=await page.evaluate(()=>{const s=globalThis.eval('S');return {log:s.log,phase:s.phase}});if(!/evad/i.test(evadeStarted.log)||!/repositioned out of danger/i.test(evadeEnded.log))throw new Error(`enemy evade branch did not complete: ${JSON.stringify({evadeStarted,evadeEnded})}`);

  await page.evaluate(()=>{const s=globalThis.eval('S'),R=window.BlazingRoadRun;const fighters=s.pairs.flatMap(p=>p.units||[]).filter(u=>u&&u.name&&u.name!=='—'&&Number(u.maxHp)>0);const run=R.createRun(fighters,{stage:10});R.saveRun(run);window.BlazingMatchResults.returnHome()});
  await waitHome(page);await enterRoad(page,10);
  const intro10=await waitCamera(page,'intro',10);if(intro10.mapKey!=='training-grounds'||intro10.targetScale!==1)throw new Error(`Stage 10 intro camera should show full map: ${JSON.stringify(intro10)}`);
  const camera10=await waitCamera(page,'combat',10);if(Math.abs(camera10.targetScale-1.16)>.001||camera10.mapKey!=='training-grounds')throw new Error(`Stage 10 combat camera invalid: ${JSON.stringify(camera10)}`);
  const stage10=await page.evaluate(()=>{const s=globalThis.eval('S');return {stage:s.bbRoadContent?.stage,elite:s.bbRoadContent?.elite,map:s.bbRoadContent?.map?.src,mapSource:s.bbRoadMapSource,enemies:s.enemies.map(e=>({hp:e.maxHp,attack:e.attack,defense:e.defense})),maxStage:window.BlazingRoadContent.MAX_STAGE}});
  if(stage10.stage!==10||!stage10.elite||stage10.maxStage!==10)throw new Error(`Stage 10 is not final elite: ${JSON.stringify(stage10)}`);
  if(!/stage-05-training-grounds\.webp$/.test(stage10.map||'')||stage10.mapSource!==stage10.map)throw new Error(`Stage 10 map slot wrong: ${JSON.stringify(stage10)}`);
  if(stage10.enemies.length<5||Math.min(...stage10.enemies.map(e=>e.attack))<=Math.min(...stage1.enemies.map(e=>e.attack)))throw new Error(`Stage 10 threat did not scale: ${JSON.stringify(stage10.enemies)}`);

  const victory=await page.evaluate(()=>{const s=globalThis.eval('S'),check=globalThis.eval('checkVictoryKillshot');s.enemies.forEach(e=>{e.hp=0});return {won:check(),run:window.BlazingRoadRun.loadRun()}});if(!victory.won||victory.run?.status!=='complete'||victory.run?.stage!==10)throw new Error(`Stage 10 did not complete Road cleanly: ${JSON.stringify(victory)}`);
  const outro10=await waitCamera(page,'outro',10);if(outro10.targetScale!==1)throw new Error(`Road victory camera did not return to full-map framing: ${JSON.stringify(outro10)}`);
  await page.locator('#bbMatchResults.active').waitFor({state:'visible',timeout:5000});const results=await page.locator('#bbMatchResults').innerText();if(!/ROAD COMPLETE/.test(results)||!/RESTART ROAD/.test(results)||!/MAIN MENU/.test(results))throw new Error(`Road completion results wrong: ${results}`);
  await page.getByRole('button',{name:'MAIN MENU'}).click();await waitHome(page);const card=await page.locator('#bbHomeApproved [data-mode="road"] span:last-child').textContent();if(!/Road Complete/i.test(card||'')||!/10\/10/.test(card||''))throw new Error(`approved Home Road completion status wrong: ${card}`);

  await page.evaluate(()=>window.BlazingRoadRun.clearRun());if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Road gameplay smoke PASS (${name}): round Speed initiative, segmented chakra HUD, compact Sub-Zero/Senku ranges, reduced 1.16 combat zoom, native touch drag, enemy AI, map routing, and Stage 10 completion verified.`);
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){try{await run(name,type)}catch(error){failed=true;console.error(`Road gameplay smoke FAIL (${name}): ${error.stack||error.message}`)}}
if(failed)process.exit(1);