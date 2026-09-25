import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

function sameNumberMap(a,b,tolerance=.01){
  const keys=[...new Set([...Object.keys(a),...Object.keys(b)])].sort();
  return keys.every(key=>Number.isFinite(Number(a[key]))&&Number.isFinite(Number(b[key]))&&Math.abs(Number(a[key])-Number(b[key]))<=tolerance);
}
function hpTotal(map){return Object.values(map||{}).reduce((sum,value)=>sum+(Number(value)||0),0)}

async function waitForHome(page){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingApprovedHomeCompat==='object',{timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  // Home/runtime readiness is authoritative here; waiting for document.readyState='complete'
  // is brittle in Chromium because late non-critical resources can remain pending after reload.
  await page.waitForTimeout(180);
}

async function readBattle(page){
  return page.evaluate(()=>{
    try{
      const state=globalThis.eval('S');
      return {
        ok:!!state,
        mode:state?.bbRunMode||null,
        stage:state?.bbRoadStage||null,
        phase:state?.phase||null,
        pairs:Array.isArray(state?.pairs)?state.pairs.length:0,
        battleActive:document.getElementById('battleScreen')?.classList.contains('active')||false,
        battleClass:document.getElementById('battleScreen')?.className||'',
        menuClass:document.getElementById('menuScreen')?.className||'',
        menuDisplay:getComputedStyle(document.getElementById('menuScreen')).display,
        homeShell:!!document.getElementById('bbHomeApproved'),
        loadingPresent:!!document.getElementById('bb-loading-screen'),
        loadingClass:document.getElementById('bb-loading-screen')?.className||'',
        readyState:document.readyState,
        startBattleType:globalThis.eval('typeof startBattle'),
        transitioning:globalThis.eval('typeof menuTransitioning!=="undefined"?menuTransitioning:null')
      };
    }catch(error){return {ok:false,error:error.message,battleActive:document.getElementById('battleScreen')?.classList.contains('active')||false};}
  });
}

async function waitForMode(page,mode,pageErrors=[]){
  const deadline=Date.now()+15000;
  let last=null;
  while(Date.now()<deadline){
    last=await readBattle(page);
    if(last.ok&&last.battleActive&&last.mode===mode&&last.pairs>0)return last;
    await page.waitForTimeout(100);
  }
  throw new Error(`battle mode ${mode} not observed: ${JSON.stringify({last,pageErrors})}`);
}

async function enterMode(page,mode,pageErrors=[]){
  const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
  if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
  await panel.waitFor({state:'visible',timeout:5000});
  await page.locator(`#bbHomeApproved [data-mode="${mode}"]`).click();
  const result=await waitForMode(page,mode==='road'?'road':'castle',pageErrors);
  if(mode==='road')await page.waitForFunction(()=>window.BlazingRoadSharedHp?.snapshot?.()?.active===true,null,{timeout:5000});
  return result;
}

async function run(name,type){
  let browser;
  try{
    console.log(`Road browser smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
    const page=await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(30000);

    const pageErrors=[];
    page.on('pageerror',error=>{pageErrors.push(error.message);console.log(`Road browser smoke (${name}) pageerror: ${error.message}`)});

    await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
    await waitForHome(page);

    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12)))){
      throw new Error(`deployed commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
    }

    await page.evaluate(()=>window.BlazingRoadRun.clearRun());

    await enterMode(page,'road',pageErrors);

    const first=await page.evaluate(()=>{
      const state=globalThis.eval('S');
      const checkVictory=globalThis.eval('checkVictoryKillshot');
      const fighters=state.pairs.flatMap(pair=>Array.isArray(pair?.units)?pair.units:[]).filter(unit=>unit&&unit.name&&unit.name!=='—'&&Number(unit.maxHp)>0);
      if(fighters.length<6)throw new Error(`expected the full six-unit paired Road squad, found ${fighters.length}`);
      if(fighters.some(unit=>!(Number(unit.maxChakra)>0)))throw new Error(`expected Road fighters to expose maxChakra: ${JSON.stringify(fighters.map(unit=>({name:unit.name,maxChakra:unit.maxChakra,chakra:unit.chakra})))}`);
      const sharedBefore=window.BlazingRoadSharedHp?.snapshot?.();
      if(!sharedBefore?.active||!(sharedBefore.maxHp>0)||!(sharedBefore.hp>0))throw new Error(`shared Road HP unavailable: ${JSON.stringify(sharedBefore)}`);
      fighters.forEach((unit,index)=>{unit.chakra=Math.min(unit.maxChakra,2+index*2);});
      const rawDamage=Math.max(24,Math.round(sharedBefore.maxHp*.30));
      const damageResult=window.BlazingCombatRuntime?.applyDamage?.(fighters[0],rawDamage);
      const sharedAfter=window.BlazingRoadSharedHp?.snapshot?.();
      if(!damageResult?.shared||!(sharedAfter?.hp<sharedBefore.hp)||!(sharedAfter.hp>0))throw new Error(`shared Road damage did not apply: ${JSON.stringify({sharedBefore,sharedAfter,damageResult})}`);
      const expected=Object.fromEntries(fighters.map(unit=>[window.BlazingRoadRun.stateUnitId(unit),unit.hp]));
      const expectedChakra=Object.fromEntries(fighters.map(unit=>[window.BlazingRoadRun.stateUnitId(unit),unit.chakra]));
      state.enemies.forEach(enemy=>{enemy.hp=0;});
      const victory=checkVictory();
      const run=window.BlazingRoadRun.loadRun();
      return {victory,expected,expectedChakra,sharedBefore,sharedAfter,damageResult,run,battleMode:state.bbRunMode,stage:state.bbRoadStage,log:state.log};
    });

    if(!first.victory)throw new Error('Road victory hook did not resolve');
    if(first.battleMode!=='road')throw new Error(`Road battle mode lost during victory: ${first.battleMode}`);
    if(first.run?.status!=='active'||first.run?.stage!==2)throw new Error(`Road run did not advance to active Stage 2: ${JSON.stringify(first.run)}`);
    const savedHp=Object.fromEntries(first.run.fighters.map(f=>[f.unit_id,f.hp]));
    if(!sameNumberMap(savedHp,first.expected))throw new Error(`saved shared-HP distribution mismatch after victory: expected ${JSON.stringify(first.expected)}, got ${JSON.stringify(savedHp)}`);
    const savedTotal=hpTotal(savedHp);
    if(Math.abs(savedTotal-first.sharedAfter.hp)>.01)throw new Error(`saved shared HP total mismatch: expected ${first.sharedAfter.hp}, got ${savedTotal}`);
    const savedChakra=Object.fromEntries(first.run.fighters.map(f=>[f.unit_id,f.chakra]));
    if(!sameNumberMap(savedChakra,first.expectedChakra))throw new Error(`saved chakra mismatch after victory: expected ${JSON.stringify(first.expectedChakra)}, got ${JSON.stringify(savedChakra)}`);
    const defeated=first.run.fighters.filter(f=>f.defeated);
    if(defeated.length)throw new Error(`partial shared HP must keep the full Road squad alive: ${JSON.stringify(first.run.fighters)}`);

    await page.reload({waitUntil:'domcontentloaded'});
    await waitForHome(page);
    const cardText=await page.locator('#bbHomeApproved [data-mode="road"] span:last-child').textContent().catch(()=>null);
    if(!/Stage\s*2/i.test(cardText||'')||!/Run in Progress/i.test(cardText||''))throw new Error(`approved Road selector did not resume Stage 2: ${JSON.stringify(cardText)}`);

    await enterMode(page,'road',pageErrors);
    const resumed=await page.evaluate(()=>{
      const state=globalThis.eval('S');
      const fighters=state.pairs.flatMap(pair=>Array.isArray(pair?.units)?pair.units:[]).filter(unit=>unit&&unit.name&&unit.name!=='—'&&Number(unit.maxHp)>0);
      const shared=window.BlazingRoadSharedHp?.snapshot?.()||{};
      return {
        stage:state.bbRoadStage,
        hp:Object.fromEntries(fighters.map(unit=>[window.BlazingRoadRun.stateUnitId(unit),unit.hp])),
        chakra:Object.fromEntries(fighters.map(unit=>[window.BlazingRoadRun.stateUnitId(unit),unit.chakra])),
        defeated:fighters.filter(unit=>unit.hp<=0).map(unit=>window.BlazingRoadRun.stateUnitId(unit)),
        sharedHp:Number(shared.hp),sharedMax:Number(shared.maxHp)
      };
    });
    if(resumed.stage!==2)throw new Error(`Road resumed wrong stage: ${resumed.stage}`);
    const resumedLiveTotal=hpTotal(resumed.hp);
    if(Math.abs(resumedLiveTotal-first.sharedAfter.hp)>.01)throw new Error(`live Stage 2 fighter HP total did not carry forward: expected ${first.sharedAfter.hp}, got ${resumedLiveTotal} from ${JSON.stringify(resumed.hp)}`);
    if(Math.abs(resumed.sharedHp-first.sharedAfter.hp)>.01)throw new Error(`live Stage 2 shared HP total did not carry forward: expected ${first.sharedAfter.hp}, got ${resumed.sharedHp}`);
    if(Math.abs(resumedLiveTotal-resumed.sharedHp)>.01)throw new Error(`live fighter HP and authoritative shared HP diverged: fighters ${resumedLiveTotal}, shared ${resumed.sharedHp}`);
    if(!sameNumberMap(resumed.chakra,first.expectedChakra))throw new Error(`live Stage 2 chakra did not carry forward: expected ${JSON.stringify(first.expectedChakra)}, got ${JSON.stringify(resumed.chakra)}`);
    if(resumed.defeated.length)throw new Error(`partial shared HP incorrectly produced a persisted KO: ${JSON.stringify(resumed)}`);

    await page.reload({waitUntil:'domcontentloaded'});
    await waitForHome(page);
    await enterMode(page,'castle',pageErrors);
    const castle=await page.evaluate(()=>{
      const state=globalThis.eval('S');
      const fighters=state.pairs.flatMap(pair=>Array.isArray(pair?.units)?pair.units:[]).filter(unit=>unit&&unit.name&&unit.name!=='—'&&Number(unit.maxHp)>0);
      const road=window.BlazingRoadRun.loadRun();
      return {
        fullHp:fighters.every(unit=>unit.hp===unit.maxHp),
        hp:Object.fromEntries(fighters.map(unit=>[window.BlazingRoadRun.stateUnitId(unit),unit.hp])),
        runStage:road?.stage,
        runHp:road?Object.fromEntries(road.fighters.map(f=>[f.unit_id,f.hp])):{},
        runChakra:road?Object.fromEntries(road.fighters.map(f=>[f.unit_id,f.chakra])):{}
      };
    });
    if(!castle.fullHp)throw new Error(`Phantom Castle inherited Road damage: ${JSON.stringify(castle.hp)}`);
    if(castle.runStage!==2||!sameNumberMap(castle.runHp,savedHp)||!sameNumberMap(castle.runChakra,savedChakra))throw new Error(`Castle altered saved Road run: ${JSON.stringify(castle)}`);

    await page.evaluate(()=>window.BlazingRoadRun.clearRun());
    if(pageErrors.length)throw new Error(`pageerror: ${pageErrors.join(' | ')}`);
    console.log(`Road browser smoke PASS (${name}): authoritative shared Team HP total + per-fighter chakra persist into Stage 2 after reload; partial damage keeps the squad alive; Phantom Castle stays isolated.`);
  }finally{
    if(browser)await browser.close().catch(()=>{});
  }
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Road browser smoke FAIL (${name}): ${error.stack||error.message}`);}
}
if(failed)process.exit(1);
