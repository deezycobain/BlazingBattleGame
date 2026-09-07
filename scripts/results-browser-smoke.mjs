import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
  await page.locator('#level1Btn').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingEconomy==='object'&&typeof window.BlazingMatchResults==='object'&&typeof window.BlazingRoadRun==='object',{timeout:30000});
  await page.waitForTimeout(180);
}

async function waitMode(page,mode){
  await page.waitForFunction(expected=>{
    try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode===expected}catch{return false}
  },mode,{timeout:15000});
}

async function win(page){
  return page.evaluate(()=>{
    const s=globalThis.eval('S'),check=globalThis.eval('checkVictoryKillshot');
    s.enemies.forEach(enemy=>{enemy.hp=0});
    return {victory:check(),reward:s.bbVictoryReward||null,mode:s.bbRunMode};
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

    await page.evaluate(()=>{window.BlazingRoadRun.clearRun();window.BlazingEconomy.reset()});
    const home=await page.evaluate(async()=>{
      const title=document.querySelector('#menuScreen .bb-home-title');
      const labels=['summonsBtn','inventoryBtn','forgeBtn'].map(id=>document.getElementById(id)?.innerText||'');
      for(let i=0;i<40&&!window.BlazingHdAudit?.homeWallpaper;i++)await new Promise(r=>setTimeout(r,100));
      return {titleDisplay:title?getComputedStyle(title).display:null,labels,hd:window.BlazingHdAudit?.homeWallpaper||null};
    });
    if(home.titleDisplay!=='none')throw new Error(`duplicate Home title still visible: ${home.titleDisplay}`);
    if(!/RECRUIT/.test(home.labels[0])||!/ROSTER/.test(home.labels[1])||!/AWAKEN/.test(home.labels[2]))throw new Error(`official secondary labels missing: ${JSON.stringify(home.labels)}`);
    if(!home.hd)throw new Error('Home wallpaper HD audit did not resolve');
    if(!home.hd.hd)throw new Error(`Home wallpaper source is below HD gate: ${home.hd.naturalWidth}x${home.hd.naturalHeight}`);
    console.log(`Results browser smoke (${name}) Home wallpaper: ${home.hd.naturalWidth}x${home.hd.naturalHeight}`);

    await page.locator('#level1Btn').click();await waitMode(page,'road');
    const road=await win(page);
    if(!road.victory||road.reward?.amount!==100||road.reward?.balance!==100)throw new Error(`Road reward incorrect: ${JSON.stringify(road)}`);
    await page.locator('#bbMatchResults.active').waitFor({state:'visible',timeout:5000});
    const roadResult=await page.locator('#bbMatchResults').innerText();
    if(!/VICTORY/.test(roadResult)||!/100/.test(roadResult)||!/BATTLE MARKS/.test(roadResult)||!/MAIN MENU/.test(roadResult))throw new Error(`Road results content incorrect: ${roadResult}`);
    await page.getByRole('button',{name:'MAIN MENU'}).click();
    await page.waitForFunction(()=>!document.getElementById('battleScreen')?.classList.contains('active')&&getComputedStyle(document.getElementById('menuScreen')).display!=='none');
    const roadCard=await page.locator('[data-bb-home-action="road"] .bb-mode-desc').textContent();
    if(!/Stage\s*2/i.test(roadCard||''))throw new Error(`Road card did not show Stage 2 after menu return: ${roadCard}`);

    await page.locator('#boss1Btn').click();await waitMode(page,'castle');
    const castle=await win(page);
    if(!castle.victory||castle.reward?.amount!==250||castle.reward?.balance!==350)throw new Error(`Castle reward incorrect: ${JSON.stringify(castle)}`);
    await page.locator('#bbMatchResults.active').waitFor({state:'visible',timeout:5000});
    const castleResult=await page.locator('#bbMatchResults').innerText();
    if(!/250/.test(castleResult)||!/350/.test(castleResult)||!/RETURN TO MENU/.test(castleResult))throw new Error(`Castle results content incorrect: ${castleResult}`);
    await page.getByRole('button',{name:'RETURN TO MENU'}).click();
    await page.waitForFunction(()=>!document.getElementById('battleScreen')?.classList.contains('active')&&getComputedStyle(document.getElementById('menuScreen')).display!=='none');
    const hud=await page.locator('#bbEconomyHud').innerText();
    if(!/350/.test(hud))throw new Error(`Home Battle Marks HUD not updated: ${hud}`);

    await page.reload({waitUntil:'domcontentloaded'});await waitHome(page);
    const persisted=await page.locator('#bbEconomyHud').innerText();
    if(!/350/.test(persisted))throw new Error(`Battle Marks did not persist after reload: ${persisted}`);
    await page.evaluate(()=>{window.BlazingRoadRun.clearRun();window.BlazingEconomy.reset()});
    if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
    console.log(`Results browser smoke PASS (${name}): official Home skin, HD wallpaper, Road/Castle rewards, menu return, and persistent Battle Marks verified.`);
  }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Results browser smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
