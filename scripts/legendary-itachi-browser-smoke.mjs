import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};
const EXPECTED_STAGES=['ignite','rings','orbit','stop','silhouette','reveal','settle','handoff'];
const EXPECTED_TIMES={ignite:0,rings:800,orbit:1700,stop:2550,silhouette:3050,reveal:3420,settle:3900,handoff:5200};

async function waitHome(page){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingSummonCinematic==='object'&&typeof window.BlazingProgression==='object',{timeout:30000});
  await page.waitForTimeout(180);
}

async function run(name,type){
  let browser;
  try{
    console.log(`Legendary Itachi summon smoke START (${name}) -> ${BASE}`);
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
    await page.locator('#bbTestLegendaryItachi').waitFor({state:'visible',timeout:8000});

    const contract=await page.evaluate(()=>({
      version:window.BlazingSummonCinematic?.version,
      timeline:window.BlazingSummonCinematic?.timeline?.itachi,
      itachiVfx:window.BlazingSummonCinematic?.itachiVfx,
      hasTestHook:typeof window.BlazingSummonCinematic?.testItachi==='function',
      styleHref:document.querySelector('link[data-bb-itachi-summon]')?.getAttribute('href')||''
    }));
    if(contract.version!=='5.8.0-itachi')throw new Error(`wrong runtime version: ${JSON.stringify(contract)}`);
    if(JSON.stringify(contract.timeline)!==JSON.stringify(EXPECTED_TIMES))throw new Error(`Itachi timeline contract changed: ${JSON.stringify(contract.timeline)}`);
    if(Object.keys(contract.itachiVfx||{}).length!==12)throw new Error(`expected 12 Itachi VFX mappings: ${JSON.stringify(contract.itachiVfx)}`);
    if(!contract.hasTestHook||!contract.styleHref.includes('legendary-itachi-summon.css'))throw new Error(`Itachi test/style hook missing: ${JSON.stringify(contract)}`);

    await page.evaluate(()=>{
      const scene=document.getElementById('pullScene');
      window.__bbItachiTrace=[];
      window.__bbItachiTraceStart=0;
      window.__bbItachiObserver?.disconnect?.();
      window.__bbItachiObserver=new MutationObserver(()=>{
        const stage=scene?.dataset.bbItachiStage||'';
        if(!['ignite','rings','orbit','stop','silhouette','reveal','settle','handoff'].includes(stage))return;
        const trace=window.__bbItachiTrace;
        const now=performance.now();
        if(stage==='ignite'&&!window.__bbItachiTraceStart)window.__bbItachiTraceStart=now;
        if(trace.at(-1)?.stage!==stage)trace.push({stage,at:window.__bbItachiTraceStart?now-window.__bbItachiTraceStart:0});
      });
      if(scene)window.__bbItachiObserver.observe(scene,{attributes:true,attributeFilter:['data-bb-itachi-stage']});
    });

    await page.locator('#bbTestLegendaryItachi').click();
    await page.waitForFunction(()=>document.getElementById('pullScene')?.dataset.bbSpecialReveal==='itachi',{timeout:5000});
    await page.waitForFunction(()=>document.getElementById('pullScene')?.dataset.bbItachiStage==='ignite',{timeout:10000});

    const loaded=await page.evaluate(()=>{
      const scene=document.getElementById('pullScene');
      const images=[...scene.querySelectorAll('.bb-itachi-stage-vfx img')];
      const generic=['.bb-portal-stage-vfx','.bb-portal-charge-vfx','.bb-card-stage-vfx'].map(selector=>{
        const node=scene.querySelector(selector);return node?getComputedStyle(node).display:'missing';
      });
      const art=scene.querySelector('.bb-card-front .summonedTradingCard');
      return {
        count:images.length,
        bad:images.filter(img=>!img.complete||!img.naturalWidth||img.classList.contains('bb-vfx-missing')).map(img=>img.getAttribute('src')),
        sources:images.map(img=>img.getAttribute('src')),
        generic,
        revealStage:scene.dataset.bbRevealStage||'',
        revealKind:scene.dataset.bbRevealKind||'',
        cardArt:art?.getAttribute('src')||''
      };
    });
    if(loaded.count!==12||loaded.bad.length)throw new Error(`Itachi VFX failed to load: ${JSON.stringify(loaded)}`);
    if(loaded.generic.some(display=>display!=='none'))throw new Error(`generic summon VFX leaked into Itachi reveal: ${JSON.stringify(loaded.generic)}`);
    if(loaded.revealStage!=='itachi'||loaded.revealKind!=='itachi'||!loaded.cardArt.endsWith('itachi_reveal.webp'))throw new Error(`Itachi cinematic did not own the reveal: ${JSON.stringify(loaded)}`);

    for(const stage of EXPECTED_STAGES.slice(1)){
      await page.waitForFunction(expected=>document.getElementById('pullScene')?.dataset.bbItachiStage===expected,stage,{timeout:7000});
    }
    await page.waitForFunction(()=>document.getElementById('pullScene')?.dataset.bbRevealStage==='done',{timeout:3000});
    await page.waitForTimeout(80);

    const final=await page.evaluate(()=>{
      const scene=document.getElementById('pullScene'),flipper=scene.querySelector('.bb-card-flipper'),message=document.getElementById('pullMessage');
      return {
        trace:window.__bbItachiTrace,
        special:scene.dataset.bbSpecialReveal||'',
        itachiStage:scene.dataset.bbItachiStage||'',
        revealStage:scene.dataset.bbRevealStage||'',
        running:scene.classList.contains('bb-cinematic-running')||scene.classList.contains('bb-itachi-running'),
        cardOpacity:Number.parseFloat(getComputedStyle(flipper).opacity),
        cardTransform:getComputedStyle(flipper).transform,
        message:message?.textContent?.trim()||'',
        name:scene.querySelector('.bb-card-nameplate')?.textContent?.trim()||'',
        rarity:scene.querySelector('.bb-card-rarityplate')?.textContent?.trim()||''
      };
    });
    if(JSON.stringify(final.trace.map(item=>item.stage))!==JSON.stringify(EXPECTED_STAGES))throw new Error(`Itachi stage order changed: ${JSON.stringify(final.trace)}`);
    for(const item of final.trace){
      const expected=EXPECTED_TIMES[item.stage],tolerance=item.stage==='ignite'?120:220;
      if(Math.abs(item.at-expected)>tolerance)throw new Error(`${item.stage} timing drifted from ${expected}ms: ${JSON.stringify(final.trace)}`);
    }
    if(final.special!=='itachi'||final.itachiStage!=='handoff'||final.revealStage!=='done'||final.running||final.cardOpacity<.95)throw new Error(`Itachi handoff did not settle: ${JSON.stringify(final)}`);
    if(final.message!=='LEGENDARY ITACHI'||final.name!=='ITACHI'||final.rarity!=='LEGENDARY')throw new Error(`Itachi final labels are wrong: ${JSON.stringify(final)}`);

    await page.locator('#nextPullBtn').evaluate(button=>button.click());
    const result=page.locator('#pullResultsGrid .pullCard').first();
    await result.waitFor({state:'visible',timeout:4000});
    const resultState=await result.evaluate(card=>({legendary:card.classList.contains('bb-legendary-itachi-result'),kind:card.dataset.bbRevealKind||'',text:card.textContent||''}));
    if(!resultState.legendary||resultState.kind!=='itachi')throw new Error(`Itachi result card lost its special treatment: ${JSON.stringify(resultState)}`);
    if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);

    console.log(`Legendary Itachi summon smoke PASS (${name}): 12 assets, 8 timed beats, special-only VFX, 5.2s handoff, and result treatment verified.`);
  }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Legendary Itachi summon smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
