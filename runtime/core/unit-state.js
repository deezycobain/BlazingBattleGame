(()=>{
  'use strict';

  function assertFiniteInteger(value,label){
    if(!Number.isInteger(value)||!Number.isFinite(value)) throw new Error(`${label} must be a finite integer`);
    return value;
  }

  function chakraCore(unit){
    if(!unit||typeof unit!=='object') throw new Error('unit data is required');
    const combat=unit.combat||{};
    const max=assertFiniteInteger(combat.chakra_max,`${unit.id||'unit'}.combat.chakra_max`);
    const start=assertFiniteInteger(combat.chakra_start,`${unit.id||'unit'}.combat.chakra_start`);
    if(max<0) throw new Error(`${unit.id||'unit'}.combat.chakra_max cannot be negative`);
    if(start<0||start>max) throw new Error(`${unit.id||'unit'}.combat.chakra_start must be between 0 and chakra_max`);
    return {max,start};
  }

  function createUnitBattleState(unit,options={}){
    const chakra=chakraCore(unit);
    const dev=options.dev||null;
    const devMaxStart=Boolean(dev?.enabled&&dev?.startPlayableAtMaxChakra&&unit.role==='playable');
    const currentChakra=devMaxStart?chakra.max:chakra.start;
    const speedOverride=dev?.enabled
      ? (unit.role==='playable'?dev.playerSpeed:(unit.role==='boss'?dev.bossSpeed:null))
      : null;

    return {
      unit_id:unit.id,
      hp:Number(unit.stats?.hp||0),
      max_hp:Number(unit.stats?.hp||0),
      attack:Number(unit.stats?.attack||0),
      defense:Number(unit.stats?.defense||0),
      speed:Number(speedOverride??unit.stats?.speed??0),
      chakra_max:chakra.max,
      current_chakra:currentChakra
    };
  }

  function resetUnitBattleState(state,unit,options={}){
    const fresh=createUnitBattleState(unit,options);
    Object.assign(state,fresh);
    return state;
  }

  window.BlazingUnitState=Object.freeze({chakraCore,createUnitBattleState,resetUnitBattleState});
})();