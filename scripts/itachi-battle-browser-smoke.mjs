import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};
await fs.mkdir('test-artifacts',{recursive:true});

async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingCombatRuntime==='object',{timeout:30000});
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
  console.log(`Itachi battle smoke START (${name}) -> ${BASE}`);
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  await context.addInitScript(()=>localStorage.setItem('blazingBattle.activeTeam.v4',JSON.stringify(['Itachi','Tyler','Sub-Zero'])));
  const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
  await page.evaluate(()=>window.BlazingRoadRun.clearRun());
  await enterRoad(page);
  await page.waitForFunction(()=>{
    try{const s=globalThis.eval('S'),front=globalThis.eval('front');return !!s.pairs.find(p=>front(p)?.name==='Itachi')}catch{return false}
  },null,{timeout:5000});

  const contract=await page.evaluate(async()=>{
   const html=document.documentElement.innerHTML;
   const s=globalThis.eval('S'),front=globalThis.eval('front'),roster=globalThis.eval('BATTLE_ROSTER'),active=globalThis.eval('ACTIVE_PLAYABLE_UNITS');
   const idle=globalThis.eval("unitIdleFrames('Itachi')"),basic=globalThis.eval("unitAttackFrames('Itachi','basic_attack')"),jutsu=globalThis.eval("unitAttackFrames('Itachi','tsukuyomi')");
   const pair=s.pairs.find(p=>front(p)?.name==='Itachi');
   const waitLoaded=async frames=>{for(let i=0;i<30;i++){if(frames.length&&frames.every(img=>img.complete&&img.naturalWidth>0))return true;await new Promise(r=>setTimeout(r,100))}return false};
   return {registered:!!roster.Itachi,active:[...active],team:s.pairs.map(p=>front(p)?.name),pair:pair?{x:pair.x,y:pair.y}:null,idleCount:idle.length,basicCount:basic.length,jutsuCount:jutsu.length,idleLoaded:await waitLoaded(idle),basicLoaded:await waitLoaded(basic),jutsuLoaded:await waitLoaded(jutsu),markers:{basic:html.includes('animateItachiCrowStrike'),jutsu:html.includes('animateItachiTsukuyomi'),dim:html.includes("f.kind==='itachiTsukuyomiDim'"),hold:html.includes('ITACHI_TSUKUYOMI_HOLD_FRAMES'),gauge:html.includes("canonicalUnit('itachi').abilities.jutsu.gauge_reduction??45")}};
  });
  if(!contract.registered||!contract.active.includes('Itachi')||!contract.team.includes('Itachi')||contract.idleCount!==6||contract.basicCount!==6||contract.jutsuCount!==6||!contract.idleLoaded||!contract.basicLoaded||!contract.jutsuLoaded||!contract.markers.basic||!contract.markers.jutsu||!contract.markers.dim||!contract.markers.hold||!contract.markers.gauge)throw new Error(`Itachi battle contract incomplete: ${JSON.stringify(contract)}`);

  const basicResult=await page.evaluate(async()=>{
   const s=globalThis.eval('S'),front=globalThis.eval('front'),begin=globalThis.eval('beginActionToken'),animate=globalThis.eval('animateItachiCrowStrike');
   const pair=s.pairs.find(p=>front(p)?.name==='Itachi'),enemy=s.enemies.find(e=>e.hp>0);if(!pair||!enemy)return {error:'missing pair/enemy'};
   s.phase='resolve';s.floaters=[];begin();const before=enemy.hp,start=performance.now();let sawCrow=false;
   const outcome=await new Promise(resolve=>{
    const sample=setInterval(()=>{if(s.floaters.some(f=>f.kind==='itachiCrowStrike'))sawCrow=true},25);
    animate('Itachi',{x:pair.x,y:pair.y},enemy,()=>window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:1}),()=>{clearInterval(sample);resolve({elapsed:performance.now()-start})},'basic_attack');
    setTimeout(()=>{clearInterval(sample);resolve({timeout:true,elapsed:performance.now()-start})},1800);
   });
   return {...outcome,before,after:enemy.hp,sawCrow,floaters:s.floaters.map(f=>f.kind)};
  });
  if(basicResult.error||basicResult.timeout||!basicResult.sawCrow||basicResult.after!==basicResult.before-1)throw new Error(`Crow Chakra Strike failed: ${JSON.stringify(basicResult)}`);

  const jutsuPromise=page.evaluate(async()=>{
   const s=globalThis.eval('S'),front=globalThis.eval('front'),begin=globalThis.eval('beginActionToken'),animate=globalThis.eval('animateItachiTsukuyomi'),canonical=globalThis.eval('canonicalUnit');
   const pair=s.pairs.find(p=>front(p)?.name==='Itachi'),enemy=s.enemies.find(e=>e.hp>0);if(!pair||!enemy)return {error:'missing pair/enemy'};
   s.phase='resolve';s.floaters=[];enemy.gauge=80;begin();const beforeHp=enemy.hp,beforeGauge=enemy.gauge,start=performance.now();let sawDim=false,sawOverlay=false,sawMandala=false,sawTarget=false,firstOverlayAt=null,firstTargetAt=null;
   const outcome=await new Promise(resolve=>{
    const sample=setInterval(()=>{const kinds=s.floaters.map(f=>f.kind),elapsed=performance.now()-start;sawDim||=kinds.includes('itachiTsukuyomiDim');if(kinds.includes('itachiTsukuyomiOverlay')){sawOverlay=true;if(firstOverlayAt===null)firstOverlayAt=elapsed}if(kinds.includes('itachiTsukuyomiMandala'))sawMandala=true;if(kinds.includes('itachiTsukuyomiTarget')){sawTarget=true;if(firstTargetAt===null)firstTargetAt=elapsed}},20);
    animate('Itachi',{x:pair.x,y:pair.y},enemy,()=>{window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:1});window.BlazingCombatRuntime.execute('reduce_target_gauge',{target:enemy,parameters:{amount:canonical('itachi').abilities.jutsu.gauge_reduction??45,minimum_gauge:0}})},()=>{clearInterval(sample);resolve({elapsed:performance.now()-start})});
    setTimeout(()=>{clearInterval(sample);resolve({timeout:true,elapsed:performance.now()-start})},2200);
   });
   return {...outcome,beforeHp,afterHp:enemy.hp,beforeGauge,afterGauge:enemy.gauge,sawDim,sawOverlay,sawMandala,sawTarget,firstOverlayAt,firstTargetAt,dim:!!s.jutsuDim};
  });
  await page.waitForFunction(()=>{try{return globalThis.eval('S')?.floaters?.some(f=>f.kind==='itachiTsukuyomiOverlay')}catch{return false}},{timeout:1600});
  await page.waitForTimeout(90);
  await page.screenshot({path:`test-artifacts/itachi-tsukuyomi-${name}.png`,fullPage:true});
  const jutsuResult=await jutsuPromise;
  if(jutsuResult.error||jutsuResult.timeout||!jutsuResult.sawDim||!jutsuResult.sawOverlay||!jutsuResult.sawMandala||!jutsuResult.sawTarget||jutsuResult.firstOverlayAt<450||jutsuResult.firstOverlayAt>1100||jutsuResult.firstTargetAt-jutsuResult.firstOverlayAt<80||jutsuResult.firstTargetAt-jutsuResult.firstOverlayAt>360||jutsuResult.elapsed<jutsuResult.firstTargetAt+450||jutsuResult.afterHp!==jutsuResult.beforeHp-1||jutsuResult.afterGauge!==Math.max(0,jutsuResult.beforeGauge-45))throw new Error(`Tsukuyomi failed: ${JSON.stringify(jutsuResult)}`);
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Itachi battle smoke PASS (${name}): roster + 6/6/6 body frames, Crow Chakra Strike VFX/damage, and Tsukuyomi ordered eye/overlay → target beat + dim + held cast pose + 45 gauge suppression verified.`);
  await context.close();
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
 try{await run(name,type)}catch(error){failed=true;console.error(`Itachi battle smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
