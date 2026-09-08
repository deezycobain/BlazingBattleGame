import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingEconomy==='object'&&typeof window.BlazingUnitProgression==='object'&&typeof window.BlazingRoadRun==='object'&&typeof window.BlazingApprovedHomeCompat==='object'&&typeof window.BlazingHomeV8==='object'&&typeof window.BlazingHomeV9Lifecycle==='object',{timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#bbHomeApproved .bb-home-v5-profile')?.dataset?.bbHomeAction==='player-profile',{timeout:10000});
  await page.waitForTimeout(180);
}

async function assertProfile(page,label){
  const trigger=page.locator('#bbHomeApproved .bb-home-v5-profile[data-bb-home-action="player-profile"]');
  const expected=await page.evaluate(()=>{const profile=window.BlazingHomeV8?.loadProfile?.();const unit=window.BlazingApprovedHomeCompat?.leaderUnit?.();return {player:profile?.username||'',leader:unit?.display_name||unit?.name||unit?.id||''}});
  if(!expected.player||!expected.leader)throw new Error(`${label}: canonical player/leader unavailable: ${JSON.stringify(expected)}`);
  const triggerLabel=await trigger.getAttribute('aria-label');
  if(!String(triggerLabel||'').includes(expected.player))throw new Error(`${label}: profile trigger does not identify persisted player: ${JSON.stringify({expected,triggerLabel})}`);
  await trigger.click();
  const panel=page.locator('#bbHomePlayerProfile');
  await panel.waitFor({state:'visible',timeout:3000});
  const player=(await panel.locator('#bbPlayerProfileTitle').innerText()).trim();
  if(player!==expected.player)throw new Error(`${label}: profile player mismatch: expected=${expected.player}, panel=${player}`);
  const header=await panel.locator('.bb-player-profile-head').innerText();
  if(!header.includes(expected.leader)||!/CURRENT LEADER/i.test(header))throw new Error(`${label}: current leader missing from profile header: ${JSON.stringify({expected,header})}`);

  const stableDom=await panel.evaluate(async root=>{const close=root.querySelector('.bb-player-profile-close');await new Promise(resolve=>setTimeout(resolve,350));return !!close&&close===root.querySelector('.bb-player-profile-close')});
  if(!stableDom)throw new Error(`${label}: open profile DOM was replaced without a saved-state change`);

  const values=await panel.evaluate(root=>{
    const read=key=>root.querySelector(`[data-stat="${key}"] strong`)?.textContent?.trim()||'';
    return {
      coins:read('coins'),
      embers:read('embers'),
      battleXp:read('battle-xp'),
      shiny:read('shiny'),
      roadWins:read('road-wins'),
      castleWins:read('castle-wins'),
      lifetimeCoins:read('lifetime-coins'),
      road:root.querySelector('.bb-player-profile-road')?.textContent||'',
      tyler:root.querySelector('[data-profile-fighter="tyler"]')?.textContent||'',
      text:root.textContent||''
    };
  });
  if(values.coins!=='850'||values.embers!=='0'||values.battleXp!=='650'||values.shiny!=='0'||values.roadWins!=='1'||values.castleWins!=='1'||values.lifetimeCoins!=='850')throw new Error(`${label}: saved profile stats incorrect: ${JSON.stringify(values)}`);
  if(!/STAGE\s*3/i.test(values.road)||!/ACTIVE/i.test(values.road)||!/1\s*\/\s*2\s*fighters standing/i.test(values.road))throw new Error(`${label}: Road profile state incorrect: ${values.road}`);
  if(!/Tyler/i.test(values.tyler)||!/LV\.\s*5/i.test(values.tyler)||!/AWAKENING\s*0\s*\/\s*5/i.test(values.tyler))throw new Error(`${label}: Tyler fighter progression incorrect: ${values.tyler}`);
  if(!/PLAYER PROFILE/i.test(values.text)||!/BLAZING COINS/i.test(values.text)||!/TOTAL BATTLE XP/i.test(values.text)||!/FIGHTER PROGRESSION/i.test(values.text))throw new Error(`${label}: profile sections missing: ${values.text}`);

  await panel.locator('.bb-player-profile-close').click();
  await panel.waitFor({state:'hidden',timeout:3000});
  const expanded=await trigger.getAttribute('aria-expanded');
  if(expanded!=='false')throw new Error(`${label}: profile trigger aria-expanded did not reset`);
  return values;
}

async function run(name,type){
  let browser;
  try{
    console.log(`Player profile browser smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
    const page=await context.newPage();
    page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);

    await page.evaluate(()=>{
      const E=window.BlazingEconomy,P=window.BlazingUnitProgression,R=window.BlazingRoadRun;
      P.reset();E.reset();R.clearRun();
      window.BlazingHomeV8.saveProfile('ProfileTest');
      E.grantMarks(500,'PROFILE_SMOKE');
      E.awardVictory({mode:'road',stage:1});
      E.awardVictory({mode:'castle',boss:1});
      P.grantXp('Tyler',650);
      const run=R.createRun([
        {id:'Tyler',maxHp:100,hp:80},
        {id:'Lebee',maxHp:100,hp:0}
      ],{stage:3,runId:'profile-smoke'});
      R.saveRun(run);
      window.BlazingApprovedHomeCompat.apply();
      window.BlazingHomeV8.apply();
      window.BlazingHomeV9Lifecycle.apply();
    });
    await page.waitForTimeout(120);

    await assertProfile(page,`${name}/fresh`);

    await page.reload({waitUntil:'domcontentloaded'});await waitHome(page);
    await assertProfile(page,`${name}/reload`);

    const persisted=await page.evaluate(()=>({profile:window.BlazingHomeV8.loadProfile(),economy:window.BlazingEconomy.load(),progression:window.BlazingUnitProgression.getState(),road:window.BlazingRoadRun.loadRun()}));
    if(persisted.profile?.username!=='ProfileTest')throw new Error(`${name}: player identity did not persist: ${JSON.stringify(persisted.profile)}`);
    if(persisted.economy.battleMarks!==850||persisted.economy.lifetimeEarned!==850||persisted.economy.wins.road!==1||persisted.economy.wins.castle!==1)throw new Error(`${name}: economy profile proof did not persist: ${JSON.stringify(persisted.economy)}`);
    if(persisted.progression.totalBattleXp!==650||persisted.progression.units.Tyler.level!==5||persisted.progression.units.Tyler.xp!==105)throw new Error(`${name}: progression profile proof did not persist: ${JSON.stringify(persisted.progression.units.Tyler)}`);
    if(persisted.road?.stage!==3||persisted.road?.status!=='active'||persisted.road?.fighters?.filter(f=>f.hp>0).length!==1)throw new Error(`${name}: Road profile proof did not persist: ${JSON.stringify(persisted.road)}`);

    await page.evaluate(()=>{window.BlazingHomeV9Lifecycle.closeProfile({restoreFocus:false});window.BlazingRoadRun.clearRun();window.BlazingUnitProgression.reset();window.BlazingEconomy.reset();});
    if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
    console.log(`Player profile browser smoke PASS (${name}): persisted player identity, canonical leader, stable open DOM, economy, battle XP, fighter progression, Road state, and reload persistence verified.`);
  }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Player profile browser smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
