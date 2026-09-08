import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingRoadCamera==='object'&&typeof window.BlazingBattlePause==='object'&&typeof window.BlazingBattleMobileControls==='object',{timeout:30000});
}
async function enterRoad(page){
 await page.evaluate(()=>window.BlazingRoadRun.clearRun());
 const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
 if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
 await panel.waitFor({state:'visible',timeout:5000});
 await page.locator('#bbHomeApproved [data-mode="road"]').click();
 await page.waitForFunction(()=>{try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'}catch{return false}},{timeout:15000});
 await page.locator('#bbBattlePauseButton.visible').waitFor({state:'visible',timeout:5000});
 await page.waitForFunction(()=>!window.BlazingRoadCamera?.isCombatLocked?.(),null,{timeout:12000});
}
async function forcePlayerControls(page){
 await page.evaluate(()=>{
  const s=globalThis.eval('S'),front=globalThis.eval('front'),updateUI=globalThis.eval('updateUI');
  const pair=(s.pairs||[]).find(candidate=>front(candidate)?.name&&front(candidate).name!=='—');
  if(!pair)throw new Error('No live player pair available for battle-control smoke');
  const unit=front(pair);pair.gauge=100;unit.chakra=unit.maxChakra;
  s.phase='player';s.ready={kind:'pair',ref:pair,g:100};s.anim=null;s.drag=false;
  updateUI();window.BlazingBattleMobileControls.sync();
 });
 await page.waitForFunction(()=>{
  const controls=window.BlazingBattleMobileControls?.snapshot?.().controls||{};
  return ['reset','basic','jutsu','pause'].every(kind=>controls[kind]?.visible);
 },null,{timeout:5000});
}
async function inspect(page,safeOverride=null){
 return page.evaluate(async safe=>{
  const root=document.getElementById('battleScreen');
  if(safe){
   root.style.setProperty('--bb-battle-safe-top',`${safe.top}px`);
   root.style.setProperty('--bb-battle-safe-right',`${safe.right}px`);
   root.style.setProperty('--bb-battle-safe-bottom',`${safe.bottom}px`);
   root.style.setProperty('--bb-battle-safe-left',`${safe.left}px`);
  }
  window.BlazingBattleMobileControls.sync();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const snap=window.BlazingBattleMobileControls.snapshot();
  const controls={};
  for(const kind of ['reset','basic','jutsu','pause']){
   const selector=kind==='pause'?'#bbBattlePauseButton':`.bb-battle-control-${kind}`;
   const candidates=[...document.querySelectorAll(`#battleScreen ${selector}`)];
   const el=candidates.find(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0})||candidates[0];
   if(!el){controls[kind]=null;continue}
   const r=el.getBoundingClientRect(),cx=Math.min(innerWidth-1,Math.max(0,r.left+r.width/2)),cy=Math.min(innerHeight-1,Math.max(0,r.top+r.height/2));
   const hit=document.elementFromPoint(cx,cy);
   controls[kind]={rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},position:getComputedStyle(el).position,hit:hit===el||el.contains(hit),disabled:!!el.disabled,text:(el.textContent||'').replace(/\s+/g,' ').trim()};
  }
  const style=document.getElementById('bb-battle-mobile-controls-style')?.textContent||'';
  const canvas=document.getElementById(window.BlazingRoadCamera.snapshot().canvasId||'game');
  const before=Object.fromEntries(Object.entries(controls).map(([kind,value])=>[kind,value?.rect||null]));
  const oldScale=canvas?.style.scale||'',oldTransform=canvas?.style.transform||'';
  if(canvas){if('scale' in canvas.style)canvas.style.scale='1.28';else canvas.style.transform='scale(1.28)'}
  const after={};
  for(const kind of ['reset','basic','jutsu','pause']){
   const selector=kind==='pause'?'#bbBattlePauseButton':`.bb-battle-control-${kind}`;
   const el=[...document.querySelectorAll(`#battleScreen ${selector}`)].find(node=>getComputedStyle(node).display!=='none'&&node.getBoundingClientRect().width>0);
   if(!el){after[kind]=null;continue}const r=el.getBoundingClientRect();after[kind]={left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
  }
  if(canvas){canvas.style.scale=oldScale;canvas.style.transform=oldTransform}
  return {snap,controls,style,before,after,camera:window.BlazingRoadCamera.snapshot(),safe:safe||{top:0,right:0,bottom:0,left:0}};
 },safeOverride);
}
function assertGeometry(result,label){
 const {snap,controls,safe}=result,v=snap.viewport;
 const right=v.left+v.width,bottom=v.top+v.height;
 if(!/safe-area-inset-top/.test(result.style)||!/safe-area-inset-bottom/.test(result.style)||!/safe-area-inset-left/.test(result.style)||!/safe-area-inset-right/.test(result.style))throw new Error(`${label}: safe-area CSS contract missing`);
 if(!(result.camera?.targetScale>1.05))throw new Error(`${label}: Road camera was not zoomed during HUD assertion :: ${JSON.stringify(result.camera)}`);
 for(const kind of ['reset','basic','jutsu','pause']){
  const c=controls[kind];if(!c)throw new Error(`${label}: ${kind} control missing`);
  const r=c.rect;if(r.width<44||r.height<44)throw new Error(`${label}: ${kind} touch target too small :: ${JSON.stringify(r)}`);
  if(r.left<v.left+safe.left-1||r.top<v.top+safe.top-1||r.right>right-safe.right+1||r.bottom>bottom-safe.bottom+1)throw new Error(`${label}: ${kind} outside visible/safe viewport :: ${JSON.stringify({rect:r,viewport:v,safe})}`);
  if(!c.hit)throw new Error(`${label}: ${kind} center is occluded/not tappable :: ${JSON.stringify(c)}`);
  const a=result.before[kind],b=result.after[kind];
  if(!a||!b||Math.abs(a.left-b.left)>.6||Math.abs(a.top-b.top)>.6||Math.abs(a.width-b.width)>.6||Math.abs(a.height-b.height)>.6)throw new Error(`${label}: ${kind} moved/scaled with Road canvas :: ${JSON.stringify({before:a,after:b})}`);
 }
}
async function run(name,type){
 let browser;
 try{
  console.log(`Battle controls smoke START (${name}) -> ${BASE}`);
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
  await enterRoad(page);await forcePlayerControls(page);
  const normal=await inspect(page);assertGeometry(normal,`${name}/phone`);
  const simulated={top:26,right:18,bottom:30,left:18};
  const safe=await inspect(page,simulated);assertGeometry(safe,`${name}/phone-safe-area`);
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Battle controls smoke PASS (${name}): Reset/Basic/Jutsu/Pause stay tappable inside phone safe bounds and independent of Road canvas zoom.`);
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){try{await run(name,type)}catch(error){failed=true;console.error(`Battle controls smoke FAIL (${name}): ${error.stack||error.message}`)}}
if(failed)process.exit(1);
