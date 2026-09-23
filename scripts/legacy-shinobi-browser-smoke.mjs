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
    invalidUnits:ids.map(id=>registry[id]).filter(unit=>!unit||unit.collection?.inventory_visible===false||!unit.collection?.battle_ready||unit.readiness?.jutsu!==false||unit.animation_standard?.animations?.idle?.frames?.length!==6||unit.animation_standard?.animations?.basic_attack?.frames?.length!==6||!unit.assets?.art).map(unit=>unit?.id||'missing'),
    playableMissing:names.filter(name=>!playable.includes(name)),
    promo:rect(promo),
    promoLabel:promo?.getAttribute('aria-label')||'',
    promoText:promo?.textContent?.replace(/\s+/g,' ').trim()||'',
    nav,
    viewport:{width:innerWidth,height:innerHeight}
   };
  },{ids:IDS,names:NAMES});

  if(contract.missingIds.length)throw new Error('canonical registry missing '+contract.missingIds.join(', '));
  if(contract.invalidUnits.length)throw new Error('canonical Legacy unit contract invalid '+contract.invalidUnits.join(', '));
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
  if(!/LEGACYOFTHE?SHINOBI/i.test(String(summon.title||'').replace(/[^A-Z]/gi,''))||summon.fighterCount!==12||summon.missingNames.length||!summon.singleVisible||!summon.multiVisible)throw new Error('Legacy summon lobby invalid: '+JSON.stringify(summon));

  const attackScaleValues=await page.evaluate(names=>{
   const body=globalThis.eval('LEGACY_SHINOBI_BODY_RUNTIME');
   return Object.fromEntries(names.map(name=>[name,body.attackScale(name)]));
  },NAMES);
  if(!(attackScaleValues.Scorpion>1.1&&attackScaleValues.Scorpion<=1.18))throw new Error('Scorpion attack scale compensation missing: '+JSON.stringify(attackScaleValues));
  if(!(attackScaleValues.Zabuza>1.1&&attackScaleValues.Zabuza<=1.18))throw new Error('Zabuza attack scale compensation missing: '+JSON.stringify(attackScaleValues));

  const runtime=await page.evaluate(async ({names})=>{
   const get=globalThis.eval;
   const body=get('LEGACY_SHINOBI_BODY_RUNTIME');
   const waitImages=images=>Promise.all(images.map(img=>{
    if(img.complete)return Promise.resolve(img.naturalWidth>0&&img.naturalHeight>0);
    return new Promise(resolve=>{img.addEventListener('load',()=>resolve(true),{once:true});img.addEventListener('error',()=>resolve(false),{once:true});setTimeout(()=>resolve(false),8000)});
   }));
   const results=[];
   for(const name of names){
    const idle=body.idle(name)||[],basic=body.basic(name)||[];
    const [idleOk,basicOk]=await Promise.all([waitImages(idle),waitImages(basic)]);
    const idleResolved=get('unitIdleFrames')(name);
    const attackResolved=get('unitAttackFrames')(name,'basic_attack');
    results.push({
     name,
     idleCount:idle.length,
     basicCount:basic.length,
     idleResolved:idleResolved?.length||0,
     attackResolved:attackResolved?.length||0,
     idleBroken:idleOk.filter(ok=>!ok).length,
     basicBroken:basicOk.filter(ok=>!ok).length,
     idleLandscape:idle.filter(img=>img.naturalWidth>=img.naturalHeight).length,
     basicLandscape:basic.filter(img=>img.naturalWidth>=img.naturalHeight).length,
     idleDims:idle.map(img=>[img.naturalWidth,img.naturalHeight]),
     basicDims:basic.map(img=>[img.naturalWidth,img.naturalHeight]),
     idleSrc:idle[0]?.src||'',
     basicSrc:basic[0]?.src||''
    });
   }
   return results;
  },{names:NAMES});
  const normalized=dims=>Array.isArray(dims)&&dims.length===6&&dims.every(([w,h])=>w===512&&h===768);
  const badRuntime=runtime.filter(x=>x.idleCount!==6||x.basicCount!==6||x.idleResolved!==6||x.attackResolved!==6||x.idleBroken||x.basicBroken||x.idleLandscape||x.basicLandscape||!normalized(x.idleDims)||!normalized(x.basicDims)||!/\/sprites\/runtime\/idle\/frame_01\.png\?legacySpriteAudit=v3$/.test(x.idleSrc)||!/\/sprites\/runtime\/attack\/basic\/frame_01\.png\?legacySpriteAudit=v3$/.test(x.basicSrc));
  if(badRuntime.length)throw new Error('Legacy battle animation runtime invalid: '+JSON.stringify(badRuntime));


  // Legacy attack renderer probe: reproduce the real lunge condition where drawUnit
  // receives a non-null visual transform. The attack sheet must still win over idle.
  const attackRenderProbe=await page.evaluate(async ({names})=>{
   const get=globalThis.eval;
   const body=get('LEGACY_SHINOBI_BODY_RUNTIME');
   const drawUnit=get('drawUnit');
   const state=get('S');
   const originalAnim=state.anim;
   const originalAction=state.action;
   const proto=CanvasRenderingContext2D.prototype;
   const originalDrawImage=proto.drawImage;
   const results=[];
   const waitLoaded=images=>Promise.all(images.map(img=>{
    if(img.complete)return Promise.resolve(img.naturalWidth>0);
    return new Promise(resolve=>{img.addEventListener('load',()=>resolve(true),{once:true});img.addEventListener('error',()=>resolve(false),{once:true});setTimeout(()=>resolve(false),5000)});
   }));
   try{
    for(const name of names){
     const unit=get('canonicalUnit')(name);
     const frames=body.basic(name)||[];
     await waitLoaded(frames);
     const seen=[];
     proto.drawImage=function(image,...args){
      const src=String(image?.src||'');
      if(src)seen.push(src);
      return originalDrawImage.call(this,image,...args);
     };
     state.action='normal';
     state.anim={positions:{},attackPose:{[name]:{kind:'basic_attack',start:performance.now()-160,duration:630}}};
     drawUnit(180,300,'','',false,{scale:1,rot:0,lift:0},name,false,1,1);
     const expected='/assets/characters/'+unit.id+'/sprites/runtime/attack/basic/';
     results.push({name,expected,seen,usedAttack:seen.some(src=>src.includes(expected))});
    }
   }finally{
    proto.drawImage=originalDrawImage;
    state.anim=originalAnim;
    state.action=originalAction;
   }
   return results;
  },{names:NAMES});
  const missedAttackRender=attackRenderProbe.filter(result=>!result.usedAttack);
  if(missedAttackRender.length)throw new Error('Legacy attack renderer probe failed: '+JSON.stringify(missedAttackRender));

  await page.goto(BASE+'/?legacyInventory=1',{waitUntil:'domcontentloaded'});
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  await page.locator('#bbHomeApproved [data-nav="units"]').click();
  await page.locator('#bbInventory:not([hidden])').waitFor({state:'visible',timeout:10000});
  const inventory=await page.evaluate(ids=>{
   const cards=[...document.querySelectorAll('#bbInventory [data-unit-id]')];
   const found=new Set(cards.map(card=>card.dataset.unitId));
   return {
    missing:ids.filter(id=>!found.has(id)),
    broken:cards.filter(card=>ids.includes(card.dataset.unitId)).map(card=>card.querySelector('img')).filter(img=>img&&img.complete&&img.naturalWidth<=0).map(img=>img.getAttribute('src'))
   };
  },IDS);
  if(inventory.missing.length||inventory.broken.length)throw new Error('Legacy inventory invalid: '+JSON.stringify(inventory));

  if(errors.length)throw new Error('page errors: '+errors.join(' | '));
  console.log('Legacy Shinobi browser smoke PASS ('+browserName+'): Home promo -> 12-unit summon banner -> inventory cards -> playable roster -> audited 512x768 six-frame idle/basic runtime.');
  await context.close();
 }finally{
  if(browser)await browser.close().catch(()=>{});
 }
}
