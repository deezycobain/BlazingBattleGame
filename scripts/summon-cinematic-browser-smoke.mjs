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
    const outerRing=scene?.querySelector('.bb-portal-ring-outer');
    const energyRing=scene?.querySelector('.bb-portal-ring-energy');
    const impact=scene?.querySelector('.bb-portal-impact');
    const afterimage=scene?.querySelector('.bb-flip-afterimage');
    const resolveFlash=scene?.querySelector('.bb-portal-resolve-flash');
    const resolveParticles=scene?.querySelector('.bb-resolve-particles');
    const art=scene?.querySelector('.bb-card-front .summonedTradingCard');
    const message=document.getElementById('pullMessage');
    const outerAnimation=outerRing?.getAnimations?.()[0];
    const energyAnimation=energyRing?.getAnimations?.()[0];
    const bounds=node=>{if(!node)return null;const box=node.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height,centerX:box.left+box.width/2,centerY:box.top+box.height/2}};
    const cardBounds=bounds(scene?.querySelector('#pullCardWrap'));
    return {
      stage:scene?.dataset.bbPaintStage||'',
      running:scene?.classList.contains('bb-cinematic-running')||false,
      portalLayers:scene?.querySelectorAll('.bb-summon-portal').length||0,
      ringLayers:scene?.querySelectorAll('.bb-portal-ring').length||0,
      resolveLayers:scene?.querySelectorAll('.bb-portal-resolve-flash').length||0,
      transitionLayers:scene?.querySelectorAll('.bb-portal-impact,.bb-flip-afterimage,.bb-resolve-particles').length||0,
      cardOpacity:flipper?Number.parseFloat(getComputedStyle(flipper).opacity):null,
      cardAnimation:flipper?getComputedStyle(flipper).animationName:'',
      portalOpacity:portal?Number.parseFloat(getComputedStyle(portal).opacity):null,
      outerOpacity:outerRing?Number.parseFloat(getComputedStyle(outerRing).opacity):null,
      energyOpacity:energyRing?Number.parseFloat(getComputedStyle(energyRing).opacity):null,
      impactOpacity:impact?Number.parseFloat(getComputedStyle(impact).opacity):null,
      afterimageOpacity:afterimage?Number.parseFloat(getComputedStyle(afterimage).opacity):null,
      resolveOpacity:resolveFlash?Number.parseFloat(getComputedStyle(resolveFlash).opacity):null,
      particlesOpacity:resolveParticles?Number.parseFloat(getComputedStyle(resolveParticles).opacity):null,
      outerAnimation:outerRing?getComputedStyle(outerRing).animationName:'',
      energyAnimation:energyRing?getComputedStyle(energyRing).animationName:'',
      impactAnimation:impact?getComputedStyle(impact).animationName:'',
      afterimageAnimation:afterimage?getComputedStyle(afterimage).animationName:'',
      resolveAnimation:resolveFlash?getComputedStyle(resolveFlash).animationName:'',
      particlesAnimation:resolveParticles?getComputedStyle(resolveParticles).animationName:'',
      outerStart:Number.isFinite(outerAnimation?.startTime)?outerAnimation.startTime:null,
      energyStart:Number.isFinite(energyAnimation?.startTime)?energyAnimation.startTime:null,
      viewport:{width:innerWidth,height:innerHeight},
      cardBounds,
      portalBounds:bounds(portal),
      outerBounds:bounds(outerRing),
      energyBounds:bounds(energyRing),
      artOpacity:art?Number.parseFloat(getComputedStyle(art).opacity):null,
      messageOpacity:message?Number.parseFloat(getComputedStyle(message).opacity):null,
      message:message?.textContent?.trim()||''
    };
  });
}

async function waitStage(page,stage){
  await page.waitForFunction(expected=>document.getElementById('pullScene')?.dataset.bbPaintStage===expected,stage,{timeout:5000});
  return stageState(page);
}

