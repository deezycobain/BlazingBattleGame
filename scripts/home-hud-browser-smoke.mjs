import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const SELECT=(process.env.BB_SMOKE_BROWSER||'').trim().toLowerCase();
const HARD_TIMEOUT_MS=Number(process.env.BB_SMOKE_HARD_TIMEOUT_MS||70000);
const SELF=fileURLToPath(import.meta.url);
const TYPES={chromium,webkit};
const PROFILE_KEY='bb_player_profile_v1';
const TEST_PROFILE=Object.freeze({username:'ScrollTester',level:7,createdAt:1700000000000});
const EXPECTED=Object.freeze({
 profile:'/assets/ui/home/hud/player-profile-scroll.png',
 coins:'/assets/ui/home/hud/gold-currency-scroll.png',
 embers:'/assets/ui/home/hud/embers-currency-scroll.png'
});

function runIsolated(name){
 return new Promise(resolve=>{
  const child=spawn(process.execPath,[SELF],{env:{...process.env,BB_SMOKE_BROWSER:name},stdio:'inherit'});
  let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},HARD_TIMEOUT_MS);
  child.on('exit',(code,signal)=>{clearTimeout(timer);if(timedOut){console.error(`Home scroll HUD smoke FAIL (${name}): timeout`);return resolve(false)}if(code===0)return resolve(true);console.error(`Home scroll HUD smoke FAIL (${name}): exit=${code} signal=${signal||'none'}`);resolve(false)});
  child.on('error',error=>{clearTimeout(timer);console.error(`Home scroll HUD smoke FAIL (${name}): ${error.message}`);resolve(false)});
 });
}

async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>window.BlazingHomeScrollHud?.VERSION==='v2'&&typeof window.BlazingHomeV8==='object'&&typeof window.BlazingHomeV9==='object'&&typeof window.BlazingEconomy==='object',{timeout:30000});
 await page.waitForFunction(()=>document.getElementById('bbHomeApproved')?.dataset?.bbHudAssets==='approved-runtime',{timeout:10000});
}

async function seedLiveData(page){
 await page.evaluate(({profile,key})=>{
  localStorage.setItem(key,JSON.stringify(profile));
  const state=window.BlazingEconomy.load();
  state.battleMarks=4321;
  state.lifetimeEarned=Math.max(Number(state.lifetimeEarned)||0,4321);
  state.embers=17;
  window.BlazingEconomy.save(state);
  window.dispatchEvent(new CustomEvent('bb:player-profile',{detail:profile}));
  window.BlazingApprovedHomeCompat?.apply?.();
  window.BlazingHomeV8?.apply?.();
  window.BlazingHomeV9?.apply?.();
  window.BlazingHomeScrollHud?.apply?.();
 },{profile:TEST_PROFILE,key:PROFILE_KEY});
 await page.waitForFunction(({username,level})=>{
  const shell=document.getElementById('bbHomeApproved');
  const copy=shell?.querySelector('.bb-home-v5-profile-copy');
  const coin=shell?.querySelector('[data-v9-currency="blazing-coins"] [data-v5-marks]');
  const embers=shell?.querySelector('[data-v9-currency="embers"] [data-v5-embers]');
  return copy?.querySelector('strong')?.textContent?.trim()===username&&copy?.querySelector('.bb-home-v5-profile-meta b')?.textContent?.trim()===`LV ${level}`&&coin?.textContent?.trim()==='4,321'&&embers?.textContent?.trim()==='17';
 },TEST_PROFILE,{timeout:10000});
}

