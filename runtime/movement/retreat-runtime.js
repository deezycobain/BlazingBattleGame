(()=>{
  'use strict';

  const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function randomDistance(minDistance,maxDistance,rng=Math.random){
    const min=Number(minDistance),max=Number(maxDistance);
    if(!Number.isFinite(min)||!Number.isFinite(max)||max<min||min<0){
      throw new Error('Invalid retreat distance range');
    }
    const sample=clamp(Number(rng()),0,1);
    return min+(max-min)*sample;
  }

  function computeRetreatPlan({from,threat,minDistance,maxDistance,bounds,rng=Math.random}={}){
    if(!finitePoint(from)||!finitePoint(threat))throw new Error('Retreat requires finite from/threat points');
    if(!bounds||![bounds.left,bounds.right,bounds.top,bounds.bottom].every(Number.isFinite)){
      throw new Error('Retreat requires finite battlefield bounds');
    }
    const requestedDistance=randomDistance(minDistance,maxDistance,rng);
    let dx=from.x-threat.x,dy=from.y-threat.y;
    let length=Math.hypot(dx,dy);
    if(length<1e-6){
      // Deterministic overlap fallback: retreat toward screen-left rather than producing NaN.
      dx=-1;dy=0;length=1;
    }
    const raw={
      x:from.x+(dx/length)*requestedDistance,
      y:from.y+(dy/length)*requestedDistance
    };
    const destination={
      x:clamp(raw.x,bounds.left,bounds.right),
      y:clamp(raw.y,bounds.top,bounds.bottom)
    };
    return Object.freeze({
      from:Object.freeze({x:from.x,y:from.y}),
      threat:Object.freeze({x:threat.x,y:threat.y}),
      destination:Object.freeze(destination),
      requestedDistance,
      actualDistance:Math.hypot(destination.x-from.x,destination.y-from.y),
      rotation:Math.atan2(destination.y-from.y,destination.x-from.x)
    });
  }

  function easeOutCubic(t){
    const p=clamp(Number(t)||0,0,1);
    return 1-Math.pow(1-p,3);
  }

  function interpolate(from,to,t){
    if(!finitePoint(from)||!finitePoint(to))throw new Error('Retreat interpolation requires finite points');
    const e=easeOutCubic(t);
    return {x:from.x+(to.x-from.x)*e,y:from.y+(to.y-from.y)*e};
  }

  window.BlazingRetreatRuntime=Object.freeze({randomDistance,computeRetreatPlan,easeOutCubic,interpolate});
})();
