import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';
const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,''),OUT='docs/validation/scorpion-puppet-atlas-v1',TYPES={chromium,webkit};
await fs.mkdir(OUT,{recursive:true});
async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(()=>{});
 await page.waitForFunction(()=>typeof window.BlazingScorpionPuppetAtlasV1==='object'&&typeof window.BlazingRoadRun==='object',null,{timeout:30000});
}
async function enterRoad(page){
 const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
 await panel.waitFor({state:'visible',timeout:5000});await page.locator('#bbHomeApproved [data-mode="road"]').click();
 await page.waitForFunction(()=>{try{const s=globalThis.eval('S'),front=globalThis.eval('front');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'&&s.pairs.some(pair=>front(pair)?.name==='Scorpion')}catch{return false}},null,{timeout:15000});
}
async function mapContract(page){return page.evaluate(async()=>{
 const roots=[['assets/characters/scorpion/puppet/v1/body/scorpion_puppet_body_atlas_v1.json','assets/characters/scorpion/puppet/v1/body/scorpion_puppet_body_atlas_v1.png'],['assets/characters/scorpion/puppet/v1/weapons/scorpion_weapon_atlas_v1.json','assets/characters/scorpion/puppet/v1/weapons/scorpion_weapon_atlas_v1.png'],['assets/characters/scorpion/puppet/v1/vfx/scorpion_vfx_atlas_v1.json','assets/characters/scorpion/puppet/v1/vfx/scorpion_vfx_atlas_v1.png']];
 const result=[];for(const [mapPath,imagePath] of roots){const map=await fetch(mapPath,{cache:'no-store'}).then(r=>r.json());const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=imagePath;});const inside=Object.values(map.parts||{}).every(rect=>rect.x>=0&&rect.y>=0&&rect.w>0&&rect.h>0&&rect.x+rect.w<=image.naturalWidth&&rect.y+rect.h<=image.naturalHeight);result.push({mapPath,width:image.naturalWidth,height:image.naturalHeight,count:Object.keys(map.parts||{}).length,inside});}return result;
});}
async function run(name,type){
 let browser;try{
  browser=await type.launch({headless:true,timeout:20000});const context=await browser.newContext({viewport:{width:480,height:800},isMobile:name==='webkit',hasTouch:name==='webkit'});
  await context.addInitScript(()=>{localStorage.setItem('bb.scorpion-puppet-atlas.dev','1');localStorage.setItem('bb.scorpion-puppet-atlas.mode','FRAME');localStorage.setItem('blazingBattle.activeTeam.v6',JSON.stringify(['Scorpion','Tyler','Lebee','Senku','Sub-Zero','Crimson']));});
  const page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',error=>errors.push(String(error?.message||error)));
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});await waitHome(page);await page.waitForFunction(()=>window.BlazingScorpionPuppetAtlasV1.ready===true,null,{timeout:20000});
  const maps=await mapContract(page);if(maps.some(map=>!map.inside)||maps[0].width!==3072||maps[0].height!==2048)throw new Error('Atlas rectangle contract failed: '+JSON.stringify(maps));
  await enterRoad(page);
  await page.waitForFunction(()=>{try{return globalThis.eval("unitIdleFrames('Scorpion')").length===12}catch{return false}},null,{timeout:15000});
  const frame=await page.evaluate(()=>{const api=window.BlazingScorpionPuppetAtlasV1;api.setMode('FRAME');const s=globalThis.eval('S'),front=globalThis.eval('front'),pair=s.pairs.find(item=>front(item)?.name==='Scorpion');return {mode:api.mode,button:document.getElementById('bb-scorpion-puppet-ab-switch')?.textContent||'',frames:globalThis.eval("unitIdleFrames('Scorpion')").length,position:{x:pair?.x,y:pair?.y},draws:api.metrics.puppetDraws};});
  if(frame.mode!=='FRAME'||frame.frames!==12||!frame.position.x||!frame.button.includes('FRAME'))throw new Error('FRAME baseline unavailable: '+JSON.stringify(frame));
  await page.waitForTimeout(180);await page.screenshot({path:OUT+'/scorpion-frame-'+name+'.png',fullPage:true});
  await page.locator('#bb-scorpion-puppet-ab-switch').click();
  await page.waitForFunction(base=>window.BlazingScorpionPuppetAtlasV1.mode==='PUPPET'&&window.BlazingScorpionPuppetAtlasV1.metrics.puppetDraws>base+2,frame.draws,{timeout:10000});
  await page.waitForTimeout(180);
  const puppet=await page.evaluate(()=>{const api=window.BlazingScorpionPuppetAtlasV1,s=globalThis.eval('S'),front=globalThis.eval('front'),pair=s.pairs.find(item=>front(item)?.name==='Scorpion'),canvas=document.getElementById('game'),ctx=canvas?.getContext('2d'),x=Math.round(pair?.x||0),y=Math.round(pair?.y||0);let checksum=0,nonTransparent=0;if(ctx&&x&&y){const pixels=ctx.getImageData(Math.max(0,x-25),Math.max(0,y-90),50,100).data;for(let i=0;i<pixels.length;i+=4){checksum=(checksum+pixels[i]*3+pixels[i+1]*5+pixels[i+2]*7+pixels[i+3])>>>0;if(pixels[i+3])nonTransparent++;}}return {mode:api.mode,button:document.getElementById('bb-scorpion-puppet-ab-switch')?.textContent||'',position:{x:pair?.x,y:pair?.y},metrics:api.metrics,drift:api.footDrift(),checksum,nonTransparent};});
  if(puppet.mode!=='PUPPET'||!puppet.button.includes('PUPPET')||puppet.metrics.lastVisibleParts<10||puppet.metrics.puppetDraws<3||!puppet.nonTransparent)throw new Error('PUPPET did not render visible atlas cutouts: '+JSON.stringify(puppet));
  if(Math.abs(puppet.position.x-frame.position.x)>0.001||Math.abs(puppet.position.y-frame.position.y)>0.001||puppet.drift.max!==0)throw new Error('Puppet A/B origin or feet drifted: '+JSON.stringify({frame,puppet}));
  await page.screenshot({path:OUT+'/scorpion-puppet-'+name+'.png',fullPage:true});
  await page.locator('#bb-scorpion-puppet-ab-switch').click();await page.waitForFunction(()=>window.BlazingScorpionPuppetAtlasV1.mode==='FRAME',null,{timeout:5000});
  const restored=await page.evaluate(()=>({mode:window.BlazingScorpionPuppetAtlasV1.mode,frames:globalThis.eval("unitIdleFrames('Scorpion')").length}));
  if(restored.mode!=='FRAME'||restored.frames!==12)throw new Error('Switching back to FRAME did not restore the existing 12-frame idle: '+JSON.stringify(restored));
  if(errors.length)throw new Error('pageerror: '+errors.join(' | '));
  console.log('Scorpion Puppet Atlas browser PASS ('+name+'): body atlas loaded, rectangles in bounds, puppet visible, 0px foot drift, FRAME/PUPPET A/B restored.');
 }finally{if(browser)await browser.close().catch(()=>{});}
}
let failed=false;for(const [name,type] of Object.entries(TYPES)){try{await run(name,type)}catch(error){failed=true;console.error('Scorpion Puppet Atlas browser FAIL ('+name+'): '+String(error?.stack||error?.message||error));}}if(failed)process.exit(1);