async function snapshot(page,requests){
 return page.evaluate(({expected,requestUrls})=>{
  const shell=document.getElementById('bbHomeApproved');
  const hidden=el=>!el||el.hidden||getComputedStyle(el).display==='none'||getComputedStyle(el).visibility==='hidden'||Number(getComputedStyle(el).opacity||1)<=0;
  const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
  const describe=img=>img?{src:img.getAttribute('src')||'',currentSrc:img.currentSrc||'',hidden:hidden(img),complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}:null;
  const background=el=>el?getComputedStyle(el).backgroundImage:'';
  const coins=shell?.querySelector('[data-v9-currency="blazing-coins"]');
  const embers=shell?.querySelector('[data-v9-currency="embers"]');
  const profileImg=shell?.querySelector('.bb-home-v5-profile-texture');
  const coinImg=coins?.querySelector(':scope>img');
  const emberImg=embers?.querySelector(':scope>img');
  const profileCopy=shell?.querySelector('.bb-home-v5-profile-copy');
  const utility={};
  for(const key of ['missions','inbox','shop','settings']){
   const button=shell?.querySelector(`[data-util="${key}"]`);
   const visibleCounts=button?[...button.querySelectorAll('[data-count],.badge,[class*="count" i],[class*="notification" i]')].filter(el=>!hidden(el)).map(el=>el.textContent?.trim()||''):[];
   utility[key]={box:rect(button),text:button?.innerText?.trim()||'',aria:button?.getAttribute('aria-label')||'',visibleCounts};
  }
  const resourceUrls=[...performance.getEntriesByType('resource')].map(entry=>entry.name);
  const domUrls=[...document.querySelectorAll('[src],[href]')].flatMap(el=>[el.getAttribute('src'),el.getAttribute('href')]).filter(Boolean);
  const allUrls=[...resourceUrls,...domUrls,...requestUrls];
  const referenceUrls=[...new Set(allUrls.filter(url=>/assets\/ui\/home\/reference\//i.test(String(url))))];
  const economy=window.BlazingEconomy?.load?.()||{};
  const style=document.getElementById('bb-home-scroll-hud-style')?.textContent||'';
  return {
   viewport:{width:innerWidth,height:innerHeight},
   hud:rect(shell?.querySelector('.bb-home-v5-hud')),
   profileBox:rect(shell?.querySelector('.bb-home-v5-profile')),
   coinsBox:rect(coins),embersBox:rect(embers),
   profile:describe(profileImg),coins:describe(coinImg),embers:describe(emberImg),
   backgrounds:{profile:background(shell?.querySelector('.bb-home-v5-profile')),coins:background(coins),embers:background(embers)},
   labels:{coins:coins?.querySelector('small')?.textContent?.trim()||'',embers:embers?.querySelector('small')?.textContent?.trim()||''},
   values:{coins:coins?.querySelector('[data-v5-marks]')?.textContent?.trim()||'',embers:embers?.querySelector('[data-v5-embers]')?.textContent?.trim()||''},
   player:{name:profileCopy?.querySelector('strong')?.textContent?.trim()||'',level:profileCopy?.querySelector('.bb-home-v5-profile-meta b')?.textContent?.trim()||''},
   economy:{battleMarks:Number(economy.battleMarks)||0,embers:Number(economy.embers)||0,hasBattleMarks:Object.prototype.hasOwnProperty.call(economy,'battleMarks')},
   skin:shell?.dataset?.bbHudSkin||'',assetsMode:shell?.dataset?.bbHudAssets||'',layout:shell?.dataset?.bbHomeLayout||'',
   referenceUrls,utility,
   socialHidden:hidden(shell?.querySelector('.bb-home-v4-social')),
   styleSafe:/safe-area-inset-top/.test(style)&&/safe-area-inset-left/.test(style)&&/safe-area-inset-right/.test(style),
   expected
  };
 },{expected:EXPECTED,requestUrls:requests});
}

function assertAsset(name,asset,background,expectedPath){
 if(!asset)throw new Error(`${name} source asset missing`);
 const path=new URL(asset.currentSrc||asset.src,'https://example.invalid').pathname;
 if(path!==expectedPath)throw new Error(`${name} source path wrong: ${JSON.stringify(asset)}`);
 if(!asset.hidden||!asset.complete||asset.naturalWidth<2000||asset.naturalHeight<700)throw new Error(`${name} approved source must stay hidden but loaded at full resolution: ${JSON.stringify(asset)}`);
 if(!String(background||'').includes(expectedPath))throw new Error(`${name} approved parchment is not the visible background: ${background}`);
}

async function exercise(browser,name,label,contextOptions){
 const context=await browser.newContext(contextOptions);
 const requests=[];
 try{
  const page=await context.newPage();
  page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  page.on('request',request=>requests.push(request.url()));
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
  if(response&&!response.ok())throw new Error(`root HTTP ${response.status()}`);
  await waitHome(page);
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
  await seedLiveData(page);
  // Exercise the legacy writer repeatedly: player identity must never flicker
  // back to fighter identity, even before the final HUD observer runs.
  for(let i=0;i<4;i++){
   const identity=await page.evaluate(()=>{
    window.BlazingApprovedHomeCompat.apply();
    const copy=document.querySelector('.bb-home-v5-profile-copy');
    return {name:copy.querySelector('strong').textContent,level:copy.querySelector('b').textContent};
   });
   if(identity.name!==TEST_PROFILE.username||identity.level!==`LV ${TEST_PROFILE.level}`)throw new Error(`legacy writer changed player identity: ${JSON.stringify(identity)}`);
   await page.waitForTimeout(100);
  }
  const state=await snapshot(page,requests);
  await page.evaluate(()=>{
   for(const card of document.querySelectorAll('.bb-home-v5-currency,.bb-home-v5-profile')){
    const parent=card.getBoundingClientRect(),currency=card.classList.contains('bb-home-v5-currency');
    for(const el of card.querySelectorAll(currency?'.bb-home-v5-currency-copy small,.bb-home-v5-currency-copy strong':'.bb-home-v5-profile-copy small,.bb-home-v5-profile-copy strong')){
     const range=document.createRange();range.selectNodeContents(el);const r=range.getBoundingClientRect();
     if(r.left<parent.left+parent.width*.37||r.right>parent.left+parent.width*.87||r.top<parent.top+parent.height*.20||r.bottom>parent.top+parent.height*.63)throw new Error(`Text outside authored parchment region: ${el.textContent} ${JSON.stringify({parent:parent.toJSON(),text:r.toJSON()})}`);
    }
   }
  });
  assertAsset(`${name}/${label} profile`,state.profile,state.backgrounds.profile,EXPECTED.profile);
  assertAsset(`${name}/${label} Blazing Coins`,state.coins,state.backgrounds.coins,EXPECTED.coins);
  assertAsset(`${name}/${label} Embers`,state.embers,state.backgrounds.embers,EXPECTED.embers);
  if(state.skin!=='scroll-red-black'||state.assetsMode!=='approved-runtime'||state.layout!=='v9-polish')throw new Error(`${name}/${label}: final Home HUD owner missing :: ${JSON.stringify(state)}`);
  if(!state.styleSafe)throw new Error(`${name}/${label}: scroll HUD CSS lost safe-area ownership`);
  if(state.labels.coins!=='BLAZING COINS'||state.labels.embers!=='EMBERS')throw new Error(`${name}/${label}: currency labels wrong :: ${JSON.stringify(state.labels)}`);
  if(state.player.name!==TEST_PROFILE.username||state.player.level!==`LV ${TEST_PROFILE.level}`)throw new Error(`${name}/${label}: real player profile/level binding regressed :: ${JSON.stringify(state.player)}`);
  if(!state.economy.hasBattleMarks||state.economy.battleMarks!==4321||state.values.coins!=='4,321'||state.economy.embers!==17||state.values.embers!=='17')throw new Error(`${name}/${label}: battleMarks/Embers binding regressed :: ${JSON.stringify({economy:state.economy,values:state.values})}`);
  if(state.referenceUrls.length)throw new Error(`${name}/${label}: design-only reference asset was loaded :: ${JSON.stringify(state.referenceUrls)}`);
  for(const key of ['missions','inbox']){
   const item=state.utility[key];
   if(!item||/\d/.test(`${item.text} ${item.aria}`)||item.visibleCounts.length)throw new Error(`${name}/${label}: fake ${key} count/badge present :: ${JSON.stringify(item)}`);
  }
  const vw=state.viewport.width,vh=state.viewport.height;
  if(!state.socialHidden)throw new Error('unfinished social controls remain visible');
  for(const [key,item] of Object.entries(state.utility)){
   const r=item.box;
   if(!r||r.left<0||r.right>vw||r.top<0||r.bottom>vh||r.width<44||r.height<44)throw new Error(`utility ${key} clipped or undersized: ${JSON.stringify(r)}`);
  }
  for(const [key,r] of Object.entries({hud:state.hud,profile:state.profileBox,coins:state.coinsBox,embers:state.embersBox})){
   if(!r||r.left<-1||r.right>vw+1||r.top<-1||r.bottom>vh+1)throw new Error(`${name}/${label}: ${key} outside viewport :: ${JSON.stringify({r,viewport:state.viewport})}`);
  }
  if(errors.length)throw new Error(`${name}/${label}: pageerror: ${errors.join(' | ')}`);
  await mkdir('test-artifacts',{recursive:true});
  await page.locator('.bb-home-v4-dock img').evaluateAll(async images=>{
   await Promise.all(images.map(img=>img.decode()));
  });
  await page.screenshot({path:`test-artifacts/home-${name}-${label}.png`});
  console.log(`Home scroll HUD smoke PASS (${name}/${label}): approved 2172px parchment assets + real profile + battleMarks->Blazing Coins + no reference assets/fake counts`);
 }finally{await context.close().catch(()=>{})}
}

async function run(name,type){
 let browser;
 try{
  browser=await type.launch({headless:true,timeout:15000});
  await exercise(browser,name,'phone',{viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  await exercise(browser,name,'desktop',{viewport:{width:1366,height:900},isMobile:false,hasTouch:false});
 }finally{if(browser)await browser.close().catch(()=>{})}
}

if(!SELECT){let ok=true;for(const name of Object.keys(TYPES))if(!await runIsolated(name))ok=false;if(!ok)process.exit(1);process.exit(0)}
if(!TYPES[SELECT]){console.error(`Unknown browser ${SELECT}`);process.exit(2)}
run(SELECT,TYPES[SELECT]).catch(error=>{console.error(`Home scroll HUD smoke FAIL (${SELECT}): ${error.stack||error.message}`);process.exit(1)});
