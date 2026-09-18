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
   return {registered:!!roster.Itachi,active:[...active],team:s.pairs.map(p=>front(p)?.name),pair:pair?{x:pair.x,y:pair.y}:null,idleCount:idle.length,basicCount:basic.length,jutsuCount:jutsu.length,idleLoaded:await waitLoaded(idle),basicLoaded:await waitLoaded(basic),jutsuLoaded:await waitLoaded(jutsu),markers:{basic:html.includes('animateItachiCrowStrike'),jutsu:html.includes('animateItachiTsukuyomi'),gauge:html.includes("canonicalUnit('itachi').abilities.jutsu.gauge_reduction??45"),scale:html.includes("name==='Itachi'?1.28:1"),aoe:html.includes('Itachi Tsukuyomi AoE resolution failed'),crowFlock:html.includes('drawSmallCrow')&&html.includes('const flock=[[0,0,28,1]'),directionSafe:html.includes('Math.atan2(f.to.y-f.from.y,Math.max(1,Math.abs(f.to.x-f.from.x)))'),redSmoke:html.includes("rgba(150,8,32,"),nightmare:html.includes("f.kind==='itachiTsukuyomiNightmare'"),cinematic:html.includes('nightmareAt=1450,impactAt=2200,holdAfterImpact=900'),centered:html.includes('ctx.translate(W/2,H/2)'),targetPngRemoved:!html.includes('ctx.drawImage(img,-size/2,-size/2,size,size)'),enemyDistortion:html.includes('createRadialGradient(cx,cy,0,cx,cy,r)')}};
  });
  if(!contract.registered||!contract.active.includes('Itachi')||!contract.team.includes('Itachi')||contract.idleCount!==6||contract.basicCount!==6||contract.jutsuCount!==6||!contract.idleLoaded||!contract.basicLoaded||!contract.jutsuLoaded||!contract.markers.basic||!contract.markers.jutsu||!contract.markers.gauge||!contract.markers.scale||!contract.markers.aoe||!contract.markers.crowFlock||!contract.markers.directionSafe||!contract.markers.redSmoke||!contract.markers.nightmare||!contract.markers.cinematic||!contract.markers.centered||!contract.markers.targetPngRemoved||!contract.markers.enemyDistortion)throw new Error(`Itachi battle contract incomplete: ${JSON.stringify(contract)}`);

  const basicResult=await page.evaluate(async()=>{
   const s=globalThis.eval('S'),front=globalThis.eval('front'),begin=globalThis.eval('beginActionToken'),animate=globalThis.eval('animateItachiCrowStrike');
   const pair=s.pairs.find(p=>front(p)?.name==='Itachi'),enemy=s.enemies.find(e=>e.hp>0);if(!pair||!enemy)return {error:'missing pair/enemy'};
   s.phase='resolve';s.floaters=[];begin();const before=enemy.hp,start=performance.now();let sawCrow=false;
   const outcome=await new Promise(resolve=>{
    const sample=setInterval(()=>{if(s.floaters.some(f=>f.kind==='itachiCrowStrike'))sawCrow=true},25);
    animate('Itachi',{x:pair.x,y:pair.y},enemy,()=>window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:1}),()=>{clearInterval(sample);resolve({elapsed:performance.now()-start})},'basic_attack');
    setTimeout(()=>{clearInterval(sample);resolve({timeout:true,elapsed:performance.now()-start})},2300);
   });
   return {...outcome,before,after:enemy.hp,sawCrow,floaters:s.floaters.map(f=>f.kind)};
  });
  if(basicResult.error||basicResult.timeout||!basicResult.sawCrow||basicResult.after!==basicResult.before-1||basicResult.elapsed<1050)throw new Error(`Crow Chakra Strike failed: ${JSON.stringify(basicResult)}`);

  const jutsuPromise=page.evaluate(async()=>{
   const s=globalThis.eval('S'),front=globalThis.eval('front'),begin=globalThis.eval('beginActionToken'),animate=globalThis.eval('animateItachiTsukuyomi'),canonical=globalThis.eval('canonicalUnit');
   const pair=s.pairs.find(p=>front(p)?.name==='Itachi'),targets=s.enemies.filter(e=>e.hp>0).slice(0,3),enemy=targets[0];if(!pair||!enemy||targets.length<2)return {error:'missing pair/enemies'};
   for(const target of targets){target.maxHp=Math.max(Number(target.maxHp)||0,200);target.hp=200;target.gauge=80}
   s.phase='resolve';s.floaters=[];begin();const before=targets.map(target=>({hp:target.hp,gauge:target.gauge})),start=performance.now();let sawOverlay=false,sawMandala=false,sawNightmare=false,sawTarget=false,primaryImpactGauge=null,impactGauges=null;
   const outcome=await new Promise(resolve=>{
    const sample=setInterval(()=>{const kinds=s.floaters.map(f=>f.kind);sawOverlay||=kinds.includes('itachiTsukuyomiOverlay');sawMandala||=kinds.includes('itachiTsukuyomiMandala');sawNightmare||=kinds.includes('itachiTsukuyomiNightmare');sawTarget||=kinds.includes('itachiTsukuyomiTarget')},25);
    animate('Itachi',{x:pair.x,y:pair.y},enemy,()=>{
      window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:1});
      window.BlazingCombatRuntime.execute('reduce_target_gauge',{target:enemy,parameters:{amount:canonical('itachi').abilities.jutsu.gauge_reduction??45,minimum_gauge:0}});
      primaryImpactGauge=enemy.gauge;
      setTimeout(()=>{impactGauges=targets.map(target=>target.gauge)},0);
    },()=>{clearInterval(sample);resolve({elapsed:performance.now()-start})});
    setTimeout(()=>{clearInterval(sample);resolve({timeout:true,elapsed:performance.now()-start})},4700);
   });
   return {...outcome,before,after:targets.map(target=>({hp:target.hp,gauge:target.gauge})),primaryImpactGauge,impactGauges,sawOverlay,sawMandala,sawNightmare,sawTarget,dim:!!s.jutsuDim};
  });
  await page.waitForTimeout(1150);
  await page.screenshot({path:`test-artifacts/itachi-tsukuyomi-ritual-${name}.png`,fullPage:true});
  await page.waitForTimeout(650);
  await page.screenshot({path:`test-artifacts/itachi-tsukuyomi-nightmare-${name}.png`,fullPage:true});
  await page.waitForTimeout(700);
  await page.screenshot({path:`test-artifacts/itachi-tsukuyomi-impact-${name}.png`,fullPage:true});
  const jutsuResult=await jutsuPromise;
  const expectedGauge=35;
  const aoeDamaged=jutsuResult.after?.every((state,index)=>state.hp<jutsuResult.before[index].hp);
  const gaugesAtImpact=jutsuResult.primaryImpactGauge===expectedGauge&&Array.isArray(jutsuResult.impactGauges)&&jutsuResult.impactGauges.every(value=>value<=expectedGauge);
  if(jutsuResult.error||jutsuResult.timeout||!jutsuResult.sawOverlay||!jutsuResult.sawMandala||!jutsuResult.sawNightmare||!jutsuResult.sawTarget||!aoeDamaged||!gaugesAtImpact||jutsuResult.elapsed<3000)throw new Error(`Tsukuyomi failed: ${JSON.stringify(jutsuResult)}`);
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Itachi battle smoke PASS (${name}): compact direction-safe crow flock with red smoke plus ritual, nightmare, and impact Tsukuyomi v2 stages verified with AoE damage and 45 gauge suppression.`);
  await context.close();
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
 try{await run(name,type)}catch(error){failed=true;console.error(`Itachi battle smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
