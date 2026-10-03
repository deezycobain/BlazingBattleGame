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

    await page.locator('#bb-rig-lab-launch').waitFor({state:'visible',timeout:30000});
    await page.locator('#bb-rig-lab-launch').click();
    await page.locator('#bb-rig-lab.bb-rig-lab-open').waitFor({state:'visible',timeout:10000});
    const lab=await page.evaluate(()=>{
      const root=document.getElementById('bb-rig-lab');
      const canvases=[...root?.querySelectorAll('canvas')||[]];
      return {
        open:root?.classList.contains('bb-rig-lab-open')===true,
        canvasCount:canvases.length,
        canvasDimensions:canvases.map(canvas=>[canvas.width,canvas.height]),
        baselineText:root?.textContent?.includes('feet baseline')===true
      };
    });
    if(!lab.open||lab.canvasCount!==2||lab.canvasDimensions.some(([width,height])=>width!==512||height!==768)||!lab.baselineText)throw new Error('Rig Lab comparison is unavailable or broke its visual contract: '+JSON.stringify(lab));
    await page.getByRole('button',{name:'INSPECT 3×',exact:true}).click();
    await page.getByRole('button',{name:'TRIGGER RECOIL',exact:true}).click();
    await page.getByRole('button',{name:'CLOSE',exact:true}).click();
    await page.locator('#bb-rig-lab').waitFor({state:'hidden',timeout:10000});

    const result=await page.evaluate(async()=>{
      const rig=window.BlazingRigRuntime;
      const quality=globalThis.eval('BB_ANIMATION_QUALITY_RUNTIME');
      const idleSource=quality.idle('Scorpion')[0];
      const profile=rig.profile('Scorpion');
      const load=src=>new Promise((resolve,reject)=>{
        const image=new Image();image.decoding='async';
        image.addEventListener('load',()=>resolve(image),{once:true});
        image.addEventListener('error',()=>reject(new Error('failed to load '+src)),{once:true});
        image.src=src;
      });
      const recoilSource=await load(profile.sources.recoil);
      const render=(source,clip,elapsedMs)=>{
        const canvas=document.createElement('canvas');canvas.width=128;canvas.height=192;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const drawn=rig.draw(ctx,{name:'Scorpion',clip,elapsedMs,sourceImage:source,x:0,y:0,w:128,h:192});
        const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let alphaPixels=0,alphaMass=0,cxMass=0,cyMass=0,bottomY=-1;
        for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
          const a=data[(y*canvas.width+x)*4+3];
          if(a>8){alphaPixels++;alphaMass+=a;cxMass+=x*a;cyMass+=y*a;bottomY=Math.max(bottomY,y);}
        }
        return {drawn,alphaPixels,cx:alphaMass?cxMass/alphaMass:0,cy:alphaMass?cyMass/alphaMass:0,bottomY,data};
      };
      const compare=(a,b)=>{
        let differentPixels=0;
        for(let i=0;i<a.data.length;i+=4){
          const delta=Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2])+Math.abs(a.data[i+3]-b.data[i+3]);
          if(delta>12)differentPixels++;
        }
        return {
          differentPixels,
          bottomDrift:Math.abs(a.bottomY-b.bottomY),
          centerDrift:Math.hypot(a.cx-b.cx,a.cy-b.cy),
          first:{drawn:a.drawn,alphaPixels:a.alphaPixels,cx:a.cx,cy:a.cy,bottomY:a.bottomY},
          second:{drawn:b.drawn,alphaPixels:b.alphaPixels,cx:b.cx,cy:b.cy,bottomY:b.bottomY}
        };
      };
      const idle=compare(render(idleSource,'idle',0),render(idleSource,'idle',950));
      const recoil=compare(render(recoilSource,'recoil',0),render(recoilSource,'recoil',36));
      const triggered=rig.trigger('Scorpion','recoil');
      const impulse=rig.active('Scorpion','recoil');
      return {
        scorpionIdle:rig.has('Scorpion','idle'),
        mashleIdle:rig.has('Mashle','idle'),
        scorpionRecoil:rig.has('Scorpion','recoil'),
        mashleRecoil:rig.has('Mashle','recoil'),
        source:{idleW:idleSource.naturalWidth,idleH:idleSource.naturalHeight,recoilW:recoilSource.naturalWidth,recoilH:recoilSource.naturalHeight},
        idle,recoil,triggered,impulse:impulse?{clip:impulse.clip,durationMs:impulse.durationMs,progress:impulse.progress}:null
      };
    });

    if(!result.scorpionIdle||!result.mashleIdle||!result.scorpionRecoil||!result.mashleRecoil)throw new Error('pilot rig profiles unavailable: '+JSON.stringify(result));
    if(!result.idle.first.drawn||!result.idle.second.drawn||result.idle.first.alphaPixels<250||result.idle.second.alphaPixels<250)throw new Error('idle rig mesh did not render a visible fighter: '+JSON.stringify(result));
    if(result.idle.differentPixels<40)throw new Error('sampled idle rig poses did not deform visible pixels: '+JSON.stringify(result));
    if(result.idle.bottomDrift>1)throw new Error('rig idle moved the planted feet baseline: '+JSON.stringify(result));
    if(result.idle.centerDrift>3)throw new Error('rig idle translated the fighter too far instead of deforming in place: '+JSON.stringify(result));
    if(!result.recoil.first.drawn||!result.recoil.second.drawn||result.recoil.first.alphaPixels<250||result.recoil.second.alphaPixels<250)throw new Error('recoil overlay did not render a visible fighter: '+JSON.stringify(result));
    if(result.recoil.differentPixels<30)throw new Error('light recoil overlay did not visibly deform the authored recoil frame: '+JSON.stringify(result));
    if(result.recoil.bottomDrift>1)throw new Error('light recoil overlay moved the planted feet baseline: '+JSON.stringify(result));
    if(result.recoil.centerDrift>3.5)throw new Error('light recoil overlay translated the fighter too far: '+JSON.stringify(result));
    if(!result.triggered||result.impulse?.clip!=='recoil'||result.impulse.durationMs!==260)throw new Error('recoil impulse lifecycle unavailable: '+JSON.stringify(result));
    if(result.source.idleW!==512||result.source.idleH!==768||result.source.recoilW!==512||result.source.recoilH!==768)throw new Error('rig source broke canonical 512x768 frame contract: '+JSON.stringify(result));
    console.log(`Rig animation browser smoke PASS (${browserName}): Rig Lab comparison + idle/authored-frame recoil deformation kept planted feet; idle ${result.idle.differentPixels}px changed, recoil ${result.recoil.differentPixels}px changed, recoil bottom drift ${result.recoil.bottomDrift}px.`);
  }finally{
    if(browser)await browser.close().catch(()=>{});
  }
}
