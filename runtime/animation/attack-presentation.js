(()=>{
  'use strict';

  const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  const canonicalFrameCache=new Map();

  function rotationToward(from,target,fallback=0){
    if(!finitePoint(from)||!finitePoint(target))return Number.isFinite(fallback)?fallback:0;
    const dx=target.x-from.x,dy=target.y-from.y;
    if(Math.abs(dx)<1e-6&&Math.abs(dy)<1e-6)return Number.isFinite(fallback)?fallback:0;
    return Math.atan2(dy,dx);
  }

  function horizontalRotationToward(from,target,fallback=0){
    const horizontalFallback=Number.isFinite(fallback)&&Math.cos(fallback)<0?Math.PI:0;
    if(!finitePoint(from)||!finitePoint(target))return horizontalFallback;
    const dx=target.x-from.x;
    if(Math.abs(dx)<1e-6)return horizontalFallback;
    return dx<0?Math.PI:0;
  }

  function pointDistance(origin,target){
    if(!finitePoint(origin)||!finitePoint(target))return Infinity;
    return Math.hypot(target.x-origin.x,target.y-origin.y);
  }

  function livePoints(candidates=[]){
    return (candidates||[]).filter(candidate=>finitePoint(candidate)&&candidate.hp!==0);
  }

  function nearestPoint(origin,candidates=[]){
    if(!finitePoint(origin))return null;
    let nearest=null,best=Infinity;
    for(const candidate of livePoints(candidates)){
      const distance=pointDistance(origin,candidate);
      if(distance<best){best=distance;nearest=candidate;}
    }
    return nearest;
  }

  function preferredRangePoint(origin,candidates=[],options={}){
    if(!finitePoint(origin))return null;
    const min=Number(options.min);
    const max=Number(options.max);
    const preferred=Number(options.preferred);
    const fallbackMax=Number(options.fallbackMax);
    const safeMin=Number.isFinite(min)?Math.max(0,min):0;
    const safeMax=Number.isFinite(max)?Math.max(safeMin,max):Infinity;
    const safePreferred=Number.isFinite(preferred)?Math.min(safeMax,Math.max(safeMin,preferred)):(safeMin+safeMax)/2;
    const safeFallbackMax=Number.isFinite(fallbackMax)?Math.max(safeMax,fallbackMax):safeMax;
    const scored=livePoints(candidates)
      .map(candidate=>({candidate,distance:pointDistance(origin,candidate)}))
      .filter(entry=>entry.distance<=safeFallbackMax);
    if(!scored.length)return null;
    const band=scored.filter(entry=>entry.distance>=safeMin&&entry.distance<=safeMax);
    const pool=band.length?band:scored;
    pool.sort((a,b)=>{
      const da=Math.abs(a.distance-safePreferred),db=Math.abs(b.distance-safePreferred);
      if(Math.abs(da-db)>1e-9)return da-db;
      // Equal-quality targets should bias toward the nearer body. This makes lock-on
      // selection feel predictable instead of unexpectedly choosing the farther enemy.
      return a.distance-b.distance;
    });
    return pool[0]?.candidate||null;
  }

  function resolveActionTarget(unitData,action,origin,candidates=[]){
    const ability=action==='jutsu'?unitData?.abilities?.jutsu:unitData?.abilities?.basic;
    const presentation=ability?.presentation||{};
    const mode=presentation.range_rotation_mode;
    if(mode==='medium_enemy_horizontal_facing'||mode==='medium_enemy_assisted_facing'){
      return preferredRangePoint(origin,candidates,{
        min:presentation.target_focus_min_px,
        max:presentation.target_focus_max_px,
        preferred:presentation.target_focus_preferred_px,
        fallbackMax:presentation.target_focus_fallback_max_px
      });
    }
    if(mode==='nearest_enemy_facing'||mode==='nearest_enemy_horizontal_facing')return nearestPoint(origin,candidates);
    return null;
  }

  function resolveActionRotation(unitData,action,origin,candidates,fallback=0){
    const ability=action==='jutsu'?unitData?.abilities?.jutsu:unitData?.abilities?.basic;
    const presentation=ability?.presentation||{};
    const mode=presentation.range_rotation_mode;
    const target=resolveActionTarget(unitData,action,origin,candidates);
    if(mode==='nearest_enemy_facing'||mode==='medium_enemy_assisted_facing')return target?rotationToward(origin,target,fallback):fallback;
    if(mode==='nearest_enemy_horizontal_facing'||mode==='medium_enemy_horizontal_facing')return horizontalRotationToward(origin,target,fallback);
    return Number.isFinite(fallback)?fallback:0;
  }

  function lockFacing(animState,unitName,from,target,fallback=0){
    if(!animState||!unitName)return rotationToward(from,target,fallback);
    if(!animState.attackFacing)animState.attackFacing={};
    const rotation=rotationToward(from,target,fallback);
    animState.attackFacing[unitName]=rotation;
    return rotation;
  }

  function lockRotation(animState,unitName,rotation=0){
    const safe=Number.isFinite(rotation)?rotation:0;
    if(!animState||!unitName)return safe;
    if(!animState.attackFacing)animState.attackFacing={};
    animState.attackFacing[unitName]=safe;
    return safe;
  }

  function lockedFacing(animState,unitName){
    const rotation=animState?.attackFacing?.[unitName];
    return Number.isFinite(rotation)?rotation:null;
  }

  function facingFor(animState,unitName,fallback=0){
    const rotation=lockedFacing(animState,unitName);
    return Number.isFinite(rotation)?rotation:(Number.isFinite(fallback)?fallback:0);
  }

  function clearFacing(animState,unitName){
    if(animState?.attackFacing&&unitName)delete animState.attackFacing[unitName];
  }

  function resolveFrameKind(requestedKind,attackMap){
    const requested=requestedKind||'punch';
    if(requested==='bomb_throw'&&attackMap?.punch?.length)return 'punch';
    if(attackMap?.[requested]?.length)return requested;
    if(['punch','kick','basic','basic_attack','melee_lunge','melee_clean'].includes(requested)){
      if(attackMap?.punch?.length)return 'punch';
      if(attackMap?.kick?.length)return 'kick';
    }
    return requested;
  }

  function canonicalAnimationFrames(unitData,animationKind){
    const unitId=unitData?.id;
    const spec=unitData?.animation_standard?.animations?.[animationKind];
    const paths=spec?.frames;
    if(!unitId||!Array.isArray(paths)||!paths.length||!window.BlazingFrameRuntime?.loadFrames)return [];
    const key=`${unitId}:${animationKind}`;
    if(!canonicalFrameCache.has(key)){
      canonicalFrameCache.set(key,window.BlazingFrameRuntime.loadFrames(paths.map(rel=>`assets/characters/${unitId}/${rel}`)));
    }
    return canonicalFrameCache.get(key)||[];
  }

  function resolveFrames(unitData,requestedKind,attackMap){
    const presentation=unitData?.abilities?.basic?.presentation||{};
    const requested=requestedKind||'punch';
    const meleeAliases=['punch','kick','basic','basic_attack','melee_lunge','melee_clean'];
    const meleeKind=presentation.melee_animation_kind;
    if(meleeKind&&(requested===meleeKind||meleeAliases.includes(requested))){
      const canonical=canonicalAnimationFrames(unitData,meleeKind);
      if(canonical.length)return canonical;
    }
    const resolvedKind=resolveFrameKind(requested,attackMap);
    let frames=attackMap?.[resolvedKind]||[];
    const count=Number(presentation.close_body_frame_count);
    if(requested===presentation.close_animation_kind&&Number.isFinite(count)&&count>0){
      frames=frames.slice(0,Math.min(frames.length,Math.floor(count)));
    }
    return frames;
  }

  function selectBasicPresentation(unitData,from,target,requestedKind='punch'){
    const presentation=unitData?.abilities?.basic?.presentation||{};
    const dx=finitePoint(from)&&finitePoint(target)?target.x-from.x:0;
    const dy=finitePoint(from)&&finitePoint(target)?target.y-from.y:0;
    const distance=finitePoint(from)&&finitePoint(target)?Math.hypot(dx,dy):Infinity;
    const threshold=Number(presentation.close_range_threshold_px);
    const hasSplit=Number.isFinite(threshold)&&threshold>=0;
    const mode=hasSplit&&distance<=threshold?'close':(hasSplit?'far':'default');
    const prefix=mode==='default'?'':`${mode}_`;
    return Object.freeze({
      mode,
      distance,
      threshold:hasSplit?threshold:null,
      runtimeDriver:presentation[`${prefix}runtime_driver`]||presentation.runtime_driver||null,
      animationKind:presentation[`${prefix}animation_kind`]||presentation.animation_kind||requestedKind,
      repositionScope:presentation[`${prefix}reposition_scope`]||presentation.reposition_scope||null
    });
  }

  window.BlazingAttackPresentation=Object.freeze({
    rotationToward,
    horizontalRotationToward,
    pointDistance,
    nearestPoint,
    preferredRangePoint,
    resolveActionTarget,
    resolveActionRotation,
    lockFacing,
    lockRotation,
    lockedFacing,
    facingFor,
    clearFacing,
    resolveFrameKind,
    canonicalAnimationFrames,
    resolveFrames,
    selectBasicPresentation
  });
})();