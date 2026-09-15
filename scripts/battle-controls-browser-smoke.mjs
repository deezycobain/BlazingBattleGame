import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingRoadCamera==='object'&&typeof window.BlazingRoadTurns==='object'&&typeof window.BlazingBattleDock==='object'&&typeof window.BlazingBattlePause==='object',{timeout:30000});
}
async function enterRoad(page){
 await page.evaluate(()=>window.BlazingRoadRun.clearRun());
 const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
 if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
 await panel.waitFor({state:'visible',timeout:5000});
 await page.locator('#bbHomeApproved [data-mode="road"]').click();
 await page.waitForFunction(()=>{try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'}catch{return false}},{timeout:15000});
 await page.waitForFunction(()=>!window.BlazingRoadCamera?.isCombatLocked?.(),null,{timeout:12000});
 await page.locator('#bbBattleDock').waitFor({state:'visible',timeout:5000});
}
async function forceCurrentPlayer(page){
 return page.evaluate(()=>{
  const s=globalThis.eval('S'),front=globalThis.eval('front'),updateUI=globalThis.eval('updateUI'),R=window.BlazingRoadTurns;
  if(!window.BlazingBattlePause.isPaused())window.BlazingBattlePause.pause();
  const refFor=current=>current?.kind==='pair'
   ? s.pairs.find(pair=>front(pair)?.name===current.name)
   : s.enemies.find(enemy=>enemy?.name===current?.name&&enemy.hp>0);
  for(let i=0;i<24;i++){
   const snap=R.snapshot({limit:20}),current=snap.current,ref=refFor(current);
   if(!current||!ref)return {error:'initiative actor could not be resolved',snap};
   if(current.kind==='pair'){
    const unit=front(ref);unit.chakra=unit.maxChakra;ref.gauge=100;s.ready={kind:'pair',ref,g:100};s.phase='player';s.anim=null;s.drag=false;
    updateUI();window.BlazingBattleDock.sync();
    return {ok:true,name:unit.name,round:snap.round,speed:current.speed};
   }
   ref.gauge=100;s.ready={kind:'enemy',ref,g:100};s.phase='cpu';R.sync();ref.gauge=0;s.ready=null;s.phase='charge';R.sync();
  }
  return {error:'no player turn reached'};
 });
}
async function inspect(page){
 return page.evaluate(async()=>{
  window.BlazingBattleDock.sync();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const root=document.getElementById('battleScreen'),field=document.getElementById('bbBattleField'),dock=document.getElementById('bbBattleDock'),active=dock.querySelector('.bb-dock-unit.active'),portrait=active?.querySelector('.bb-dock-portrait'),turns=dock.querySelector('.bb-dock-turns'),health=dock.querySelector('.bb-team-health');
  const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
  const shared=window.BlazingRoadSharedHp?.snapshot?.()||{};
  const canvas=document.getElementById('game'),dockBefore=rect(dock),portraitBefore=rect(portrait),oldScale=canvas?.style.scale||'',oldTransform=canvas?.style.transform||'';
  if(canvas){if('scale' in canvas.style)canvas.style.scale='1.28';else canvas.style.transform='scale(1.28)'}
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const dockAfter=rect(dock),portraitAfter=rect(portrait);
  if(canvas){canvas.style.scale=oldScale;canvas.style.transform=oldTransform}
  const actionRow=dock.querySelector('.bb-dock-actions'),meter=document.getElementById('meter'),legacyNormal=document.getElementById('normal'),legacyJutsu=document.getElementById('jutsu');
  return {
   field:rect(field),dock:dockBefore,dockAfter,portrait:portraitBefore,portraitAfter,
   viewport:{width:visualViewport?.width||innerWidth,height:visualViewport?.height||innerHeight,top:visualViewport?.offsetTop||0,left:visualViewport?.offsetLeft||0},
   turnMode:turns?.dataset.mode||null,turnLabels:[...dock.querySelectorAll('.bb-turn-chip')].map(el=>({text:(el.textContent||'').replace(/\s+/g,' ').trim(),current:el.classList.contains('current'),next:el.classList.contains('next')})),
   activeName:active?.querySelector('small')?.textContent||null,activePressed:active?.getAttribute('aria-pressed')||null,activeDisabled:!!active?.disabled,
   chakraBackground:portrait?.style.backgroundImage||'',chakraText:active?.querySelector(':scope>em')?.textContent||'',
   hp:Number(health?.getAttribute('aria-valuenow')),max:Number(health?.getAttribute('aria-valuemax')),sharedHp:Number(shared.hp),sharedMax:Number(shared.maxHp),
   hidden:{actions:getComputedStyle(actionRow).display,meter:getComputedStyle(meter).display,normal:legacyNormal?getComputedStyle(legacyNormal).display:null,jutsu:legacyJutsu?getComputedStyle(legacyJutsu).display:null},
   style:await (await fetch('runtime/ui/battle/battle-dock.css')).text(),rootActive:root.classList.contains('active'),round:window.BlazingRoadTurns.snapshot({limit:20})
  };
 });
}
function sameRect(a,b,t=.75){return a&&b&&Math.abs(a.left-b.left)<=t&&Math.abs(a.top-b.top)<=t&&Math.abs(a.width-b.width)<=t&&Math.abs(a.height-b.height)<=t}
function assertLayout(result,label){
 if(!result.rootActive||!result.field||!result.dock||result.field.bottom>result.dock.top+1)throw new Error(`${label}: field/dock geometry invalid :: ${JSON.stringify(result)}`);
 if(result.turnMode!=='round'||!result.turnLabels.length||!result.turnLabels[0].current)throw new Error(`${label}: round initiative strip missing :: ${JSON.stringify(result.turnLabels)}`);
 if(!result.portrait||result.portrait.width<52||result.portrait.height<52||result.activeDisabled)throw new Error(`${label}: active portrait is not a usable touch target :: ${JSON.stringify(result)}`);
 if(!/conic-gradient/i.test(result.chakraBackground)||result.chakraText.trim())throw new Error(`${label}: segmented chakra ring/numeric suppression failed :: ${JSON.stringify({bg:result.chakraBackground,text:result.chakraText})}`);
 if(Math.abs(result.hp-result.sharedHp)>.01||Math.abs(result.max-result.sharedMax)>.01)throw new Error(`${label}: shared Road HP is not dock authority :: ${JSON.stringify(result)}`);
 if(result.hidden.actions!=='none'||result.hidden.meter!=='none')throw new Error(`${label}: legacy meter/action row leaked into portrait HUD :: ${JSON.stringify(result.hidden)}`);
 if(!sameRect(result.dock,result.dockAfter)||!sameRect(result.portrait,result.portraitAfter))throw new Error(`${label}: HUD moved/scaled with battlefield camera :: ${JSON.stringify({dock:[result.dock,result.dockAfter],portrait:[result.portrait,result.portraitAfter]})}`);
 if(!/safe-area-inset-top/.test(result.style)||!/safe-area-inset-bottom/.test(result.style))throw new Error(`${label}: mobile safe-area contract missing`);
}
async function toggleJutsuViaPortrait(page){
 return page.evaluate(async()=>{
  const active=document.querySelector('#bbBattleDock .bb-dock-unit.active');if(!active)return {error:'active portrait missing'};
  const before={pressed:active.getAttribute('aria-pressed'),armed:active.classList.contains('armed')};
  active.click();await new Promise(resolve=>setTimeout(resolve,80));window.BlazingBattleDock.sync();
  const after={pressed:active.getAttribute('aria-pressed'),armed:active.classList.contains('armed')};
  return {before,after};
 });
}
async function run(name,type){
 let browser;
 try{
  console.log(`Battle dock smoke START (${name}) -> ${BASE}`);
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
  await enterRoad(page);const forced=await forceCurrentPlayer(page);if(forced.error)throw new Error(`could not prepare player initiative turn: ${JSON.stringify(forced)}`);
  const phone=await inspect(page);assertLayout(phone,`${name}/phone`);
  const jutsu=await toggleJutsuViaPortrait(page);if(jutsu.error||(!jutsu.after.armed&&jutsu.after.pressed!=='true'))throw new Error(`portrait Jutsu toggle failed: ${JSON.stringify(jutsu)}`);
  await fs.mkdir('test-artifacts',{recursive:true});await page.screenshot({path:`test-artifacts/road-dock-${name}.png`});
  await page.setViewportSize({width:1366,height:900});await page.waitForTimeout(180);
  const desktop=await inspect(page);assertLayout(desktop,`${name}/desktop`);
  await page.evaluate(()=>window.BlazingBattlePause?.resume?.());
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Battle dock smoke PASS (${name}): portrait-driven Jutsu, segmented chakra, shared HP, round initiative, and camera-independent HUD verified.`);
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){try{await run(name,type)}catch(error){failed=true;console.error(`Battle dock smoke FAIL (${name}): ${error.stack||error.message}`)}}
if(failed)process.exit(1);
