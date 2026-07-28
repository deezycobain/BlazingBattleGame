(()=>{
  'use strict';

  const clamp01=value=>Math.max(0,Math.min(1,value));

  function drawLebeeStarProjectile(ctx,f,img){
    const t=clamp01((performance.now()-f.start)/f.duration);
    const e=1-Math.pow(1-t,2.4);
    const x=f.from.x+(f.to.x-f.from.x)*e;
    const y=f.from.y+(f.to.y-f.from.y)*e-5*Math.sin(t*Math.PI);
    const ang=Math.atan2(f.to.y-f.from.y,f.to.x-f.from.x);
    ctx.translate(x,y);
    ctx.rotate(ang);
    if(img?.complete&&img.naturalWidth>0){
      const h=24+8*t;
      const ratio=img.naturalWidth/img.naturalHeight;
      const w=h*ratio;
      ctx.globalCompositeOperation='screen';
      ctx.shadowColor='#ff78df';
      ctx.shadowBlur=10;
      ctx.drawImage(img,-w*.6,-h*.5,w,h);
      ctx.globalCompositeOperation='source-over';
    }
  }

  function drawLebeeMeteor(ctx,f,assets){
    const meteorFrames=assets?.meteorFrames||[];
    const impactFrames=assets?.impactFrames||[];
    const finale=assets?.finale||null;
    const aftermath=assets?.aftermath||null;

    if(f.kind==='lebeeMeteor'){
      const raw=(performance.now()-f.start)/f.duration;
      const t=clamp01(raw);
      const e=t*t*(3-2*t);
      const x=f.from.x+(f.to.x-f.from.x)*e;
      const y=f.from.y+(f.to.y-f.from.y)*e;
      const img=meteorFrames.length?meteorFrames[f.frameIndex%meteorFrames.length]:null;
      ctx.translate(x,y);
      ctx.rotate((f.spin||.08)*(1-t)+(f.rot||0));
      if(img?.complete&&img.naturalWidth>0){
        const startH=f.startH||110,endH=f.endH||44;
        const h=startH+(endH-startH)*t;
        const ratio=img.naturalWidth/img.naturalHeight;
        const w=h*ratio;
        const tailFade=t<.84?1:Math.max(0,(1-t)/.16);
        ctx.globalAlpha=raw<0?0:tailFade;
        ctx.globalCompositeOperation='screen';
        ctx.shadowColor=f.frameIndex%3===0?'#ff61d8':f.frameIndex%3===1?'#58a8ff':'#ffc94e';
        ctx.shadowBlur=11+5*(1-t);
        ctx.drawImage(img,-w/2,-h/2,w,h);
        ctx.globalCompositeOperation='source-over';
      }
      return true;
    }

    if(f.kind==='lebeeMeteorImpact'){
      const t=clamp01((performance.now()-f.start)/f.duration);
      const img=impactFrames.length?impactFrames[(f.frameIndex||0)%impactFrames.length]:null;
      ctx.translate(f.x,f.y-3);
      if(img?.complete&&img.naturalWidth>0){
        const pulse=Math.sin(Math.min(1,t)*Math.PI);
        const w=108+46*pulse;
        const ratio=img.naturalHeight/img.naturalWidth;
        const h=w*ratio;
        ctx.globalAlpha=t<.72?1:(1-t)/.28;
        ctx.shadowColor=f.frameIndex%3===0?'#ff77df':f.frameIndex%3===1?'#68aaff':'#ffd15a';
        ctx.shadowBlur=14;
        ctx.drawImage(img,-w/2,-h*.72,w,h);
      }
      return true;
    }

    if(f.kind==='lebeeMeteorFinale'){
      const t=clamp01((performance.now()-f.start)/f.duration);
      ctx.translate(f.x,f.y);
      if(finale?.complete&&finale.naturalWidth>0){
        const pulse=Math.sin(Math.min(1,t)*Math.PI);
        const w=220+72*pulse;
        const ratio=finale.naturalHeight/finale.naturalWidth;
        const h=w*ratio;
        ctx.globalAlpha=t<.70?1:(1-t)/.30;
        ctx.shadowColor='#ffffff';
        ctx.shadowBlur=18;
        ctx.drawImage(finale,-w/2,-h*.76,w,h);
      }
      return true;
    }

    if(f.kind==='lebeeMeteorAftermath'){
      const t=clamp01((performance.now()-f.start)/f.duration);
      ctx.translate(f.x,f.y);
      if(aftermath?.complete&&aftermath.naturalWidth>0){
        const w=210;
        const ratio=aftermath.naturalHeight/aftermath.naturalWidth;
        const h=w*ratio;
        ctx.globalAlpha=.68*(1-t);
        ctx.drawImage(aftermath,-w/2,-h*.70,w,h);
      }
      return true;
    }

    return false;
  }

  function drawSubzeroFreezeProjectile(ctx,f,frames){
    const t=clamp01((performance.now()-f.start)/f.duration);
    const e=1-Math.pow(1-t,2.2);
    const x=f.from.x+(f.to.x-f.from.x)*e;
    const y=f.from.y+(f.to.y-f.from.y)*e-8*Math.sin(t*Math.PI);
    const ang=Math.atan2(f.to.y-f.from.y,f.to.x-f.from.x);
    ctx.translate(x,y);
    ctx.rotate(ang);
    const idx=t<.24?0:(t<.58?1:2);
    const img=frames?.[idx];
    if(img?.complete&&img.naturalWidth>0){
      const targetH=18+15*t;
      const ratio=img.naturalWidth/img.naturalHeight;
      const targetW=targetH*ratio;
      ctx.globalCompositeOperation='screen';
      ctx.shadowColor='#72eaff';
      ctx.shadowBlur=11;
      ctx.drawImage(img,-targetW*.62,-targetH*.5,targetW,targetH);
      ctx.globalCompositeOperation='source-over';
    }
  }

  window.BlazingVfxRenderer=Object.freeze({
    drawLebeeStarProjectile,
    drawLebeeMeteor,
    drawSubzeroFreezeProjectile
  });
})();