async function run(name,type){
  let browser;
  try{
    console.log(`Summon cinematic browser smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:true});
    const page=await context.newPage();
    page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);

    await page.locator('#bbHomeApproved [data-nav="summon"]').click();
    await page.locator('#summonScreen.active #singleSummonBtn').waitFor({state:'visible'});
    const runtime=await page.evaluate(()=>({version:window.BlazingSummonCinematic?.version,timeline:window.BlazingSummonCinematic?.timeline}));
    if(runtime.version!=='5.1.0'||runtime.timeline?.resonance?.done!==2240||runtime.timeline?.resonance?.flip!==1580)throw new Error(`unexpected cinematic contract: ${JSON.stringify(runtime)}`);

    await page.evaluate(()=>{
      const scene=document.getElementById('pullScene');
      window.__bbSummonTrace=[];
      window.__bbSummonTraceStart=performance.now();
      window.__bbSummonObserver?.disconnect?.();
      window.__bbSummonObserver=new MutationObserver(()=>{
        const stage=scene?.dataset.bbPaintStage||'';
        const trace=window.__bbSummonTrace;
        if(stage&&trace.at(-1)?.stage!==stage)trace.push({stage,at:performance.now()-window.__bbSummonTraceStart});
      });
      if(scene)window.__bbSummonObserver.observe(scene,{attributes:true,attributeFilter:['data-bb-paint-stage']});
    });
    await page.locator('#singleSummonBtn').click();

    await waitStage(page,'portal');
    await page.waitForTimeout(90);
    const portal=await stageState(page);
    if(portal.portalLayers!==1||portal.ringLayers!==2||portal.resolveLayers!==1||portal.transitionLayers!==3)throw new Error(`phase-isolated portal layer contract changed: ${JSON.stringify(portal)}`);
    if(portal.cardOpacity!==0||portal.portalOpacity<=0||portal.outerOpacity!==0||portal.energyOpacity!==0)throw new Error(`portal beat is not isolated: ${JSON.stringify(portal)}`);
    for(const [label,box] of Object.entries({portal:portal.portalBounds,outer:portal.outerBounds,energy:portal.energyBounds})){
      if(!box||box.left<0||box.right>portal.viewport.width||Math.abs(box.centerX-portal.cardBounds.centerX)>2||Math.abs(box.centerY-portal.cardBounds.centerY)>2)throw new Error(`${label} VFX is not compact and card-centered: ${JSON.stringify({box,card:portal.cardBounds,viewport:portal.viewport})}`);
    }

    const slow=await waitStage(page,'circle-slow');
    await page.waitForTimeout(110);
    const slowMoving=await stageState(page);
    if(slow.cardOpacity!==0||slowMoving.outerAnimation!=='bbPortalRingOuter'||slowMoving.energyAnimation!=='bbPortalRingEnergy'||slowMoving.outerOpacity<=0)throw new Error(`slow charge is not isolated: ${JSON.stringify({slow,slowMoving})}`);

    const fast=await waitStage(page,'circle-fast');
    await page.waitForTimeout(110);
    const fastMoving=await stageState(page);
    if(fast.cardOpacity!==0||fastMoving.outerAnimation!=='bbPortalRingOuter'||fastMoving.energyAnimation!=='bbPortalRingEnergy'||fastMoving.energyOpacity<=0)throw new Error(`circle did not accelerate cleanly before card entry: ${JSON.stringify({slowMoving,fast,fastMoving})}`);
    if(slowMoving.outerStart!==null&&fastMoving.outerStart!==null&&Math.abs(slowMoving.outerStart-fastMoving.outerStart)>2)throw new Error(`outer ring restarted between slow/fast stages: ${JSON.stringify({slowMoving,fastMoving})}`);
    if(slowMoving.energyStart!==null&&fastMoving.energyStart!==null&&Math.abs(slowMoving.energyStart-fastMoving.energyStart)>2)throw new Error(`energy ring restarted between slow/fast stages: ${JSON.stringify({slowMoving,fastMoving})}`);
    for(const [label,box] of Object.entries({outer:fastMoving.outerBounds,energy:fastMoving.energyBounds})){
      if(!box||box.left<0||box.right>fastMoving.viewport.width||Math.abs(box.centerX-fastMoving.cardBounds.centerX)>2||Math.abs(box.centerY-fastMoving.cardBounds.centerY)>2)throw new Error(`${label} charge left the centered mobile corridor: ${JSON.stringify({box,card:fastMoving.cardBounds,viewport:fastMoving.viewport})}`);
    }
    await page.waitForTimeout(165);
    const peakBridge=await stageState(page);
    if(peakBridge.stage!=='circle-fast'||peakBridge.impactAnimation!=='bbPortalImpact'||peakBridge.impactOpacity<=0)throw new Error(`impact did not bridge peak charge into the card: ${JSON.stringify(peakBridge)}`);

    await waitStage(page,'card-enter');
    await page.waitForTimeout(90);
    const card=await stageState(page);
    if(card.cardOpacity<.5||card.cardAnimation!=='bbCardBackEnter'||card.outerOpacity>0.05||card.energyOpacity>0.05)throw new Error(`card back did not materialize after charge cleared: ${JSON.stringify(card)}`);

    await waitStage(page,'flip');
    await page.waitForTimeout(90);
    const flip=await stageState(page);
    const flipFrames=await page.locator('#pullScene .bb-card-flipper').evaluate(node=>node.getAnimations()[0]?.effect?.getKeyframes?.().map(frame=>frame.transform)||[]);
    if(flip.cardAnimation!=='bbPhysicalCardFlip'||flip.artOpacity!==1||flip.afterimageAnimation!=='bbFlipAfterimage'||flip.afterimageOpacity<=0)throw new Error(`single supported flip did not reveal fighter front: ${JSON.stringify(flip)}`);
    if(!flipFrames.some(value=>String(value).includes('180deg'))||flipFrames.some(value=>/rotateY\((?:[2-9]\d\d|\d{4,})deg\)/.test(String(value))))throw new Error(`flip is not one 180-degree action: ${JSON.stringify(flipFrames)}`);

    await waitStage(page,'resolve');
    await page.waitForTimeout(55);
    const resolve=await stageState(page);
    if(resolve.resolveAnimation!=='bbPortalResolve'||resolve.resolveOpacity<=0||resolve.particlesAnimation!=='bbResolveParticles'||resolve.particlesOpacity<=0)throw new Error(`resolve accents did not support the settled card: ${JSON.stringify(resolve)}`);
    if(resolve.messageOpacity>0.05)throw new Error(`result text became visible before card settled: ${JSON.stringify(resolve)}`);
    const done=await waitStage(page,'done');
    await page.waitForTimeout(40);
    const settled=await stageState(page);
    if(settled.running||settled.artOpacity!==1||settled.messageOpacity<.9||!settled.message)throw new Error(`reveal did not resolve cleanly: ${JSON.stringify({done,settled})}`);

    const labels=await page.evaluate(()=>({
      name:document.querySelector('.bb-card-nameplate')?.textContent?.trim()||'',
      rarity:document.querySelector('.bb-card-rarityplate')?.textContent?.trim()||'',
      copyDisplay:document.querySelector('.bb-card-front .pullCardMeta')?getComputedStyle(document.querySelector('.bb-card-front .pullCardMeta')).display:'missing'
    }));
    if(!labels.name||!labels.rarity||labels.copyDisplay!=='none')throw new Error(`front labels/copy overlay incorrect: ${JSON.stringify(labels)}`);

    const trace=await page.evaluate(()=>window.__bbSummonTrace);
    const expectedStages=['portal','circle-slow','circle-fast','card-enter','flip','resolve','done'];
    if(JSON.stringify(trace.map(item=>item.stage))!==JSON.stringify(expectedStages))throw new Error(`stage order changed: ${JSON.stringify(trace)}`);
    const portalAt=trace[0].at;
    const ranges={portal:[0,20],'circle-slow':[520,680],'circle-fast':[920,1080],'card-enter':[1300,1460],flip:[1500,1660],resolve:[1920,2080],done:[2160,2320]};
    for(const item of trace){const elapsed=item.at-portalAt,[min,max]=ranges[item.stage];if(elapsed<min||elapsed>max)throw new Error(`${item.stage} timing outside ${min}-${max}ms after portal: ${JSON.stringify(trace)}`)}

    await page.locator('#nextPullBtn').evaluate(button=>button.click());
    await page.locator('#pullResultsGrid .pullCard').first().waitFor({state:'visible',timeout:3000});
    if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
    console.log(`Summon cinematic browser smoke PASS (${name}): fluid portal/charge handoff, peak impact, supported 180-degree flip, restrained resolve, 2.24s timing, and results flow verified.`);
  }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Summon cinematic browser smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
