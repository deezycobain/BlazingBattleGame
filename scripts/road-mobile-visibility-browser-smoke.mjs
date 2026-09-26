import {webkit} from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
let browser;
try{
 browser=await webkit.launch({headless:true,timeout:15000});
 const context=await browser.newContext({
  viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',error=>errors.push(error.stack||error.message));
 await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(()=>{});
 await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingRoadCamera==='object'&&document.documentElement.dataset.bbRoadCanvasMode==='ios-static-safe',{timeout:10000});
 const meta=await page.evaluate(()=>window.BB_BUILD_META||null);if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error('commit mismatch');
 await page.evaluate(()=>window.BlazingRoadRun.clearRun());
 const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
 await panel.waitFor({state:'visible',timeout:5000});await page.locator('#bbHomeApproved [data-mode="road"]').click();
 await page.waitForFunction(()=>{try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'&&s?.bbRoadStage===1}catch{return false}},{timeout:15000});
 await page.waitForFunction(()=>window.BlazingRoadCamera?.snapshot?.()?.mode==='intro',{timeout:6000});
 await page.waitForFunction(()=>window.BlazingRoadCamera?.snapshot?.()?.mode==='combat'&&!window.BlazingRoadCamera?.isCombatLocked?.(),{timeout:12000});
 await page.waitForTimeout(650);
 const state=await page.evaluate(()=>{
  const snap=window.BlazingRoadCamera.snapshot(),canvas=document.getElementById('game'),overlay=document.getElementById('bbRoadFightIntro'),style=canvas?getComputedStyle(canvas):null,rect=canvas?.getBoundingClientRect(),overlayStyle=overlay?getComputedStyle(overlay):null;
  let sampled=0,lit=0,colors=new Set(),sampleError='';
  try{
   const ctx=canvas?.getContext('2d'),w=canvas?.width||0,h=canvas?.height||0;
   if(ctx&&w&&h){for(let gy=1;gy<=8;gy++)for(let gx=1;gx<=8;gx++){const x=Math.min(w-1,Math.floor(w*gx/9)),y=Math.min(h-1,Math.floor(h*gy/9)),p=ctx.getImageData(x,y,1,1).data;sampled++;const lum=(p[0]+p[1]+p[2])/3;if(p[3]>20&&lum>8)lit++;colors.add(`${Math.round(p[0]/16)},${Math.round(p[1]/16)},${Math.round(p[2]/16)},${Math.round(p[3]/32)}`)}}
  }catch(error){sampleError=String(error?.message||error)}
  let road=null;try{const s=globalThis.eval('S');road={stage:s?.bbRoadStage,map:s?.bbRoadContent?.map?.src||'',pairs:s?.pairs?.length||0,enemies:s?.enemies?.length||0}}catch(_){ }
  return {mode:document.documentElement.dataset.bbRoadCanvasMode||'',safe:canvas?.dataset.bbRoadCanvasSafe||'',camera:snap,canvas:{display:style?.display||'',visibility:style?.visibility||'',opacity:style?.opacity||'',scale:style?.scale||'',transform:style?.transform||'',width:rect?.width||0,height:rect?.height||0,backingWidth:canvas?.width||0,backingHeight:canvas?.height||0},overlay:{active:!!overlay?.classList.contains('active'),display:overlayStyle?.display||''},pixels:{sampled,lit,unique:colors.size,error:sampleError},road};
 });
 if(state.mode!=='ios-static-safe'||state.safe!=='true')throw new Error('iOS Road canvas safety did not activate: '+JSON.stringify(state));
 if(state.camera.mode!=='combat'||state.camera.locked)throw new Error('Road camera did not reach combat: '+JSON.stringify(state));
 if(state.overlay.active||state.overlay.display!=='none')throw new Error('Road countdown overlay survived FIGHT: '+JSON.stringify(state));
 if(state.canvas.display==='none'||state.canvas.visibility==='hidden'||Number(state.canvas.opacity)<.9||state.canvas.width<250||state.canvas.height<250)throw new Error('Road canvas is not visible after countdown: '+JSON.stringify(state));
 if(!/none|^1(?:\.0+)?$/i.test(state.canvas.scale)||state.canvas.transform!=='none')throw new Error('iOS Road canvas compositor scaling survived safety mode: '+JSON.stringify(state));
 if(state.road?.stage!==1||!state.road.map||state.road.pairs<1||state.road.enemies<1)throw new Error('Road content missing after countdown: '+JSON.stringify(state));
 if(!state.pixels.error&&state.pixels.sampled&& (state.pixels.lit<4||state.pixels.unique<3))throw new Error('Road backing canvas appears effectively black/blank: '+JSON.stringify(state));
 if(errors.length)throw new Error('pageerror: '+errors.join(' | '));
 console.log('Road mobile visibility PASS (webkit/iPhone): countdown clears, battle canvas remains visible, iOS compositor zoom is bypassed, and Stage 1 map/units remain live.');
 await context.close();
}finally{if(browser)await browser.close().catch(()=>{})}
