import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingSummonCinematic==='object'&&typeof window.BlazingProgression==='object'&&typeof window.BlazingUnitProgression==='object',{timeout:30000});
  await page.waitForTimeout(180);
}

async function stageState(page){
  return page.evaluate(()=>{
    const scene=document.getElementById('pullScene');
    const flipper=scene?.querySelector('.bb-card-flipper');
    const portal=scene?.querySelector('.bb-summon-portal');
    const charge=scene?.querySelector('.bb-portal-ring-charge');
    const resolveFlash=scene?.querySelector('.bb-portal-resolve-flash');
    const art=scene?.querySelector('.bb-card-front .summonedTradingCard');
    const message=document.getElementById('pullMessage');
    const chargeAnimation=charge?.getAnimations?.()[0];
    const bounds=node=>{if(!node)return null;const box=node.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height,centerX:box.left+box.width/2,centerY:box.top+box.height/2}};
    return {
      stage:scene?.dataset.bbRevealStage||'',running:scene?.classList.contains('bb-cinematic-running')||false,
      vfxLayers:scene?.querySelectorAll('.bb-portal-stage-vfx img,.bb-portal-charge-vfx img').length||0,
      portalLayers:scene?.querySelectorAll('.bb-summon-portal').length||0,chargeLayers:scene?.querySelectorAll('.bb-portal-ring-charge').length||0,resolveLayers:scene?.querySelectorAll('.bb-portal-resolve-flash').length||0,
      forbiddenLayers:scene?.querySelectorAll('.bb-paint-stroke,.bb-paint-accent,.bb-portal-ring-outer,.bb-portal-ring-energy,.bb-portal-impact,.bb-flip-afterimage,.bb-resolve-particles').length||0,
      cardOpacity:flipper?Number.parseFloat(getComputedStyle(flipper).opacity):null,cardAnimation:flipper?getComputedStyle(flipper).animationName:'',
      portalOpacity:portal?Number.parseFloat(getComputedStyle(portal).opacity):null,chargeOpacity:charge?Number.parseFloat(getComputedStyle(charge).opacity):null,
      chargeAnimation:charge?getComputedStyle(charge).animationName:'',chargeStart:Number.isFinite(chargeAnimation?.startTime)?chargeAnimation.startTime:null,
      resolveOpacity:resolveFlash?Number.parseFloat(getComputedStyle(resolveFlash).opacity):null,resolveAnimation:resolveFlash?getComputedStyle(resolveFlash).animationName:'',
      viewport:{width:innerWidth,height:innerHeight},cardBounds:bounds(scene?.querySelector('#pullCardWrap')),portalBounds:bounds(portal),chargeBounds:bounds(charge),resolveBounds:bounds(resolveFlash),
      artOpacity:art?Number.parseFloat(getComputedStyle(art).opacity):null,messageOpacity:message?Number.parseFloat(getComputedStyle(message).opacity):null,message:message?.textContent?.trim()||''
    };
  });
}

async function waitStage(page,stage){
  await page.waitForFunction(expected=>document.getElementById('pullScene')?.dataset.bbRevealStage===expected,stage,{timeout:5000});
  return stageState(page);
}

function assertCentered(label,box,card,viewport){
  if(!box||!card||box.left<0||box.right>viewport.width||Math.abs(box.centerX-card.centerX)>2||Math.abs(box.centerY-card.centerY)>2)throw new Error(`${label} is not compact and card-centered: ${JSON.stringify({box,card,viewport})}`);
}

