import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,''),OUT='docs/validation/scorpion-puppet-atlas-v1',TYPES={chromium,webkit};
await fs.mkdir(OUT,{recursive:true});
const equal=(a,b,tolerance=.001)=>Math.abs(a-b)<=tolerance;

async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(()=>{});
 await page.waitForFunction(()=>typeof window.BlazingScorpionPuppetAtlasV1==='object'&&typeof window.BlazingRoadRun==='object'&&typeof window.BlazingRoadCamera==='object',null,{timeout:30000});
}
async function enterSettledRoad(page){
 const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
 await panel.waitFor({state:'visible',timeout:5000});await page.locator('#bbHomeApproved [data-mode="road"]').click();
 await page.waitForFunction(()=>{try{const s=globalThis.eval('S'),front=globalThis.eval('front');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'&&s.pairs.some(pair=>front(pair)?.name==='Scorpion')}catch{return false}},null,{timeout:15000});
 // Do not capture any intro/countdown/camera-transition frame.
 await page.waitForFunction(()=>{const camera=window.BlazingRoadCamera.snapshot?.();return camera?.mode==='combat'&&!camera.locked&&!camera.word&&camera.introPhase==='none';},null,{timeout:12000});
 await page.waitForTimeout(350);
}
async function mapContract(page){return page.evaluate(async()=>{
 const roots=[['assets/characters/scorpion/puppet/v1/body/scorpion_puppet_body_atlas_v1.json','assets/characters/scorpion/puppet/v1/body/scorpion_puppet_body_atlas_v1.png'],['assets/characters/scorpion/puppet/v1/weapons/scorpion_weapon_atlas_v1.json','assets/characters/scorpion/puppet/v1/weapons/scorpion_weapon_atlas_v1.png'],['assets/characters/scorpion/puppet/v1/vfx/scorpion_vfx_atlas_v1.json','assets/characters/scorpion/puppet/v1/vfx/scorpion_vfx_atlas_v1.png']];
 const result=[];for(const [mapPath,imagePath] of roots){const map=await fetch(mapPath,{cache:'no-store'}).then(r=>r.json());const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=imagePath;});const inside=Object.values(map.parts||{}).every(rect=>rect.x>=0&&rect.y>=0&&rect.w>0&&rect.h>0&&rect.x+rect.w<=image.naturalWidth&&rect.y+rect.h<=image.naturalHeight);result.push({mapPath,width:image.naturalWidth,height:image.naturalHeight,count:Object.keys(map.parts||{}).length,inside});}return result;
});}
async function isolatedLoop(page){return page.evaluate(()=>{
 const api=window.BlazingScorpionPuppetAtlasV1,canvas=document.createElement('canvas');canvas.width=280;canvas.height=240;const ctx=canvas.getContext('2d',{willReadFrequently:true}),samples=[];
 for(let t=0;t<=1800;t+=50){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.translate(140,184);if(!api.render(ctx,{bodyHeight:68,now:t,measure:true}))throw new Error('isolated puppet render failed at '+t);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let opaque=0,maxY=-1;for(let i=3;i<pixels.length;i+=4)if(pixels[i]){opaque++;maxY=Math.max(maxY,Math.floor((i/4)/canvas.width));}samples.push({t,opaque,maxY});}
 const joints=api.idleJointSamples(),range=(values)=>Math.max(...values)-Math.min(...values),baseline=range(samples.map(sample=>sample.maxY));
 return {samples,joints,opaqueMin:Math.min(...samples.map(sample=>sample.opaque)),renderedBaselineDrift:baseline,leftJointDrift:Math.max(range(joints.map(sample=>sample.left.x)),range(joints.map(sample=>sample.left.y))),rightJointDrift:Math.max(range(joints.map(sample=>sample.right.x)),range(joints.map(sample=>sample.right.y)))};
});}
async function run(name,type){
 let browser;try{
  browser=await type.launch({headless:true,timeout:30000});const context=await browser.newContext({viewport:{width:480,height:800},isMobile:false});
  await context.addInitScript(()=>{localStorage.setItem('bb.scorpion-puppet-atlas.dev','1');localStorage.setItem('bb.scorpion-puppet-atlas.mode','FRAME');localStorage.removeItem('bb.scorpion-puppet-atlas.components');localStorage.setItem('blazingBattle.activeTeam.v6',JSON.stringify(['Scorpion','Tyler','Lebee','Senku','Sub-Zero','Crimson']));});
  const page=await context.newPage();page.setDefaultTimeout(25000);const errors=[];page.on('pageerror',error=>errors.push(String(error?.message||error)));
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});await waitHome(page);await page.waitForFunction(()=>window.BlazingScorpionPuppetAtlasV1.ready===true,null,{timeout:20000});
  const maps=await mapContract(page);if(maps.some(map=>!map.inside)||maps[0].width!==3072||maps[0].height!==2048)throw new Error('Atlas rectangle contract failed: '+JSON.stringify(maps));
  const components=await page.evaluate(()=>{const api=window.BlazingScorpionPuppetAtlasV1;api.openLab();return {count:api.components.length,assignments:api.componentAssignments,lab:Boolean(document.getElementById('bb-scorpion-puppet-lab')&&!document.getElementById('bb-scorpion-puppet-lab').hidden)};});
  if(components.count<41||!components.assignments.head?.startsWith('body_04.')||!components.lab)throw new Error('alpha-island lab did not expose derived components: '+JSON.stringify(components));
  await enterSettledRoad(page);await page.waitForFunction(()=>{try{return globalThis.eval("unitIdleFrames('Scorpion')").length===12}catch{return false}},null,{timeout:15000});
  const frame=await page.evaluate(()=>{const api=window.BlazingScorpionPuppetAtlasV1,s=globalThis.eval('S'),front=globalThis.eval('front'),pair=s.pairs.find(item=>front(item)?.name==='Scorpion'),frames=globalThis.eval("unitIdleFrames('Scorpion')");api.setMode('FRAME');return {mode:api.mode,button:document.getElementById('bb-scorpion-puppet-ab-switch')?.textContent||'',frames:frames.length,fingerprint:frames.map(frame=>frame?.src||'').join('|'),position:{x:pair?.x,y:pair?.y},camera:window.BlazingRoadCamera.snapshot?.()};});
  if(frame.mode!=='FRAME'||frame.frames!==12||!frame.button.includes('FRAME')||!frame.camera||frame.camera.mode!=='combat'||frame.camera.locked)throw new Error('settled FRAME baseline unavailable: '+JSON.stringify(frame));
  await page.screenshot({path:OUT+'/scorpion-frame-'+name+'.png',fullPage:true});
  await page.locator('#bb-scorpion-puppet-ab-switch').click();await page.waitForFunction(()=>window.BlazingScorpionPuppetAtlasV1.mode==='PUPPET'&&window.BlazingScorpionPuppetAtlasV1.metrics.puppetDraws>2,null,{timeout:10000});
  const loop=await isolatedLoop(page);if(loop.opaqueMin<=0||loop.renderedBaselineDrift!==0||loop.leftJointDrift!==0||loop.rightJointDrift!==0)throw new Error('isolated alpha/foot loop failed: '+JSON.stringify(loop));
  await page.waitForTimeout(220);
  const puppet=await page.evaluate(()=>{const api=window.BlazingScorpionPuppetAtlasV1,s=globalThis.eval('S'),front=globalThis.eval('front'),pair=s.pairs.find(item=>front(item)?.name==='Scorpion');return {mode:api.mode,button:document.getElementById('bb-scorpion-puppet-ab-switch')?.textContent||'',position:{x:pair?.x,y:pair?.y},metrics:api.metrics,camera:window.BlazingRoadCamera.snapshot?.(),componentAssignments:api.componentAssignments};});
  if(puppet.mode!=='PUPPET'||!puppet.button.includes('PUPPET')||puppet.metrics.lastVisibleParts!==13||puppet.metrics.puppetDraws<3||!puppet.camera||puppet.camera.mode!=='combat'||puppet.camera.locked)throw new Error('PUPPET did not render at the settled camera: '+JSON.stringify(puppet));
  if(!equal(puppet.position.x,frame.position.x)||!equal(puppet.position.y,frame.position.y))throw new Error('A/B origin changed: '+JSON.stringify({frame,puppet}));
  await page.screenshot({path:OUT+'/scorpion-puppet-'+name+'.png',fullPage:true});
  await page.locator('#bb-scorpion-puppet-ab-switch').click();await page.waitForFunction(()=>window.BlazingScorpionPuppetAtlasV1.mode==='FRAME',null,{timeout:5000});
  const restored=await page.evaluate(()=>{const frames=globalThis.eval("unitIdleFrames('Scorpion')");return {mode:window.BlazingScorpionPuppetAtlasV1.mode,frames:frames.length,fingerprint:frames.map(frame=>frame?.src||'').join('|')};});
  if(restored.mode!=='FRAME'||restored.frames!==12||restored.fingerprint!==frame.fingerprint)throw new Error('FRAME did not restore the exact 12-frame resolver output: '+JSON.stringify({frame,restored}));
  const fallback=await page.evaluate(()=>{const api=window.BlazingScorpionPuppetAtlasV1;api.setMode('PUPPET');api.render({},{});const frames=globalThis.eval("unitIdleFrames('Scorpion')");return {mode:api.mode,ready:api.ready,error:api.error,frames:frames.length};});
  if(fallback.mode!=='FRAME'||fallback.ready||fallback.frames!==12||!fallback.error)throw new Error('render failure did not cleanly fall back to FRAME: '+JSON.stringify(fallback));
  if(errors.length)throw new Error('pageerror: '+errors.join(' | '));
  console.log('Scorpion Puppet Atlas browser PASS ('+name+'): settled camera, atlas bounds, isolated alpha, transformed joints/rendered baseline at 0px drift, both A/B directions, and rendering-failure fallback.');
 }finally{if(browser)await browser.close().catch(()=>{});}
}
let failed=false;for(const [name,type] of Object.entries(TYPES)){try{await run(name,type)}catch(error){failed=true;console.error('Scorpion Puppet Atlas browser FAIL ('+name+'): '+String(error?.stack||error?.message||error));}}if(failed)process.exit(1);
