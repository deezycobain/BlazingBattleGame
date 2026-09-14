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
    const scene=document.getElementById('pullScene'),flipper=scene?.querySelector('.bb-card-flipper'),art=scene?.querySelector('.bb-card-front .summonedTradingCard'),message=document.getElementById('pullMessage');
    const nodes={portal:'.bb-summon-portal',ornate:'.bb-portal-ring-ornate',outer:'.bb-portal-ring-outer',energy:'.bb-portal-ring-energy',impact:'.bb-charge-impact',motion:'.bb-flip-motion-cards',frame:'.bb-flip-energy-frame',slash:'.bb-flip-slash',flash:'.bb-portal-resolve-flash',particles:'.bb-resolve-particles'};
    const effects={};
    for(const [key,selector] of Object.entries(nodes)){const node=scene?.querySelector(selector),style=node?getComputedStyle(node):null,animation=node?.getAnimations?.()[0];effects[key]={opacity:style?Number.parseFloat(style.opacity):null,animation:style?.animationName||'',start:Number.isFinite(animation?.startTime)?animation.startTime:null,src:node?.getAttribute('src')||''}}
    const bounds=node=>{if(!node)return null;const box=node.getBoundingClientRect();return {left:box.left,right:box.right,centerX:box.left+box.width/2,centerY:box.top+box.height/2}};
    const card=scene?.querySelector('#pullCardWrap'),cardBounds=bounds(card);
    return {stage:scene?.dataset.bbRevealStage||'',kind:scene?.dataset.bbRevealKind||'',running:scene?.classList.contains('bb-cinematic-running')||false,vfxLayers:scene?.querySelectorAll('.bb-portal-stage-vfx img,.bb-portal-charge-vfx img,.bb-card-stage-vfx img').length||0,brushLayers:scene?.querySelectorAll('.bb-paint-stroke,.bb-paint-accent,[src*="reveal-brush"]').length||0,shadowLayers:scene?.querySelectorAll('.bb-flip-afterimage,[src*="flip_shadow_afterimage"],[src*="flip_impact_burst"]').length||0,effects,cardOpacity:flipper?Number.parseFloat(getComputedStyle(flipper).opacity):null,cardAnimation:flipper?getComputedStyle(flipper).animationName:'',artOpacity:art?Number.parseFloat(getComputedStyle(art).opacity):null,messageOpacity:message?Number.parseFloat(getComputedStyle(message).opacity):null,message:message?.textContent?.trim()||'',viewport:{width:innerWidth,height:innerHeight},cardBounds,bounds:Object.fromEntries(Object.entries(nodes).map(([key,selector])=>[key,bounds(scene?.querySelector(selector))]))};
  });
}

