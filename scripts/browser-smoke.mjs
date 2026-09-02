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

async function runBrowser(name,type){
  let browser,page;
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

    console.log(`Browser smoke (${name}): verify stable direct-root document`);
    const rootRes=await context.request.get(`${BASE}/`,{timeout:20000,failOnStatusCode:false});
    if(!rootRes.ok())throw new Error(`root HTTP ${rootRes.status()}`);
    const rootText=await rootRes.text();
    if(rootText.length<100000)throw new Error(`root document unexpectedly small (${rootText.length} bytes)`);
    if(!/Blazing Battle/i.test(rootText))throw new Error('root document missing Blazing Battle marker');
    if(!/BB_BUILD_META/.test(rootText))throw new Error('root document missing build metadata marker');
    console.log(`Browser smoke (${name}): root HTTP verified (${Math.round(rootText.length/1024)} KiB)`);

    console.log(`Browser smoke (${name}): navigate stable root`);
    const response=await page.goto(`${BASE}/`,{waitUntil:'commit',timeout:30000});
    if(response&&!response.ok())throw new Error(`root HTTP ${response.status()}`);

    const readySelector='canvas,.bb-home-theme,#homeScreen,[data-screen="home"]';
    console.log(`Browser smoke (${name}): wait for rendered game/home surface`);
    await page.locator(readySelector).first().waitFor({state:'attached',timeout:45000});

    const state=await page.evaluate(()=>({
      meta:window.BB_BUILD_META||null,
      hasCanvas:!!document.querySelector('canvas'),
      hasHome:!!document.querySelector('.bb-home-theme,#homeScreen,[data-screen="home"]'),
      title:document.title,
      readyState:document.readyState
    }));
    if(!state.hasCanvas&&!state.hasHome)throw new Error('game/home surface missing after readiness signal');
    if(EXPECT&&(!state.meta?.commit||!String(state.meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`deployed commit mismatch: expected ${EXPECT.slice(0,12)}, got ${state.meta?.commit||'missing'}`);
    if(pageErrors.length)throw new Error(`pageerror: ${pageErrors.join(' | ')}`);
    if(consoleErrors.length)console.log(`Browser smoke (${name}) console errors observed (non-fatal): ${consoleErrors.slice(0,8).join(' | ')}`);
    console.log(`Browser smoke PASS (${name}): direct root rendered ${state.hasHome?'home':'canvas'} surface; readyState=${state.readyState}${EXPECT?` @ ${String(state.meta?.commit).slice(0,12)}`:''}`);
  }catch(err){
    console.error(`Browser smoke FAIL (${name}): ${err.message}`);
    console.error(`State (${name}): ${JSON.stringify({url:page?.url?.()||'',pageErrors:pageErrors.slice(-8),consoleErrors:consoleErrors.slice(-8)})}`);
    process.exitCode=1;
  }finally{
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
