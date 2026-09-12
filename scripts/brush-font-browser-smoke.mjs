import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();

async function waitHome(page){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingRoadCamera==='object'&&typeof window.BlazingBrushText==='object',{timeout:30000});
}

async function enterFreshRoad(page){
  await page.evaluate(()=>{
    window.BlazingRoadRun?.clearRun?.();
    try{
      for(let i=sessionStorage.length-1;i>=0;i--){
        const key=sessionStorage.key(i);
        if(key?.startsWith('bbRoadIntroSeen:'))sessionStorage.removeItem(key);
      }
    }catch{}
  });
  const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
  if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
  await panel.waitFor({state:'visible',timeout:5000});
  await page.locator('#bbHomeApproved [data-mode="road"]').click();
  await page.waitForFunction(()=>{
    try{
      const s=globalThis.eval('S');
      return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'&&window.BlazingRoadCamera?.snapshot?.()?.active;
    }catch{return false}
  },null,{timeout:15000});
}

async function inspectWord(page,word,count){
  await page.waitForFunction(({word,count})=>{
    const overlay=document.getElementById('bbRoadFightIntro');
    const target=overlay?.querySelector('.bb-road-fight-word');
    const glyphs=[...(target?.querySelectorAll('.bb-brush-glyph')||[])];
    return overlay?.dataset?.word===word&&target?.dataset?.brushText===word&&target?.dataset?.brushError==='0'&&glyphs.length===count&&glyphs.every(img=>img.complete&&img.naturalWidth>0&&img.naturalHeight>0);
  },{word,count},{timeout:10000});

  return page.evaluate(({word,count})=>{
    const overlay=document.getElementById('bbRoadFightIntro');
    const target=overlay.querySelector('.bb-road-fight-word');
    const glyphs=[...target.querySelectorAll('.bb-brush-glyph')];
    const alphaStats=glyphs.map(img=>{
      const canvas=document.createElement('canvas');
      canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);
      const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let min=255,max=0,transparent=0,opaque=0;
      for(let i=3;i<data.length;i+=4){
        const a=data[i];min=Math.min(min,a);max=Math.max(max,a);
        if(a===0)transparent++;if(a>200)opaque++;
      }
      return {min,max,transparent,opaque,width:img.naturalWidth,height:img.naturalHeight};
    });
    const firstGlyphStyle=glyphs[0]?getComputedStyle(glyphs[0]):null;
    const secondGlyphStyle=glyphs[1]?getComputedStyle(glyphs[1]):null;
    return {
      word,count:glyphs.length,chars:glyphs.map(img=>img.dataset.char).join(''),
      srcs:glyphs.map(img=>img.getAttribute('src')),
      error:target.dataset.brushError,
      ready:overlay.dataset.brushReady,
      containerAnimation:getComputedStyle(target).animationName,
      glyphAnimation:firstGlyphStyle?.animationName||'',
      secondMargin:secondGlyphStyle?.marginLeft||'',
      alphaStats
    };
  },{word,count});
}

let browser;
try{
  console.log(`Blazing Brush smoke START -> ${BASE}`);
  browser=await chromium.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
  await waitHome(page);
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
  await enterFreshRoad(page);

  const three=await inspectWord(page,'3',1);
  if(three.chars!=='3'||!three.srcs[0]?.endsWith('/numbers/3.png'))throw new Error(`3 glyph mapping incorrect: ${JSON.stringify(three)}`);
  if(three.ready!=='1'||three.error!=='0')throw new Error(`3 brush renderer not ready: ${JSON.stringify(three)}`);
  if(!three.alphaStats.every(s=>s.min===0&&s.max>200&&s.transparent>0&&s.opaque>0))throw new Error(`3 transparency invalid: ${JSON.stringify(three.alphaStats)}`);

  const fight=await inspectWord(page,'FIGHT',5);
  if(fight.chars!=='FIGHT')throw new Error(`FIGHT glyph order incorrect: ${JSON.stringify(fight)}`);
  const expected=['F','I','G','H','T'];
  if(!fight.srcs.every((src,i)=>src?.endsWith(`/uppercase/${expected[i]}.png`)))throw new Error(`FIGHT glyph mapping incorrect: ${JSON.stringify(fight.srcs)}`);
  if(!/bbRoadFightStrike/.test(fight.containerAnimation))throw new Error(`FIGHT container strike missing: ${fight.containerAnimation}`);
  if(!/bbBrushFightInk/.test(fight.glyphAnimation))throw new Error(`FIGHT ink animation missing: ${fight.glyphAnimation}`);
  if(!(Number.parseFloat(fight.secondMargin)<0))throw new Error(`FIGHT glyph tracking should overlap slightly: ${fight.secondMargin}`);
  if(!fight.alphaStats.every(s=>s.min===0&&s.max>200&&s.transparent>0&&s.opaque>0))throw new Error(`FIGHT transparency invalid: ${JSON.stringify(fight.alphaStats)}`);

  await page.waitForTimeout(230);
  await fs.mkdir('test-artifacts',{recursive:true});
  await page.screenshot({path:'test-artifacts/blazing-brush-fight-chromium.png',fullPage:false});
  if(errors.length)throw new Error(`page errors: ${errors.join(' | ')}`);
  console.log(`Blazing Brush smoke PASS: 3 + ${fight.chars}; transparent raster glyphs loaded at 3x DPR with ink animation`);
  await context.close();
}finally{
  await browser?.close().catch(()=>{});
}
