import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingRoadCamera==='object'&&typeof window.BlazingRoadContent==='object',{timeout:30000});
}

async function enterFreshRoad(page){
  await page.evaluate(()=>{
    window.BlazingRoadRun?.clearRun?.();
    try{
      for(let i=sessionStorage.length-1;i>=0;i--){
        const key=sessionStorage.key(i);
        if(key?.startsWith('bbRoadIntroSeen:'))sessionStorage.removeItem(key);
      }
    }catch{}
  });
  const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
  if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
  await panel.waitFor({state:'visible',timeout:5000});
  await page.locator('#bbHomeApproved [data-mode="road"]').click();
  await page.waitForFunction(()=>{
    try{
      const s=globalThis.eval('S');
      return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'&&s?.bbRoadStage===1;
    }catch{return false}
  },null,{timeout:15000});
}

async function sample(page){
  return page.evaluate(()=>{
    const s=globalThis.eval('S');
    const camera=window.BlazingRoadCamera?.snapshot?.()||{};
    const shared=window.BlazingRoadSharedHp?.snapshot?.()||{};
    const front=pair=>{
      if(!pair||!Array.isArray(pair.units))return null;
      const index=Number.isInteger(pair.active)?pair.active:0;
      return pair.units[index]||pair.units.find(unit=>unit&&unit.name&&unit.name!=='—')||null;
    };
    const stageSummary=stage=>{
      const cfg=window.BlazingRoadContent?.stageConfig?.(stage);
      const stats=(cfg?.enemies||[]).map(enemy=>enemy.stats||{});
      const max=key=>stats.length?Math.max(...stats.map(item=>Number(item[key])||0)):0;
      return {attack:max('attack'),speed:max('speed'),hp:max('hp'),defense:max('defense')};
    };
    return {
      camera:{active:!!camera.active,mode:camera.mode||null,phase:camera.introPhase||null,locked:!!camera.locked,word:camera.word||null},
      shared:{active:!!shared.active,hp:Number(shared.hp)||0,maxHp:Number(shared.maxHp)||0},
      phase:s?.phase||null,
      ready:!!s?.ready?.ref,
      pairGauges:(s?.pairs||[]).map(pair=>Number(pair?.gauge)||0),
      enemyGauges:(s?.enemies||[]).map(enemy=>Number(enemy?.gauge)||0),
      stage1:stageSummary(1),
      stage2:stageSummary(2),
      stage3:stageSummary(3),
      enemyDisplayScale:Number(window.BlazingBasicEnemySprites?.ROAD_DISPLAY_SCALE)||0
    };
  });
}

async function run(name,type){
  let browser;
  try{
    console.log(`Road pre-FIGHT smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
    const page=await context.newPage();
    page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
    await waitHome(page);
    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
    await enterFreshRoad(page);

    let preFightSamples=0,sawShared=false,sawCountdown=false,sawFight=false,unlocked=null;
    const started=Date.now();
    while(Date.now()-started<9000){
      const frame=await sample(page);
      const combatReleased=frame.camera.mode==='combat'&&!frame.camera.locked;
      if(combatReleased){unlocked=frame;break;}
      preFightSamples++;
      if(frame.shared.maxHp>0){
        sawShared=true;
        if(Math.abs(frame.shared.hp-frame.shared.maxHp)>.01)throw new Error(`player HP changed before FIGHT released combat: ${JSON.stringify(frame)}`);
      }
      const gauges=[...frame.pairGauges,...frame.enemyGauges];
      if(gauges.some(value=>value>.01))throw new Error(`turn gauge charged before FIGHT released combat: ${JSON.stringify(frame)}`);
      if(frame.ready||frame.phase==='cpu'||frame.phase==='player'||frame.phase==='resolve')throw new Error(`combat phase became actionable before FIGHT released combat: ${JSON.stringify(frame)}`);
      if(frame.camera.phase==='countdown')sawCountdown=true;
      if(frame.camera.phase==='fight'||frame.camera.word==='FIGHT')sawFight=true;
      await page.waitForTimeout(18);
    }

    if(!unlocked)throw new Error('Road combat never released after the intro');
    if(preFightSamples<10||!sawShared||!sawCountdown||!sawFight)throw new Error(`pre-FIGHT coverage was incomplete: ${JSON.stringify({preFightSamples,sawShared,sawCountdown,sawFight})}`);
    if(unlocked.enemyDisplayScale<1.29||unlocked.enemyDisplayScale>1.31)throw new Error(`Road enemy display scale is not 1.30: ${unlocked.enemyDisplayScale}`);
    if(unlocked.stage1.attack>18||unlocked.stage1.speed>39)throw new Error(`Stage 1 is no longer an easy opener: ${JSON.stringify(unlocked.stage1)}`);
    if(unlocked.stage2.attack>23||unlocked.stage2.speed>46)throw new Error(`Stage 2 is no longer an easy follow-up: ${JSON.stringify(unlocked.stage2)}`);
    if(unlocked.stage3.attack>32||unlocked.stage3.speed>57)throw new Error(`Stage 3 transition tuning regressed: ${JSON.stringify(unlocked.stage3)}`);
    if(errors.length)throw new Error(`page errors: ${errors.join(' | ')}`);

    console.log(`Road pre-FIGHT smoke PASS (${name}): ${preFightSamples} locked samples; opening caps S1 ${unlocked.stage1.attack}/${unlocked.stage1.speed}, S2 ${unlocked.stage2.attack}/${unlocked.stage2.speed}, S3 ${unlocked.stage3.attack}/${unlocked.stage3.speed}; enemy scale ${unlocked.enemyDisplayScale.toFixed(2)}.`);
    await context.close();
  }finally{
    await browser?.close().catch(()=>{});
  }
}

for(const [name,type] of Object.entries(TYPES))await run(name,type);
