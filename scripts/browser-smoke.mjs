import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const SELECT=(process.env.BB_SMOKE_BROWSER||'').trim().toLowerCase();
const HARD_TIMEOUT_MS=Number(process.env.BB_SMOKE_HARD_TIMEOUT_MS||90000);
const SELF=fileURLToPath(import.meta.url);
const TYPES={chromium,webkit};
const IS_LOCAL=/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(BASE);

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

async function snapshot(page){
  try{
    return await Promise.race([
      page.evaluate(()=>({
        href:location.href,
        title:document.title,
        readyState:document.readyState,
        bodyChildren:document.body?.children?.length??-1,
        bodyText:(document.body?.innerText||'').slice(0,500),
        htmlLength:document.documentElement?.outerHTML?.length||0,
        scripts:[...document.scripts].slice(0,12).map(s=>({src:s.src||'',type:s.type||'',defer:s.defer,async:s.async,text:(s.src?'':(s.textContent||'').slice(0,80))})),
        canvases:document.querySelectorAll('canvas').length,
        home:!!document.querySelector('.bb-home-theme,#homeScreen,[data-screen="home"]'),
        meta:window.BB_BUILD_META||null
      })),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('snapshot timeout')),4000))
    ]);
  }catch(error){
    return {snapshotError:error.message,url:page?.url?.()||''};
  }
}

async function assertHomeLayout(page,label,{stacked}){
  await page.locator('.bb-home-theme [data-bb-home-action="road"]').waitFor({state:'visible',timeout:20000});
  const state=await page.evaluate(()=>{
    const root=document.querySelector('.bb-home-theme');
    const group=root?.querySelector('.bb-home-actions');
    const keys=['road','castle','summon','inventory','forge'];
    const box=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,text:(el.innerText||'').replace(/\s+/g,' ').trim()};};
    const actions=Object.fromEntries(keys.map(key=>[key,box(root?.querySelector(`[data-bb-home-action="${key}"]`))]));
    return {
      viewport:{width:innerWidth,height:innerHeight},
      rootText:(root?.innerText||'').replace(/\s+/g,' ').trim(),
      group:box(group),
      actions,
      styleId:document.querySelector('#bb-home-polish-v3')?.id||'',
      observerRuntime:typeof window.BlazingHomeSkin?.apply==='function'
    };
  });
  const {width:vw}=state.viewport;
  const required=['road','castle','summon','inventory','forge'];
  for(const key of required){
    const r=state.actions[key];
    if(!r)throw new Error(`${label}: missing ${key} home action`);
    if(r.height<44)throw new Error(`${label}: ${key} hit target too short (${r.height.toFixed(1)}px)`);
    if(r.width<70)throw new Error(`${label}: ${key} hit target too narrow (${r.width.toFixed(1)}px)`);
    if(r.x<-1||r.right>vw+1)throw new Error(`${label}: ${key} overflows viewport (${r.x.toFixed(1)}..${r.right.toFixed(1)} of ${vw})`);
    if(r.scrollWidth>r.clientWidth+3)throw new Error(`${label}: ${key} content overflows horizontally (${r.scrollWidth}>${r.clientWidth})`);
  }
  if(!state.styleId)throw new Error(`${label}: v3 Home polish stylesheet missing`);
  if(!state.observerRuntime)throw new Error(`${label}: BlazingHomeSkin runtime missing`);
  if(!/BLAZING\s+ROAD/i.test(state.actions.road.text)||!/PHANTOM\s+CASTLE/i.test(state.actions.castle.text))throw new Error(`${label}: featured mode labels missing`);
  if(/\bSTORY\b/i.test(state.rootText))throw new Error(`${label}: Story Mode unexpectedly visible`);
  if(!state.group||state.group.scrollWidth>state.group.clientWidth+3)throw new Error(`${label}: Home action grid overflows horizontally`);
  const road=state.actions.road,castle=state.actions.castle;
  if(stacked){
    if(castle.y<road.bottom-3)throw new Error(`${label}: featured cards should stack on phone`);
    if(Math.abs(road.width-castle.width)>4)throw new Error(`${label}: stacked featured cards have inconsistent widths`);
  }else{
    if(Math.abs(road.y-castle.y)>4)throw new Error(`${label}: featured cards should share a desktop row`);
    if(road.right>castle.x+4)throw new Error(`${label}: desktop featured cards overlap`);
    if(road.width<280||castle.width<280)throw new Error(`${label}: desktop featured cards are undersized`);
  }
  const secondary=['summon','inventory','forge'].map(key=>state.actions[key]);
  if(Math.max(...secondary.map(r=>r.y))-Math.min(...secondary.map(r=>r.y))>4)throw new Error(`${label}: secondary navigation is not aligned to one row`);
  console.log(`Browser smoke (${label}) Home layout PASS: ${stacked?'stacked phone':'two-column desktop'} featured modes; grid=${state.group.width.toFixed(1)}px`);
}

