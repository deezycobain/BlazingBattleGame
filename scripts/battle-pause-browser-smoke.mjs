import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
 await page.locator('#level1Btn').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>typeof window.BlazingBattlePause==='object'&&typeof window.BlazingRoadRun==='object'&&typeof window.BlazingMatchResults==='object',{timeout:30000});
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
  await page.locator('#level1Btn').click();
  await page.waitForFunction(()=>{try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'}catch{return false}},{timeout:15000});
  await page.locator('#bbBattlePauseButton.visible').waitFor({state:'visible',timeout:5000});
  const before=await page.evaluate(()=>{const s=globalThis.eval('S');return {stage:s.bbRoadStage,gauges:[...s.pairs.map(p=>p.gauge),...s.enemies.map(e=>e.gauge)],reward:window.BlazingEconomy?.balance?.()??0}});
  await page.locator('#bbBattlePauseButton').click();
  await page.locator('#bbBattlePause.active').waitFor({state:'visible',timeout:3000});
  if(!(await page.evaluate(()=>window.BlazingBattlePause.isPaused())))throw new Error('pause API did not enter paused state');
  const frozenA=await page.evaluate(()=>{const s=globalThis.eval('S');return [...s.pairs.map(p=>p.gauge),...s.enemies.map(e=>e.gauge)]});
  await page.waitForTimeout(650);
  const frozenB=await page.evaluate(()=>{const s=globalThis.eval('S');return [...s.pairs.map(p=>p.gauge),...s.enemies.map(e=>e.gauge)]});
  if(JSON.stringify(frozenA)!==JSON.stringify(frozenB))throw new Error(`turn gauges moved while paused: ${JSON.stringify({frozenA,frozenB})}`);
  await page.getByRole('button',{name:'RESUME'}).click();
  await page.waitForFunction(()=>!window.BlazingBattlePause.isPaused());
  await page.waitForTimeout(400);
  const afterResume=await page.evaluate(()=>{const s=globalThis.eval('S');return [...s.pairs.map(p=>p.gauge),...s.enemies.map(e=>e.gauge)]});
  if(JSON.stringify(afterResume)===JSON.stringify(frozenB))throw new Error('turn gauges did not resume after Resume');
  await page.locator('#bbBattlePauseButton').click();
  await page.getByRole('button',{name:'EXIT TO MAIN MENU'}).click();
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('menuScreen')).display!=='none'&&!document.getElementById('battleScreen')?.classList.contains('active'));
  const exitState=await page.evaluate(()=>({run:window.BlazingRoadRun.loadRun(),reward:window.BlazingEconomy?.balance?.()??0,paused:window.BlazingBattlePause.isPaused()}));
  if(exitState.paused)throw new Error('pause state survived Exit');
  if(exitState.run?.status!=='active'||exitState.run?.stage!==before.stage)throw new Error(`Exit mutated Road stage/status: ${JSON.stringify(exitState.run)}`);
  if(exitState.reward!==before.reward)throw new Error(`Exit awarded currency: before ${before.reward}, after ${exitState.reward}`);
  await page.evaluate(()=>window.BlazingRoadRun.clearRun());
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Battle pause smoke PASS (${name}): Pause freezes turn gauges, Resume restores battle flow, Exit returns Home without rewards or Road progression.`);
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
 try{await run(name,type)}catch(error){failed=true;console.error(`Battle pause smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
