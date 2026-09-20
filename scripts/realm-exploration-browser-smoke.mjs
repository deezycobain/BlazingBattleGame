import { mkdirSync } from 'node:fs';
import { chromium, webkit } from 'playwright';
const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};
mkdirSync('test-artifacts',{recursive:true});
async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>window.BlazingRealmExplorer?.VERSION===2&&typeof window.BlazingRoadRun==='object',{timeout:30000});
}
async function sample(page){return page.evaluate(()=>{let b=null;try{b=globalThis.eval('S')}catch{}const api=window.BlazingRealmExplorer,s=document.querySelector('#bbRealmExplorer .bb-run-stage');return {run:api?.loadState?.()||null,road:window.BlazingRoadRun?.loadRun?.()||null,title:document.querySelector('#bbRealmExplorer .bb-realm-heading strong')?.textContent?.trim()||'',stage:!!s,runner:!!document.querySelector('#bbRealmExplorer .bb-run-player'),world:!!document.querySelector('#bbRealmExplorer .bb-run-world'),sparks:document.querySelectorAll('#bbRealmExplorer .bb-run-spark').length,blocked:s?.dataset?.blocked||'',battleActive:document.getElementById('battleScreen')?.classList.contains('active')||false,battleMode:b?.bbRunMode||null,encounter:b?.bbRealmEncounter||null,roadStage:b?.bbRoadStage||null,enemies:Array.isArray(b?.enemies)?b.enemies.length:0};});}
async function run(name,type){
 let browser;
 try{
  console.log('Realm Run smoke START ('+name+') -> '+BASE);
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});await waitHome(page);
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error('commit mismatch: expected '+EXPECT.slice(0,12)+', got '+(meta?.commit||'missing'));
  await page.evaluate(()=>{localStorage.removeItem('bb_realm_run_v1');localStorage.removeItem('bb_realm_exploration_v1');sessionStorage.removeItem('bb_realm_run_resume_v1');window.BlazingRoadRun?.clearRun?.();});
  await page.locator('#bbRealmEntry').click();
  await page.locator('#bbRealmExplorer:not([hidden]) .bb-realm-card[data-realm="shinobi"]').waitFor({state:'visible'});
  if(await page.locator('#bbRealmExplorer .bb-realm-card').count()!==3)throw new Error('World Nexus realm count regressed');
  await page.screenshot({path:'test-artifacts/realm-run-nexus-'+name+'.png',fullPage:true});
  await page.locator('#bbRealmExplorer .bb-realm-card[data-realm="shinobi"]').click();
  await page.locator('#bbRealmExplorer .bb-run-stage').waitFor({state:'visible'});
  let s=await sample(page);
  if(s.title!=='SHINOBI REALM'||!s.stage||!s.runner||!s.world||s.sparks!==12)throw new Error('Realm Run shell incomplete: '+JSON.stringify(s));
  await page.evaluate(()=>window.BlazingRealmExplorer.setAutoRun(true));
  await page.waitForFunction(()=>window.BlazingRealmExplorer.loadState().distance>140,null,{timeout:5000});
  await page.evaluate(()=>window.BlazingRealmExplorer.setAutoRun(false));
  s=await sample(page);if(!(s.run.distance>140))throw new Error('runner did not advance');
  await page.evaluate(()=>{window.BlazingRealmExplorer.laneShift(-1);window.BlazingRealmExplorer.jump();window.BlazingRealmExplorer.dash();});
  await page.waitForTimeout(120);
  s=await sample(page);if(s.run.lane!==0)throw new Error('upper trail switch failed: '+JSON.stringify(s.run));
  await page.evaluate(()=>window.BlazingRealmExplorer.setAutoRun(false));
  await page.evaluate(()=>{const a=window.BlazingRealmExplorer,x=a.loadState();a.saveState({...x,distance:1085,lane:0,route:'upper'});a.renderRun();});
  await page.waitForFunction(()=>document.querySelector('#bbRealmExplorer .bb-run-event strong')?.textContent?.trim()==='Hidden Supply Cache');
  await page.locator('#bbRealmExplorer [data-event-primary]').click();
  s=await sample(page);if(s.run.fragments!==1||!s.run.claimed.includes('supply_cache'))throw new Error('cache reward failed: '+JSON.stringify(s.run));
  await page.evaluate(()=>{const a=window.BlazingRealmExplorer,x=a.loadState();a.saveState({...x,distance:2075,lane:1,route:'main'});a.renderRun();a.setAutoRun(true);});
  await page.waitForFunction(()=>document.querySelector('#bbRealmExplorer .bb-run-stage')?.dataset?.blocked==='rogue_patrol',null,{timeout:4000});
  s=await sample(page);if(s.blocked!=='rogue_patrol')throw new Error('patrol did not stop traversal');
  await page.screenshot({path:'test-artifacts/realm-run-shinobi-'+name+'.png',fullPage:true});
  await page.locator('#bbRealmExplorer [data-event-primary]').click();
  await page.waitForFunction(()=>{try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='exploration'&&s?.bbRealmEncounter?.id==='rogue_patrol';}catch{return false}},null,{timeout:15000});
  s=await sample(page);
  if(s.road)throw new Error('Realm Run battle touched Blazing Road state: '+JSON.stringify(s.road));
  if(s.battleMode!=='exploration'||s.encounter?.id!=='rogue_patrol'||s.roadStage!==4||s.enemies<1)throw new Error('patrol battle handoff failed: '+JSON.stringify(s));
  if(errors.length)throw new Error('page errors: '+errors.join(' | '));
  console.log('Realm Run smoke PASS ('+name+'): side-scroll movement, lane control, jump/dash, cache reward, patrol stop, and tactical handoff verified.');
  await context.close();
 }finally{await browser?.close().catch(()=>{});}
}
let failed=false;
for(const [name,type] of Object.entries(TYPES)){try{await run(name,type)}catch(error){failed=true;console.error('Realm Run smoke FAIL ('+name+'): '+(error.stack||error.message));}}
if(failed)process.exit(1);
