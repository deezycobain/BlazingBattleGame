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
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},HARD_TIMEOUT_MS);
  child.on('exit',(code,signal)=>{clearTimeout(timer);if(timedOut){console.error(`Home v9 smoke FAIL (${name}): timeout`);return resolve(false)}if(code===0)return resolve(true);console.error(`Home v9 smoke FAIL (${name}): exit=${code} signal=${signal||'none'}`);resolve(false)});
  child.on('error',error=>{clearTimeout(timer);console.error(`Home v9 smoke FAIL (${name}): ${error.message}`);resolve(false)});
 });
}
async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>typeof window.BlazingApprovedHomeCompat==='object'&&typeof window.BlazingHomeLivePolish==='object'&&typeof window.BlazingHomeV8==='object'&&typeof window.BlazingHomeV9==='object'&&typeof window.BlazingHomeFeedbackFixes==='object',{timeout:30000});
 await page.waitForFunction(()=>document.querySelector('#bbHomeApproved')?.dataset?.bbHomeLayout==='v9-polish'&&document.querySelector('#bbHomeApproved')?.dataset?.bbHomeFeedback==='r1',{timeout:10000});
 await page.waitForTimeout(300);
}
async function assertHome(page,label){
 const state=await page.evaluate(()=>{
  const root=document.querySelector('#menuScreen.bb-home-v4'),shell=document.querySelector('#bbHomeApproved');
  const hidden=el=>!el||el.hidden||getComputedStyle(el).display==='none'||getComputedStyle(el).visibility==='hidden';
  const visible=el=>{if(!el||hidden(el))return false;const r=el.getBoundingClientRect();return Number(getComputedStyle(el).opacity||1)>0&&r.width>0&&r.height>0};
  const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
  const nav={};for(const key of ['battle','summon','units','forge'])nav[key]=rect(shell?.querySelector(`[data-nav="${key}"]`));
  const baked=[shell?.querySelector('.bb-home-v5-profile-texture'),...shell?.querySelectorAll('.bb-home-v5-currency>img')||[]].filter(Boolean);
  const currencyState=el=>({label:el?.querySelector('.bb-home-v5-currency-copy small')?.textContent?.trim()||'',value:el?.querySelector('strong')?.textContent?.trim()||'',icon:!!el?.querySelector('.bb-home-v5-currency-icon svg')});
  const images=[...shell?.querySelectorAll('img')||[]].map(img=>({src:img.getAttribute('src')||'',complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,visible:visible(img)}));
  const leader=shell?.querySelector('.bb-home-v5-leader');
  return {
   viewport:{width:innerWidth,height:innerHeight},dock:rect(shell?.querySelector('.bb-home-v4-dock')),leaderHidden:hidden(leader),nav,
   layout:shell?.dataset?.bbHomeLayout||'',feedback:shell?.dataset?.bbHomeFeedback||'',currencyMode:shell?.dataset?.bbHomeCurrency||'',
   centerHidden:hidden(shell?.querySelector('.bb-home-v4-center')),profileReady:shell?.dataset?.bbPlayerProfile||'',gateHidden:hidden(shell?.querySelector('#bbHomeProfileGate')),
   profileName:shell?.querySelector('.bb-home-v5-profile-copy strong')?.textContent?.trim()||'',profileKicker:shell?.querySelector('.bb-home-v5-profile-copy small')?.textContent?.trim()||'',
   bakedHidden:baked.every(hidden),coins:currencyState(shell?.querySelector('[data-v9-currency="blazing-coins"]')),embers:currencyState(shell?.querySelector('[data-v9-currency="embers"]')),
   background:root?getComputedStyle(root,'::before').backgroundImage:'',images,
   legacy:{level1:!!document.querySelector('#level1Btn'),boss1:!!document.querySelector('#boss1Btn'),summon:!!document.querySelector('#summonsBtn'),inventory:!!document.querySelector('#inventoryBtn'),forge:!!document.querySelector('#forgeBtn')}
  };
 });
 const {width:vw,height:vh}=state.viewport,n=state.nav;
 if(state.layout!=='v9-polish'||state.feedback!=='r1')throw new Error(`${label}: Home feedback runtime missing :: ${JSON.stringify(state)}`);
 if(!state.profileReady||!state.gateHidden||state.profileKicker!=='PLAYER'||!state.profileName)throw new Error(`${label}: profile bootstrap failed :: ${JSON.stringify(state)}`);
 if(!/assets\/ui\/home\/backgrounds\/home-wallpaper-v2\.png/i.test(state.background))throw new Error(`${label}: approved Home wallpaper missing :: ${state.background}`);
 if(!state.leaderHidden)throw new Error(`${label}: Home leader presentation should be hidden`);
 if(!state.centerHidden)throw new Error(`${label}: duplicate center battle CTA is visible`);
 if(!state.bakedHidden)throw new Error(`${label}: baked HUD textures are visible`);
 if(state.currencyMode!=='blazing-coins'||state.coins.label!=='BLAZING COINS'||!state.coins.icon)throw new Error(`${label}: Blazing Coins HUD incomplete :: ${JSON.stringify(state.coins)}`);
 if(state.embers.label!=='EMBERS'||!state.embers.icon)throw new Error(`${label}: Embers HUD incomplete :: ${JSON.stringify(state.embers)}`);
 if(!state.dock||state.dock.x<-1||state.dock.right>vw+1||state.dock.bottom>vh+1)throw new Error(`${label}: dock outside viewport :: ${JSON.stringify(state.dock)}`);
 for(const key of Object.keys(n)){const r=n[key];if(!r||r.width<58||r.height<30||r.x<-1||r.right>vw+1||r.y<-1||r.bottom>vh+1)throw new Error(`${label}: invalid ${key} target :: ${JSON.stringify(r)}`)}
 const right=[n.summon,n.units,n.forge];
 if(!(n.summon.y<n.units.y&&n.units.y<n.forge.y))throw new Error(`${label}: right actions are not stacked :: ${JSON.stringify(right)}`);
 if(n.units.y-n.summon.bottom<1||n.forge.y-n.units.bottom<1)throw new Error(`${label}: right actions remain cramped/overlapping :: ${JSON.stringify(right)}`);
 if(n.battle.x>=n.summon.x||n.battle.right>n.summon.x+20)throw new Error(`${label}: Battle is not the left dominant action :: ${JSON.stringify(n)}`);
 if(n.battle.height<n.forge.bottom-n.summon.y-12)throw new Error(`${label}: Battle does not span right action stack :: ${JSON.stringify(n)}`);
 if(n.battle.width>vw*.66)throw new Error(`${label}: Battle action remains oversized :: ${JSON.stringify(n.battle)}`);
 const broken=state.images.filter(img=>img.visible&&img.complete&&(img.naturalWidth<=0||img.naturalHeight<=0));if(broken.length)throw new Error(`${label}: broken visible Home images :: ${JSON.stringify(broken.slice(0,8))}`);
 for(const required of Object.keys(state.legacy))if(!state.legacy[required])throw new Error(`${label}: legacy route anchor ${required} missing`);
 console.log(`Home v9 smoke PASS (${label}): leader hidden + spaced dock + Blazing Coins/Embers + approved Home wallpaper`);
}
async function exerciseBattle(page,label){
 await page.locator('#bbHomeApproved [data-nav="battle"]').click();const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');await panel.waitFor({state:'visible',timeout:5000});
 const labels=await page.locator('#bbHomeApproved .bb-home-v4-modes').innerText();if(!/BLAZING\s+ROAD/i.test(labels)||!/PHANTOM\s+CASTLE/i.test(labels))throw new Error(`${label}: battle mode labels missing`);
 await page.locator('#bbHomeApproved [data-close-battle]').click();await panel.waitFor({state:'hidden',timeout:5000});
}
async function exerciseViewport(browser,name,label,contextOptions){
 const errors=[],context=await browser.newContext(contextOptions);
 try{const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);page.on('pageerror',e=>errors.push(e.message));const response=await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});if(response&&!response.ok())throw new Error(`root HTTP ${response.status()}`);await waitHome(page);const meta=await page.evaluate(()=>window.BB_BUILD_META||null);if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);await assertHome(page,`${name}/${label}`);await exerciseBattle(page,`${name}/${label}`);if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`)}finally{await context.close().catch(()=>{})}
}
async function run(name,type){let browser;try{browser=await type.launch({headless:true,timeout:15000});await exerciseViewport(browser,name,'phone',{viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});await exerciseViewport(browser,name,'desktop',{viewport:{width:1366,height:900},isMobile:false,hasTouch:false})}finally{if(browser)await browser.close().catch(()=>{})}}
if(!SELECT){let ok=true;for(const name of Object.keys(TYPES))if(!await runIsolated(name))ok=false;if(!ok)process.exit(1);process.exit(0)}
if(!TYPES[SELECT]){console.error(`Unknown browser ${SELECT}`);process.exit(2)}
run(SELECT,TYPES[SELECT]).catch(error=>{console.error(`Home v9 smoke FAIL (${SELECT}): ${error.stack||error.message}`);process.exit(1)});
