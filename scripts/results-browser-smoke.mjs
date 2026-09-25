import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingEconomy==='object'&&typeof window.BlazingMatchResults==='object'&&typeof window.BlazingRoadRun==='object'&&typeof window.BlazingUnitProgression==='object'&&typeof window.BlazingApprovedHomeCompat==='object'&&typeof window.BlazingHomeLivePolish==='object'&&typeof window.BlazingHomeV8==='object'&&typeof window.BlazingHomeV9==='object',{timeout:30000});
  await page.locator('#bbHomeApproved[data-bb-home-generation="v5"][data-bb-home-live-polish="v7"][data-bb-home-layout="v9-polish"] [data-v9-currency="blazing-coins"] [data-v5-marks]').waitFor({state:'visible',timeout:10000});
  await page.waitForTimeout(180);
}

async function waitMode(page,mode){
  await page.waitForFunction(expected=>{
    try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode===expected}catch{return false}
  },mode,{timeout:15000});
}

async function waitRoadSyntheticWinReady(page){
  await page.waitForFunction(()=>{
    try{
      const s=globalThis.eval('S'),run=window.BlazingRoadRun?.loadRun?.(),camera=window.BlazingRoadCamera?.snapshot?.();
      return s?.bbRunMode==='road'&&run?.status==='active'&&Number(run?.stage)===Number(s?.bbRoadStage||1)&&camera?.active&&camera?.mode==='combat'&&!window.BlazingRoadCamera?.isCombatLocked?.();
    }catch{return false}
  },null,{timeout:12000});
}

async function openBattle(page){
  const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
  if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
  await panel.waitFor({state:'visible',timeout:5000});
}

async function launchMode(page,mode){
  await openBattle(page);
  await page.locator(`#bbHomeApproved [data-mode="${mode}"]`).click();
  await waitMode(page,mode==='road'?'road':'castle');
  if(mode==='road')await waitRoadSyntheticWinReady(page);
}

async function win(page){
  return page.evaluate(()=>{
    const s=globalThis.eval('S'),check=globalThis.eval('checkVictoryKillshot');
    s.enemies.forEach(enemy=>{enemy.hp=0});
    const victory=check();
    return {victory,reward:s.bbVictoryReward||null,xp:s.bbVictoryXp||null,mode:s.bbRunMode};
  });
}

