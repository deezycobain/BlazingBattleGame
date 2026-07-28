(function initBlazingAttackRuntime(global){
  'use strict';

  function unitByName(name){
    const units=global.BLAZING_UNIT_DATA||{};
    for(const unit of Object.values(units)){
      if(unit?.display_name===name||unit?.id===name)return unit;
    }
    return null;
  }

  function distance(a,b){
    if(!a||!b)return Infinity;
    return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0));
  }

  function basicPresentation(unitName,from,target){
    const unit=unitByName(unitName);
    const basic=unit?.abilities?.basic||{};
    const presentation=basic.presentation||{};
    const defaultAnimation=presentation.animation_kind||'punch';

    if(basic.delivery==='hybrid_distance'){
      const threshold=Number.isFinite(presentation.close_range_threshold_px)
        ? presentation.close_range_threshold_px
        : 78;
      const close=distance(from,target)<=threshold;
      if(close){
        return Object.freeze({
          driver:presentation.close_runtime_driver||'lunge',
          target_mode:'melee_stop',
          animation_kind:presentation.close_animation_kind||defaultAnimation,
          distance_band:'close',
          threshold_px:threshold
        });
      }
      return Object.freeze({
        driver:presentation.far_runtime_driver||'lunge',
        target_mode:'enemy',
        animation_kind:presentation.far_animation_kind||defaultAnimation,
        distance_band:'far',
        threshold_px:threshold
      });
    }

    return Object.freeze({
      driver:presentation.runtime_driver||'lunge',
      target_mode:presentation.runtime_target_mode||'melee_stop',
      animation_kind:defaultAnimation,
      distance_band:'standard',
      threshold_px:null
    });
  }

  global.BB_ATTACK_RUNTIME=Object.freeze({
    version:'0.7.1',
    basicPresentation,
    distance
  });
})(window);
