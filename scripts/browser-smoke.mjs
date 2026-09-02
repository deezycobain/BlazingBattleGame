import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const SELECT=(process.env.BB_SMOKE_BROWSER||'').trim().toLowerCase();
const HARD_TIMEOUT_MS=Number(process.env.BB_SMOKE_HARD_TIMEOUT_MS||90000);
const SELF=fileURLToPath(import.meta.url);
const TYPES={chromium,webkit};

function runIsolated(name){
  return new Promise(resolve=>{
    console.log(`Browser smoke isolate START (${name})`);
    const child=spawn(process.execPath,[SELF],{
      env:{...process.env,BB_SMOKE_BROWSER:name},
      stdio:'inherit'
    });
    let timedOut=false;
    const timer=setTimeout(()=>{
      timedOut=true;
      console.error(`Browser smoke isolate FAIL (${name}): hard timeout after ${HARD_TIMEOUT_MS}ms; killing child process`);
      child.kill('SIGKILL');
    },HARD_TIMEOUT_MS);
    child.on('exit',(code,signal)=>{
      clearTimeout(timer);
      if(timedOut)return resolve(false);
      if(code===0){
        console.log(`Browser smoke isolate PASS (${name})`);
        return resolve(true);
      }
      console.error(`Browser smoke isolate FAIL (${name}): exit=${code} signal=${signal||'none'}`);
      resolve(false);
    });
    child.on('error',err=>{
      clearTimeout(timer);
      console.error(`Browser smoke isolate FAIL (${name}): ${err.message}`);
      resolve(false);
    });
  });
}

async function runBrowser(name,type){
  let browser;
  let page;
  const pageErrors=[];
  const consoleErrors=[];
  try{
    console.log(`Browser smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({
      viewport:{width:390,height:844},
      isMobile:name==='webkit',
      hasTouch:name==='webkit'
    });
    page=await context.newPage();
    page.setDefaultTimeout(12000);
    page.setDefaultNavigationTimeout(30000);
    page.on('pageerror',e=>pageErrors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
    page.on('requestfailed',r=>console.log(`Browser smoke (${name}) request failed: ${r.method()} ${r.url()} :: ${r.failure()?.errorText||'unknown'}`));

    console.log(`Browser smoke (${name}): verify boot-shell HTTP`);
    const shellRes=await context.request.get(`${BASE}/`,{timeout:20000,failOnStatusCode:false});
    if(!shellRes.ok())throw new Error(`boot shell HTTP ${shellRes.status()}`);
    const shellText=await shellRes.text();
    if(!/class=["']logo["'][^>]*>Blazing Battle/i.test(shellText))throw new Error('boot shell markup missing Blazing Battle logo');
    if(!/GAME_FETCH_COMPLETE/.test(shellText)||!/game\.html/.test(shellText))throw new Error('boot shell handoff markers missing');
    console.log(`Browser smoke (${name}): BOOT_SHELL HTTP verified`);

    console.log(`Browser smoke (${name}): navigate root`);
    const response=await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded',timeout:30000});
    if(response&&!response.ok())throw new Error(`root HTTP ${response.status()}`);

    console.log(`Browser smoke (${name}): wait for boot handoff -> game.html`);
    await page.waitForFunction(()=>location.pathname.endsWith('/game.html'),null,{timeout:35000});
    console.log(`Browser smoke (${name}): GAME_DOCUMENT URL reached`);

    await page.waitForFunction(()=>window.BBTelemetry&&Array.isArray(window.__BB_DIAGNOSTICS__)&&window.__BB_DIAGNOSTICS__.some(e=>e.name==='RUNTIME_STARTED'),null,{timeout:20000});
    console.log(`Browser smoke (${name}): RUNTIME_STARTED`);

    await page.waitForFunction(()=>Array.isArray(window.__BB_DIAGNOSTICS__)&&window.__BB_DIAGNOSTICS__.some(e=>e.name==='HOME_READY'),null,{timeout:35000});
    console.log(`Browser smoke (${name}): HOME_READY`);

    const state=await page.evaluate(()=>({
      diagnostics:window.__BB_DIAGNOSTICS__||[],
      meta:window.BB_BUILD_META||null
    }));
    const names=state.diagnostics.map(e=>e?.name);
    if(!names.includes('BOOT_SHELL'))throw new Error('boot diagnostics were not preserved across navigation');
    if(!names.includes('GAME_FETCH_COMPLETE'))throw new Error('GAME_FETCH_COMPLETE was not preserved across navigation');
    if(EXPECT&&(!state.meta?.commit||!String(state.meta.commit).startsWith(EXPECT.slice(0,12)))){
      throw new Error(`deployed commit mismatch: expected ${EXPECT.slice(0,12)}, got ${state.meta?.commit||'missing'}`);
    }
    if(pageErrors.length)throw new Error(`pageerror: ${pageErrors.join(' | ')}`);
    if(consoleErrors.length)console.log(`Browser smoke (${name}) console errors observed (non-fatal): ${consoleErrors.slice(0,8).join(' | ')}`);
    console.log(`Browser smoke PASS (${name}): BOOT_SHELL -> GAME_FETCH_COMPLETE -> RUNTIME_STARTED -> HOME_READY${EXPECT?` @ ${String(state.meta?.commit).slice(0,12)}`:''}`);
  }catch(err){
    let state={url:page?.url?.()||'',diagnostics:[],meta:null};
    if(page){
      try{
        const snapshot=await Promise.race([
          page.evaluate(()=>({url:location.href,diagnostics:window.__BB_DIAGNOSTICS__||[],meta:window.BB_BUILD_META||null})),
          new Promise(resolve=>setTimeout(()=>resolve(null),2500))
        ]);
        if(snapshot)state=snapshot;
      }catch{}
    }
    console.error(`Browser smoke FAIL (${name}): ${err.message}`);
    console.error(`State (${name}): ${JSON.stringify({url:state.url,meta:state.meta,diagnostics:(state.diagnostics||[]).slice(-25),pageErrors:pageErrors.slice(-8),consoleErrors:consoleErrors.slice(-8)})}`);
    process.exitCode=1;
  }finally{
    if(browser){
      try{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,2500))])}catch{}
    }
  }
}

if(!SELECT){
  let ok=true;
  for(const name of ['chromium','webkit']){
    if(!await runIsolated(name))ok=false;
  }
  if(!ok)process.exit(1);
}else{
  const type=TYPES[SELECT];
  if(!type){
    console.error(`Unknown BB_SMOKE_BROWSER=${SELECT}`);
    process.exit(2);
  }
  await runBrowser(SELECT,type);
}
