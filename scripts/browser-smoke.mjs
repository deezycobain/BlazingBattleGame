import { chromium, webkit } from 'playwright';

const BASE=process.env.BB_SMOKE_URL||'http://127.0.0.1:4173';
const browsers=[['chromium',chromium],['webkit',webkit]];
let failed=false;
for(const [name,type] of browsers){
  const browser=await type.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  const errors=[];
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`)});
  try{
    const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:20000});
    if(!response?.ok())throw new Error(`HTTP ${response?.status()}`);
    await page.locator('.logo').waitFor({state:'visible',timeout:5000});
    const bootText=await page.locator('.logo').textContent();
    if(!/Blazing Battle/i.test(bootText||''))throw new Error('boot logo missing');
    await page.waitForFunction(()=>Array.isArray(window.__BB_DIAGNOSTICS__)&&window.__BB_DIAGNOSTICS__.some(e=>e.name==='GAME_FETCH_COMPLETE'),null,{timeout:30000});
    await page.waitForFunction(()=>window.BBTelemetry&&Array.isArray(window.__BB_DIAGNOSTICS__)&&window.__BB_DIAGNOSTICS__.some(e=>e.name==='RUNTIME_STARTED'),null,{timeout:10000});
    await page.waitForFunction(()=>Array.isArray(window.__BB_DIAGNOSTICS__)&&window.__BB_DIAGNOSTICS__.some(e=>e.name==='HOME_READY'),null,{timeout:25000});
    if(errors.length)throw new Error(errors.join(' | '));
    console.log(`Browser smoke PASS (${name}): BOOT_SHELL -> GAME_FETCH_COMPLETE -> RUNTIME_STARTED -> HOME_READY`);
  }catch(err){
    failed=true;
    const diag=await page.evaluate(()=>window.__BB_DIAGNOSTICS__||[]).catch(()=>[]);
    console.error(`Browser smoke FAIL (${name}): ${err.message}`);
    console.error(`Diagnostics (${name}): ${JSON.stringify(diag.slice(-20))}`);
  }finally{await browser.close();}
}
if(failed)process.exit(1);
