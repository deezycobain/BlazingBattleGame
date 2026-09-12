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
    const paint=scene?.querySelector('.bb-paint-stage-vfx');
    const orbit=scene?.querySelector('.bb-spin-orbit');
    const art=scene?.querySelector('.bb-card-front .summonedTradingCard');
    const message=document.getElementById('pullMessage');
    const orbitAnimation=orbit?.getAnimations?.()[0];
    return {
      stage:scene?.dataset.bbPaintStage||'',
      running:scene?.classList.contains('bb-cinematic-running')||false,
      strokes:scene?.querySelectorAll('.bb-paint-stroke').length||0,
      echoes:scene?.querySelectorAll('.bb-paint-stroke-echo').length||0,
      accents:scene?.querySelectorAll('.bb-paint-accent').length||0,
      cardOpacity:flipper?Number.parseFloat(getComputedStyle(flipper).opacity):null,
      cardAnimation:flipper?getComputedStyle(flipper).animationName:'',
      paintOpacity:paint?Number.parseFloat(getComputedStyle(paint).opacity):null,
      orbitOpacity:orbit?Number.parseFloat(getComputedStyle(orbit).opacity):null,
      orbitAnimation:orbit?getComputedStyle(orbit).animationName:'',
      orbitStart:Number.isFinite(orbitAnimation?.startTime)?orbitAnimation.startTime:null,
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
    if(runtime.version!=='4.0.0'||runtime.timeline?.resonance?.done!==2150||runtime.timeline?.resonance?.flip!==1550)throw new Error(`unexpected cinematic contract: ${JSON.stringify(runtime)}`);

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

    const paint=await waitStage(page,'paint');
    if(paint.strokes!==2||paint.echoes!==0||paint.accents!==0)throw new Error(`paint layer count is not exactly two: ${JSON.stringify(paint)}`);
    if(paint.cardOpacity!==0||paint.orbitOpacity!==0)throw new Error(`card/circle leaked into paint beat: ${JSON.stringify(paint)}`);

    const slow=await waitStage(page,'circle-slow');
    await page.waitForTimeout(110);
    const slowMoving=await stageState(page);
    if(slow.cardOpacity!==0||slow.paintOpacity!==0||slowMoving.orbitAnimation!=='bbCircleCharge'||slowMoving.orbitOpacity<=0)throw new Error(`slow charge is not isolated: ${JSON.stringify({slow,slowMoving})}`);

    const fast=await waitStage(page,'circle-fast');
    await page.waitForTimeout(110);
    const fastMoving=await stageState(page);
    if(fast.cardOpacity!==0||fast.paintOpacity!==0||fastMoving.orbitAnimation!=='bbCircleCharge'||fastMoving.orbitOpacity<=slowMoving.orbitOpacity)throw new Error(`circle did not accelerate cleanly before card entry: ${JSON.stringify({slowMoving,fast,fastMoving})}`);
    if(slowMoving.orbitStart!==null&&fastMoving.orbitStart!==null&&Math.abs(slowMoving.orbitStart-fastMoving.orbitStart)>2)throw new Error(`circle animation restarted between slow/fast stages: ${JSON.stringify({slowMoving,fastMoving})}`);

    await waitStage(page,'card-enter');
    await page.waitForTimeout(90);
    const card=await stageState(page);
    if(card.cardOpacity<.5||card.cardAnimation!=='bbCardBackEnter'||card.paintOpacity!==0)throw new Error(`card back did not materialize cleanly: ${JSON.stringify(card)}`);

    await waitStage(page,'flip');
    await page.waitForTimeout(90);
    const flip=await stageState(page);
    const flipFrames=await page.locator('#pullScene .bb-card-flipper').evaluate(node=>node.getAnimations()[0]?.effect?.getKeyframes?.().map(frame=>frame.transform)||[]);
    if(flip.cardAnimation!=='bbPhysicalCardFlip'||flip.artOpacity!==1)throw new Error(`single flip did not reveal fighter front: ${JSON.stringify(flip)}`);
    if(!flipFrames.some(value=>String(value).includes('180deg'))||flipFrames.some(value=>/rotateY\((?:[2-9]\d\d|\d{4,})deg\)/.test(String(value))))throw new Error(`flip is not one 180-degree action: ${JSON.stringify(flipFrames)}`);

    const resolve=await waitStage(page,'resolve');
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
    const expectedStages=['paint','circle-slow','circle-fast','card-enter','flip','resolve','done'];
    if(JSON.stringify(trace.map(item=>item.stage))!==JSON.stringify(expectedStages))throw new Error(`stage order changed: ${JSON.stringify(trace)}`);
    const paintAt=trace[0].at;
    const ranges={paint:[0,20],'circle-slow':[620,780],'circle-fast':[970,1130],'card-enter':[1270,1430],flip:[1470,1630],resolve:[1870,2030],done:[2070,2230]};
    for(const item of trace){const elapsed=item.at-paintAt,[min,max]=ranges[item.stage];if(elapsed<min||elapsed>max)throw new Error(`${item.stage} timing outside ${min}-${max}ms after paint: ${JSON.stringify(trace)}`)}

    await page.locator('#nextPullBtn').evaluate(button=>button.click());
    await page.locator('#pullResultsGrid .pullCard').first().waitFor({state:'visible',timeout:3000});
    if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
    console.log(`Summon cinematic browser smoke PASS (${name}): two strokes, isolated continuous charge, hidden card, one 180-degree flip, 2.15s resolve, and results flow verified.`);
  }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Summon cinematic browser smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
