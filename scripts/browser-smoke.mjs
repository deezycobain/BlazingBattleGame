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
    const child=spawn(process.execPath,[SELF],{env:{...process.env,BB_SMOKE_BROWSER:name},stdio:'inherit'});
    let timedOut=false;
    const timer=setTimeout(()=>{
      timedOut=true;
      console.error(`Browser smoke isolate FAIL (${name}): hard timeout after ${HARD_TIMEOUT_MS}ms; killing child process`);
      child.kill('SIGKILL');
    },HARD_TIMEOUT_MS);
    child.on('exit',(code,signal)=>{
      clearTimeout(timer);
      if(timedOut)return resolve(false);
      if(code===0){console.log(`Browser smoke isolate PASS (${name})`);return resolve(true)}
      console.error(`Browser smoke isolate FAIL (${name}): exit=${code} signal=${signal||'none'}`);resolve(false);
    });
    child.on('error',err=>{clearTimeout(timer);console.error(`Browser smoke isolate FAIL (${name}): ${err.message}`);resolve(false)});
  });
}

function waitForGameUrl(page,timeout=35000){
  if(page.url().includes('/game.html'))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(new Error(`game.html navigation timeout; current URL ${page.url()}`))},timeout);
    const onFrame=frame=>{
      if(frame===page.mainFrame()&&frame.url().includes('/game.html')){cleanup();resolve()}
    };
    function cleanup(){clearTimeout(timer);page.off('framenavigated',onFrame)}
    page.on('framenavigated',onFrame);
  });
}

function telemetryWatcher(page,name){
  const seen=new Set();
  const waiters=new Map();
  const onConsole=msg=>{
    const text=msg.text();
    if(msg.type()==='error')return;
    const m=text.match(/^\[BB\]\s+([A-Z0-9_]+)/);
    if(!m)return;
    const checkpoint=m[1];
    seen.add(checkpoint);
    console.log(`Browser smoke (${name}) telemetry: ${checkpoint}`);
    const waiter=waiters.get(checkpoint);
    if(waiter){clearTimeout(waiter.timer);waiters.delete(checkpoint);waiter.resolve()}
  };
  page.on('console',onConsole);
  return {
    seen,
    wait(checkpoint,timeout){
      if(seen.has(checkpoint))return Promise.resolve();
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{waiters.delete(checkpoint);reject(new Error(`telemetry checkpoint ${checkpoint} timeout after ${timeout}ms`))},timeout);
        waiters.set(checkpoint,{resolve,reject,timer});
      });
    },
    close(){page.off('console',onConsole);for(const waiter of waiters.values())clearTimeout(waiter.timer);waiters.clear()}
  };
}

async function runBrowser(name,type){
  let browser,page,telemetry;
  const pageErrors=[];
  const consoleErrors=[];
  try{
    console.log(`Browser smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
    page=await context.newPage();
    page.setDefaultTimeout(12000);
    page.setDefaultNavigationTimeout(30000);
    page.on('pageerror',e=>pageErrors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
    page.on('requestfailed',r=>console.log(`Browser smoke (${name}) request failed: ${r.method()} ${r.url()} :: ${r.failure()?.errorText||'unknown'}`));
    telemetry=telemetryWatcher(page,name);

    console.log(`Browser smoke (${name}): verify boot-shell HTTP`);
    const shellRes=await context.request.get(`${BASE}/`,{timeout:20000,failOnStatusCode:false});
    if(!shellRes.ok())throw new Error(`boot shell HTTP ${shellRes.status()}`);
    const shellText=await shellRes.text();
    if(!/class=["']logo["'][^>]*>Blazing Battle/i.test(shellText))throw new Error('boot shell markup missing Blazing Battle logo');
    if(!/GAME_FETCH_COMPLETE/.test(shellText)||!/game\.html/.test(shellText))throw new Error('boot shell handoff markers missing');

    const gameRes=await context.request.get(`${BASE}/game.html?smoke=1`,{timeout:20000,failOnStatusCode:false});
    if(!gameRes.ok())throw new Error(`game document HTTP ${gameRes.status()}`);
    const gameText=await gameRes.text();
    if(!/RUNTIME_STARTED/.test(gameText)||!/HOME_READY/.test(gameText))throw new Error('game document telemetry markers missing');
    if(EXPECT&&!gameText.includes(EXPECT.slice(0,12)))throw new Error(`deployed commit marker mismatch: expected ${EXPECT.slice(0,12)} in game document`);
    console.log(`Browser smoke (${name}): boot + game HTTP verified${EXPECT?` @ ${EXPECT.slice(0,12)}`:''}`);

    console.log(`Browser smoke (${name}): navigate root`);
    const gameUrlPromise=waitForGameUrl(page,35000);
    const response=await page.goto(`${BASE}/`,{waitUntil:'commit',timeout:30000});
    if(response&&!response.ok())throw new Error(`root HTTP ${response.status()}`);

    await telemetry.wait('BOOT_SHELL',10000);
    await telemetry.wait('GAME_FETCH_COMPLETE',35000);
    console.log(`Browser smoke (${name}): wait for external navigation event -> game.html`);
    await gameUrlPromise;
    console.log(`Browser smoke (${name}): GAME_DOCUMENT URL reached (${page.url()})`);

    // Read readiness entirely from console telemetry. This remains observable even while
    // the document is still parsing and avoids coupling a usable game to DOMContentLoaded.
    await telemetry.wait('RUNTIME_STARTED',15000);
    await telemetry.wait('HOME_READY',35000);

    if(pageErrors.length)throw new Error(`pageerror: ${pageErrors.join(' | ')}`);
    if(consoleErrors.length)console.log(`Browser smoke (${name}) console errors observed (non-fatal): ${consoleErrors.slice(0,8).join(' | ')}`);
    console.log(`Browser smoke PASS (${name}): BOOT_SHELL -> GAME_FETCH_COMPLETE -> RUNTIME_STARTED -> HOME_READY${EXPECT?` @ ${EXPECT.slice(0,12)}`:''}`);
  }catch(err){
    console.error(`Browser smoke FAIL (${name}): ${err.message}`);
    console.error(`State (${name}): ${JSON.stringify({url:page?.url?.()||'',telemetry:[...(telemetry?.seen||[])],pageErrors:pageErrors.slice(-8),consoleErrors:consoleErrors.slice(-8)})}`);
    process.exitCode=1;
  }finally{
    telemetry?.close();
    if(browser){try{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,2500))])}catch{}}
  }
}

if(!SELECT){
  let ok=true;
  for(const name of ['chromium','webkit'])if(!await runIsolated(name))ok=false;
  if(!ok)process.exit(1);
}else{
  const type=TYPES[SELECT];
  if(!type){console.error(`Unknown BB_SMOKE_BROWSER=${SELECT}`);process.exit(2)}
  await runBrowser(SELECT,type);
}