async function run(name,type){
  let browser;
  try{
    console.log(`Results browser smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
    const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);

    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);

    await page.evaluate(()=>{window.BlazingRoadRun.clearRun();window.BlazingEconomy.reset();window.BlazingUnitProgression.reset();window.BlazingApprovedHomeCompat.apply();window.BlazingHomeLivePolish.apply();window.BlazingHomeV8.apply();window.BlazingHomeV9.apply()});
    const home=await page.evaluate(()=>{
      const shell=document.getElementById('bbHomeApproved');
      const legacy=document.querySelector('#menuScreen > .menuInner');
      const legacyStyle=legacy?getComputedStyle(legacy):null;
      const nav={};
      for(const key of ['battle','summon','units','forge']){
        const btn=shell?.querySelector(`[data-nav="${key}"]`),img=btn?.querySelector('img');
        nav[key]={exists:!!btn,src:img?.getAttribute('src')||'',visible:!!btn&&getComputedStyle(btn).display!=='none'};
      }
      const coinBox=shell?.querySelector('[data-v9-currency="blazing-coins"]');
      const marks=coinBox?.querySelector('[data-v5-marks]');
      const embers=shell?.querySelector('[data-v5-embers]');
      const legacyMarks=document.getElementById('bbEconomyHud');
      const legacyMarksStyle=legacyMarks?getComputedStyle(legacyMarks):null;
      const center=shell?.querySelector('.bb-home-v4-center');
      const centerStyle=center?getComputedStyle(center):null;
      return {
        approved:!!shell,
        generation:shell?.dataset.bbHomeGeneration||'',
        livePolish:shell?.dataset.bbHomeLivePolish||'',
        layout:shell?.dataset.bbHomeLayout||'',
        currencyMode:shell?.dataset.bbHomeCurrency||'',
        roadState:shell?.dataset.bbRoadState||'',
        centerHidden:!center||centerStyle?.display==='none'||centerStyle?.visibility==='hidden'||centerStyle?.opacity==='0',
        legacyHidden:!legacy||legacyStyle?.visibility==='hidden'||legacyStyle?.opacity==='0'||legacyStyle?.display==='none',
        nav,
        coinLabel:coinBox?.querySelector('.bb-home-v5-currency-copy small')?.textContent?.trim()||'',
        marks:marks?.textContent||'',
        marksVisible:!!marks&&getComputedStyle(marks).display!=='none'&&getComputedStyle(marks).visibility!=='hidden',
        embers:embers?.textContent||'',
        embersVisible:!!embers&&getComputedStyle(embers).display!=='none'&&getComputedStyle(embers).visibility!=='hidden',
        legacyMarksHidden:!legacyMarks||legacyMarksStyle?.display==='none'||legacyMarksStyle?.visibility==='hidden'||legacyMarksStyle?.opacity==='0'
      };
    });
    if(!home.approved)throw new Error('approved Home shell missing');
    if(home.generation!=='v5')throw new Error(`Home compatibility generation marker missing: ${home.generation}`);
    if(home.livePolish!=='v7'||home.layout!=='v9-polish'||home.currencyMode!=='blazing-coins'||!home.centerHidden)throw new Error(`Home v9 live presentation missing: ${JSON.stringify(home)}`);
    if(home.roadState!=='fresh')throw new Error(`fresh Home Road state incorrect: ${home.roadState}`);
    if(!home.legacyHidden)throw new Error('legacy Home controls are still visually exposed behind approved shell');
    for(const [key,file] of Object.entries({battle:'battle.png',summon:'summon-scroll-v2.png',units:'units.png',forge:'forge-scroll-v2.png'})){
      const item=home.nav[key];
      if(!item?.exists||!item.visible||!item.src.endsWith(`/navigation/${file}`))throw new Error(`approved ${key} navigation asset missing: ${JSON.stringify(item)}`);
    }
    if(home.coinLabel!=='BLAZING COINS'||!home.marksVisible||!/0/.test(home.marks))throw new Error(`Home Blazing Coins HUD did not reset visibly: ${JSON.stringify(home)}`);
    if(!home.embersVisible||!/0/.test(home.embers))throw new Error(`Home Embers HUD did not reset visibly: ${JSON.stringify(home)}`);
    if(!home.legacyMarksHidden)throw new Error('legacy currency pill is visually exposed beside live Home HUD');

    await launchMode(page,'road');
    const forgeReadyName=await page.evaluate(()=>{
      const supported=new Set(window.BlazingProgression?.fighters?.()||window.BlazingUnitProgression?.fighters?.()||window.BlazingUnitProgression?.FIGHTERS||[]);
      const s=globalThis.eval('S');
      const names=(Array.isArray(s?.pairs)?s.pairs:[]).flatMap(pair=>Array.isArray(pair?.units)?pair.units:[]).filter(unit=>unit&&unit.name&&unit.name!=='—').map(unit=>unit.name);
      const name=names.find(unit=>supported.has(unit));
      if(!name)throw new Error('Road smoke could not find a Forge-routable deployed fighter');
      const state=window.BlazingUnitProgression.getState(),unit=state.units?.[name];
      if(!unit)throw new Error(`Road smoke progression state missing ${name}`);
      Object.assign(unit,{level:9,xp:0,awakening:0,copies:1,shiny:false});
      window.BlazingUnitProgression.save(state);
      return name;
    });
    const road=await win(page);
    if(!road.victory||road.reward?.amount!==100||road.reward?.balance!==100||road.reward?.currency!=='BLAZING COINS')throw new Error(`Road reward incorrect: ${JSON.stringify(road)}`);
    if(road.xp?.amount!==650||road.xp?.units?.length!==6)throw new Error(`Road Battle XP incorrect: ${JSON.stringify(road.xp)}`);
    await page.locator('#bbMatchResults.active').waitFor({state:'visible',timeout:5000});
    const roadResult=await page.locator('#bbMatchResults').innerText();
    if(!/VICTORY/.test(roadResult)||!/100/.test(roadResult)||!/BLAZING COINS/.test(roadResult)||!/\+650 XP/.test(roadResult)||!/OPEN FORGE/.test(roadResult)||!/MAIN MENU/.test(roadResult))throw new Error(`Road results content incorrect: ${roadResult}`);
    const progressionResult=await page.evaluate(()=>{
      const box=document.getElementById('bbResultsXp'),readyRow=box?.querySelector('.bb-results-xp-unit.ready'),readyStatus=readyRow?.querySelector('small'),readyName=readyRow?.querySelector('b'),readyLevel=readyRow?.querySelector('em');
      const visible=node=>{if(!node)return false;const style=getComputedStyle(node),rect=node.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&(Number.parseFloat(style.opacity)||0)>.01&&rect.width>0&&rect.height>0};
      return {
        ready:box?.dataset.forgeReady||'',
        rows:box?.querySelectorAll('[data-progression-unit]').length||0,
        readyRows:box?.querySelectorAll('.bb-results-xp-unit.ready').length||0,
        text:box?.textContent||'',
        readyName:readyName?.textContent?.trim()||'',
        readyLevel:readyLevel?.textContent?.trim()||'',
        readyStatus:readyStatus?.textContent?.trim()||'',
        readyStatusVisible:visible(readyStatus),
        three:document.getElementById('bbResultsActions')?.classList.contains('three')||false
      };
    });
    if(progressionResult.ready!==forgeReadyName||progressionResult.rows!==road.xp.units.length||progressionResult.readyRows!==1||!progressionResult.three)throw new Error(`Road progression bridge state incorrect: ${JSON.stringify(progressionResult)}`);
    if(progressionResult.readyName.toLowerCase()!==forgeReadyName.toLowerCase()||!/AWAKENING READY/.test(progressionResult.readyStatus)||!/LV\.9\s*→\s*LV\.10/.test(progressionResult.readyLevel))throw new Error(`Road progression bridge content incorrect: ${JSON.stringify(progressionResult)}`);
    const roadIntermission=await page.evaluate(()=>{
      const box=document.getElementById('bbResultsRoad');
      return {
        hidden:!!box?.hidden,
        cleared:box?.dataset.clearedStage||'',
        next:box?.dataset.nextStage||'',
        text:box?.innerText||'',
        nodes:box?.querySelectorAll('[data-road-node]').length||0,
        carry:box?.querySelectorAll('.bb-road-carry-unit').length||0
      };
    });
    if(roadIntermission.hidden||roadIntermission.cleared!=='1'||roadIntermission.next!=='2'||roadIntermission.nodes!==10||roadIntermission.carry<1)throw new Error(`Road intermission state incorrect: ${JSON.stringify(roadIntermission)}`);
    if(!/ROAD PROGRESS/.test(roadIntermission.text)||!/1\s*\/\s*10/.test(roadIntermission.text)||!/NEXT ENCOUNTER/.test(roadIntermission.text)||!/STAGE 2/.test(roadIntermission.text)||!/MOONLIT RUINS/i.test(roadIntermission.text)||!/HP\s+\d+%/.test(roadIntermission.text)||!/CHAKRA\s+\d+\/\d+/.test(roadIntermission.text))throw new Error(`Road intermission content incorrect: ${roadIntermission.text}`);
    const roadNames=road.xp.units.map(item=>item.name);
    const roadLevels=await page.evaluate(names=>Object.fromEntries(names.map(unit=>[unit,window.BlazingUnitProgression.unit(unit)])),roadNames);
    for(const [name,unit] of Object.entries(roadLevels)){
      if(name===forgeReadyName){
        if(unit.level!==10||unit.xp!==0||unit.copies!==1||unit.awakening!==0)throw new Error(`Forge-ready Road fighter progression incorrect: ${JSON.stringify({name,unit})}`);
      }else if(unit.level!==5||unit.xp!==105)throw new Error(`Road XP did not accelerate fresh fighter to Lv5 + 105 XP: ${JSON.stringify({name,unit})}`);
    }
    await page.getByRole('button',{name:'OPEN FORGE'}).click();
    await page.locator('#resonanceScreen.active').waitFor({state:'visible',timeout:5000});
    const forgeName=(await page.locator('#forgeName').innerText()).trim();
    if(forgeName.toLowerCase()!==forgeReadyName.toLowerCase())throw new Error(`Battle result Forge route opened the wrong fighter: expected ${forgeReadyName}, got ${forgeName}`);
    await page.locator('#forgeBack').click();
    await waitHome(page);
    const liveRoad=await page.evaluate(()=>{
      window.BlazingHomeLivePolish.apply();window.BlazingHomeV8.apply();window.BlazingHomeV9.apply();
      const shell=document.getElementById('bbHomeApproved');
      return {state:shell?.dataset.bbRoadState||'',stage:shell?.dataset.bbRoadStage||'',layout:shell?.dataset.bbHomeLayout||''};
    });
    if(liveRoad.state!=='active'||liveRoad.stage!=='2'||liveRoad.layout!=='v9-polish')throw new Error(`Home Road state did not advance to Stage 2: ${JSON.stringify(liveRoad)}`);
    await openBattle(page);
    const roadCard=await page.locator('#bbHomeApproved [data-mode="road"] span:last-child').textContent();
    if(!/Stage\s*2/i.test(roadCard||''))throw new Error(`approved Road selector did not show Stage 2 after menu return: ${roadCard}`);

    await page.locator('#bbHomeApproved [data-mode="castle"]').click();await waitMode(page,'castle');
    const castle=await win(page);
    if(!castle.victory||castle.reward?.amount!==250||castle.reward?.balance!==350||castle.reward?.currency!=='BLAZING COINS')throw new Error(`Castle reward incorrect: ${JSON.stringify(castle)}`);
    if(castle.xp?.amount!==900||castle.xp?.units?.length!==6)throw new Error(`Castle Battle XP incorrect: ${JSON.stringify(castle.xp)}`);
    await page.locator('#bbMatchResults.active').waitFor({state:'visible',timeout:5000});
    const castleResult=await page.locator('#bbMatchResults').innerText();
    if(!/250/.test(castleResult)||!/350/.test(castleResult)||!/BLAZING COINS/.test(castleResult)||!/\+900 XP/.test(castleResult)||!/RETURN TO MENU/.test(castleResult))throw new Error(`Castle results content incorrect: ${castleResult}`);
    await page.getByRole('button',{name:'RETURN TO MENU'}).click();
    await waitHome(page);
    const hud=await page.locator('#bbHomeApproved [data-v9-currency="blazing-coins"] [data-v5-marks]').innerText();
    if(!/350/.test(hud))throw new Error(`Home Blazing Coins HUD not updated: ${hud}`);

    const progressionBeforeReload=await page.evaluate(()=>window.BlazingUnitProgression.getState());
    await page.reload({waitUntil:'domcontentloaded'});await waitHome(page);
    const persisted=await page.locator('#bbHomeApproved [data-v9-currency="blazing-coins"] [data-v5-marks]').innerText();
    if(!/350/.test(persisted))throw new Error(`Blazing Coins did not persist in Home after reload: ${persisted}`);
    const progressionAfterReload=await page.evaluate(()=>window.BlazingUnitProgression.getState());
    if(JSON.stringify(progressionAfterReload)!==JSON.stringify(progressionBeforeReload))throw new Error('Battle XP progression did not persist after reload');
    await page.evaluate(()=>{window.BlazingRoadRun.clearRun();window.BlazingEconomy.reset();window.BlazingUnitProgression.reset()});
    if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
    console.log(`Results browser smoke PASS (${name}): Home v9, live currencies, Road reward/intermission carry preview, battle-to-Forge progression routing, Stage 2 menu return, Castle rewards, and persistent progression verified.`);
  }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Results browser smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
