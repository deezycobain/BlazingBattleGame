import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>typeof window.BlazingBattlePause==='object'&&typeof window.BlazingRoadRun==='object'&&typeof window.BlazingMatchResults==='object'&&typeof window.BlazingApprovedHomeCompat==='object'&&typeof window.BlazingHomeV9Lifecycle==='object'&&typeof window.BlazingHomeFeedbackFixes==='object',{timeout:30000});
}
async function enterRoad(page){
 const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
 if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
 await panel.waitFor({state:'visible',timeout:5000});
 await page.locator('#bbHomeApproved [data-mode="road"]').click();
 await page.waitForFunction(()=>{try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'}catch{return false}},{timeout:15000});
}
async function waitRoadCombatReady(page){
 await page.waitForFunction(()=>!window.BlazingRoadCamera?.isCombatLocked?.(),null,{timeout:12000});
}
async function run(name,type){
 let browser;
 try{
  console.log(`Battle pause smoke START (${name}) -> ${BASE}`);
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
  await page.evaluate(()=>window.BlazingRoadRun.clearRun());
  await enterRoad(page);
  await page.locator('#bbBattlePauseButton.visible').waitFor({state:'visible',timeout:5000});

  const before=await page.evaluate(()=>{const s=globalThis.eval('S');return {stage:s.bbRoadStage,map:s.bbRoadContent?.map?.src,mapSource:s.bbRoadMapSource,gauges:[...s.pairs.map(p=>p.gauge),...s.enemies.map(e=>e.gauge)],reward:window.BlazingEconomy?.balance?.()??0}});
  const reset=page.getByRole('button',{name:/^Reset$/i});
  await reset.waitFor({state:'visible',timeout:5000});await reset.click();
  await page.waitForFunction(stage=>{try{const s=globalThis.eval('S'),run=window.BlazingRoadRun.loadRun();return s?.bbRunMode==='road'&&s?.bbRoadStage===stage&&run?.stage===stage&&s?.bbRoadContent?.map?.src&&s.bbRoadMapSource===s.bbRoadContent.map.src}catch{return false}},before.stage,{timeout:5000});
  const afterReset=await page.evaluate(()=>{const s=globalThis.eval('S'),run=window.BlazingRoadRun.loadRun();return {stage:s.bbRoadStage,map:s.bbRoadContent?.map?.src,mapSource:s.bbRoadMapSource,runStage:run?.stage,runStatus:run?.status}});
  if(afterReset.stage!==before.stage||afterReset.runStage!==before.stage||afterReset.runStatus!=='active'||afterReset.mapSource!==afterReset.map)throw new Error(`Reset did not preserve Road stage/map: ${JSON.stringify({before,afterReset})}`);

  const placement=await page.evaluate(()=>{const battle=document.getElementById('battleScreen'),pause=document.getElementById('bbBattlePauseButton'),reset=[...battle.querySelectorAll('button')].find(button=>/^\s*reset\s*$/i.test(button.textContent||''));const rect=el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};return {battle:rect(battle),pause:rect(pause),reset:rect(reset)}});
  if(placement.pause.top<placement.reset.bottom-1||placement.pause.right>placement.battle.right+1||placement.pause.width>48)throw new Error(`Pause control placement is not below the battle toolbar: ${JSON.stringify(placement)}`);

  // Road now intentionally freezes the combat tick through the 3-2-1-FIGHT/camera intro.
  // Wait for that independent presentation lock to clear before testing Pause/Resume itself.
  await waitRoadCombatReady(page);

  await page.locator('#bbBattlePauseButton').click();await page.locator('#bbBattlePause.active').waitFor({state:'visible',timeout:3000});
  if(!(await page.evaluate(()=>window.BlazingBattlePause.isPaused())))throw new Error('pause API did not enter paused state');
  const frozenA=await page.evaluate(()=>{const s=globalThis.eval('S');return [...s.pairs.map(p=>p.gauge),...s.enemies.map(e=>e.gauge)]});
  await page.waitForTimeout(650);
  const frozenB=await page.evaluate(()=>{const s=globalThis.eval('S');return [...s.pairs.map(p=>p.gauge),...s.enemies.map(e=>e.gauge)]});
  if(JSON.stringify(frozenA)!==JSON.stringify(frozenB))throw new Error(`turn gauges moved while paused: ${JSON.stringify({frozenA,frozenB})}`);
  await page.getByRole('button',{name:'RESUME'}).click();await page.waitForFunction(()=>!window.BlazingBattlePause.isPaused());await page.waitForTimeout(400);
  const afterResume=await page.evaluate(()=>{const s=globalThis.eval('S');return [...s.pairs.map(p=>p.gauge),...s.enemies.map(e=>e.gauge)]});
  if(JSON.stringify(afterResume)===JSON.stringify(frozenB))throw new Error('turn gauges did not resume after Resume');

  await page.locator('#bbBattlePauseButton').click();await page.getByRole('button',{name:'EXIT TO MAIN MENU'}).click();await waitHome(page);
  await page.waitForFunction(()=>!document.getElementById('battleScreen')?.classList.contains('active'));
  await page.waitForFunction(()=>{const leader=document.querySelector('#bbHomeApproved .bb-home-v5-leader');return !leader||getComputedStyle(leader).display==='none'||getComputedStyle(leader).visibility==='hidden'||leader.getBoundingClientRect().width===0},{timeout:5000});
  const exitState=await page.evaluate(()=>{const leader=document.querySelector('#bbHomeApproved .bb-home-v5-leader');return {run:window.BlazingRoadRun.loadRun(),reward:window.BlazingEconomy?.balance?.()??0,paused:window.BlazingBattlePause.isPaused(),leaderDisplay:leader?getComputedStyle(leader).display:'missing',feedback:document.querySelector('#bbHomeApproved')?.dataset?.bbHomeFeedback||''}});
  if(exitState.paused)throw new Error('pause state survived Exit');
  if(exitState.run?.status!=='active'||exitState.run?.stage!==before.stage)throw new Error(`Exit mutated Road stage/status: ${JSON.stringify(exitState.run)}`);
  if(exitState.reward!==before.reward)throw new Error(`Exit awarded currency: before ${before.reward}, after ${exitState.reward}`);
  if(exitState.leaderDisplay!=='none')throw new Error(`Home leader presentation should remain hidden: ${JSON.stringify(exitState)}`);
  if(exitState.feedback!=='r1')throw new Error(`Home feedback layer missing after Exit: ${JSON.stringify(exitState)}`);
  await page.evaluate(()=>window.BlazingRoadRun.clearRun());
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Battle pause smoke PASS (${name}): Reset preserves Road stage/map, Pause freezes/resumes correctly after the Road intro lock, Exit keeps Road state, and the Home leader presentation stays hidden.`);
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){try{await run(name,type)}catch(error){failed=true;console.error(`Battle pause smoke FAIL (${name}): ${error.stack||error.message}`)}}
if(failed)process.exit(1);
