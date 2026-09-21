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
  await context.addInitScript(()=>localStorage.setItem('blazingBattle.activeTeam.v5',JSON.stringify(['Itachi','Tyler','Lebee','Senku','Sub-Zero','Crimson'])));
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
   const pair=s.pairs.find(p=>front(p)?.name==='Itachi'),crowSheet=globalThis.eval('ITACHI_CROW_FLOCK_SHEET');
   const waitLoaded=async frames=>{for(let i=0;i<30;i++){if(frames.length&&frames.every(img=>img.complete&&img.naturalWidth>0))return true;await new Promise(r=>setTimeout(r,100))}return false};
   const waitImage=async img=>{for(let i=0;i<30;i++){if(img?.complete&&img.naturalWidth>0&&img.naturalHeight>0)return true;await new Promise(r=>setTimeout(r,100))}return false};
   const crowSheetLoaded=await waitImage(crowSheet);
   return {registered:!!roster.Itachi,active:[...active],team:s.pairs.map(p=>front(p)?.name),pair:pair?{x:pair.x,y:pair.y}:null,idleCount:idle.length,basicCount:basic.length,jutsuCount:jutsu.length,idleLoaded:await waitLoaded(idle),basicLoaded:await waitLoaded(basic),jutsuLoaded:await waitLoaded(jutsu),crowSheetLoaded,crowSheetSize:{width:crowSheet?.naturalWidth||0,height:crowSheet?.naturalHeight||0},markers:{basic:html.includes('animateItachiCrowStrike'),jutsu:html.includes('animateItachiTsukuyomi'),gauge:html.includes("canonicalUnit('itachi').abilities.jutsu.gauge_reduction??45"),scale:html.includes("name==='Itachi'?1.28:1"),aoe:html.includes('Itachi Tsukuyomi AoE resolution failed'),crowFlock:html.includes('ITACHI_CROW_FLOCK_SHEET')&&html.includes('crow_flock_lightning_sheet.png')&&html.includes('drawItachiCrowSheetFrame'),directionSafe:html.includes('Math.atan2(f.to.y-f.from.y,Math.max(1,Math.abs(f.to.x-f.from.x)))'),redSmoke:html.includes("rgba(150,8,32,"),fullscreenDom:html.includes('ensureItachiTsukuyomiCinematic')&&html.includes('position:fixed;inset:0;width:100vw;height:100dvh'),authoredOverlay:html.includes('ITACHI_TSUKUYOMI_OVERLAY_FRAMES')&&html.includes(".bb-tsu-overlay"),authoredMandala:html.includes('ITACHI_TSUKUYOMI_MANDALA_FRAMES')&&html.includes(".bb-tsu-mandala"),authoredTarget:html.includes('ITACHI_TSUKUYOMI_TARGET_FRAMES')&&html.includes(".bb-tsu-target"),cinematic:html.includes('nightmareAt=1500,impactAt=2600,holdAfterImpact=1200'),canvasTsukuyomiRemoved:!html.includes("f.kind==='itachiTsukuyomiOverlay'")&&!html.includes("f.kind==='itachiTsukuyomiMandala'")&&!html.includes("f.kind==='itachiTsukuyomiNightmare'")&&!html.includes("f.kind==='itachiTsukuyomiTarget'")}};
  });
  if(!contract.registered||!contract.active.includes('Itachi')||!contract.team.includes('Itachi')||contract.idleCount!==6||contract.basicCount!==6||contract.jutsuCount!==6||!contract.idleLoaded||!contract.basicLoaded||!contract.jutsuLoaded||!contract.crowSheetLoaded||contract.crowSheetSize.width!==1448||contract.crowSheetSize.height!==1086||!contract.markers.basic||!contract.markers.jutsu||!contract.markers.gauge||!contract.markers.scale||!contract.markers.aoe||!contract.markers.crowFlock||!contract.markers.directionSafe||!contract.markers.redSmoke||!contract.markers.fullscreenDom||!contract.markers.authoredOverlay||!contract.markers.authoredMandala||!contract.markers.authoredTarget||!contract.markers.cinematic||!contract.markers.canvasTsukuyomiRemoved)throw new Error(`Itachi battle contract incomplete: ${JSON.stringify(contract)}`);

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
   s.phase='resolve';s.floaters=[];begin();const before=targets.map(target=>({hp:target.hp,gauge:target.gauge})),start=performance.now();window.__bbItachiJutsuSmokeStart=start;let localCanvasTsukuyomi=false,primaryImpactGauge=null,impactGauges=null;
   const outcome=await new Promise(resolve=>{
    const sample=setInterval(()=>{localCanvasTsukuyomi||=s.floaters.some(f=>String(f?.kind||'').startsWith('itachiTsukuyomi'))},25);
    animate('Itachi',{x:pair.x,y:pair.y},enemy,()=>{
      window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:1});
      window.BlazingCombatRuntime.execute('reduce_target_gauge',{target:enemy,parameters:{amount:canonical('itachi').abilities.jutsu.gauge_reduction??45,minimum_gauge:0}});
      primaryImpactGauge=enemy.gauge;
      setTimeout(()=>{impactGauges=targets.map(target=>target.gauge)},0);
    },()=>{clearInterval(sample);resolve({elapsed:performance.now()-start})});
    setTimeout(()=>{clearInterval(sample);resolve({timeout:true,elapsed:performance.now()-start})},7000);
   });
   const root=document.getElementById('bb-itachi-tsukuyomi-cinematic');
   return {...outcome,before,after:targets.map(target=>({hp:target.hp,gauge:target.gauge})),primaryImpactGauge,impactGauges,localCanvasTsukuyomi,dim:!!s.jutsuDim,domStillActive:!!root?.classList.contains('bb-active')};
  });

  await page.waitForFunction(()=>{
    const root=document.getElementById('bb-itachi-tsukuyomi-cinematic'),overlay=root?.querySelector('.bb-tsu-overlay'),mandala=root?.querySelector('.bb-tsu-mandala');
    return root?.classList.contains('bb-active')&&overlay?.complete&&overlay.naturalWidth>0&&mandala?.complete&&mandala.naturalWidth>0;
  },null,{timeout:3000});
  const takeover=await page.evaluate(()=>{
    const root=document.getElementById('bb-itachi-tsukuyomi-cinematic'),rect=root?.getBoundingClientRect(),style=root?getComputedStyle(root):null;
    const overlay=root?.querySelector('.bb-tsu-overlay'),mandala=root?.querySelector('.bb-tsu-mandala'),target=root?.querySelector('.bb-tsu-target');
    return {active:!!root?.classList.contains('bb-active'),position:style?.position||'',width:rect?.width||0,height:rect?.height||0,viewportW:innerWidth,viewportH:innerHeight,phase:root?.dataset.phase||'',overlay:overlay?.getAttribute('src')||'',mandala:mandala?.getAttribute('src')||'',target:target?.getAttribute('src')||''};
  });
  if(!takeover.active||takeover.position!=='fixed'||takeover.width<takeover.viewportW*.98||takeover.height<takeover.viewportH*.98||!takeover.overlay.includes('/tsukuyomi/overlay/')||!takeover.mandala.includes('/tsukuyomi/mandala/'))throw new Error(`Tsukuyomi did not take over full viewport with authored assets: ${JSON.stringify(takeover)}`);

  if(name==='chromium'){
    for(const [at,label,phase] of [[1050,'ritual','ritual'],[1800,'nightmare','nightmare'],[2850,'impact','impact']]){
      await page.waitForFunction(target=>window.__bbItachiJutsuSmokeStart&&performance.now()-window.__bbItachiJutsuSmokeStart>=target,at,{timeout:5500});
      await page.waitForFunction(expected=>document.getElementById('bb-itachi-tsukuyomi-cinematic')?.dataset.phase===expected,phase,{timeout:1500});
      if(phase==='impact'){
        await page.waitForFunction(()=>{const img=document.querySelector('#bb-itachi-tsukuyomi-cinematic .bb-tsu-target');return img?.complete&&img.naturalWidth>0},{timeout:1800});
        const targetSrc=await page.locator('#bb-itachi-tsukuyomi-cinematic .bb-tsu-target').getAttribute('src');
        if(!String(targetSrc||'').includes('/tsukuyomi/target/'))throw new Error(`Tsukuyomi impact did not use authored target frames: ${targetSrc}`);
      }
      await page.screenshot({path:`test-artifacts/itachi-tsukuyomi-${label}-${name}.png`});
    }
  }
  const jutsuResult=await jutsuPromise;
  const expectedGauge=35;
  const aoeDamaged=jutsuResult.after?.every((state,index)=>state.hp<jutsuResult.before[index].hp);
  const gaugesAtImpact=jutsuResult.primaryImpactGauge===expectedGauge&&Array.isArray(jutsuResult.impactGauges)&&jutsuResult.impactGauges.every(value=>value<=expectedGauge);
  if(jutsuResult.error||jutsuResult.timeout||jutsuResult.localCanvasTsukuyomi||jutsuResult.domStillActive||!aoeDamaged||!gaugesAtImpact||jutsuResult.elapsed<3700)throw new Error(`Tsukuyomi failed: ${JSON.stringify(jutsuResult)}`);
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Itachi battle smoke PASS (${name}): authored 8-frame crow flock sheet plus full-viewport Tsukuyomi overlay/mandala/target cinematic, AoE damage, and 45 gauge suppression verified.`);
  await context.close();
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
 let passed=false;
 for(let attempt=1;attempt<=2;attempt++){
  try{
   await run(name,type);
   passed=true;
   break;
  }catch(error){
   const message=String(error?.stack||error?.message||error);
   const transient=/Target page, context or browser has been closed|browser has been closed|context has been closed/i.test(message);
   if(transient&&attempt<2){
    console.warn(`Itachi battle smoke transient browser-close (${name}), retrying once...`);
    continue;
   }
   console.error(`Itachi battle smoke FAIL (${name}): ${message}`);
   break;
  }
 }
 if(!passed)failed=true;
}
if(failed)process.exit(1);
