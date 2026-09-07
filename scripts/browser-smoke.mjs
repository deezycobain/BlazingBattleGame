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
        canvases:document.querySelectorAll('canvas').length,
        home:!!document.querySelector('.bb-home-theme,#homeScreen,[data-screen="home"]'),
        approvedHome:!!document.querySelector('#bbHomeApproved[data-bb-home-version="approved-v4"]'),
        meta:window.BB_BUILD_META||null
      })),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('snapshot timeout')),4000))
    ]);
  }catch(error){
    return {snapshotError:error.message,url:page?.url?.()||''};
  }
}

async function assertApprovedHome(page,label,{mobile}){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:20000});
  const state=await page.evaluate(()=>{
    const root=document.querySelector('#menuScreen.bb-home-v4');
    const shell=document.querySelector('#bbHomeApproved');
    const dock=shell?.querySelector('.bb-home-v4-dock');
    const feature=shell?.querySelector('.bb-home-v4-feature');
    const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const nav={};
    for(const key of ['battle','summon','units','forge'])nav[key]=rect(shell?.querySelector(`[data-nav="${key}"]`));
    const images=[...shell?.querySelectorAll('img')||[]].map(img=>({src:img.getAttribute('src')||'',complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}));
    return {
      viewport:{width:innerWidth,height:innerHeight},
      shell:rect(shell),dock:rect(dock),feature:rect(feature),nav,images,
      style:!!document.querySelector('#bb-home-approved-v4-style'),
      runtime:typeof window.BlazingHomeSkin?.apply==='function',
      background:root?getComputedStyle(root,'::before').backgroundImage:'',
      legacy:{level1:!!document.querySelector('#level1Btn'),boss1:!!document.querySelector('#boss1Btn'),summon:!!document.querySelector('#summonsBtn'),inventory:!!document.querySelector('#inventoryBtn'),forge:!!document.querySelector('#forgeBtn')}
    };
  });

  const {width:vw,height:vh}=state.viewport;
  if(!state.style)throw new Error(`${label}: approved Home v4 stylesheet missing`);
  if(!state.runtime)throw new Error(`${label}: BlazingHomeSkin runtime missing`);
  if(!state.shell||state.shell.width<vw-8||state.shell.height<vh-8)throw new Error(`${label}: approved Home shell does not cover viewport :: ${JSON.stringify(state.shell)}`);
  if(!state.dock||state.dock.x<-1||state.dock.right>vw+1)throw new Error(`${label}: Home dock overflows viewport :: ${JSON.stringify(state.dock)}`);
  if(!state.feature||state.feature.width<180||state.feature.height<70)throw new Error(`${label}: featured Battle card is undersized :: ${JSON.stringify(state.feature)}`);
  if(!/home-city-clean-a\.webp/i.test(state.background))throw new Error(`${label}: approved clean city background is not active :: ${state.background}`);

  for(const key of ['battle','summon','units','forge']){
    const r=state.nav[key];
    if(!r)throw new Error(`${label}: missing ${key} navigation button`);
    if(r.width<70||r.height<38)throw new Error(`${label}: ${key} navigation hit target is undersized :: ${JSON.stringify(r)}`);
    if(r.x<-1||r.right>vw+1||r.y<-1||r.bottom>vh+1)throw new Error(`${label}: ${key} navigation overflows viewport :: ${JSON.stringify(r)}`);
  }

  const broken=state.images.filter(img=>!img.complete||img.naturalWidth<=0||img.naturalHeight<=0);
  if(broken.length)throw new Error(`${label}: approved Home assets failed to load :: ${JSON.stringify(broken.slice(0,8))}`);
  if(state.images.some(img=>/assets\/ui\/home\/reference\//i.test(img.src)))throw new Error(`${label}: design-reference asset was loaded by runtime`);
  for(const required of ['level1','boss1','summon','inventory','forge'])if(!state.legacy[required])throw new Error(`${label}: legacy route anchor ${required} missing behind new shell`);

  const n=state.nav;
  if(mobile){
    if(Math.abs(n.battle.y-n.summon.y)>4)throw new Error(`${label}: first mobile nav row is misaligned`);
    if(Math.abs(n.units.y-n.forge.y)>4)throw new Error(`${label}: second mobile nav row is misaligned`);
    if(n.units.y<=n.battle.y+8)throw new Error(`${label}: mobile dock did not form two rows`);
  }else{
    const ys=Object.values(n).map(r=>r.y);
    if(Math.max(...ys)-Math.min(...ys)>4)throw new Error(`${label}: desktop dock is not aligned to one row`);
  }
  console.log(`Browser smoke (${label}) approved Home v4 PASS: ${mobile?'two-row phone':'four-button desktop'} dock; ${state.images.length} assets loaded`);
}

async function exerciseBattleMenu(page,label){
  await page.locator('#bbHomeApproved [data-nav="battle"]').click();
  const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
  await panel.waitFor({state:'visible',timeout:5000});
  await page.locator('#bbHomeApproved [data-mode="road"]').waitFor({state:'visible',timeout:5000});
  await page.locator('#bbHomeApproved [data-mode="castle"]').waitFor({state:'visible',timeout:5000});
  const labels=await page.locator('#bbHomeApproved .bb-home-v4-modes').innerText();
  if(!/BLAZING\s+ROAD/i.test(labels)||!/PHANTOM\s+CASTLE/i.test(labels))throw new Error(`${label}: Battle selector labels missing`);
  await page.locator('#bbHomeApproved [data-close-battle]').click();
  await panel.waitFor({state:'hidden',timeout:5000});
  console.log(`Browser smoke (${label}) Battle selector PASS`);
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
    const homeRuntimeMatch=rootText.match(/<script id="bb-home-wallpaper-runtime">([\s\S]*?)<\/script>/i);
    if(!homeRuntimeMatch)throw new Error('Home runtime script missing from built root');
    const homeRuntimeText=homeRuntimeMatch[1];
    for(const marker of ['bbHomeApproved','approved-v4','navigation/battle.webp','navigation/summon.webp','navigation/units.webp','navigation/forge.webp','home-city-clean-a.webp']){
      if(!homeRuntimeText.includes(marker))throw new Error(`approved Home runtime missing ${marker}`);
    }
    if(/assets\/ui\/home\/reference\//i.test(homeRuntimeText))throw new Error('Home runtime references design-only assets');
    if(!/new MutationObserver\(schedule\)/.test(homeRuntimeText))throw new Error('Home observer runtime missing');
    console.log(`Browser smoke (${name}): root HTTP verified (${Math.round(rootText.length/1024)} KiB)`);

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
      if(snap.approvedHome)break;
    }

    await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
    await assertApprovedHome(page,`${name}/phone`,{mobile:true});
    await exerciseBattleMenu(page,`${name}/phone`);

    await page.setViewportSize({width:1366,height:900});
    await page.waitForTimeout(180);
    await assertApprovedHome(page,`${name}/desktop`,{mobile:false});
    await exerciseBattleMenu(page,`${name}/desktop`);

    const state=await page.evaluate(()=>({
      meta:window.BB_BUILD_META||null,
      hasCanvas:!!document.querySelector('canvas'),
      hasHome:!!document.querySelector('#bbHomeApproved[data-bb-home-version="approved-v4"]'),
      title:document.title,
      readyState:document.readyState
    }));
    if(!state.hasHome)throw new Error('approved Home surface missing after readiness signal');
    if(EXPECT&&(!state.meta?.commit||!String(state.meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`deployed commit mismatch: expected ${EXPECT.slice(0,12)}, got ${state.meta?.commit||'missing'}`);
    if(pageErrors.length)throw new Error(`pageerror: ${pageErrors.join(' | ')}`);
    const homeFailures=failedRequests.filter(msg=>/assets\/ui\/home\//i.test(msg));
    if(homeFailures.length)throw new Error(`approved Home asset requests failed: ${homeFailures.join(' | ')}`);
    console.log(`Browser smoke PASS (${name}): approved Home v4 rendered; readyState=${state.readyState}${EXPECT?` @ ${String(state.meta?.commit).slice(0,12)}`:''}`);
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
