import { chromium, webkit } from 'playwright';

const BASE=process.env.BB_SMOKE_URL||'http://127.0.0.1:4173';
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const browsers=[['chromium',chromium],['webkit',webkit]];
const HARD_TIMEOUT_MS=Number(process.env.BB_SMOKE_HARD_TIMEOUT_MS||95000);
let failed=false;

async function runBrowser(name,type){
  let browser;
  let page;
  const errors=[];
  try{
    console.log(`Browser smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    page=await browser.newPage({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(20000);
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`)});
    const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:20000});
    if(!response?.ok())throw new Error(`HTTP ${response?.status()}`);
    await page.locator('.logo').waitFor({state:'visible',timeout:5000});
    const bootText=await page.locator('.logo').textContent();
    if(!/Blazing Battle/i.test(bootText||''))throw new Error('boot logo missing');
    console.log(`Browser smoke (${name}): BOOT_SHELL visible`);
    await page.waitForFunction(()=>Array.isArray(window.__BB_DIAGNOSTICS__)&&window.__BB_DIAGNOSTICS__.some(e=>e.name==='GAME_FETCH_COMPLETE'),null,{timeout:30000});
    console.log(`Browser smoke (${name}): GAME_FETCH_COMPLETE`);
    await page.waitForFunction(()=>window.BBTelemetry&&Array.isArray(window.__BB_DIAGNOSTICS__)&&window.__BB_DIAGNOSTICS__.some(e=>e.name==='RUNTIME_STARTED'),null,{timeout:15000});
    console.log(`Browser smoke (${name}): RUNTIME_STARTED`);
    await page.waitForFunction(()=>Array.isArray(window.__BB_DIAGNOSTICS__)&&window.__BB_DIAGNOSTICS__.some(e=>e.name==='HOME_READY'),null,{timeout:30000});
    console.log(`Browser smoke (${name}): HOME_READY`);
    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`deployed commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
    if(errors.length)throw new Error(errors.join(' | '));
    console.log(`Browser smoke PASS (${name}): BOOT_SHELL -> GAME_FETCH_COMPLETE -> RUNTIME_STARTED -> HOME_READY${EXPECT?` @ ${String(meta?.commit).slice(0,12)}`:''}`);
  }catch(err){
    failed=true;
    const state=page?await Promise.race([
      page.evaluate(()=>({diagnostics:window.__BB_DIAGNOSTICS__||[],meta:window.BB_BUILD_META||null})).catch(()=>({diagnostics:[],meta:null})),
      new Promise(resolve=>setTimeout(()=>resolve({diagnostics:[],meta:null}),3000))
    ]):{diagnostics:[],meta:null};
    console.error(`Browser smoke FAIL (${name}): ${err.message}`);
    console.error(`State (${name}): ${JSON.stringify({meta:state.meta,diagnostics:state.diagnostics.slice(-20)})}`);
  }finally{
    if(browser)await Promise.race([browser.close().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,3000))]);
  }
}

for(const [name,type] of browsers){
  let timer;
  await Promise.race([
    runBrowser(name,type),
    new Promise(resolve=>{
      timer=setTimeout(()=>{
        failed=true;
        console.error(`Browser smoke FAIL (${name}): hard timeout after ${HARD_TIMEOUT_MS}ms`);
        resolve();
      },HARD_TIMEOUT_MS);
    })
  ]);
  clearTimeout(timer);
}
if(failed)process.exit(1);
