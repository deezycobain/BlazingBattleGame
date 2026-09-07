import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitForHome(page){
  await page.locator('#level1Btn').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>document.readyState==='complete',{timeout:30000});
}

async function run(name,type){
  let browser;
  try{
    console.log(`Display quality smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:name==='webkit',hasTouch:name==='webkit'});
    const page=await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded',timeout:30000});
    await waitForHome(page);
    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`deployed commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
    await page.locator('#level1Btn').click();
    await page.waitForFunction(()=>document.getElementById('battleScreen')?.classList.contains('active'),{timeout:20000});
    await page.waitForTimeout(300);
    const metrics=await page.evaluate(()=>{
      const canvas=document.getElementById('game');
      if(!canvas)return null;
      const r=canvas.getBoundingClientRect();
      const sx=r.width?canvas.width/r.width:0;
      const sy=r.height?canvas.height/r.height:0;
      return {
        dpr:window.devicePixelRatio,
        backing:{width:canvas.width,height:canvas.height},
        css:{width:r.width,height:r.height},
        density:{x:sx,y:sy},
        imageSmoothing:canvas.getContext('2d')?.imageSmoothingEnabled??null
      };
    });
    if(!metrics)throw new Error('battle canvas missing');
    console.log(`Display quality (${name}): ${JSON.stringify(metrics)}`);
    const target=Math.min(2,metrics.dpr||1);
    if(metrics.density.x<target-.05||metrics.density.y<target-.05){
      throw new Error(`battle canvas is under-density for Retina: need >=${target.toFixed(2)} backing px/CSS px, got ${metrics.density.x.toFixed(2)}x${metrics.density.y.toFixed(2)} (backing ${metrics.backing.width}x${metrics.backing.height}, CSS ${metrics.css.width.toFixed(1)}x${metrics.css.height.toFixed(1)}, DPR ${metrics.dpr})`);
    }
    console.log(`Display quality smoke PASS (${name}): battle canvas has Retina-capable backing density.`);
  }finally{
    if(browser)await browser.close().catch(()=>{});
  }
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
  try{await run(name,type)}catch(error){failed=true;console.error(`Display quality smoke FAIL (${name}): ${error.stack||error.message}`);}
}
if(failed)process.exit(1);
