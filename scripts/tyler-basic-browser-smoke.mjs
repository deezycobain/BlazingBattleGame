import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingApprovedHomeCompat==='object',{timeout:30000});
 await page.waitForTimeout(120);
}
async function enterRoad(page){
 const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
 if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
 await panel.waitFor({state:'visible',timeout:5000});
 await page.locator('#bbHomeApproved [data-mode="road"]').click();
 await page.waitForFunction(()=>{
  try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'}catch{return false}
 },null,{timeout:15000});
}

async function run(name,type){
 let browser;
 try{
  console.log(`Tyler Basic smoke START (${name}) -> ${BASE}`);
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
  await page.evaluate(()=>window.BlazingRoadRun.clearRun());
  await enterRoad(page);

  const result=await page.evaluate(async()=>{
   const shell=document.documentElement.innerHTML;
   const blocking="runBasicAttack=au.name==='Tyler'?async(...args)=>{await TYLER_BODY_RUNTIME.basic.readyPromise";
   if(shell.includes(blocking))return {error:'blocking sprite-readiness hook survived'};
   const s=globalThis.eval('S'),front=globalThis.eval('front'),animateLunge=globalThis.eval('animateLunge'),body=globalThis.eval('TYLER_BODY_RUNTIME');
   const pair=s.pairs.find(p=>front(p)?.name==='Tyler');
   const enemy=s.enemies.find(e=>e?.hp>0);
   if(!pair||!enemy)return {error:'Tyler or living enemy missing',fighters:s.pairs.map(p=>front(p)?.name),enemies:s.enemies.length};
   const wasReady=body.basic.ready;
   body.basic.ready=false;
   const before=enemy.hp,start=performance.now();
   const outcome=await new Promise(resolve=>{
    let impactCount=0,doneCount=0,settled=false;
    const finish=value=>{if(settled)return;settled=true;resolve(value)};
    const timer=setTimeout(()=>finish({timedOut:true,impactCount,doneCount,hp:enemy.hp,elapsed:performance.now()-start}),2200);
    try{
     animateLunge('Tyler',{x:pair.x,y:pair.y},{x:enemy.x,y:enemy.y},()=>{
      impactCount++;
      window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:1});
     },()=>{
      doneCount++;
      clearTimeout(timer);
      finish({timedOut:false,impactCount,doneCount,hp:enemy.hp,elapsed:performance.now()-start});
     },'basic');
    }catch(error){clearTimeout(timer);finish({error:String(error?.stack||error),impactCount,doneCount,hp:enemy.hp,elapsed:performance.now()-start})}
   });
   body.basic.ready=wasReady;
   return {...outcome,before,after:enemy.hp,wasReady};
  });
  if(result.error)throw new Error(`runtime error: ${JSON.stringify(result)}`);
  if(result.timedOut)throw new Error(`Tyler Basic timed out: ${JSON.stringify(result)}`);
  if(result.impactCount!==1||result.doneCount!==1)throw new Error(`Tyler Basic callbacks incomplete: ${JSON.stringify(result)}`);
  if(!(result.after<result.before))throw new Error(`Tyler Basic impact did not apply damage: ${JSON.stringify(result)}`);
  if(result.elapsed>1900)throw new Error(`Tyler Basic lifecycle was abnormally slow: ${JSON.stringify(result)}`);
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Tyler Basic smoke PASS (${name}): impact + damage + completion succeeded with authored Basic readiness forced false in ${Math.round(result.elapsed)}ms.`);
  await context.close();
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
 try{await run(name,type)}catch(error){failed=true;console.error(`Tyler Basic smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
