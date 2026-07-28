(()=>{
  'use strict';

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function drawField(ctx,{image,W,H,mapZoom=1}){
    if(image?.complete&&image.naturalWidth>0){
      ctx.imageSmoothingEnabled=true;
      const ir=image.naturalWidth/image.naturalHeight,cr=W/H;
      let sx=0,sy=0,sw=image.naturalWidth,sh=image.naturalHeight;
      if(ir>cr){sw=image.naturalHeight*cr;sx=(image.naturalWidth-sw)/2;}
      else if(ir<cr){sh=image.naturalWidth/cr;sy=(image.naturalHeight-sh)/2;}
      const baseSw=sw,baseSh=sh;
      sw=baseSw/mapZoom;sh=baseSh/mapZoom;
      sx+=(baseSw-sw)/2;sy+=(baseSh-sh)/2;
      ctx.drawImage(image,sx,sy,sw,sh,0,0,W,H);
      ctx.fillStyle='rgba(7,10,12,.025)';
      ctx.fillRect(0,0,W,H);
      return true;
    }
    ctx.clearRect(0,0,W,H);
    return false;
  }

  function drawShape(ctx,{origin,shape,rotation=0,color,glow=false,visualOffsetY=0,bounds,now=performance.now()}){
    const s=shape;
    if(!s)return;
    const pulse=1+Math.sin(now/180)*0.014;
    const breathe=.5+.5*Math.sin(now/230);

    if(s.type==='screen_rect'){
      const pad=s.padding??18;
      const x=bounds.left+pad,y=bounds.top+pad;
      const w=(bounds.right-bounds.left)-pad*2;
      const h=(bounds.bottom-bounds.top)-pad*2;
      ctx.save();
      const ultimateRed=color==='#ff3548'||color==='#ff3348';
      ctx.shadowColor=color;ctx.shadowBlur=glow?18:6;
      ctx.fillStyle=glow
        ? (ultimateRed?'rgba(255,53,72,.10)':'rgba(69,215,255,.10)')
        : 'rgba(255,255,255,.045)';
      ctx.strokeStyle=glow
        ? (ultimateRed?`rgba(255,110,126,${.82+.10*breathe})`:`rgba(132,235,255,${.80+.12*breathe})`)
        : 'rgba(255,255,255,.78)';
      ctx.lineWidth=glow?2.2:1.25;
      ctx.beginPath();ctx.roundRect(x,y,w,h,13);ctx.fill();ctx.stroke();
      ctx.shadowBlur=3;ctx.globalAlpha=.62+.18*breathe;ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(x+5,y+5,w-10,h-10,10);ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(origin.x,origin.y+visualOffsetY);
    ctx.rotate(rotation||0);
    ctx.scale(pulse,pulse);

    if(glow){
      const ultimateRed=color==='#ff3548'||color==='#ff3348';
      ctx.shadowColor=ultimateRed?'rgba(255,28,52,.95)':color;
      ctx.shadowBlur=18+6*breathe;
      ctx.fillStyle=ultimateRed
        ? `rgba(255,38,72,${0.10+0.04*breathe})`
        : `rgba(40,210,255,${0.105+0.035*breathe})`;
      ctx.strokeStyle=ultimateRed
        ? `rgba(255,96,112,${0.78+0.16*breathe})`
        : `rgba(105,229,255,${0.72+0.18*breathe})`;
      ctx.lineWidth=2.0;
    }else{
      ctx.shadowColor=color;
      ctx.shadowBlur=1.5+1.5*breathe;
      ctx.fillStyle='rgba(255,255,255,.035)';
      ctx.strokeStyle='rgba(255,255,255,.82)';
      ctx.globalAlpha=.62+.14*breathe;
      ctx.lineWidth=1.05;
    }

    const path=()=>{
      ctx.beginPath();
      if(s.type==='circle')ctx.arc(0,0,s.r,0,Math.PI*2);
      else if(s.type==='rect')ctx.rect((s.offset_x||0)-s.w/2,(s.offset_y||0)-s.h/2,s.w,s.h);
      else if(s.type==='square')ctx.rect(-s.s/2,-s.s/2,s.s,s.s);
      else if(s.type==='cross'){
        const h=s.l/2,t=s.t/2;
        ctx.rect(-h,-t,s.l,s.t);
        ctx.rect(-t,-h,s.t,s.l);
      }else if(s.type==='donut'){
        ctx.arc(0,0,s.o,0,Math.PI*2);
        ctx.arc(0,0,s.i,0,Math.PI*2,true);
      }else if(s.type==='cone'){
        ctx.moveTo(0,0);
        ctx.arc(0,0,s.r,-s.a/2,s.a/2);
        ctx.closePath();
      }
    };

    path();ctx.fill('evenodd');ctx.stroke();
    if(glow){
      ctx.shadowBlur=5;ctx.globalAlpha=.92;
      ctx.strokeStyle=(color==='#ff3548'||color==='#ff3348')?'rgba(255,162,172,.94)':'rgba(174,242,255,.92)';
      ctx.lineWidth=1.05;path();ctx.stroke();
    }
    ctx.restore();
  }

  function drawOverheadLinkIcon(ctx,{x,y,strength,now=performance.now()}){
    strength=clamp(strength,0,1);
    const pulse=.5+.5*Math.sin(now/190);
    const sat=Math.round(28+72*strength);
    const light=Math.round(50+8*strength);
    const alpha=.24+.76*strength;
    const color=`hsla(143,${sat}%,${light}%,${alpha})`;
    ctx.save();ctx.translate(x,y);ctx.rotate(-.38);
    ctx.strokeStyle=color;
    ctx.shadowColor=`hsla(143,100%,56%,${.10+.75*strength})`;
    ctx.shadowBlur=1+10*strength+1.5*pulse*strength;
    ctx.lineWidth=1.15+.55*strength;
    ctx.beginPath();ctx.ellipse(-3.6,0,5.6,3,0,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(3.6,0,5.6,3,0,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }

  function drawPlayerResources(ctx,{x,y,hp,maxHp,chakra,maxChakra,linked=false,linkStrength=0,spriteTop=null,now=performance.now()}){
    if(linked&&Number.isFinite(spriteTop))drawOverheadLinkIcon(ctx,{x,y:spriteTop-10,strength:linkStrength,now});
    const hpY=y+19,hpW=52,hpH=4;
    const hpRatio=clamp(hp/maxHp,0,1);
    ctx.save();
    ctx.fillStyle='rgba(4,9,13,.72)';ctx.fillRect(x-hpW/2,hpY,hpW,hpH);
    ctx.strokeStyle='rgba(255,255,255,.34)';ctx.lineWidth=.55;
    ctx.strokeRect(x-hpW/2+.25,hpY+.25,hpW-.5,hpH-.5);
    ctx.fillStyle=hpRatio>.5?'#53dc72':hpRatio>.25?'#ffbd4a':'#ff616a';
    ctx.fillRect(x-hpW/2,hpY,hpW*hpRatio,hpH);
    const pipW=5,pipH=4,gap=2,total=maxChakra;
    const chakraY=hpY+8;
    const start=x-((pipW+gap)*total-gap)/2;
    for(let i=0;i<total;i++){
      if(i<chakra){ctx.fillStyle='#23c9ff';ctx.shadowColor='rgba(35,201,255,.88)';ctx.shadowBlur=3.5;}
      else{ctx.fillStyle='rgba(12,25,33,.72)';ctx.shadowBlur=0;}
      ctx.fillRect(start+i*(pipW+gap),chakraY,pipW,pipH);
    }
    ctx.restore();
  }

  function drawMoveReturnCue(ctx,{origin,distance,hintRadius,cancelRadius}){
    const hint=distance<=hintRadius;
    const cancelReady=distance<=cancelRadius;
    const proximity=1-clamp(distance/hintRadius,0,1);
    ctx.save();ctx.translate(origin.x,origin.y+18);
    const alpha=.045+proximity*.11+(cancelReady?.10:0);
    ctx.fillStyle=`rgba(255,255,255,${alpha})`;
    ctx.shadowColor='rgba(255,255,255,.78)';ctx.shadowBlur=cancelReady?8:hint?3:1;
    ctx.beginPath();ctx.ellipse(0,0,cancelReady?10.5:hint?9:7.5,cancelReady?4.1:hint?3.4:2.7,0,0,Math.PI*2);ctx.fill();
    if(cancelReady){
      ctx.save();ctx.translate(0,-10);ctx.rotate(-.55);ctx.shadowBlur=0;
      ctx.strokeStyle='rgba(255,255,255,.94)';ctx.lineWidth=1.45;
      ctx.beginPath();ctx.arc(0,0,4.8,.35,5.55);ctx.stroke();
      ctx.beginPath();ctx.moveTo(3.9,-3.9);ctx.lineTo(7.5,-4.3);ctx.lineTo(5.8,-.9);ctx.closePath();
      ctx.fillStyle='rgba(255,255,255,.96)';ctx.fill();
      ctx.beginPath();ctx.arc(0,0,1.05,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.90)';ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawVictoryOverlay(ctx,{victoryFX,victoryImage,W,H,now=performance.now()}){
    if(!victoryFX)return;
    const elapsed=now-victoryFX.start;
    const dimT=clamp(elapsed/victoryFX.dimFade,0,1);
    const dimEase=1-Math.pow(1-dimT,3);
    const dimAlpha=victoryFX.maxDim*dimEase;
    ctx.save();ctx.fillStyle=`rgba(2,5,8,${dimAlpha})`;ctx.fillRect(0,0,W,H);
    const textT=clamp(elapsed/victoryFX.textFade,0,1);
    const textEase=1-Math.pow(1-textT,3);
    const scale=.92+.08*textEase;
    if(victoryImage?.complete&&victoryImage.naturalWidth>0){
      const maxW=W*.62,maxH=H*.30,ratio=victoryImage.naturalWidth/victoryImage.naturalHeight;
      let w=maxW,h=w/ratio;if(h>maxH){h=maxH;w=h*ratio;}
      ctx.save();ctx.globalAlpha=textEase;ctx.translate(W/2,H/2-8);ctx.scale(scale,scale);
      ctx.shadowColor=`rgba(225,0,0,${.20*textEase})`;ctx.shadowBlur=13*textEase;
      ctx.drawImage(victoryImage,-w/2,-h/2,w,h);ctx.restore();
    }else{
      ctx.save();ctx.globalAlpha=textEase;ctx.translate(W/2,H/2-8);ctx.scale(scale,scale);
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='64px BambooBrush, Impact, system-ui';
      ctx.fillStyle='#e31820';ctx.shadowColor='rgba(0,0,0,.88)';ctx.shadowBlur=9;ctx.fillText('VICTORY',0,0);ctx.restore();
    }
    ctx.restore();
  }

  window.BlazingBattlefieldRenderer=Object.freeze({
    drawField,
    drawShape,
    drawOverheadLinkIcon,
    drawPlayerResources,
    drawMoveReturnCue,
    drawVictoryOverlay
  });
})();
