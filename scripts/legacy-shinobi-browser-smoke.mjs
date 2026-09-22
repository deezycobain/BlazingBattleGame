import {chromium,webkit} from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const IDS=['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza'];
const NAMES=['Kakashi','Obito','Jiraiya','Sasuke','Pain','Scorpion','Rock Lee','Mashle','Jackie Chan','Gabimaru','Killua','Zabuza'];

function overlaps(a,b){
 if(!a||!b)return false;
 return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
}

for(const [browserName,browserType] of Object.entries({chromium,webkit})){
 let browser;
 try{
  browser=await browserType.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:browserName==='webkit',hasTouch:true});
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));

  const response=await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});
  if(response&&!response.ok())throw new Error('root HTTP '+response.status());
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#bbHomeApproved')?.dataset?.bbHomeLayout==='v9-polish',{timeout:30000});

  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error('commit mismatch: expected '+EXPECT.slice(0,12)+', got '+(meta?.commit||'missing'));

  const contract=await page.evaluate(({ids,names})=>{
   const get=globalThis.eval;
   const registry=window.BLAZING_UNIT_DATA||{};
   let playable=[];
   try{playable=get('[...ACTIVE_PLAYABLE_UNITS]')}catch(_){}
   const promo=document.querySelector('#bbHomeApproved .bb-home-v9-legacy-banner');
   const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
   const nav={};
   for(const key of ['battle','summon','units','forge'])nav[key]=rect(document.querySelector('#bbHomeApproved [data-nav="'+key+'"]'));
   return {
    missingIds:ids.filter(id=>!registry[id]),
    playableMissing:names.filter(name=>!playable.includes(name)),
    promo:rect(promo),
    promoLabel:promo?.getAttribute('aria-label')||'',
    promoText:promo?.textContent?.replace(/\s+/g,' ').trim()||'',
    nav,
    viewport:{width:innerWidth,height:innerHeight}
   };
  },{ids:IDS,names:NAMES});

  if(contract.missingIds.length)throw new Error('canonical registry missing '+contract.missingIds.join(', '));
  if(contract.playableMissing.length)throw new Error('active playable roster missing '+contract.playableMissing.join(', '));
  if(!contract.promo||contract.promo.width<80||contract.promo.height<70)throw new Error('Home promo target invalid: '+JSON.stringify(contract.promo));
  if(contract.promo.x<0||contract.promo.right>contract.viewport.width||contract.promo.y<0||contract.promo.bottom>contract.viewport.height)throw new Error('Home promo outside viewport: '+JSON.stringify(contract));
  if(!/Legacy of the Shinobi/i.test(contract.promoLabel+' '+contract.promoText))throw new Error('Home promo copy/label missing');
  for(const [key,rect] of Object.entries(contract.nav))if(overlaps(contract.promo,rect))throw new Error('Home promo overlaps '+key+' navigation: '+JSON.stringify({promo:contract.promo,nav:rect}));

  const promoBox=await page.locator('#bbHomeApproved .bb-home-v9-legacy-banner').boundingBox();
  const topAtPromo=await page.evaluate(({x,y})=>{
   const node=document.elementFromPoint(x,y);
   return {promo:!!node?.closest?.('.bb-home-v9-legacy-banner'),nav:node?.closest?.('[data-nav]')?.getAttribute('data-nav')||'',id:node?.id||''};
  },{x:promoBox.x+promoBox.width/2,y:promoBox.y+promoBox.height/2});
  if(!topAtPromo.promo||topAtPromo.nav)throw new Error('Home promo hit target intercepted: '+JSON.stringify(topAtPromo));

  await page.locator('#bbHomeApproved .bb-home-v9-legacy-banner').click();
  await page.locator('#summonScreen.active .bb-legacy-lobby').waitFor({state:'visible',timeout:10000});
  const summon=await page.evaluate(({names})=>{
   const lobby=document.querySelector('#summonScreen.active .bb-legacy-lobby');
   const text=lobby?.textContent?.replace(/\s+/g,' ').trim()||'';
   return {
    title:document.querySelector('#bbSummonTitle')?.textContent?.replace(/\s+/g,' ').trim()||'',
    fighterCount:[...document.querySelectorAll('#summonScreen .bb-banner-roster span')].length,
    missingNames:names.filter(name=>!text.toLowerCase().includes(name.toLowerCase())),
    singleVisible:!!document.querySelector('#summonScreen.active #singleSummonBtn'),
    multiVisible:!!document.querySelector('#summonScreen.active #multiSummonBtn')
   };
  },{names:NAMES});
  if(!/LEGACY OF THE SHINOBI/i.test(summon.title)||summon.fighterCount!==12||summon.missingNames.length||!summon.singleVisible||!summon.multiVisible)throw new Error('Legacy summon lobby invalid: '+JSON.stringify(summon));

  const runtime=await page.evaluate(async ({names})=>{
   const get=globalThis.eval;
   const body=get('LEGACY_SHINOBI_BODY_RUNTIME');
   const results=[];
   for(const name of names){
    await body.ready(name);
    const idle=body.idle(name),basic=body.basic(name);
    const idleResolved=get('unitIdleFrames') (name);
    const attackResolved=get('unitAttackFrames') (name,'basic_attack');
    results.push({
     name,
     idleReady:!!idle?.ready,
     basicReady:!!basic?.ready,
     idleCount:idle?.frames?.length||0,
     basicCount:basic?.frames?.length||0,
     idleResolved:idleResolved?.length||0,
     attackResolved:attackResolved?.length||0,
     idleBroken:(idle?.frames||[]).filter(img=>!img.complete||img.naturalWidth<=0||img.naturalHeight<=0).length,
     basicBroken:(basic?.frames||[]).filter(img=>!img.complete||img.naturalWidth<=0||img.naturalHeight<=0).length
    });
   }
   return results;
  },{names:NAMES});
  const badRuntime=runtime.filter(x=>!x.idleReady||!x.basicReady||x.idleCount!==6||x.basicCount!==6||x.idleResolved!==6||x.attackResolved!==6||x.idleBroken||x.basicBroken);
  if(badRuntime.length)throw new Error('Legacy battle animation runtime invalid: '+JSON.stringify(badRuntime));

  if(errors.length)throw new Error('page errors: '+errors.join(' | '));
  console.log('Legacy Shinobi browser smoke PASS ('+browserName+'): Home promo -> 12-unit summon banner -> playable roster -> six-frame idle/basic runtime.');
  await context.close();
 }finally{
  if(browser)await browser.close().catch(()=>{});
 }
}
