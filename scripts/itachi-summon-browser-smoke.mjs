import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingSummonCinematic==='object'&&window.BlazingSummonCinematic.version==='5.8.1-itachi',{timeout:30000});
}
async function waitItachiStage(page,stage,timeout=7000){
  await page.waitForFunction(expected=>document.getElementById('pullScene')?.dataset.bbItachiStage===expected,stage,{timeout});
  return page.evaluate(()=>({
    special:document.getElementById('pullScene')?.dataset.bbSpecialReveal||'',
    stage:document.getElementById('pullScene')?.dataset.bbItachiStage||'',
    revealStage:document.getElementById('pullScene')?.dataset.bbRevealStage||'',
    running:document.getElementById('pullScene')?.classList.contains('bb-itachi-running')||false,
    message:document.getElementById('pullMessage')?.textContent?.trim()||'',
    art:document.querySelector('#pullScene .summonedTradingCard')?.getAttribute('src')||''
  }));
}

async function run(name,type){
  let browser;
  try{
    console.log(`Itachi summon smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:true});
    const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
    await page.locator('#bbHomeApproved [data-nav="summon"]').click();
    await page.locator('#summonScreen.active #bbTestLegendaryItachi').waitFor({state:'visible',timeout:5000});
    const contract=await page.evaluate(()=>({version:window.BlazingSummonCinematic.version,timeline:window.BlazingSummonCinematic.timeline?.itachi,itachiVfx:window.BlazingSummonCinematic.itachiVfx}));
    if(contract.version!=='5.8.1-itachi'||contract.timeline?.handoff!==5200||Object.keys(contract.itachiVfx||{}).length!==12)throw new Error(`Itachi cinematic contract mismatch: ${JSON.stringify(contract)}`);
    await page.locator('#bbTestLegendaryItachi').click();
    const ignite=await waitItachiStage(page,'ignite');
    const assets=await page.evaluate(()=>[...document.querySelectorAll('#pullScene .bb-itachi-stage-vfx img')].map(node=>({src:node.getAttribute('src')||'',missing:node.classList.contains('bb-vfx-missing'),w:node.naturalWidth,h:node.naturalHeight})));
    if(ignite.special!=='itachi'||!ignite.running||assets.length!==12||assets.some(a=>a.missing||!a.w||!a.h))throw new Error(`Itachi VFX did not initialize cleanly: ${JSON.stringify({ignite,assets})}`);
    const expectedAssets=['itachi_environment_lotus_clouds.webp','itachi_ring_flame_halo.webp','itachi_ring_outer_compass.webp','itachi_ring_middle_enamel.webp','itachi_ring_inner_aperture.webp','itachi_ring_sharingan_orbit.webp','itachi_fx_shadow_lotus.webp','itachi_silhouette.webp','itachi_fx_raven_burst.webp','itachi_fx_feather_vortex.webp','itachi_reveal.webp','itachi_fx_legendary_flash.webp'];
    for(const asset of expectedAssets)if(!assets.some(a=>a.src.endsWith(asset)))throw new Error(`missing Itachi summon layer ${asset}`);
    for(const stage of ['rings','orbit','stop','silhouette','reveal','settle'])await waitItachiStage(page,stage);
    const handoff=await waitItachiStage(page,'handoff');
    await page.waitForFunction(()=>document.getElementById('pullScene')?.dataset.bbRevealStage==='done',{timeout:2000});
    const settled=await page.evaluate(()=>({running:document.getElementById('pullScene')?.classList.contains('bb-itachi-running')||false,message:document.getElementById('pullMessage')?.textContent?.trim()||'',art:document.querySelector('#pullScene .summonedTradingCard')?.getAttribute('src')||'',name:document.querySelector('#pullScene .bb-card-nameplate')?.textContent?.trim()||'',rarity:document.querySelector('#pullScene .bb-card-rarityplate')?.textContent?.trim()||''}));
    if(handoff.special!=='itachi'||settled.running||settled.message!=='LEGENDARY ITACHI'||!settled.art.endsWith('itachi_card.png')||settled.name!=='ITACHI'||settled.rarity!=='LEGENDARY')throw new Error(`Itachi reveal did not settle correctly: ${JSON.stringify({handoff,settled})}`);
    if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
    console.log(`Itachi summon smoke PASS (${name}): all 12 dedicated layers loaded, the 5.2s reveal completed, and the cinematic handed off to Itachi's real card art.`);
    await context.close();
  }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Itachi summon smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
