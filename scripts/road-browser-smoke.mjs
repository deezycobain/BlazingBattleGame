import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

function sameHpMap(a,b){
  const keys=[...new Set([...Object.keys(a),...Object.keys(b)])].sort();
  return keys.every(key=>a[key]===b[key]);
}

async function waitForHome(page){
  await page.locator('#level1Btn').waitFor({state:'attached',timeout:30000});
  await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object',{timeout:30000});
}

async function waitForMode(page,mode){
  await page.waitForFunction(expected=>{
    try{return typeof S!=='undefined'&&S?.bbRunMode===expected&&Array.isArray(S?.pairs)}catch{return false}
  },mode,{timeout:15000});
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
    page.on('pageerror',error=>pageErrors.push(error.message));

    await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
    await waitForHome(page);

    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12)))){
      throw new Error(`deployed commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
    }

    await page.evaluate(()=>window.BlazingRoadRun.clearRun());

    // Enter Road through the real Home button.
    await page.locator('#level1Btn').click({force:true});
    await waitForMode(page,'road');

    // Damage one fighter, KO a second, leave the third alive, then resolve victory.
    const first=await page.evaluate(()=>{
      const fighters=S.pairs.map(pair=>pair.units[pair.active]).filter(unit=>unit&&unit.name&&unit.name!=='—'&&Number(unit.maxHp)>0);
      if(fighters.length<3)throw new Error(`expected 3 Road fighters, found ${fighters.length}`);
      fighters[0].hp=Math.max(1,Math.floor(fighters[0].maxHp*0.53));
      fighters[1].hp=0;
      fighters[2].hp=Math.max(1,fighters[2].maxHp-11);
      const expected=Object.fromEntries(fighters.map(unit=>[window.BlazingRoadRun.stateUnitId(unit),unit.hp]));
      S.enemies.forEach(enemy=>{enemy.hp=0;});
      const victory=checkVictoryKillshot();
      const run=window.BlazingRoadRun.loadRun();
      return {
        victory,
        expected,
        run,
        battleMode:S.bbRunMode,
        stage:S.bbRoadStage,
        log:S.log
      };
    });

    if(!first.victory)throw new Error('Road victory hook did not resolve');
    if(first.battleMode!=='road')throw new Error(`Road battle mode lost during victory: ${first.battleMode}`);
    if(first.run?.status!=='active'||first.run?.stage!==2)throw new Error(`Road run did not advance to active Stage 2: ${JSON.stringify(first.run)}`);
    const savedHp=Object.fromEntries(first.run.fighters.map(f=>[f.unit_id,f.hp]));
    if(!sameHpMap(savedHp,first.expected))throw new Error(`saved HP mismatch after victory: expected ${JSON.stringify(first.expected)}, got ${JSON.stringify(savedHp)}`);
    const defeated=first.run.fighters.filter(f=>f.defeated);
    if(defeated.length!==1||defeated[0].hp!==0)throw new Error(`expected exactly one persisted KO: ${JSON.stringify(first.run.fighters)}`);

    // Reload the whole game to prove persistence is not just in-memory state.
    await page.reload({waitUntil:'domcontentloaded'});
    await waitForHome(page);
    const cardText=await page.locator('[data-bb-home-action="road"] .bb-mode-desc').textContent().catch(()=>null);
    if(!/Stage\s*2/i.test(cardText||'')||!/Run in Progress/i.test(cardText||''))throw new Error(`Road Home card did not resume Stage 2: ${JSON.stringify(cardText)}`);

    await page.locator('#level1Btn').click({force:true});
    await waitForMode(page,'road');
    const resumed=await page.evaluate(()=>{
      const fighters=S.pairs.map(pair=>pair.units[pair.active]).filter(unit=>unit&&unit.name&&unit.name!=='—'&&Number(unit.maxHp)>0);
      return {
        stage:S.bbRoadStage,
        hp:Object.fromEntries(fighters.map(unit=>[window.BlazingRoadRun.stateUnitId(unit),unit.hp])),
        defeated:fighters.filter(unit=>unit.hp<=0).map(unit=>window.BlazingRoadRun.stateUnitId(unit))
      };
    });
    if(resumed.stage!==2)throw new Error(`Road resumed wrong stage: ${resumed.stage}`);
    if(!sameHpMap(resumed.hp,first.expected))throw new Error(`live Stage 2 HP did not carry forward: expected ${JSON.stringify(first.expected)}, got ${JSON.stringify(resumed.hp)}`);
    if(resumed.defeated.length!==1)throw new Error(`persisted KO was not preserved in live Stage 2 battle: ${JSON.stringify(resumed)}`);

    // Reload and enter Castle. Road damage must not bleed into that mode.
    await page.reload({waitUntil:'domcontentloaded'});
    await waitForHome(page);
    await page.locator('#boss1Btn').click({force:true});
    await waitForMode(page,'castle');
    const castle=await page.evaluate(()=>{
      const fighters=S.pairs.map(pair=>pair.units[pair.active]).filter(unit=>unit&&unit.name&&unit.name!=='—'&&Number(unit.maxHp)>0);
      const road=window.BlazingRoadRun.loadRun();
      return {
        fullHp:fighters.every(unit=>unit.hp===unit.maxHp),
        hp:Object.fromEntries(fighters.map(unit=>[window.BlazingRoadRun.stateUnitId(unit),unit.hp])),
        runStage:road?.stage,
        runHp:road?Object.fromEntries(road.fighters.map(f=>[f.unit_id,f.hp])):{}
      };
    });
    if(!castle.fullHp)throw new Error(`Phantom Castle inherited Road damage: ${JSON.stringify(castle.hp)}`);
    if(castle.runStage!==2||!sameHpMap(castle.runHp,first.expected))throw new Error(`Castle altered saved Road run: ${JSON.stringify(castle)}`);

    await page.evaluate(()=>window.BlazingRoadRun.clearRun());
    if(pageErrors.length)throw new Error(`pageerror: ${pageErrors.join(' | ')}`);
    console.log(`Road browser smoke PASS (${name}): Stage 1 damage + KO persisted into Stage 2 after reload; Phantom Castle stayed full HP.`);
  }finally{
    if(browser)await browser.close().catch(()=>{});
  }
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Road browser smoke FAIL (${name}): ${error.stack||error.message}`);}
}
if(failed)process.exit(1);
