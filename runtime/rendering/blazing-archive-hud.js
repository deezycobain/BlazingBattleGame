(()=>{
  'use strict';

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const ASSET_ROOT='assets/ui/battle/blazing-archive/';
  const sources=Object.freeze({
    gauge:'hp-gauge-fill.png',
    chakraActive:'chakra-active.png',
    chakraEmpty:'chakra-empty.png',
    status:'status-medallion.png'
  });
  const images={};
  for(const [key,file] of Object.entries(sources)){
    const image=new Image();
    image.decoding='async';
    image.src=ASSET_ROOT+file;
    images[key]=image;
  }
  const ready=image=>!!(image?.complete&&image.naturalWidth>0);

  function drawGauge(ctx,{x,y,ratio,width=64}){
    const h=6,left=x-width/2;
    ratio=clamp(Number(ratio)||0,0,1);
    ctx.save();
    ctx.fillStyle='rgba(8,5,4,.82)';ctx.fillRect(left,y,width,h);
    ctx.strokeStyle='rgba(214,164,54,.92)';ctx.lineWidth=.72;
    ctx.strokeRect(left+.36,y+.36,width-.72,h-.72);
    if(ratio>0){
      ctx.save();ctx.beginPath();ctx.rect(left+1,y+1,(width-2)*ratio,h-2);ctx.clip();
      if(ready(images.gauge))ctx.drawImage(images.gauge,left,y,width,h);
      else{
        const fill=ctx.createLinearGradient(left,y,left,y+h);
        fill.addColorStop(0,'#ffd957');fill.addColorStop(.48,'#e74325');fill.addColorStop(1,'#7d140f');
        ctx.fillStyle=fill;ctx.fillRect(left+1,y+1,width-2,h-2);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawChakra(ctx,{x,y,chakra,maxChakra}){
    const total=Math.max(0,Math.min(8,Math.round(Number(maxChakra)||0)));
    const current=clamp(Math.round(Number(chakra)||0),0,total);
    const size=7,gap=1.5,start=x-((size+gap)*total-gap)/2;
    ctx.save();
    for(let index=0;index<total;index++){
      const active=index<current,px=start+index*(size+gap);
      if(active&&ready(images.chakraActive)){
        ctx.globalAlpha=.94;ctx.shadowColor='rgba(25,210,255,.82)';ctx.shadowBlur=3;
        ctx.drawImage(images.chakraActive,px,y,size,size);
      }else if(!active&&ready(images.chakraEmpty)){
        ctx.globalAlpha=.18;ctx.shadowBlur=0;ctx.drawImage(images.chakraEmpty,px+.7,y+.7,size-1.4,size-1.4);
      }else{
        ctx.globalAlpha=active?1:.28;ctx.fillStyle=active?'#2bd8ff':'#6a5529';
        ctx.fillRect(px,y+1,size,Math.max(2,size-2));
      }
    }
    ctx.restore();
  }

  function drawUnitResources(ctx,args={}){
    const hpRatio=(Number(args.maxHp)||0)>0?(Number(args.hp)||0)/Number(args.maxHp):0;
    // Keep unit resources above the character silhouette.  The old feet-level
    // placement collided with nearby fighters and with tall imported sprites.
    drawGauge(ctx,{x:args.x,y:args.y-42,ratio:hpRatio});
    drawChakra(ctx,{x:args.x,y:args.y-34,chakra:args.chakra,maxChakra:args.maxChakra});
    return true;
  }

  function drawEnemyHealth(ctx,{x,y,hp,maxHp}){
    const ratio=(Number(maxHp)||0)>0?(Number(hp)||0)/Number(maxHp):0;
    drawGauge(ctx,{x,y:y-38,ratio,width:58});
    return true;
  }

  function statusLabel(effect){
    const labels={stun:'STUN',bind:'BIND',poison:'POISON',immobilize:'LOCK',immobilized:'LOCK',silence:'SEAL'};
    return labels[String(effect||'').toLowerCase()]||String(effect||'STATUS').slice(0,6).toUpperCase();
  }

  // Visual-only battlefield summary. CombatRuntime remains the sole owner of
  // creating/consuming effects; this reads the same statusEffects bag used by
  // the dock and does not mutate it.
  function drawStatusMarkers(ctx,{x,y,target}){
    const bag=target?.statusEffects&&typeof target.statusEffects==='object'?target.statusEffects:{};
    const statuses=Object.values(bag).filter(status=>Number(status?.turns)>0).slice(0,2);
    if(!statuses.length)return false;
    const size=15,gap=2,start=x-((size+gap)*statuses.length-gap)/2;
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    statuses.forEach((status,index)=>{
      const px=start+index*(size+gap),py=y+15,label=statusLabel(status.id),turns=Math.max(1,Math.round(Number(status.turns)||1));
      if(ready(images.status))ctx.drawImage(images.status,px,py,size,size);
      else{ctx.fillStyle='#8d2729';ctx.beginPath();ctx.arc(px+size/2,py+size/2,size/2,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#fff4c8';ctx.shadowColor='rgba(0,0,0,.95)';ctx.shadowBlur=1.8;ctx.font='700 4px system-ui';
      ctx.fillText(label.slice(0,4),px+size/2,py+size/2-.5);
      ctx.shadowBlur=0;ctx.fillStyle='#fff6cd';ctx.font='900 6px system-ui';ctx.fillText(String(turns),px+size-1,py+size-1);
    });
    ctx.restore();return true;
  }

  window.BlazingArchiveBattleHud=Object.freeze({drawUnitResources,drawEnemyHealth,drawStatusMarkers});
})();