async function run(name,type){
  let browser;
  try{
    console.log(`Summon cinematic browser smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:true});
    const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);

    await page.locator('#bbHomeApproved [data-nav="summon"]').click();
    await page.locator('#summonScreen.active #singleSummonBtn').waitFor({state:'visible'});
    const runtime=await page.evaluate(()=>({version:window.BlazingSummonCinematic?.version,timeline:window.BlazingSummonCinematic?.timeline,vfx:window.BlazingSummonCinematic?.vfx}));
    if(runtime.version!=='5.2.0'||runtime.timeline?.resonance?.done!==2120||runtime.timeline?.resonance?.cardEnter!==1300||runtime.timeline?.resonance?.flip!==1500)throw new Error(`unexpected cinematic contract: ${JSON.stringify(runtime)}`);
    if(Object.keys(runtime.vfx||{}).join(',')!=='portal,chargeRing,resolveFlash')throw new Error(`summon VFX was not reduced to three assets: ${JSON.stringify(runtime.vfx)}`);

    await page.evaluate(()=>{
      const scene=document.getElementById('pullScene');window.__bbSummonTrace=[];window.__bbSummonTraceStart=performance.now();window.__bbSummonObserver?.disconnect?.();
      window.__bbSummonObserver=new MutationObserver(()=>{const stage=scene?.dataset.bbRevealStage||'',trace=window.__bbSummonTrace;if(stage&&trace.at(-1)?.stage!==stage)trace.push({stage,at:performance.now()-window.__bbSummonTraceStart})});
      if(scene)window.__bbSummonObserver.observe(scene,{attributes:true,attributeFilter:['data-bb-reveal-stage']});
    });
    await page.locator('#singleSummonBtn').click();

    await waitStage(page,'portal');await page.waitForTimeout(90);const portal=await stageState(page);
    if(portal.vfxLayers!==3||portal.portalLayers!==1||portal.chargeLayers!==1||portal.resolveLayers!==1||portal.forbiddenLayers!==0)throw new Error(`simplified VFX layer contract changed: ${JSON.stringify(portal)}`);
    if(portal.cardOpacity!==0||portal.portalOpacity<=0||portal.chargeOpacity!==0||portal.resolveOpacity!==0)throw new Error(`portal beat is not isolated: ${JSON.stringify(portal)}`);
    assertCentered('portal',portal.portalBounds,portal.cardBounds,portal.viewport);assertCentered('charge ring',portal.chargeBounds,portal.cardBounds,portal.viewport);assertCentered('resolve flash',portal.resolveBounds,portal.cardBounds,portal.viewport);

    const slow=await waitStage(page,'circle-slow');await page.waitForTimeout(100);const slowMoving=await stageState(page);
    if(slow.cardOpacity!==0||slowMoving.chargeAnimation!=='bbChargeAccelerate'||slowMoving.chargeOpacity<=0)throw new Error(`slow charge is not isolated: ${JSON.stringify({slow,slowMoving})}`);
    const fast=await waitStage(page,'circle-fast');await page.waitForTimeout(100);const fastMoving=await stageState(page);
    if(fast.cardOpacity!==0||fastMoving.chargeAnimation!=='bbChargeAccelerate'||fastMoving.chargeOpacity<=0)throw new Error(`circle did not accelerate before card entry: ${JSON.stringify({fast,fastMoving})}`);
    if(slowMoving.chargeStart!==null&&fastMoving.chargeStart!==null&&Math.abs(slowMoving.chargeStart-fastMoving.chargeStart)>2)throw new Error(`charge ring restarted between slow/fast stages: ${JSON.stringify({slowMoving,fastMoving})}`);
    const chargeFrames=await page.locator('#pullScene .bb-portal-ring-charge').evaluate(node=>node.getAnimations()[0]?.effect?.getKeyframes?.().map(frame=>frame.transform)||[]);
    if(!chargeFrames.some(value=>String(value).includes('46deg'))||!chargeFrames.some(value=>String(value).includes('230deg')))throw new Error(`charge animation lost authored slow-to-fast curve: ${JSON.stringify(chargeFrames)}`);

    await waitStage(page,'card-enter');await page.waitForTimeout(80);const card=await stageState(page);
    if(card.cardOpacity<.5||card.cardAnimation!=='bbCardBackEnter'||card.portalOpacity>0.05||card.chargeOpacity>0.05)throw new Error(`card back did not materialize after charge cleared: ${JSON.stringify(card)}`);
    await waitStage(page,'flip');await page.waitForTimeout(240);const flip=await stageState(page);
    const flipFrames=await page.locator('#pullScene .bb-card-flipper').evaluate(node=>node.getAnimations()[0]?.effect?.getKeyframes?.().map(frame=>frame.transform)||[]);
    if(flip.cardAnimation!=='bbPhysicalCardFlip'||flip.artOpacity!==1)throw new Error(`single flip did not reveal fighter front: ${JSON.stringify(flip)}`);
    if(!flipFrames.some(value=>String(value).includes('180deg'))||flipFrames.some(value=>/rotateY\((?:[2-9]\d\d|\d{4,})deg\)/.test(String(value))))throw new Error(`flip is not one 180-degree action: ${JSON.stringify(flipFrames)}`);

    await waitStage(page,'resolve');await page.waitForTimeout(55);const resolve=await stageState(page);
    if(resolve.resolveAnimation!=='bbResolveFlash'||resolve.resolveOpacity<=0||resolve.messageOpacity>0.05)throw new Error(`resolve was not a single restrained flash before text: ${JSON.stringify(resolve)}`);
    await waitStage(page,'done');await page.waitForTimeout(40);const settled=await stageState(page);
    if(settled.running||settled.artOpacity!==1||settled.messageOpacity<.9||!settled.message)throw new Error(`reveal did not resolve cleanly: ${JSON.stringify(settled)}`);

    const labels=await page.evaluate(()=>({name:document.querySelector('.bb-card-nameplate')?.textContent?.trim()||'',rarity:document.querySelector('.bb-card-rarityplate')?.textContent?.trim()||'',copyDisplay:document.querySelector('.bb-card-front .pullCardMeta')?getComputedStyle(document.querySelector('.bb-card-front .pullCardMeta')).display:'missing'}));
    if(!labels.name||!labels.rarity||labels.copyDisplay!=='none')throw new Error(`front labels/copy overlay incorrect: ${JSON.stringify(labels)}`);
    const trace=await page.evaluate(()=>window.__bbSummonTrace),expectedStages=['portal','circle-slow','circle-fast','card-enter','flip','resolve','done'];
    if(JSON.stringify(trace.map(item=>item.stage))!==JSON.stringify(expectedStages))throw new Error(`stage order changed: ${JSON.stringify(trace)}`);
    const portalAt=trace[0].at,ranges={portal:[0,25],'circle-slow':[500,700],'circle-fast':[900,1100],'card-enter':[1200,1400],flip:[1400,1600],resolve:[1800,2000],done:[2020,2220]};
    for(const item of trace){const elapsed=item.at-portalAt,[min,max]=ranges[item.stage];if(elapsed<min||elapsed>max)throw new Error(`${item.stage} timing outside ${min}-${max}ms after portal: ${JSON.stringify(trace)}`)}

    await page.locator('#nextPullBtn').evaluate(button=>button.click());await page.locator('#pullResultsGrid .pullCard').first().waitFor({state:'visible',timeout:3000});
    if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
    console.log(`Summon cinematic browser smoke PASS (${name}): no brush layers, centered portal, one accelerating ring, one 180-degree flip, one resolve flash, 2.12s timing, and results flow verified.`);
  }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){try{await run(name,type)}catch(error){failed=true;console.error(`Summon cinematic browser smoke FAIL (${name}): ${error.stack||error.message}`)}}
if(failed)process.exit(1);