async function runBrowser(name,type){
  let browser,page;
  const pageErrors=[];
  const consoleMessages=[];
  const failedRequests=[];
  const responses=[];
  try{
    console.log(`Browser smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
    page=await context.newPage();
    page.setDefaultTimeout(12000);
    page.setDefaultNavigationTimeout(30000);
    page.on('pageerror',e=>{pageErrors.push(e.message);console.log(`Browser smoke (${name}) pageerror: ${e.message}`)});
    page.on('console',m=>{
      const text=m.text();
      consoleMessages.push(`${m.type()}: ${text}`);
      if(consoleMessages.length>60)consoleMessages.shift();
      if(m.type()==='error'||m.type()==='warning')console.log(`Browser smoke (${name}) console ${m.type()}: ${text}`);
    });
    page.on('requestfailed',r=>{
      const msg=`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'unknown'}`;
      failedRequests.push(msg);
      console.log(`Browser smoke (${name}) request failed: ${msg}`);
    });
    page.on('response',r=>{
      const url=r.url();
      if(url.startsWith(BASE)){
        responses.push(`${r.status()} ${r.request().resourceType()} ${url}`);
        if(responses.length>80)responses.shift();
      }
    });

    console.log(`Browser smoke (${name}): verify stable direct-root document`);
    const rootRes=await context.request.get(`${BASE}/`,{timeout:20000,failOnStatusCode:false});
    if(!rootRes.ok())throw new Error(`root HTTP ${rootRes.status()}`);
    const rootText=await rootRes.text();
    if(rootText.length<100000)throw new Error(`root document unexpectedly small (${rootText.length} bytes)`);
    if(!/Blazing Battle/i.test(rootText))throw new Error('root document missing Blazing Battle marker');
    if(!/BB_BUILD_META/.test(rootText))throw new Error('root document missing build metadata marker');
    if(!/new MutationObserver\(schedule\)\.observe\(document\.body,\{\s*subtree\s*:\s*true\s*,\s*childList\s*:\s*true\s*\}\)/.test(rootText))throw new Error('Home observer is not the approved child-list-only runtime');
    if(/new MutationObserver\(schedule\)[\s\S]{0,180}\battributes\s*:\s*true/.test(rootText))throw new Error('Home observer regressed to attribute mutation watching');
    console.log(`Browser smoke (${name}): root HTTP verified (${Math.round(rootText.length/1024)} KiB)`);

    // GitHub-hosted headless browsers have intermittently stalled committing the local
    // loopback main-document response even though the same response is healthy via the
    // Playwright request client. The server is already verified above. For local smoke,
    // fulfill only the main document with the exact bytes just fetched, preserving its
    // HTTP URL/base so every asset still loads from the real local server. Deployed smoke
    // never uses this route and therefore validates Cloudflare's real network response.
    if(IS_LOCAL){
      await page.route(`${BASE}/`,async route=>{
        await route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:rootText,headers:{'cache-control':'no-store'}});
      });
      console.log(`Browser smoke (${name}): local main document will use verified-byte fulfillment`);
    }

    console.log(`Browser smoke (${name}): navigate stable root`);
    const response=await page.goto(`${BASE}/`,{waitUntil:'commit',timeout:30000});
    if(response&&!response.ok())throw new Error(`root HTTP ${response.status()}`);
    console.log(`Browser smoke (${name}): navigation committed`);

    for(const delay of [1000,3000,6000]){
      await page.waitForTimeout(delay);
      const snap=await snapshot(page);
      console.log(`Browser smoke (${name}) snapshot +${delay}ms: ${JSON.stringify(snap)}`);
      if(snap.canvases||snap.home)break;
    }

    const readySelector='canvas,.bb-home-theme,#homeScreen,[data-screen="home"]';
    console.log(`Browser smoke (${name}): wait for rendered game/home surface`);
    await page.locator(readySelector).first().waitFor({state:'attached',timeout:30000});

    await assertHomeLayout(page,`${name}/phone`,{stacked:true});
    await page.setViewportSize({width:1366,height:900});
    await page.waitForTimeout(180);
    await assertHomeLayout(page,`${name}/desktop`,{stacked:false});

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
    console.log(`Browser smoke PASS (${name}): direct root rendered ${state.hasHome?'home':'canvas'} surface; readyState=${state.readyState}${EXPECT?` @ ${String(state.meta?.commit).slice(0,12)}`:''}`);
  }catch(err){
    const snap=page?await snapshot(page):null;
    console.error(`Browser smoke FAIL (${name}): ${err.message}`);
    console.error(`State (${name}): ${JSON.stringify({url:page?.url?.()||'',snapshot:snap,pageErrors:pageErrors.slice(-8),failedRequests:failedRequests.slice(-12),responses:responses.slice(-20),consoleMessages:consoleMessages.slice(-20)})}`);
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
