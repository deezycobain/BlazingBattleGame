(()=>{
'use strict';
const titleCase=value=>String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const abilitySummary=(ability,kind)=>{
 if(!ability)return null;
 const summary={
  id:ability.id||kind,
  kind,
  name:ability.name||titleCase(ability.id||kind),
  cost:kind==='jutsu'?number(ability.cost):null,
  chakraGain:kind==='basic'?number(ability.chakra_gain):null,
  damageMultiplier:number(ability.damage_multiplier),
  delivery:ability.delivery||null,
  targetMode:ability.target_mode||ability.target||null,
  category:ability.category||kind,
  ultimate:!!ability.ultimate,
  effect:ability.effect||null,
  healPercent:Number.isFinite(Number(ability.heal_percent))?Number(ability.heal_percent):null
 };
 return Object.freeze(summary);
};
const assetPath=(unit,asset)=>{
 if(!asset)return null;
 if(/^https?:|^data:|^assets\//.test(asset))return asset;
 return `assets/characters/${unit.id}/${asset}`;
};
function fromUnit(unit){
 if(!unit||!unit.id)throw new Error('Unit details requires canonical unit data');
 const stats=unit.stats||{},combat=unit.combat||{},collection=unit.collection||{},abilities=unit.abilities||{},assets=unit.assets||{};
 return Object.freeze({
  schemaVersion:1,
  id:unit.id,
  name:unit.display_name||titleCase(unit.id),
  title:unit.title||'',
  role:unit.role||'unit',
  archetype:unit.archetype||'',
  element:unit.element||'Unknown',
  rarity:unit.rarity||'Unknown',
  collection:Object.freeze({owned:collection.owned!==false,inventoryVisible:collection.inventory_visible!==false,battleReady:!!collection.battle_ready}),
  stats:Object.freeze({level:number(stats.level),hp:number(stats.hp),attack:number(stats.attack),defense:number(stats.defense),speed:number(stats.speed)}),
  resources:Object.freeze({chakraMax:number(combat.chakra_max),chakraStart:number(combat.chakra_start)}),
  abilities:Object.freeze({basic:abilitySummary(abilities.basic,'basic'),jutsu:abilitySummary(abilities.jutsu,'jutsu')}),
  art:Object.freeze({full:assetPath(unit,assets.art),card:assetPath(unit,assets.card),portrait:assetPath(unit,assets.portrait),icon:assetPath(unit,assets.icon)}),
  readiness:Object.freeze({...unit.readiness}),
  extensions:Object.freeze({progression:unit.progression||null,traits:unit.traits||null,equipment:unit.equipment||null,awakening:unit.awakening||null,skins:unit.skins||null,lore:unit.lore||null})
 });
}
function get(id,registry=window.BLAZING_UNIT_DATA){return fromUnit(registry?.[id]);}
window.BlazingUnitDetails=Object.freeze({fromUnit,get,titleCase});
})();
