import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingEconomy==='object'&&typeof window.BlazingMatchResults==='object'&&typeof window.BlazingRoadRun==='object'&&typeof window.BlazingUnitProgression==='object'&&typeof window.BlazingApprovedHomeCompat==='object',{timeout:30000});
  await page.locator('#bbEconomyHud').waitFor({state:'visible',timeout:10000});
  await page.waitForTimeout(180);
}

async function waitMode(page,mode){
  await page.waitForFunction(expected=>{
    try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode===expected}catch{return false}
  },mode,{timeout:15000});
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

    await page.evaluate(()=>{window.BlazingRoadRun.clearRun();window.BlazingEconomy.reset();window.BlazingUnitProgression.reset();window.BlazingApprovedHomeCompat.apply()});
    const home=await page.evaluate(()=>{
      const shell=document.getElementById('bbHomeApproved');
      const legacy=document.querySelector('#menuScreen > .menuInner');
      const legacyStyle=legacy?getComputedStyle(legacy):null;
      const nav={};
      for(const key of ['battle','summon','units','forge']){
        const btn=shell?.querySelector(`[data-nav="${key}"]`),img=btn?.querySelector('img');
        nav[key]={exists:!!btn,src:img?.getAttribute('src')||'',visible:!!btn&&getComputedStyle(btn).display!=='none'};
      }
      const marks=document.getElementById('bbEconomyHud');
      return {
        approved:!!shell,
        legacyHidden:!legacy||legacyStyle?.visibility==='hidden'||legacyStyle?.opacity==='0'||legacyStyle?.display==='none',
        nav,
        marks:marks?.innerText||'',marksVisible:!!marks&&getComputedStyle(marks).display!=='none'
      };
    });
    if(!home.approved)throw new Error('approved Home v4 shell missing');
    if(!home.legacyHidden)throw new Error('legacy Home controls are still visually exposed behind approved shell');
    for(const [key,file] of Object.entries({battle:'battle.webp',summon:'summon.webp',units:'units.webp',forge:'forge.webp'})){
      const item=home.nav[key];
      if(!item?.exists||!item.visible||!item.src.endsWith(`/navigation/${file}`))throw new Error(`approved ${key} navigation asset missing: ${JSON.stringify(item)}`);
    }
    if(!home.marksVisible||!/0/.test(home.marks))throw new Error(`approved Home Battle Marks HUD did not reset visibly: ${JSON.stringify(home)}`);

    await launchMode(page,'road');
    const road=await win(page);
    if(!road.victory||road.reward?.amount!==100||road.reward?.balance!==100)throw new Error(`Road reward incorrect: ${JSON.stringify(road)}`);
    if(road.xp?.amount!==180||road.xp?.units?.length!==3)throw new Error(`Road Battle XP incorrect: ${JSON.stringify(road.xp)}`);
    await page.locator('#bbMatchResults.active').waitFor({state:'visible',timeout:5000});
    const roadResult=await page.locator('#bbMatchResults').innerText();
    if(!/VICTORY/.test(roadResult)||!/100/.test(roadResult)||!/BATTLE MARKS/.test(roadResult)||!/\+180 XP/.test(roadResult)||!/MAIN MENU/.test(roadResult))throw new Error(`Road results content incorrect: ${roadResult}`);
    const roadNames=road.xp.units.map(item=>item.name);
    const roadLevels=await page.evaluate(names=>Object.fromEntries(names.map(unit=>[unit,window.BlazingUnitProgression.unit(unit)])),roadNames);
    if(Object.values(roadLevels).some(unit=>unit.level!==2||unit.xp!==80))throw new Error(`Road XP did not persist into deployed team levels: ${JSON.stringify(roadLevels)}`);
    await page.getByRole('button',{name:'MAIN MENU'}).click();
    await waitHome(page);
    await openBattle(page);
    const roadCard=await page.locator('#bbHomeApproved [data-mode="road"] span:last-child').textContent();
    if(!/Stage\s*2/i.test(roadCard||''))throw new Error(`approved Road selector did not show Stage 2 after menu return: ${roadCard}`);

    await page.locator('#bbHomeApproved [data-mode="castle"]').click();await waitMode(page,'castle');
    const castle=await win(page);
    if(!castle.victory||castle.reward?.amount!==250||castle.reward?.balance!==350)throw new Error(`Castle reward incorrect: ${JSON.stringify(castle)}`);
    if(castle.xp?.amount!==450||castle.xp?.units?.length!==3)throw new Error(`Castle Battle XP incorrect: ${JSON.stringify(castle.xp)}`);
    await page.locator('#bbMatchResults.active').waitFor({state:'visible',timeout:5000});
    const castleResult=await page.locator('#bbMatchResults').innerText();
    if(!/250/.test(castleResult)||!/350/.test(castleResult)||!/\+450 XP/.test(castleResult)||!/RETURN TO MENU/.test(castleResult))throw new Error(`Castle results content incorrect: ${castleResult}`);
    await page.getByRole('button',{name:'RETURN TO MENU'}).click();
    await waitHome(page);
    const hud=await page.locator('#bbEconomyHud').innerText();
    if(!/350/.test(hud))throw new Error(`approved Home Battle Marks HUD not updated: ${hud}`);

    const progressionBeforeReload=await page.evaluate(()=>window.BlazingUnitProgression.getState());
    await page.reload({waitUntil:'domcontentloaded'});await waitHome(page);
    const persisted=await page.locator('#bbEconomyHud').innerText();
    if(!/350/.test(persisted))throw new Error(`Battle Marks did not persist after reload: ${persisted}`);
    const progressionAfterReload=await page.evaluate(()=>window.BlazingUnitProgression.getState());
    if(JSON.stringify(progressionAfterReload)!==JSON.stringify(progressionBeforeReload))throw new Error('Battle XP progression did not persist after reload');
    await page.evaluate(()=>{window.BlazingRoadRun.clearRun();window.BlazingEconomy.reset();window.BlazingUnitProgression.reset()});
    if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
    console.log(`Results browser smoke PASS (${name}): approved Home v4 routes, visible Battle Marks, Road/Castle rewards, Battle XP, Stage 2 menu return, and persistent progression verified.`);
  }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Results browser smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
