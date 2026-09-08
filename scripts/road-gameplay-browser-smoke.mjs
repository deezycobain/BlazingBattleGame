import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingRoadContent==='object'&&typeof window.BlazingRoadCamera==='object'&&typeof window.BlazingMatchResults==='object'&&typeof window.BlazingApprovedHomeCompat==='object',{timeout:30000});
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
 },{mode,stage},{timeout:5000});
 return page.evaluate(()=>{
  const snap=window.BlazingRoadCamera.snapshot();
  const canvas=document.getElementById(snap.canvasId||'game');
  return {...snap,inlineScale:canvas?.style?.scale||'',inlineTransform:canvas?.style?.transform||''};
 });
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
  const intro1=await waitCamera(page,'intro',1);
  if(intro1.mapKey!=='south-sac'||intro1.targetScale!==1)throw new Error(`Stage 1 intro camera should show full map: ${JSON.stringify(intro1)}`);
  const camera1=await waitCamera(page,'combat',1);
  if(!(camera1.targetScale>1.05&&camera1.targetScale<=1.16)||camera1.combatScale!==camera1.targetScale)throw new Error(`Stage 1 combat camera zoom invalid: ${JSON.stringify(camera1)}`);
  if(!/center/i.test(camera1.position||''))throw new Error(`Stage 1 camera focus is not centered on playable floor: ${JSON.stringify(camera1)}`);
  if(!(camera1.inlineScale&&Number(camera1.inlineScale)>1.05)&&!/scale\(/.test(camera1.inlineTransform||''))throw new Error(`Stage 1 camera did not apply visual canvas zoom: ${JSON.stringify(camera1)}`);

  const stage1=await page.evaluate(()=>{
   const s=globalThis.eval('S'),front=globalThis.eval('front'),tick=globalThis.eval('tick'),C=window.BlazingRoadContent;
   const players=s.pairs.filter(p=>p.units?.[p.active]?.name&&p.units[p.active].name!=='—').map(p=>front(p));
   const broadPoints=[{x:90,y:300},{x:240,y:300},{x:390,y:300}];
   const snapshot={stage:s.bbRoadContent?.stage,name:s.bbRoadContent?.name,elite:s.bbRoadContent?.elite,map:s.bbRoadContent?.map?.src,mapSource:s.bbRoadMapSource,mapAudit:window.BlazingRoadMapAudit||null,enemies:s.enemies.map(e=>({hp:e.maxHp,attack:e.attack,defense:e.defense,speed:e.speed,ai:!!e.bbRoadAi})),chakra:players.map(u=>({name:u.name,chakra:u.chakra,max:u.maxChakra})),tickSource:String(tick),playerFootPadding:C.PLAYER_FOOT_PADDING,enemyTerrainPadding:C.ENEMY_TERRAIN_PADDING,broadWalkable:broadPoints.map(point=>C.isWalkablePoint(s.bbRoadContent?.map,point,{padding:C.PLAYER_FOOT_PADDING}))};
   s.pairs.forEach(p=>{p.gauge=0;front(p).speed=1});
   s.enemies.forEach((e,i)=>{e.gauge=0;e.speed=i===0?100:1});
   s.phase='charge';s.ready=null;s._chargeSince=performance.now();
   for(let i=0;i<80&&s.phase==='charge';i++)tick();
   snapshot.speedWinner=s.ready?.kind||null;
   if(s.ready?.kind==='enemy'){s.ready.ref.gauge=0;s.ready=null;s.phase='resolve';}
   return snapshot;
  });
  if(stage1.stage!==1||stage1.elite)throw new Error(`Stage 1 content wrong: ${JSON.stringify(stage1)}`);
  if(!/stage-01-south-sac\.webp$/.test(stage1.map||'')||stage1.mapSource!==stage1.map)throw new Error(`Stage 1 map routing wrong: ${JSON.stringify(stage1)}`);
  if(stage1.enemies.length<3||stage1.enemies.some(e=>e.attack<24||!e.ai))throw new Error(`Stage 1 enemies are not combat-ready: ${JSON.stringify(stage1.enemies)}`);
  if(stage1.chakra.some(u=>u.chakra>Math.min(2,u.max)))throw new Error(`development full-chakra shortcut survived: ${JSON.stringify(stage1.chakra)}`);
  if(stage1.playerFootPadding!==4||stage1.enemyTerrainPadding!==18)throw new Error(`Road terrain footprints are not separated correctly: ${JSON.stringify(stage1)}`);
  if(stage1.broadWalkable.some(value=>!value))throw new Error(`Stage 1 broad playable field regressed: ${JSON.stringify(stage1.broadWalkable)}`);
  if(stage1.speedWinner!=='enemy')throw new Error(`Speed meter did not allow faster enemy to win: ${stage1.speedWinner}`);
  if(/player control restored|fallback restored player control/i.test(stage1.tickSource))throw new Error('player-forcing speed fallback survived in tick()');
  console.log(`Road gameplay smoke (${name}) Stage 1 map request: ${stage1.map}; fallback=${!!stage1.mapAudit?.fallback}; combatZoom=${camera1.targetScale}`);

  await page.evaluate(()=>window.BlazingMatchResults.returnHome());
  await page.reload({waitUntil:'domcontentloaded'});await waitHome(page);await enterRoad(page,1);
  await waitCamera(page,'combat',1);
  const evadeStarted=await page.evaluate(()=>{
   const s=globalThis.eval('S'),cpuTurn=globalThis.eval('cpuTurn');
   const e=s.enemies[0];e.hp=1;e.gauge=100;s.ready={kind:'enemy',ref:e,g:100};s.phase='cpu';
   const random=Math.random;Math.random=()=>0;
   try{cpuTurn()}finally{Math.random=random}
   return {name:e.name,log:s.log};
  });
  await page.waitForFunction(()=>{
   try{const s=globalThis.eval('S');return /repositioned out of danger/i.test(s?.log||'')}catch{return false}
  },null,{timeout:3500});
  const evadeEnded=await page.evaluate(()=>{const s=globalThis.eval('S');return {log:s.log,phase:s.phase}});
  if(!/evad/i.test(evadeStarted.log)||!/repositioned out of danger/i.test(evadeEnded.log))throw new Error(`enemy evade branch did not complete: ${JSON.stringify({evadeStarted,evadeEnded})}`);

  await page.evaluate(()=>{
   const s=globalThis.eval('S'),R=window.BlazingRoadRun;
   const fighters=s.pairs.flatMap(p=>p.units||[]).filter(u=>u&&u.name&&u.name!=='—'&&Number(u.maxHp)>0);
   const run=R.createRun(fighters,{stage:10});R.saveRun(run);window.BlazingMatchResults.returnHome();
  });
  await waitHome(page);await enterRoad(page,10);
  const intro10=await waitCamera(page,'intro',10);
  if(intro10.mapKey!=='training-grounds'||intro10.targetScale!==1)throw new Error(`Stage 10 intro camera should show full map: ${JSON.stringify(intro10)}`);
  const camera10=await waitCamera(page,'combat',10);
  if(!(camera10.targetScale>1&&camera10.targetScale<=1.16)||camera10.mapKey!=='training-grounds')throw new Error(`Stage 10 combat camera invalid: ${JSON.stringify(camera10)}`);
  const stage10=await page.evaluate(()=>{
   const s=globalThis.eval('S');return {stage:s.bbRoadContent?.stage,elite:s.bbRoadContent?.elite,map:s.bbRoadContent?.map?.src,mapSource:s.bbRoadMapSource,enemies:s.enemies.map(e=>({hp:e.maxHp,attack:e.attack,defense:e.defense,speed:e.speed})),maxStage:window.BlazingRoadContent.MAX_STAGE};
  });
  if(stage10.stage!==10||!stage10.elite||stage10.maxStage!==10)throw new Error(`Stage 10 is not final elite: ${JSON.stringify(stage10)}`);
  if(!/stage-05-training-grounds\.webp$/.test(stage10.map||'')||stage10.mapSource!==stage10.map)throw new Error(`Stage 10 map slot wrong: ${JSON.stringify(stage10)}`);
  if(stage10.enemies.length<5||Math.min(...stage10.enemies.map(e=>e.attack))<=Math.min(...stage1.enemies.map(e=>e.attack)))throw new Error(`Stage 10 threat did not scale: ${JSON.stringify(stage10.enemies)}`);

  const victory=await page.evaluate(()=>{
   const s=globalThis.eval('S'),check=globalThis.eval('checkVictoryKillshot');s.enemies.forEach(e=>{e.hp=0});
   return {won:check(),run:window.BlazingRoadRun.loadRun()};
  });
  if(!victory.won||victory.run?.status!=='complete'||victory.run?.stage!==10)throw new Error(`Stage 10 did not complete Road cleanly: ${JSON.stringify(victory)}`);
  const outro10=await waitCamera(page,'outro',10);
  if(outro10.targetScale!==1)throw new Error(`Road victory camera did not return to full-map framing: ${JSON.stringify(outro10)}`);
  await page.locator('#bbMatchResults.active').waitFor({state:'visible',timeout:5000});
  const results=await page.locator('#bbMatchResults').innerText();
  if(!/ROAD COMPLETE/.test(results)||!/RESTART ROAD/.test(results)||!/MAIN MENU/.test(results))throw new Error(`Road completion results wrong: ${results}`);
  await page.getByRole('button',{name:'MAIN MENU'}).click();
  await waitHome(page);
  const card=await page.locator('#bbHomeApproved [data-mode="road"] span:last-child').textContent();
  if(!/Road Complete/i.test(card||'')||!/10\/10/.test(card||''))throw new Error(`approved Home Road completion status wrong: ${card}`);

  await page.evaluate(()=>window.BlazingRoadRun.clearRun());
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Road gameplay smoke PASS (${name}): broad roster-independent movement field, full-map intro/outro, combat zoom, real Speed ordering, enemy AI, map routing, and Stage 10 completion verified.`);
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
 try{await run(name,type)}catch(error){failed=true;console.error(`Road gameplay smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
