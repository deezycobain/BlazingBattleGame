(()=>{
  'use strict';

  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const nonNegative=value=>Math.max(0,finite(value,0));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const STAT_MAX=100;
  const DEFENSE_REDUCTION_PER_POINT=.0045;
  const DEFENSE_REDUCTION_MAX=.45;

  function computeScaledDamage(attack,multiplier=1){
    return Math.max(0,Math.round(clamp(nonNegative(attack),0,STAT_MAX)*nonNegative(multiplier)));
  }

  function computeBuffedNormalDamage(attack,bonus=0){
    return Math.max(0,Math.round(clamp(nonNegative(attack),0,STAT_MAX)*(1+finite(bonus,0))));
  }

  function defenseMitigation(defense=0){
    return Math.min(DEFENSE_REDUCTION_MAX,clamp(nonNegative(defense),0,STAT_MAX)*DEFENSE_REDUCTION_PER_POINT);
  }

  function mitigatedDamage(damage,defense=0){
    const raw=nonNegative(damage),mitigation=defenseMitigation(defense);
    if(raw<=0)return {raw:0,mitigation,damage:0};
    return {raw,mitigation,damage:Math.max(1,Math.round(raw*(1-mitigation)))};
  }

  function applyDamage(target,damage){
    if(!target)throw new Error('applyDamage requires a target');
    const before=nonNegative(target.hp);
    const reduced=mitigatedDamage(damage,target.defense);
    const requested=reduced.damage;
    const after=Math.max(0,before-requested);
    target.hp=after;
    return {before,after,raw:reduced.raw,mitigation:reduced.mitigation,requested,amount:before-after,defeated:after<=0};
  }

  function applyDamageTargets(targets,damage){
    return (targets||[]).filter(Boolean).map(target=>({target,...applyDamage(target,damage)}));
  }

  function spendChakra(unit,cost){
    if(!unit)throw new Error('spendChakra requires a unit');
    const before=nonNegative(unit.chakra);
    const requested=nonNegative(cost);
    if(before<requested)return {ok:false,before,after:before,cost:requested};
    const after=before-requested;
    unit.chakra=after;
    return {ok:true,before,after,cost:requested};
  }

  function gainChakra(unit,amount){
    if(!unit)throw new Error('gainChakra requires a unit');
    const before=nonNegative(unit.chakra);
    const max=Math.max(0,finite(unit.maxChakra,before));
    const after=clamp(before+nonNegative(amount),0,max);
    unit.chakra=after;
    return {before,after,amount:after-before};
  }

  function reduceGauge(target,amount,minimum=0){
    if(!target)throw new Error('reduceGauge requires a target');
    const min=nonNegative(minimum);
    const before=nonNegative(target.gauge);
    const after=Math.max(min,before-nonNegative(amount));
    target.gauge=after;
    return {before,after,amount:before-after};
  }

  function healPercentMaxHp(target,percent,{minimumHeal=1,ignoreDefeated=true}={}){
    if(!target)throw new Error('healPercentMaxHp requires a target');
    const before=nonNegative(target.hp);
    const maxHp=nonNegative(target.maxHp);
    if(ignoreDefeated&&before<=0)return {before,after:before,amount:0,skipped:true};
    const requested=Math.max(nonNegative(minimumHeal),Math.round(maxHp*nonNegative(percent)));
    const after=Math.min(maxHp,before+requested);
    target.hp=after;
    return {before,after,requested,amount:after-before,skipped:false};
  }

  function healPartyPercent(targets,percent,options={}){
    return (targets||[]).filter(Boolean).map(target=>({target,...healPercentMaxHp(target,percent,options)}));
  }

  function execute(actionId,context={}){
    const parameters=context.parameters||{};
    switch(actionId){
      case 'damage_target': {
        const damage=context.damage??computeScaledDamage(context.actor?.attack,parameters.multiplier??1);
        return applyDamage(context.target,damage);
      }
      case 'damage_targets': {
        const damage=context.damage??computeScaledDamage(context.actor?.attack,parameters.multiplier??1);
        return applyDamageTargets(context.targets,damage);
      }
      case 'reduce_target_gauge':
        return reduceGauge(context.target,parameters.amount??context.amount??0,parameters.minimum_gauge??0);
      case 'heal_party_percent':
        return healPartyPercent(context.targets,parameters.percent_of_max_hp??context.percent??0,{minimumHeal:1,ignoreDefeated:true});
      default:
        throw new Error(`Unsupported combat action: ${actionId}`);
    }
  }

  window.BlazingCombatRuntime=Object.freeze({
    STAT_MAX,
    computeScaledDamage,
    computeBuffedNormalDamage,
    defenseMitigation,
    mitigatedDamage,
    applyDamage,
    applyDamageTargets,
    spendChakra,
    gainChakra,
    reduceGauge,
    healPercentMaxHp,
    healPartyPercent,
    execute
  });
})();
