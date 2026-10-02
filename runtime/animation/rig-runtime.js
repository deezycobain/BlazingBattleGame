(()=>{
  'use strict';

  const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number(value)||0));
  const lerp=(a,b,t)=>(Number(a)||0)+((Number(b)||0)-(Number(a)||0))*t;
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
  const profiles=new Map();
  const images=new Map();
  const reduceMotion=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}};
  const mobile=()=>{try{return matchMedia('(pointer: coarse)').matches||/iPhone|iPad|Android/i.test(navigator.userAgent)}catch(_){return false}};

  function imageFor(src){
    if(!src)return null;
    if(images.has(src))return images.get(src);
    const image=new Image();
    image.decoding='async';
    image.src=src;
    images.set(src,image);
    return image;
  }

  function normalizeKeyframes(clip){
    const frames=Array.isArray(clip?.keyframes)?clip.keyframes:[];
    if(!frames.length)return [{t:0,pins:{}},{t:1,pins:{}}];
    const normalized=frames.map(frame=>({t:clamp(frame?.t),pins:frame?.pins||{}})).sort((a,b)=>a.t-b.t);
    if(normalized[0].t>0)normalized.unshift({t:0,pins:normalized[0].pins});
    if(normalized[normalized.length-1].t<1)normalized.push({t:1,pins:normalized[normalized.length-1].pins});
    return normalized;
  }

  function register(name,profile){
    if(!name||!profile||typeof profile!=='object')return false;
    const clips={};
    for(const [clipName,clip] of Object.entries(profile.clips||{})){
      clips[clipName]={...clip,keyframes:normalizeKeyframes(clip)};
    }
    profiles.set(name,{...profile,clips});
    return true;
  }

  function phaseFor(clip,elapsedMs){
    const duration=Math.max(1,Number(clip?.durationMs)||1000);
    const elapsed=Math.max(0,Number(elapsedMs)||0);
    if(clip?.loop===false)return clamp(elapsed/duration);
    return (elapsed%duration)/duration;
  }

  function samplePins(profile,clipName,elapsedMs){
    const clip=profile?.clips?.[clipName];
    if(!clip)return null;
    if(reduceMotion())return {};
    const t=phaseFor(clip,elapsedMs);
    const frames=clip.keyframes;
    let left=frames[0],right=frames[frames.length-1];
    for(let i=1;i<frames.length;i++){
      if(t<=frames[i].t){left=frames[i-1];right=frames[i];break;}
    }
    const span=Math.max(.000001,right.t-left.t);
    const local=(clip.easing==='linear')?clamp((t-left.t)/span):smooth((t-left.t)/span);
    const names=new Set([...Object.keys(left.pins||{}),...Object.keys(right.pins||{})]);
    const out={};
    for(const name of names){
      const a=left.pins?.[name]||{},b=right.pins?.[name]||{};
      out[name]={x:lerp(a.x,b.x,local),y:lerp(a.y,b.y,local)};
    }
    return out;
  }

  function displacedVertex(u,v,profile,pose){
    const pins=profile?.pins||{};
    let dx=0,dy=0,total=0;
    for(const [name,pin] of Object.entries(pins)){
      const radius=Math.max(.001,Number(pin.radius)||.2);
      const px=Number(pin.x)||0,py=Number(pin.y)||0;
      const distance=Math.hypot(u-px,v-py);
      if(distance>=radius)continue;
      const influence=1-distance/radius;
      const weight=influence*influence*(3-2*influence);
      const delta=pose?.[name]||{};
      dx+=(Number(delta.x)||0)*weight;
      dy+=(Number(delta.y)||0)*weight;
      total+=weight;
    }
    if(total>1){dx/=total;dy/=total;}
    return {u:u+dx,v:v+dy};
  }

  function affine(source,dest){
    const [s0,s1,s2]=source,[d0,d1,d2]=dest;
    const den=s0.x*(s1.y-s2.y)+s1.x*(s2.y-s0.y)+s2.x*(s0.y-s1.y);
    if(Math.abs(den)<1e-7)return null;
    const a=(d0.x*(s1.y-s2.y)+d1.x*(s2.y-s0.y)+d2.x*(s0.y-s1.y))/den;
    const c=(d0.x*(s2.x-s1.x)+d1.x*(s0.x-s2.x)+d2.x*(s1.x-s0.x))/den;
    const e=(d0.x*(s1.x*s2.y-s2.x*s1.y)+d1.x*(s2.x*s0.y-s0.x*s2.y)+d2.x*(s0.x*s1.y-s1.x*s0.y))/den;
    const b=(d0.y*(s1.y-s2.y)+d1.y*(s2.y-s0.y)+d2.y*(s0.y-s1.y))/den;
    const d=(d0.y*(s2.x-s1.x)+d1.y*(s0.x-s2.x)+d2.y*(s1.x-s0.x))/den;
    const f=(d0.y*(s1.x*s2.y-s2.x*s1.y)+d1.y*(s2.x*s0.y-s0.x*s2.y)+d2.y*(s0.x*s1.y-s1.x*s0.y))/den;
    return {a,b,c,d,e,f};
  }

  function drawTriangle(ctx,image,source,dest){
    const matrix=affine(source,dest);if(!matrix)return;
    ctx.save();
    ctx.beginPath();ctx.moveTo(dest[0].x,dest[0].y);ctx.lineTo(dest[1].x,dest[1].y);ctx.lineTo(dest[2].x,dest[2].y);ctx.closePath();ctx.clip();
    ctx.transform(matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f);
    ctx.drawImage(image,0,0);
    ctx.restore();
  }

  function drawMesh(ctx,image,{x,y,w,h,profile,pose}){
    if(!(image?.complete&&image.naturalWidth>0&&image.naturalHeight>0))return false;
    const mesh=profile?.mesh||{};
    const cols=Math.max(2,Math.min(10,Math.round(mobile()?(mesh.mobileCols||4):(mesh.cols||5))));
    const rows=Math.max(3,Math.min(12,Math.round(mobile()?(mesh.mobileRows||6):(mesh.rows||8))));
    const vertices=[];
    for(let row=0;row<=rows;row++){
      const line=[];
      for(let col=0;col<=cols;col++){
        const u=col/cols,v=row/rows,moved=displacedVertex(u,v,profile,pose);
        line.push({
          src:{x:u*image.naturalWidth,y:v*image.naturalHeight},
          dst:{x:x+moved.u*w,y:y+moved.v*h}
        });
      }
      vertices.push(line);
    }
    ctx.imageSmoothingEnabled=true;
    try{ctx.imageSmoothingQuality='high'}catch(_){}
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const a=vertices[row][col],b=vertices[row][col+1],c=vertices[row+1][col],d=vertices[row+1][col+1];
      drawTriangle(ctx,image,[a.src,b.src,c.src],[a.dst,b.dst,c.dst]);
      drawTriangle(ctx,image,[b.src,d.src,c.src],[b.dst,d.dst,c.dst]);
    }
    return true;
  }

  function has(name,clipName='idle'){
    const profile=profiles.get(name);
    return !!profile?.clips?.[clipName]&&!!profile?.sources?.[clipName];
  }

  function draw(ctx,{name,clip='idle',elapsedMs=performance.now(),sourceImage=null,x=0,y=0,w=0,h=0}={}){
    const profile=profiles.get(name);if(!profile||!has(name,clip))return false;
    const image=sourceImage||imageFor(profile.sources[clip]);
    if(!(image?.complete&&image.naturalWidth>0&&image.naturalHeight>0))return false;
    const pose=samplePins(profile,clip,elapsedMs);if(!pose)return false;
    return drawMesh(ctx,image,{x,y,w,h,profile,pose});
  }

  const api=Object.freeze({register,has,draw,drawMesh,samplePins,profile:name=>profiles.get(name)||null});
  window.BlazingRigRuntime=api;
})();
