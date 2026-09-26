import {chromium,webkit} from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const LEGACY_IDS=new Set(['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza']);
for(const [name,type] of Object.entries({chromium,webkit})){
 let browser;
 try{
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:true});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',error=>errors.push(String(error?.message||error)));
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(()=>{});
  await page.waitForFunction(()=>typeof window.BlazingProgression==='object'&&typeof window.BLAZING_UNIT_DATA==='object'&&/legacy_summon_art\.png$/i.test(window.BlazingProgression.forgeArt('Gabimaru')||''),null,{timeout:15000});
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error('commit mismatch');

  const homePresentation=await page.evaluate(()=>{const banner=document.querySelector('#bbHomeApproved .bb-home-v9-legacy-banner'),style=banner?getComputedStyle(banner):null,polish=document.getElementById('bb-summon-blazing-polish-style');return{banner:!!banner,background:style?.backgroundImage||'',ratio:banner?banner.getBoundingClientRect().width/Math.max(1,banner.getBoundingClientRect().height):0,polish:!!polish,polishText:polish?.textContent||''}});
  if(!homePresentation.banner||!homePresentation.background.includes('legacy_summon_art.png')||homePresentation.ratio<1.7||!homePresentation.polish||!homePresentation.polishText.includes('.bb-card-elementplate')||!homePresentation.polishText.includes('bbItachiOuterExtended'))throw new Error('Home/summon polish contract missing: '+JSON.stringify(homePresentation));

  const forgeResolver=await page.evaluate(()=>({gabimaru:window.BlazingProgression.forgeArt('Gabimaru'),kakashi:window.BlazingProgression.forgeArt('Kakashi')}));
  if(!/gabimaru\/cards\/legacy_summon_art\.png$/i.test(forgeResolver.gabimaru)||!/kakashi\/cards\/legacy_summon_art\.png$/i.test(forgeResolver.kakashi))throw new Error('Forge resolver did not prefer clean card art: '+JSON.stringify(forgeResolver));

  const teamOpened=await page.evaluate(()=>{
   const edit=[...document.querySelectorAll('button,[role="button"]')].find(el=>/EDIT TEAM/i.test(el.textContent||'')&&getComputedStyle(el).display!=='none');
   if(edit){edit.click();return true}
   try{const fn=globalThis.eval('typeof showTeamScreen==="function"?showTeamScreen:null');if(fn){fn();return true}}catch(_){ }
   return false;
  });
  if(!teamOpened)throw new Error('Could not open Edit Team through the live UI/runtime');
  await page.waitForFunction(()=>{const root=document.getElementById('teamScreen');return !!root&&getComputedStyle(root).display!=='none'&&root.querySelectorAll('img').length>=6},null,{timeout:10000});
  await page.waitForTimeout(900);
  if(errors.length)throw new Error('Edit Team emitted pageerror: '+errors.join(' | '));
  await page.waitForFunction(()=>{
   const legacy=new Set(['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza']);
   const rows=[...document.querySelectorAll('#teamScreen img')].map(img=>{const src=img.getAttribute('src')||'',m=src.match(/assets\/characters\/([^/]+)\//i);return{img,id:img.dataset.bbTeamUnit||(m?.[1]||''),src}}).filter(row=>legacy.has(row.id));
   return rows.length>=6&&rows.every(row=>/\/cards\/legacy_summon_art\.png$/i.test(row.src)&&row.img.dataset.bbTeamArt==='full'&&getComputedStyle(row.img).objectFit==='cover');
  },null,{timeout:10000});
  const team=await page.evaluate(()=>[...document.querySelectorAll('#teamScreen img')].map(img=>{const src=img.getAttribute('src')||'',m=src.match(/assets\/characters\/([^/]+)\//i);return{unit:img.dataset.bbTeamUnit||(m?.[1]||''),src,kind:img.dataset.bbTeamArt||'',fit:getComputedStyle(img).objectFit,padding:getComputedStyle(img).padding}}).filter(row=>['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza'].includes(row.unit)));
  if(team.length<6||team.some(row=>!/\/cards\/legacy_summon_art\.png$/i.test(row.src)||row.kind!=='full'||row.fit!=='cover'||row.padding!=='0px'))throw new Error('Edit Team Legacy clean-art contract failed: '+JSON.stringify(team));

  await page.evaluate(()=>window.BlazingProgression.openForge('Gabimaru'));
  await page.locator('#forgePortrait').waitFor({state:'visible',timeout:6000});
  await page.waitForFunction(()=>{const img=document.getElementById('forgePortrait');return /gabimaru\/cards\/legacy_summon_art\.png$/i.test(img?.getAttribute('src')||'')&&img.complete&&img.naturalWidth>0},null,{timeout:10000});
  const forge=await page.evaluate(()=>{const img=document.getElementById('forgePortrait');return{src:img?.getAttribute('src')||'',name:document.getElementById('forgeName')?.textContent?.trim()||'',width:img?.naturalWidth||0,height:img?.naturalHeight||0,clean:img?.dataset.bbLegacyClean||''}});
  if(!/gabimaru\/cards\/legacy_summon_art\.png$/i.test(forge.src)||!forge.width||!forge.height||forge.clean!=='true')throw new Error('Forge rendered wrong Gabimaru art: '+JSON.stringify(forge));
  console.log(`Presentation regression PASS (${name}): Edit Team stays responsive, Legacy Team/Forge use clean art, Home event asset loads, and summon polish is present.`);
  await context.close();
 }finally{if(browser)await browser.close().catch(()=>{})}
}
