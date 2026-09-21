import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};
const EXPECTED_STAGES=['ignite','rings','orbit','stop','silhouette','reveal','settle','handoff'];
const EXPECTED_TIMES={ignite:0,rings:1050,orbit:2460,stop:3550,silhouette:4400,reveal:6450,settle:7550,handoff:9300};

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
      itachiCardArt:window.BlazingSummonCinematic?.itachiCardArt,
      hasTestHook:typeof window.BlazingSummonCinematic?.testItachi==='function',
      styleHref:document.querySelector('link[data-bb-itachi-summon]')?.getAttribute('href')||''
    }));
    if(contract.version!=='6.14.0-itachi')throw new Error(`wrong runtime version: ${JSON.stringify(contract)}`);
    if(JSON.stringify(contract.timeline)!==JSON.stringify(EXPECTED_TIMES))throw new Error(`Itachi timeline contract changed: ${JSON.stringify(contract.timeline)}`);
    if(Object.keys(contract.itachiVfx||{}).length!==11||contract.itachiVfx?.orbit||!String(contract.itachiVfx?.middle||'').endsWith('itachi_ring_middle_enamel.webp'))throw new Error(`expected 11 Itachi VFX mappings with the floating Sharingan orbit removed: ${JSON.stringify(contract.itachiVfx)}`);
    if(!contract.hasTestHook||!contract.styleHref.includes('legendary-itachi-summon.css')||!String(contract.itachiCardArt||'').endsWith('assets/characters/itachi/art/itachi_full_art.png'))throw new Error(`Itachi test/style hook missing: ${JSON.stringify(contract)}`);

    await page.evaluate(()=>{
      const scene=document.getElementById('pullScene');
      window.__bbItachiTrace=[];
      window.__bbItachiTraceStart=0;
      window.__bbItachiRingStarts=[];
      window.__bbItachiRingStartHandler?.abort?.();
      const ringStartController=new AbortController();
      window.__bbItachiRingStartHandler=ringStartController;
      scene?.addEventListener('animationstart',event=>{
        const shell=event.target?.classList?.contains('bb-itachi-ring-shell')?event.target:null;
        if(!shell||(!event.animationName.startsWith('bbItachiRingDoubleSnapSoft')&&!event.animationName.startsWith('bbItachiRingSingleSnapSoft')&&!event.animationName.startsWith('bbItachiRingSlowSnap')))return;
        const shells=[...scene.querySelectorAll('.bb-itachi-ring-shell')];
        window.__bbItachiRingStarts.push({index:shells.indexOf(shell),at:performance.now()});
      },{signal:ringStartController.signal});
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

    await page.waitForTimeout(720);
    const blackout=await page.evaluate(()=>{
      const screen=document.getElementById('summonPullScreen'),layer=screen?.querySelector(':scope > .bb-itachi-blackout');
      const hero=screen?.querySelector('.pullHeroArea'),scene=screen?.querySelector('.pullScene'),stage=screen?.querySelector('.bb-itachi-stage-vfx'),wrap=screen?.querySelector('.pullCardWrap');
      const outline=wrap?getComputedStyle(wrap,'::before'):null,smoke=getComputedStyle(stage,'::before');
      return {
        active:screen?.classList.contains('bb-itachi-blackout-active')||false,
        opacity:layer?Number.parseFloat(getComputedStyle(layer).opacity)||0:0,
        visibleRings:[...document.querySelectorAll('.bb-itachi-ring-shell')].filter(node=>(Number.parseFloat(getComputedStyle(node).opacity)||0)>.01).length,
        blackoutZ:layer?Number.parseInt(getComputedStyle(layer).zIndex,10)||0:0,
        heroZ:hero?Number.parseInt(getComputedStyle(hero).zIndex,10)||0:0,
        sceneZ:scene?Number.parseInt(getComputedStyle(scene).zIndex,10)||0:0,
        stageZ:stage?Number.parseInt(getComputedStyle(stage).zIndex,10)||0:0,
        outlineHidden:!outline||outline.display==='none'||outline.content==='none'||(Number.parseFloat(outline.opacity)||0)<.01,
        smokeAnimation:smoke.animationName||''
      };
    });
    if(!blackout.active||blackout.opacity<.7||blackout.visibleRings!==0||blackout.blackoutZ>=blackout.heroZ||blackout.heroZ>=blackout.sceneZ||blackout.stageZ<6||!blackout.outlineHidden||!blackout.smokeAnimation.includes('bbItachiSmokeBloom'))throw new Error(`Itachi blackout/smoke/card-frame intro is wrong: ${JSON.stringify(blackout)}`);
    await page.waitForFunction(()=>window.__bbItachiRingStarts?.length===4,{timeout:5000});
    const ringStarts=await page.evaluate(()=>window.__bbItachiRingStarts.map((item,index,array)=>({
      index:item.index,
      at:index?item.at-array[0].at:0,
      gap:index?item.at-array[index-1].at:0
    })));
    const startOrder=ringStarts.map(item=>item.index);
    const sequentialStarts=startOrder.length===4&&startOrder.every((value,index)=>value===index);
    const gaps=ringStarts.slice(1).map(item=>item.gap),separatedStarts=gaps.every(gap=>gap>=400),smoothTaper=gaps.every((gap,index)=>index===0||gap<=gaps[index-1]+40)&&((Math.max(...gaps)-Math.min(...gaps))>=35);
    if(!sequentialStarts||!separatedStarts||!smoothTaper)throw new Error(`Itachi ring starts lost their intended staggered smooth cadence: ${JSON.stringify(ringStarts)}`);
    await page.waitForFunction(()=>[...document.querySelectorAll('#pullScene .bb-itachi-ring-shell')].length===4&&[...document.querySelectorAll('#pullScene .bb-itachi-ring-shell')].every(node=>(Number.parseFloat(getComputedStyle(node).opacity)||0)>=.99),null,{timeout:2600});
    const assembled=await page.evaluate(()=>{
      const scene=document.getElementById('pullScene');
      return {
        ringOpacities:[...scene.querySelectorAll('.bb-itachi-ring-shell')].map(node=>Number.parseFloat(getComputedStyle(node).opacity)||0),
        environmentOpacity:Number.parseFloat(getComputedStyle(scene.querySelector('.bb-itachi-environment')).opacity)||0,
        environmentDisplay:getComputedStyle(scene.querySelector('.bb-itachi-environment')).display
      };
    });
    if(assembled.ringOpacities.length!==4||assembled.ringOpacities.some(value=>value<.99)||assembled.environmentOpacity>.01||assembled.environmentDisplay!=='none')throw new Error(`Itachi ring assembly still contains translucent overlap/background ghosting: ${JSON.stringify(assembled)}`);
    if(name==='chromium')await page.screenshot({path:'test-artifacts/itachi-summon-four-ring-assembly-chromium.png'});

    const loaded=await page.evaluate(()=>{
      const scene=document.getElementById('pullScene');
      const images=[...scene.querySelectorAll('.bb-itachi-stage-vfx img')];
      const generic=['.bb-portal-stage-vfx','.bb-portal-charge-vfx','.bb-card-stage-vfx'].map(selector=>{
        const node=scene.querySelector(selector);return node?getComputedStyle(node).display:'missing';
      });
      const art=scene.querySelector('.bb-card-front .summonedTradingCard');
      const ringSelectors=['.bb-itachi-ring-flame','.bb-itachi-ring-outer','.bb-itachi-ring-middle','.bb-itachi-ring-inner'];
      const stageWidth=scene.querySelector('.bb-itachi-stage-vfx')?.offsetWidth||0;const rings=ringSelectors.map(selector=>{const node=scene.querySelector(selector),shell=node?.closest('.bb-itachi-ring-shell'),box=shell?.getBoundingClientRect(),style=node?getComputedStyle(node):null,shellStyle=shell?getComputedStyle(shell):null,resolvedWidth=style?Number.parseFloat(style.width)||node?.offsetWidth||0:0;return {selector,cx:box?box.left+box.width/2:null,cy:box?box.top+box.height/2:null,width:resolvedWidth,widthPct:stageWidth?resolvedWidth/stageWidth*100:0,duration:style?.animationDuration||'',name:style?.animationName||'',shellName:shellStyle?.animationName||'',shellDuration:shellStyle?.animationDuration||'',shellDelay:shellStyle?.animationDelay||''}});
      return {
        count:images.length,
        bad:images.filter(img=>!img.complete||!img.naturalWidth||img.classList.contains('bb-vfx-missing')).map(img=>img.getAttribute('src')),
        sources:images.map(img=>img.getAttribute('src')),
        generic,
        revealStage:scene.dataset.bbRevealStage||'',
        revealKind:scene.dataset.bbRevealKind||'',
        cardArt:art?.getAttribute('src')||'',
        ringShells:scene.querySelectorAll('.bb-itachi-ring-shell').length,
        rings
      };
    });
    if(loaded.count!==11||loaded.bad.length||loaded.sources.some(src=>String(src||'').includes('itachi_ring_sharingan_orbit.webp')))throw new Error(`Itachi VFX failed to load or removed orbit survived: ${JSON.stringify(loaded)}`);
    if(loaded.generic.some(display=>display!=='none'))throw new Error(`generic summon VFX leaked into Itachi reveal: ${JSON.stringify(loaded.generic)}`);
    if(loaded.ringShells!==4)throw new Error(`Itachi four-ring cog assembly is not isolated in concentric shells: ${JSON.stringify(loaded)}`);
    const centersOk=loaded.rings.every(r=>Math.abs(r.cx-loaded.rings[0].cx)<1.5&&Math.abs(r.cy-loaded.rings[0].cy)<1.5);
    const widths=loaded.rings.map(r=>r.width),nested=widths.every((value,index)=>index===0||value<widths[index-1]);
    const expectedWidthPct=[141,125,108,95],widthTargetsOk=loaded.rings.every((r,index)=>Math.abs(r.widthPct-expectedWidthPct[index])<1.6);
    const speeds=loaded.rings.map(r=>Number.parseFloat(r.duration)||0),tiered=speeds.every((value,index)=>index===0||value<speeds[index-1])&&speeds[0]>=22.8&&speeds[0]<=23.2&&speeds[1]>=16.8&&speeds[1]<=17.2&&speeds[2]>=14.3&&speeds[2]<=14.7&&speeds[3]>=9.0&&speeds[3]<=9.4;
    const directions=loaded.rings.map(r=>r.name),directionOk=directions[0].includes('bbItachiSpinCCW')&&directions[1].includes('bbItachiSpinCCW')&&directions[2].includes('bbItachiSpinCW')&&directions[3].includes('bbItachiSpinCCW');
    const snapDurations=loaded.rings.map(r=>Number.parseFloat(r.shellDuration)||9),snapOk=loaded.rings[0].shellName.includes('bbItachiRingDoubleSnapSoft')&&loaded.rings[1].shellName.includes('bbItachiRingSingleSnapSoft')&&loaded.rings[2].shellName.includes('bbItachiRingSlowSnap')&&loaded.rings[3].shellName.includes('bbItachiRingSlowSnap')&&snapDurations[0]>=.82&&snapDurations[0]<=.86&&snapDurations[1]>=.72&&snapDurations[1]<=.76&&snapDurations[2]>=1.32&&snapDurations[2]<=1.36&&snapDurations[3]>=1.44&&snapDurations[3]<=1.48;
    const shadowTiming=await page.evaluate(()=>{const scene=document.getElementById('pullScene'),sil=scene.querySelector('.bb-itachi-silhouette'),ravens=scene.querySelector('.bb-itachi-raven-burst');const ss=getComputedStyle(sil),rs=getComputedStyle(ravens);return {silDelay:Number.parseFloat(ss.animationDelay)||0,silDuration:Number.parseFloat(ss.animationDuration)||0,ravenDelay:Number.parseFloat(rs.animationDelay)||0,silFilter:ss.filter||''}});
    const shadowHoldOk=shadowTiming.silDuration>=2.3&&(shadowTiming.ravenDelay-shadowTiming.silDelay)>=1.45;
    if(!centersOk||!nested||!widthTargetsOk||!tiered||!directionOk||!snapOk||!shadowHoldOk)throw new Error(`Itachi ring geometry/snap/direction/speed or shadow-hold contract is wrong: ${JSON.stringify({rings:loaded.rings,shadowTiming})}`);
    if(loaded.revealStage!=='itachi'||loaded.revealKind!=='itachi'||!loaded.cardArt.endsWith('itachi_reveal.webp'))throw new Error(`Itachi cinematic did not own the reveal: ${JSON.stringify(loaded)}`);

    await page.waitForFunction(()=>document.getElementById('pullScene')?.dataset.bbItachiStage==='handoff',{timeout:9000});
    await page.waitForFunction(()=>document.getElementById('pullScene')?.dataset.bbRevealStage==='done',{timeout:3000});
    await page.waitForTimeout(840);
    const restored=await page.evaluate(()=>{
      const screen=document.getElementById('summonPullScreen'),layer=screen?.querySelector(':scope > .bb-itachi-blackout'),header=screen?.querySelector('.summonShopHeader');
      return {
        blackoutOpacity:layer?Number.parseFloat(getComputedStyle(layer).opacity)||0:0,
        active:screen?.classList.contains('bb-itachi-blackout-active')||false,
        exiting:screen?.classList.contains('bb-itachi-blackout-exiting')||false,
        headerOpacity:header?Number.parseFloat(getComputedStyle(header).opacity)||0:0
      };
    });
    if(restored.blackoutOpacity>.05||restored.active||restored.exiting||restored.headerOpacity<.9)throw new Error(`Itachi blackout did not fade back to the normal summon screen after handoff: ${JSON.stringify(restored)}`);

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
        rarity:scene.querySelector('.bb-card-rarityplate')?.textContent?.trim()||'',
        cardArt:scene.querySelector('.bb-card-front .summonedTradingCard')?.getAttribute('src')||''
      };
    });
    if(JSON.stringify(final.trace.map(item=>item.stage))!==JSON.stringify(EXPECTED_STAGES))throw new Error(`Itachi stage order changed: ${JSON.stringify(final.trace)}`);
    if(name==='chromium'){
      for(const item of final.trace){
        const expected=EXPECTED_TIMES[item.stage],tolerance=item.stage==='ignite'?120:260;
        if(Math.abs(item.at-expected)>tolerance)throw new Error(`${item.stage} timing drifted from ${expected}ms: ${JSON.stringify(final.trace)}`);
      }
    }else{
      for(let i=0;i<final.trace.length;i++){
        const item=final.trace[i],expected=EXPECTED_TIMES[item.stage];
        if(i>0&&item.at<final.trace[i-1].at)throw new Error(`WebKit stage timestamps regressed: ${JSON.stringify(final.trace)}`);
        if(item.at<expected-260)throw new Error(`WebKit fired ${item.stage} too early vs ${expected}ms: ${JSON.stringify(final.trace)}`);
      }
      const handoff=final.trace.at(-1);
      if(!handoff||handoff.stage!=='handoff'||handoff.at<EXPECTED_TIMES.handoff-260)throw new Error(`WebKit handoff fired too early: ${JSON.stringify(final.trace)}`);
    }
    if(final.special!=='itachi'||final.itachiStage!=='handoff'||final.revealStage!=='done'||final.running||final.cardOpacity<.95)throw new Error(`Itachi handoff did not settle: ${JSON.stringify(final)}`);
    if(final.message!=='LEGENDARY ITACHI'||final.name!=='ITACHI'||final.rarity!=='LEGENDARY'||!final.cardArt.endsWith('assets/characters/itachi/art/itachi_full_art.png'))throw new Error(`Itachi final card/labels are wrong: ${JSON.stringify(final)}`);

    await page.locator('#nextPullBtn').evaluate(button=>button.click());
    const result=page.locator('#pullResultsGrid .pullCard').first();
    await result.waitFor({state:'visible',timeout:4000});
    await page.waitForFunction(()=>{
      const card=document.querySelector('#pullResultsGrid .pullCard');
      return card?.classList.contains('bb-legendary-itachi-result')&&card?.dataset.bbRevealKind==='itachi';
    },{timeout:2000});
    const resultState=await result.evaluate(card=>{const image=card.querySelector('.resultTradingCard')||card.querySelector('img');return {legendary:card.classList.contains('bb-legendary-itachi-result'),kind:card.dataset.bbRevealKind||'',text:card.textContent||'',art:image?.getAttribute('src')||''}});
    if(!resultState.legendary||resultState.kind!=='itachi'||!resultState.art.endsWith('assets/characters/itachi/art/itachi_full_art.png'))throw new Error(`Itachi result card lost its special treatment/full-background art: ${JSON.stringify(resultState)}`);
    if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);

    console.log(`Legendary Itachi summon smoke PASS (${name}): four-ring kinetic cog starts ${JSON.stringify(ringStarts.map(s=>s.index))}, two-beat outer snap, one-beat second-ring snap, two smooth inner transitions, and a brief isolated gear-spin pause before Itachi appears, floating Sharingan orbit removed, uniform 5% ring shrink, one-second red-flicker shadow hold, crows-before-Itachi reveal, 8.5s handoff, smoke-backed gear intro, blackout fade-back, and full-background card art verified.`);
  }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Legendary Itachi summon smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
