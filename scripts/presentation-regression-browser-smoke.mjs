import {chromium,webkit} from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const LEGACY=['Gabimaru','Kakashi','Obito','Jiraiya','Sasuke','Pain'];
for(const [name,type] of Object.entries({chromium,webkit})){
 let browser;
 try{
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:true});
  await context.addInitScript(team=>localStorage.setItem('blazingBattle.activeTeam.v5',JSON.stringify(team)),LEGACY);
  const page=await context.newPage();
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(()=>{});
  await page.waitForFunction(()=>typeof window.BlazingProgression==='object'&&document.documentElement.dataset.bbLegacyPresentationReady==='12',{timeout:10000});
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error('commit mismatch');

  const forgeResolver=await page.evaluate(()=>({gabimaru:window.BlazingProgression.forgeArt('Gabimaru'),kakashi:window.BlazingProgression.forgeArt('Kakashi')}));
  if(!/gabimaru\/cards\/legacy_summon_art\.png$/i.test(forgeResolver.gabimaru)||!/kakashi\/cards\/legacy_summon_art\.png$/i.test(forgeResolver.kakashi))throw new Error('Forge resolver did not prefer clean card art: '+JSON.stringify(forgeResolver));

  await page.evaluate(()=>{
   const edit=[...document.querySelectorAll('button,[role="button"]')].find(el=>/EDIT TEAM/i.test(el.textContent||''));
   if(edit)edit.click();else{document.querySelectorAll('.screen.active').forEach(node=>node.classList.remove('active'));const screen=document.getElementById('teamScreen');if(screen){screen.classList.add('active');screen.style.display='block'}}
  });
  await page.waitForFunction(()=>document.querySelectorAll('#teamScreen img[data-bb-team-legacy="true"][data-bb-team-unit]').length>=6,{timeout:6000});
  const team=await page.evaluate(()=>[...document.querySelectorAll('#teamScreen img[data-bb-team-legacy="true"][data-bb-team-unit]')].map(img=>({unit:img.dataset.bbTeamUnit,src:img.getAttribute('src')||'',kind:img.dataset.bbTeamArt||'',fit:getComputedStyle(img).objectFit,padding:getComputedStyle(img).padding})));
  const activeLegacy=team.filter(row=>['gabimaru','kakashi','obito','jiraiya','sasuke','pain'].includes(row.unit));
  if(activeLegacy.length<6||activeLegacy.some(row=>!/\/cards\/legacy_summon_art\.png$/i.test(row.src)||row.kind==='body'||row.fit!=='cover'||row.padding!=='0px'))throw new Error('Edit Team Legacy clean-art contract failed: '+JSON.stringify(activeLegacy));

  await page.evaluate(()=>window.BlazingProgression.openForge('Gabimaru'));
  await page.locator('#forgePortrait').waitFor({state:'visible',timeout:6000});
  await page.waitForFunction(()=>{const img=document.getElementById('forgePortrait');return /gabimaru\/cards\/legacy_summon_art\.png$/i.test(img?.getAttribute('src')||'')&&img.complete&&img.naturalWidth>0},{timeout:6000});
  const forge=await page.evaluate(()=>{const img=document.getElementById('forgePortrait');return{src:img?.getAttribute('src')||'',name:document.getElementById('forgeName')?.textContent?.trim()||'',width:img?.naturalWidth||0,height:img?.naturalHeight||0}});
  if(!/gabimaru\/cards\/legacy_summon_art\.png$/i.test(forge.src)||!forge.width||!forge.height)throw new Error('Forge rendered wrong Gabimaru art: '+JSON.stringify(forge));
  console.log(`Presentation regression PASS (${name}): Legacy Edit Team and Forge use clean card/full art instead of body sprites.`);
  await context.close();
 }finally{if(browser)await browser.close().catch(()=>{})}
}
