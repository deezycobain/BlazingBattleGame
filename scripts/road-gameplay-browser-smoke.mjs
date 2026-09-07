import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
 await page.locator('#level1Btn').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingRoadContent==='object'&&typeof window.BlazingMatchResults==='object',{timeout:30000});
 await page.waitForTimeout(120);
}
async function waitRoad(page,stage){
 await page.waitForFunction(expected=>{
  try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'&&s?.bbRoadStage===expected}catch{return false}
 },stage,{timeout:15000});
}
async function enterRoad(page,stage){await page.locator('#level1Btn').click();await waitRoad(page,stage)}

async function run(name,type){
 let browser;
 try{
  console.log(`Road gameplay smoke START (${name}) -> ${BASE}`);
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
  await page.evaluate(()=>window.BlazingRoadRun.clearRun());

  await enterRoad(page,1);
  const stage1=await page.evaluate(()=>{
   const s=globalThis.eval('S'),front=globalThis.eval('front'),tick=globalThis.eval('tick');
   const players=s.pairs.filter(p=>p.units?.[p.active]?.name&&p.units[p.active].name!=='—').map(p=>front(p));
   const snapshot={
    stage:s.bbRoadContent?.stage,name:s.bbRoadContent?.name,elite:s.bbRoadContent?.elite,
    map:s.bbRoadContent?.map?.src,mapSource:s.bbRoadMapSource,mapAudit:window.BlazingRoadMapAudit||null,
    enemies:s.enemies.map(e=>({hp:e.maxHp,attack:e.attack,defense:e.defense,speed:e.speed,ai:!!e.bbRoadAi})),
    chakra:players.map(u=>({name:u.name,chakra:u.chakra,max:u.maxChakra})),
    tickSource:String(tick)
   };
   // Deterministic meter proof: with clean gauges, an intentionally much faster enemy must win.
   s.pairs.forEach(p=>{p.gauge=0;front(p).speed=1});
   s.enemies.forEach((e,i)=>{e.gauge=0;e.speed=i===0?100:1});
   s.phase='charge';s.ready=null;s._chargeSince=performance.now();
   for(let i=0;i<80&&s.phase==='charge';i++)tick();
   snapshot.speedWinner=s.ready?.kind||null;
   // Cancel the scheduled CPU action after proving meter ownership; the next reload restores canonical stats.
   if(s.ready?.kind==='enemy'){s.ready.ref.gauge=0;s.ready=null;s.phase='resolve';}
   return snapshot;
  });
  if(stage1.stage!==1||stage1.elite)throw new Error(`Stage 1 content wrong: ${JSON.stringify(stage1)}`);
  if(!/stage-01-south-sac\.webp$/.test(stage1.map||'')||stage1.mapSource!==stage1.map)throw new Error(`Stage 1 map routing wrong: ${JSON.stringify(stage1)}`);
  if(stage1.enemies.length<3||stage1.enemies.some(e=>e.attack<24||!e.ai))throw new Error(`Stage 1 enemies are not combat-ready: ${JSON.stringify(stage1.enemies)}`);
  if(stage1.chakra.some(u=>u.chakra>Math.min(2,u.max)))throw new Error(`development full-chakra shortcut survived: ${JSON.stringify(stage1.chakra)}`);
  if(stage1.speedWinner!=='enemy')throw new Error(`Speed meter did not allow faster enemy to win: ${stage1.speedWinner}`);
  if(/player control restored|fallback restored player control/i.test(stage1.tickSource))throw new Error('player-forcing speed fallback survived in tick()');
  console.log(`Road gameplay smoke (${name}) Stage 1 map request: ${stage1.map}; fallback=${!!stage1.mapAudit?.fallback}`);

  // Reload to restore canonical player/enemy speed values after the meter proof.
  await page.evaluate(()=>window.BlazingMatchResults.returnHome());
  await page.reload({waitUntil:'domcontentloaded'});await waitHome(page);await enterRoad(page,1);
  const evadeStarted=await page.evaluate(()=>{
   const s=globalThis.eval('S'),cpuTurn=globalThis.eval('cpuTurn');
   const e=s.enemies[0];e.hp=1;e.gauge=100;s.ready={kind:'enemy',ref:e,g:100};s.phase='cpu';
   const random=Math.random;Math.random=()=>0;
   try{cpuTurn()}finally{Math.random=random}
   return {name:e.name,log:s.log};
  });
  await page.waitForTimeout(900);
  const evadeEnded=await page.evaluate(()=>{const s=globalThis.eval('S');return {log:s.log,phase:s.phase}});
  if(!/evad/i.test(evadeStarted.log)||!/repositioned out of danger/i.test(evadeEnded.log))throw new Error(`enemy evade branch did not complete: ${JSON.stringify({evadeStarted,evadeEnded})}`);

  // Seed the same surviving team directly at Stage 10, then enter it through the real Home button.
  await page.evaluate(()=>{
   const s=globalThis.eval('S'),R=window.BlazingRoadRun;
   const fighters=s.pairs.flatMap(p=>p.units||[]).filter(u=>u&&u.name&&u.name!=='—'&&Number(u.maxHp)>0);
   const run=R.createRun(fighters,{stage:10});R.saveRun(run);window.BlazingMatchResults.returnHome();
  });
  await page.waitForTimeout(250);await enterRoad(page,10);
  const stage10=await page.evaluate(()=>{
   const s=globalThis.eval('S');return {
    stage:s.bbRoadContent?.stage,elite:s.bbRoadContent?.elite,map:s.bbRoadContent?.map?.src,mapSource:s.bbRoadMapSource,
    enemies:s.enemies.map(e=>({hp:e.maxHp,attack:e.attack,defense:e.defense,speed:e.speed})),
    maxStage:window.BlazingRoadContent.MAX_STAGE
   };
  });
  if(stage10.stage!==10||!stage10.elite||stage10.maxStage!==10)throw new Error(`Stage 10 is not final elite: ${JSON.stringify(stage10)}`);
  if(!/stage-05-training-grounds\.webp$/.test(stage10.map||'')||stage10.mapSource!==stage10.map)throw new Error(`Stage 10 map slot wrong: ${JSON.stringify(stage10)}`);
  if(stage10.enemies.length<5||Math.min(...stage10.enemies.map(e=>e.attack))<=Math.min(...stage1.enemies.map(e=>e.attack)))throw new Error(`Stage 10 threat did not scale: ${JSON.stringify(stage10.enemies)}`);

  const victory=await page.evaluate(()=>{
   const s=globalThis.eval('S'),check=globalThis.eval('checkVictoryKillshot');s.enemies.forEach(e=>{e.hp=0});
   return {won:check(),run:window.BlazingRoadRun.loadRun()};
  });
  if(!victory.won||victory.run?.status!=='complete'||victory.run?.stage!==10)throw new Error(`Stage 10 did not complete Road cleanly: ${JSON.stringify(victory)}`);
  await page.locator('#bbMatchResults.active').waitFor({state:'visible',timeout:5000});
  const results=await page.locator('#bbMatchResults').innerText();
  if(!/ROAD COMPLETE/.test(results)||!/RESTART ROAD/.test(results)||!/MAIN MENU/.test(results))throw new Error(`Road completion results wrong: ${results}`);
  await page.getByRole('button',{name:'MAIN MENU'}).click();
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('menuScreen')).display!=='none');
  const card=await page.locator('[data-bb-home-action="road"] .bb-mode-desc').textContent();
  if(!/Road Complete/i.test(card||'')||!/10\/10/.test(card||''))throw new Error(`Home Road completion card wrong: ${card}`);

  await page.evaluate(()=>window.BlazingRoadRun.clearRun());
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Road gameplay smoke PASS (${name}): real Speed ordering, meaningful enemy scaling, attack/evade AI, map routing, and Stage 10 completion verified.`);
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
 try{await run(name,type)}catch(error){failed=true;console.error(`Road gameplay smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
