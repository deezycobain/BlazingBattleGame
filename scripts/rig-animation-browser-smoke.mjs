import {chromium,webkit} from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();

for(const [browserName,type] of Object.entries({chromium,webkit})){
  let browser;
  try{
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:browserName==='webkit',hasTouch:true});
    const page=await context.newPage();
    await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof window.BB_BUILD_META==='object'&&typeof window.BlazingRigRuntime==='object',null,{timeout:30000});
    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error('commit mismatch');

    await page.waitForFunction(()=>{
      try{
        const quality=globalThis.eval('typeof BB_ANIMATION_QUALITY_RUNTIME!=="undefined"?BB_ANIMATION_QUALITY_RUNTIME:null');
        const img=quality?.idle?.('Scorpion')?.[0];
        return !!(img?.complete&&img.naturalWidth>0&&img.naturalHeight>0);
      }catch(_){return false}
    },null,{timeout:30000});

    const result=await page.evaluate(()=>{
      const rig=window.BlazingRigRuntime;
      const quality=globalThis.eval('BB_ANIMATION_QUALITY_RUNTIME');
      const source=quality.idle('Scorpion')[0];
      const render=elapsedMs=>{
        const canvas=document.createElement('canvas');canvas.width=128;canvas.height=192;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const drawn=rig.draw(ctx,{name:'Scorpion',clip:'idle',elapsedMs,sourceImage:source,x:0,y:0,w:128,h:192});
        const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let alphaPixels=0,alphaMass=0,cxMass=0,cyMass=0;
        for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
          const a=data[(y*canvas.width+x)*4+3];
          if(a>8){alphaPixels++;alphaMass+=a;cxMass+=x*a;cyMass+=y*a;}
        }
        return {drawn,alphaPixels,alphaMass,cx:alphaMass?cxMass/alphaMass:0,cy:alphaMass?cyMass/alphaMass:0,data:[...data]};
      };
      const a=render(0),b=render(950);
      let different=0;
      for(let i=0;i<a.data.length;i+=4){
        const delta=Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2])+Math.abs(a.data[i+3]-b.data[i+3]);
        if(delta>12)different++;
      }
      return {
        scorpion:rig.has('Scorpion','idle'),
        mashle:rig.has('Mashle','idle'),
        source:{w:source.naturalWidth,h:source.naturalHeight},
        first:{drawn:a.drawn,alphaPixels:a.alphaPixels,cx:a.cx,cy:a.cy},
        second:{drawn:b.drawn,alphaPixels:b.alphaPixels,cx:b.cx,cy:b.cy},
        differentPixels:different
      };
    });

    if(!result.scorpion||!result.mashle)throw new Error('pilot rig profiles unavailable: '+JSON.stringify(result));
    if(!result.first.drawn||!result.second.drawn||result.first.alphaPixels<250||result.second.alphaPixels<250)throw new Error('rig mesh did not render a visible fighter: '+JSON.stringify(result));
    if(result.differentPixels<40)throw new Error('sampled rig poses did not deform visible pixels: '+JSON.stringify(result));
    if(result.source.w!==512||result.source.h!==768)throw new Error('rig normalized source broke canonical 512x768 frame contract: '+JSON.stringify(result));
    console.log(`Rig animation browser smoke PASS (${browserName}): normalized Scorpion mesh rendered and deformed; Mashle profile registered; ${result.differentPixels} pixels changed.`);
  }finally{
    if(browser)await browser.close().catch(()=>{});
  }
}