async function waitStage(page,stage){await page.waitForFunction(expected=>document.getElementById('pullScene')?.dataset.bbRevealStage===expected,stage,{timeout:5000});return stageState(page)}
function visible(effect){return effect?.opacity>0.02}
function assertCentered(label,box,card,viewport){const limit=label==='slash'?18:12;if(!box||!card||box.left<0||box.right>viewport.width||Math.abs(box.centerX-card.centerX)>limit||Math.abs(box.centerY-card.centerY)>limit)throw new Error(`${label} escaped the centered corridor: ${JSON.stringify({box,card,viewport,limit})}`)}

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
    await page.locator('#bbHomeApproved [data-nav="summon"]').click();await page.locator('#summonScreen.active #singleSummonBtn').waitFor({state:'visible'});
    const runtime=await page.evaluate(()=>({version:window.BlazingSummonCinematic?.version,timeline:window.BlazingSummonCinematic?.timeline,vfx:window.BlazingSummonCinematic?.vfx}));
    if(runtime.version!=='5.3.0'||runtime.timeline?.resonance?.done!==2240||runtime.timeline?.resonance?.cardEnter!==1280||runtime.timeline?.resonance?.flip!==1500)throw new Error(`unexpected cinematic contract: ${JSON.stringify(runtime)}`);
    if(Object.keys(runtime.vfx||{}).length!==11)throw new Error(`the production pack is not fully mapped: ${JSON.stringify(runtime.vfx)}`);

    await page.evaluate(()=>{const scene=document.getElementById('pullScene');window.__bbSummonTrace=[];window.__bbSummonTraceStart=performance.now();window.__bbSummonObserver?.disconnect?.();window.__bbSummonObserver=new MutationObserver(()=>{const stage=scene?.dataset.bbRevealStage||'',trace=window.__bbSummonTrace;if(stage&&trace.at(-1)?.stage!==stage)trace.push({stage,at:performance.now()-window.__bbSummonTraceStart})});if(scene)window.__bbSummonObserver.observe(scene,{attributes:true,attributeFilter:['data-bb-reveal-stage']})});
    await page.locator('#singleSummonBtn').click();

    await waitStage(page,'portal');await page.waitForTimeout(90);const portal=await stageState(page);
    if(portal.vfxLayers!==10||portal.brushLayers||portal.shadowLayers||portal.cardOpacity!==0||!visible(portal.effects.portal)||visible(portal.effects.outer)||visible(portal.effects.energy))throw new Error(`portal beat is not isolated: ${JSON.stringify(portal)}`);
    for(const key of Object.keys(portal.bounds))assertCentered(key,portal.bounds[key],portal.cardBounds,portal.viewport);

    const slow=await waitStage(page,'circle-slow');await page.waitForTimeout(100);const slowMoving=await stageState(page);
    if(slow.cardOpacity!==0||slowMoving.effects.ornate.animation!=='bbOrnateRingBuild'||slowMoving.effects.outer.animation!=='bbOuterRingCharge'||!visible(slowMoving.effects.ornate)||!visible(slowMoving.effects.outer)||visible(slowMoving.effects.energy))throw new Error(`slow charge layering is wrong: ${JSON.stringify({slow,slowMoving})}`);
    const fast=await waitStage(page,'circle-fast');await page.waitForTimeout(100);const fastMoving=await stageState(page);
    if(fast.cardOpacity!==0||fastMoving.effects.outer.animation!=='bbOuterRingCharge'||fastMoving.effects.energy.animation!=='bbEnergyRingCharge'||!visible(fastMoving.effects.outer)||!visible(fastMoving.effects.energy))throw new Error(`accelerated charge layering is wrong: ${JSON.stringify({fast,fastMoving})}`);
    if(slowMoving.effects.outer.start!==null&&fastMoving.effects.outer.start!==null&&Math.abs(slowMoving.effects.outer.start-fastMoving.effects.outer.start)>2)throw new Error(`outer ring restarted during acceleration: ${JSON.stringify({slowMoving,fastMoving})}`);

    await waitStage(page,'card-enter');await page.waitForTimeout(80);const card=await stageState(page);
    if(card.cardOpacity<.5||card.cardAnimation!=='bbCardBackEnter'||visible(card.effects.outer)||visible(card.effects.energy)||!visible(card.effects.motion)||!visible(card.effects.frame))throw new Error(`card arrival did not receive the pack transition: ${JSON.stringify(card)}`);
    const expectedFrame=card.kind==='new'?'flip_frame_blue_white.webp':'flip_frame_crimson_gold.webp';
    if(!card.effects.frame.src.endsWith(expectedFrame))throw new Error(`wrong reveal frame for ${card.kind}: ${card.effects.frame.src}`);

    await waitStage(page,'flip');await page.waitForTimeout(240);const flip=await stageState(page);
    const flipFrames=await page.locator('#pullScene .bb-card-flipper').evaluate(node=>node.getAnimations()[0]?.effect?.getKeyframes?.().map(frame=>frame.transform)||[]);
    if(flip.cardAnimation!=='bbPhysicalCardFlip'||flip.artOpacity!==1||!visible(flip.effects.frame)||!visible(flip.effects.slash))throw new Error(`physical flip/support VFX are wrong: ${JSON.stringify(flip)}`);
    if(!flipFrames.some(value=>String(value).includes('180deg'))||flipFrames.some(value=>/rotateY\((?:[2-9]\d\d|\d{4,})deg\)/.test(String(value))))throw new Error(`flip is not one 180-degree action: ${JSON.stringify(flipFrames)}`);

    await waitStage(page,'resolve');await page.waitForTimeout(100);const resolve=await stageState(page);
    if(resolve.effects.flash.animation!=='bbResolveFlash'||resolve.effects.particles.animation!=='bbResolveParticles'||!visible(resolve.effects.flash)||!visible(resolve.effects.particles)||resolve.messageOpacity>0.05)throw new Error(`resolve tail is not sequenced correctly: ${JSON.stringify(resolve)}`);
    await waitStage(page,'done');await page.waitForTimeout(40);const settled=await stageState(page);
    if(settled.running||settled.artOpacity!==1||settled.messageOpacity<.9||!settled.message)throw new Error(`reveal did not settle cleanly: ${JSON.stringify(settled)}`);

    const labels=await page.evaluate(()=>({name:document.querySelector('.bb-card-nameplate')?.textContent?.trim()||'',rarity:document.querySelector('.bb-card-rarityplate')?.textContent?.trim()||'',copyDisplay:document.querySelector('.bb-card-front .pullCardMeta')?getComputedStyle(document.querySelector('.bb-card-front .pullCardMeta')).display:'missing'}));
    if(!labels.name||!labels.rarity||labels.copyDisplay!=='none')throw new Error(`front labels/copy overlay incorrect: ${JSON.stringify(labels)}`);
    const trace=await page.evaluate(()=>window.__bbSummonTrace),expectedStages=['portal','circle-slow','circle-fast','card-enter','flip','resolve','done'];
    if(JSON.stringify(trace.map(item=>item.stage))!==JSON.stringify(expectedStages))throw new Error(`stage order changed: ${JSON.stringify(trace)}`);
    const portalAt=trace[0].at,ranges={portal:[0,25],'circle-slow':[350,550],'circle-fast':[750,950],'card-enter':[1180,1380],flip:[1400,1600],resolve:[1820,2020],done:[2140,2340]};
    for(const item of trace){const elapsed=item.at-portalAt,[min,max]=ranges[item.stage];if(elapsed<min||elapsed>max)throw new Error(`${item.stage} timing outside ${min}-${max}ms after portal: ${JSON.stringify(trace)}`)}
    await page.locator('#nextPullBtn').evaluate(button=>button.click());await page.locator('#pullResultsGrid .pullCard').first().waitFor({state:'visible',timeout:3000});
    if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
    console.log(`Summon cinematic browser smoke PASS (${name}): brush-free pack sequencing, centered rings, impact/card bridge, rarity frame, slash-supported 180-degree flip, resolve tail, and 2.24s results flow verified.`);
  }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){try{await run(name,type)}catch(error){failed=true;console.error(`Summon cinematic browser smoke FAIL (${name}): ${error.stack||error.message}`)}}
if(failed)process.exit(1);
