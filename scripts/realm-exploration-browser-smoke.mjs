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
  await page.waitForFunction(()=>typeof window.BlazingRealmExplorer==='object'&&typeof window.BlazingRoadRun==='object',{timeout:30000});
  await page.waitForTimeout(180);
}

async function state(page){
  return page.evaluate(()=>{
    const api=window.BlazingRealmExplorer;
    let battle=null;
    try{battle=globalThis.eval('S')}catch{}
    return {
      exploration:api?.loadState?.()||null,
      road:window.BlazingRoadRun?.loadRun?.()||null,
      rootVisible:!!document.querySelector('#bbRealmExplorer:not([hidden])'),
      viewTitle:document.querySelector('#bbRealmExplorer .bb-realm-heading strong')?.textContent?.trim()||'',
      battleActive:document.getElementById('battleScreen')?.classList.contains('active')||false,
      battleMode:battle?.bbRunMode||null,
      encounter:battle?.bbRealmEncounter||null,
      roadStage:battle?.bbRoadStage||null,
      enemies:Array.isArray(battle?.enemies)?battle.enemies.length:0
    };
  });
}

async function run(name,type){
  let browser;
  try{
    console.log(`Realm exploration smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
    const page=await context.newPage();
    page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));

    await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
    await waitHome(page);
    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);

    await page.evaluate(()=>{
      localStorage.removeItem('bb_realm_exploration_v1');
      sessionStorage.removeItem('bb_realm_exploration_resume_v1');
      window.BlazingRoadRun?.clearRun?.();
    });

    const entry=page.locator('#bbRealmEntry');
    await entry.waitFor({state:'visible'});
    await entry.click();
    await page.locator('#bbRealmExplorer:not([hidden]) .bb-realm-card[data-realm="shinobi"]').waitFor({state:'visible'});
    const realms=await page.locator('#bbRealmExplorer .bb-realm-card').count();
    if(realms!==3)throw new Error(`expected three Nexus realm cards, found ${realms}`);
    const locked=await page.locator('#bbRealmExplorer .bb-realm-card[data-status="locked"]').count();
    if(locked!==2)throw new Error(`expected two locked future realms, found ${locked}`);
    await page.screenshot({path:`test-artifacts/realm-nexus-${name}.png`,fullPage:true});

    await page.locator('#bbRealmExplorer .bb-realm-card[data-realm="shinobi"]').click();
    const field=page.locator('#bbRealmExplorer .bb-explore-stage');
    await field.waitFor({state:'visible'});
    let snap=await state(page);
    if(!snap.rootVisible||snap.viewTitle!=='SHINOBI REALM')throw new Error(`Shinobi Realm did not open: ${JSON.stringify(snap)}`);
    if(!snap.exploration||Math.abs(Number(snap.exploration.x)-.5)>.01||Math.abs(Number(snap.exploration.y)-.82)>.01)throw new Error(`fresh exploration spawn is wrong: ${JSON.stringify(snap.exploration)}`);

    const box=await field.boundingBox();
    if(!box)throw new Error('exploration field has no layout box');
    await page.mouse.click(box.x+box.width*.44,box.y+box.height*.70);
    await page.waitForFunction(()=>{
      const s=window.BlazingRealmExplorer?.loadState?.();
      return s&&Math.abs(Number(s.x)-.5)>.025;
    },null,{timeout:7000});
    snap=await state(page);
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('bb_realm_exploration_v1')||'null'));
    if(!stored||Math.abs(Number(stored.x)-Number(snap.exploration.x))>.005)throw new Error(`movement did not persist: ${JSON.stringify({stored,snap:snap.exploration})}`);

    await page.evaluate(()=>{
      const api=window.BlazingRealmExplorer,s=api.loadState();
      api.saveState({...s,x:.23,y:.67,discovered:[...s.discovered,'west']});
      api.renderExplore();
    });
    await page.waitForFunction(()=>document.querySelector('#bbRealmExplorer .bb-nearby strong')?.textContent?.trim()==='Hidden Supply Cache');
    await page.locator('#bbRealmExplorer .bb-nearby button').click();
    snap=await state(page);
    if(snap.exploration.fragments!==1||!snap.exploration.claimed.includes('supply_cache'))throw new Error(`cache interaction failed: ${JSON.stringify(snap.exploration)}`);

    await page.evaluate(()=>{
      const api=window.BlazingRealmExplorer,s=api.loadState();
      api.saveState({...s,x:.73,y:.455,discovered:[...s.discovered,'east']});
      api.renderExplore();
    });
    await page.waitForFunction(()=>document.querySelector('#bbRealmExplorer .bb-nearby strong')?.textContent?.trim()==='Rogue Patrol');
    await page.screenshot({path:`test-artifacts/realm-shinobi-${name}.png`,fullPage:true});
    await page.locator('#bbRealmExplorer .bb-nearby button').click();

    await page.waitForFunction(()=>{
      try{
        const s=globalThis.eval('S');
        return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='exploration'&&s?.bbRealmEncounter?.id==='rogue_patrol';
      }catch{return false}
    },null,{timeout:15000});
    snap=await state(page);
    if(snap.road)throw new Error(`exploration encounter created/changed a Blazing Road run: ${JSON.stringify(snap.road)}`);
    if(snap.battleMode!=='exploration'||snap.encounter?.id!=='rogue_patrol'||snap.roadStage!==4||snap.enemies<1)throw new Error(`exploration battle handoff is incomplete: ${JSON.stringify(snap)}`);
    if(errors.length)throw new Error(`page errors: ${errors.join(' | ')}`);

    console.log(`Realm exploration smoke PASS (${name}): Home -> Nexus -> Shinobi exploration, persistent movement, cache reward, and isolated roaming-patrol battle verified.`);
    await context.close();
  }finally{
    await browser?.close().catch(()=>{});
  }
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Realm exploration smoke FAIL (${name}): ${error.stack||error.message}`);}
}
if(failed)process.exit(1);
