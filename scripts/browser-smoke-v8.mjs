import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const SELECT=(process.env.BB_SMOKE_BROWSER||'').trim().toLowerCase();
const HARD_TIMEOUT_MS=Number(process.env.BB_SMOKE_HARD_TIMEOUT_MS||90000);
const SELF=fileURLToPath(import.meta.url);
const TYPES={chromium,webkit};

function runIsolated(name){
  return new Promise(resolve=>{
    const child=spawn(process.execPath,[SELF],{env:{...process.env,BB_SMOKE_BROWSER:name},stdio:'inherit'});
    let timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},HARD_TIMEOUT_MS);
    child.on('exit',(code,signal)=>{clearTimeout(timer);if(timedOut){console.error(`Home v9 smoke FAIL (${name}): timeout`);return resolve(false)};if(code===0)return resolve(true);console.error(`Home v9 smoke FAIL (${name}): exit=${code} signal=${signal||'none'}`);resolve(false)});
    child.on('error',error=>{clearTimeout(timer);console.error(`Home v9 smoke FAIL (${name}): ${error.message}`);resolve(false)});
  });
}

async function waitHome(page){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingApprovedHomeCompat==='object'&&typeof window.BlazingHomeLivePolish==='object'&&typeof window.BlazingHomeV8==='object'&&typeof window.BlazingHomeV9==='object',{timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#bbHomeApproved')?.dataset?.bbHomeLayout==='v9-polish',{timeout:10000});
  await page.waitForFunction(()=>{
    const images=[...document.querySelectorAll('#bbHomeApproved img')];
    return images.length>0&&images.every(img=>img.complete);
  },{timeout:10000});
  await waitPresentationDecode(page);
  await page.waitForTimeout(100);
}

async function waitPresentationDecode(page){
  await page.waitForFunction(()=>{
    const art=document.querySelector('#bbHomeApproved [data-v5-leader-art]');
    return !!art&&art.naturalWidth>0&&art.naturalHeight>0;
  },{timeout:15000});
}

async function assertHome(page,label){
  const state=await page.evaluate(()=>{
    const root=document.querySelector('#menuScreen.bb-home-v4');
    const shell=document.querySelector('#bbHomeApproved');
    const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const nav={};for(const key of ['battle','summon','units','forge'])nav[key]=rect(shell?.querySelector(`[data-nav="${key}"]`));
    const center=shell?.querySelector('.bb-home-v4-center');
    const dock=rect(shell?.querySelector('.bb-home-v4-dock'));
    const leader=rect(shell?.querySelector('.bb-home-v5-leader'));
    const gate=shell?.querySelector('#bbHomeProfileGate');
    const profileName=shell?.querySelector('.bb-home-v5-profile-copy strong')?.textContent?.trim()||'';
    const profileKicker=shell?.querySelector('.bb-home-v5-profile-copy small')?.textContent?.trim()||'';
    const leaderSrc=shell?.querySelector('[data-v5-leader-art]')?.getAttribute('src')||'';
    const baked=[shell?.querySelector('.bb-home-v5-profile-texture'),...shell?.querySelectorAll('.bb-home-v5-currency>img')||[]].filter(Boolean);
    const hidden=el=>!el||el.hidden||getComputedStyle(el).display==='none'||getComputedStyle(el).visibility==='hidden';
    const coins=shell?.querySelector('[data-v9-currency="blazing-coins"]');
    const embers=shell?.querySelector('[data-v9-currency="embers"]');
    const currencyState=el=>({label:el?.querySelector('.bb-home-v5-currency-copy small')?.textContent?.trim()||'',value:el?.querySelector('strong')?.textContent?.trim()||'',icon:!!el?.querySelector('.bb-home-v5-currency-icon svg')});
    const images=[...shell?.querySelectorAll('img')||[]].map(img=>({src:img.getAttribute('src')||'',complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}));
    return {
      viewport:{width:innerWidth,height:innerHeight},dock,leader,nav,
      v8Style:!!document.querySelector('#bb-home-v8-style'),v9Style:!!document.querySelector('#bb-home-v9-style'),
      v8Runtime:typeof window.BlazingHomeV8?.apply==='function',v9Runtime:typeof window.BlazingHomeV9?.apply==='function',
      layout:shell?.dataset?.bbHomeLayout||'',currencyMode:shell?.dataset?.bbHomeCurrency||'',centerHidden:hidden(center),
      profileReady:shell?.dataset?.bbPlayerProfile||'',gateHidden:hidden(gate),profileName,profileKicker,leaderSrc,bakedHidden:baked.every(hidden),images,
      coins:currencyState(coins),embers:currencyState(embers),
      background:root?getComputedStyle(root,'::before').backgroundImage:'',
      legacy:{level1:!!document.querySelector('#level1Btn'),boss1:!!document.querySelector('#boss1Btn'),summon:!!document.querySelector('#summonsBtn'),inventory:!!document.querySelector('#inventoryBtn'),forge:!!document.querySelector('#forgeBtn')}
    };
  });
  const {width:vw,height:vh}=state.viewport;
  if(!state.v8Style||!state.v8Runtime||!state.v9Style||!state.v9Runtime||state.layout!=='v9-polish')throw new Error(`${label}: Home v9 runtime/style missing :: ${JSON.stringify(state)}`);
  if(!state.profileReady||!state.gateHidden||state.profileKicker!=='PLAYER'||!state.profileName)throw new Error(`${label}: webdriver profile bootstrap failed :: ${JSON.stringify({profileReady:state.profileReady,gateHidden:state.gateHidden,profileKicker:state.profileKicker,profileName:state.profileName})}`);
  if(!/runtime\/ui\/home\/home-wallpaper-hq\.png/i.test(state.background))throw new Error(`${label}: original parallax wallpaper missing :: ${state.background}`);
  if(!/foreground_cutout/i.test(state.leaderSrc))throw new Error(`${label}: Home leader is not using a presentation cutout :: ${state.leaderSrc}`);
  if(!state.centerHidden)throw new Error(`${label}: duplicate center battle CTA is still visible`);
  if(!state.bakedHidden)throw new Error(`${label}: baked HUD textures are still visible`);
  if(state.currencyMode!=='blazing-coins'||state.coins.label!=='BLAZING COINS'||!state.coins.icon)throw new Error(`${label}: Blazing Coins HUD incomplete :: ${JSON.stringify(state.coins)}`);
  if(state.embers.label!=='EMBERS'||!state.embers.icon)throw new Error(`${label}: Embers HUD incomplete :: ${JSON.stringify(state.embers)}`);
  if(!state.dock||state.dock.x<-1||state.dock.right>vw+1||state.dock.bottom>vh+1)throw new Error(`${label}: dock outside viewport :: ${JSON.stringify(state.dock)}`);
  if(!state.leader||state.leader.right>vw+1||state.leader.bottom>state.dock.y+18)throw new Error(`${label}: leader is not grounded above dock :: ${JSON.stringify({leader:state.leader,dock:state.dock})}`);
  const n=state.nav;for(const key of Object.keys(n)){const r=n[key];if(!r||r.width<58||r.height<30||r.x<-1||r.right>vw+1||r.y<-1||r.bottom>vh+1)throw new Error(`${label}: invalid ${key} target :: ${JSON.stringify(r)}`)}
  const right=[n.summon,n.units,n.forge];
  if(Math.max(...right.map(r=>r.x))-Math.min(...right.map(r=>r.x))>10)throw new Error(`${label}: right nav stack is not vertically aligned :: ${JSON.stringify(right)}`);
  if(!(n.summon.y<n.units.y&&n.units.y<n.forge.y))throw new Error(`${label}: Summon/Units/Forge are not stacked :: ${JSON.stringify(right)}`);
  if(n.battle.x>=n.summon.x||n.battle.right>n.summon.x+20)throw new Error(`${label}: Battle is not the left dominant action :: ${JSON.stringify(n)}`);
  if(n.battle.height<n.forge.bottom-n.summon.y-12)throw new Error(`${label}: Battle does not span the stacked nav height :: ${JSON.stringify(n)}`);
  if(n.battle.width>vw*.66)throw new Error(`${label}: Battle action remains oversized :: ${JSON.stringify(n.battle)}`);
  const broken=state.images.filter(img=>img.naturalWidth<=0||img.naturalHeight<=0);if(broken.length)throw new Error(`${label}: broken Home images :: ${JSON.stringify(broken.slice(0,8))}`);
  for(const required of Object.keys(state.legacy))if(!state.legacy[required])throw new Error(`${label}: legacy route anchor ${required} missing`);
  console.log(`Home v9 smoke PASS (${label}): formal HUD + grounded cutout + Blazing Coins/Embers + restrained dock`);
}

async function exerciseBattle(page,label){
  await page.locator('#bbHomeApproved [data-nav="battle"]').click();
  const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
  await panel.waitFor({state:'visible',timeout:5000});
  const labels=await page.locator('#bbHomeApproved .bb-home-v4-modes').innerText();
  if(!/BLAZING\s+ROAD/i.test(labels)||!/PHANTOM\s+CASTLE/i.test(labels))throw new Error(`${label}: battle mode labels missing`);
  await page.locator('#bbHomeApproved [data-close-battle]').click();await panel.waitFor({state:'hidden',timeout:5000});
}

async function exerciseViewport(browser,name,label,contextOptions){
  const errors=[];
  const context=await browser.newContext(contextOptions);
  try{
    const page=await context.newPage();
    page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});if(response&&!response.ok())throw new Error(`root HTTP ${response.status()}`);
    await waitHome(page);
    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
    await assertHome(page,`${name}/${label}`);await exerciseBattle(page,`${name}/${label}`);
    if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  }finally{await context.close().catch(()=>{})}
}

async function run(name,type){
  let browser;
  try{
    browser=await type.launch({headless:true,timeout:15000});
    await exerciseViewport(browser,name,'phone',{viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
    await exerciseViewport(browser,name,'desktop',{viewport:{width:1366,height:900},isMobile:false,hasTouch:false});
  }finally{if(browser)await browser.close().catch(()=>{})}
}

if(!SELECT){
  let ok=true;for(const name of Object.keys(TYPES))if(!await runIsolated(name))ok=false;if(!ok)process.exit(1);process.exit(0);
}
if(!TYPES[SELECT]){console.error(`Unknown browser ${SELECT}`);process.exit(2)}
run(SELECT,TYPES[SELECT]).catch(error=>{console.error(`Home v9 smoke FAIL (${SELECT}): ${error.stack||error.message}`);process.exit(1)});
