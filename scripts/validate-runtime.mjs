import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const readJson=async p=>JSON.parse(await fs.readFile(path.join(ROOT,p),'utf8'));
const exists=async p=>{try{await fs.access(path.join(ROOT,p));return true}catch{return false}};
const fail=(msg)=>{throw new Error(`Runtime validation failed: ${msg}`)};
const unitAssetPath=(unitId,rel)=>path.posix.join('assets/characters',unitId,String(rel||'').replace(/^\/+/,''));
const requireUnitAsset=async(unitId,rel,label)=>{
  if(!rel||typeof rel!=='string')fail(`${label} must reference an asset path`);
  const p=unitAssetPath(unitId,rel);
  if(!(await exists(p)))fail(`${label} references missing asset ${p}`);
};

const unitIndex=await readJson('runtime/registry/unit-index.json');
const actionRegistry=await readJson('runtime/registry/action-registry.json');
const assetManifest=await readJson('runtime/registry/asset-manifest.json');

const seen=new Set();
const units={};
const unitEntries={};
for(const entry of unitIndex.units||[]){
  if(!entry?.id||!entry?.path)fail('unit-index contains an invalid entry');
  if(seen.has(entry.id))fail(`duplicate unit id ${entry.id}`);
  seen.add(entry.id);
  unitEntries[entry.id]=entry;
  if(!(await exists(entry.path)))fail(`missing unit file ${entry.path}`);
  const unit=await readJson(entry.path);
  units[entry.id]=unit;
  if(unit.id!==entry.id)fail(`unit id mismatch for ${entry.path}`);
  if(Number(unit.schema_version||0)<3)fail(`${entry.id} must use schema_version 3+`);
  for(const stat of ['hp','attack','defense','speed'])if(!Number.isFinite(unit.stats?.[stat]))fail(`${entry.id}.stats.${stat} must be numeric`);
  const max=unit.combat?.chakra_max,start=unit.combat?.chakra_start;
  if(!Number.isInteger(max)||max<0)fail(`${entry.id}.combat.chakra_max must be a non-negative integer`);
  if(!Number.isInteger(start)||start<0||start>max)fail(`${entry.id}.combat.chakra_start must be an integer between 0 and chakra_max`);
  if(!assetManifest.units?.[entry.id])fail(`${entry.id} is missing from asset-manifest.json`);
}

const senku=units.senku;
if(!senku)fail('Senku missing from unit registry');
const heal=senku.abilities?.jutsu;
if(heal?.id!=='ally_heal')fail('Senku jutsu id must be ally_heal');
if(heal?.effect!=='heal_percent_max_hp'||heal?.heal_percent!==0.3)fail('Senku Ally Heal must heal 30% max HP');
if(heal?.target!=='all_living_allies'||heal?.revive!==false)fail('Senku Ally Heal must target living allies and never revive');
if(senku.combat.chakra_start!==8)fail('Senku canonical chakra_start must be 8');

// Canonical Senku ability metadata must never point at phantom runtime assets.
const bombPresentation=senku.abilities?.basic?.presentation||{};
for(const [i,rel] of (bombPresentation.projectile_assets||[]).entries())await requireUnitAsset('senku',rel,`Senku basic projectile_assets[${i}]`);
const impactRefs=[...(bombPresentation.impact_assets||[])];
if(bombPresentation.impact_asset)impactRefs.push(bombPresentation.impact_asset);
if(!impactRefs.length)fail('Senku basic must declare at least one impact asset');
for(const [i,rel] of impactRefs.entries())await requireUnitAsset('senku',rel,`Senku basic impact asset[${i}]`);
if(bombPresentation.impact_vfx_mode==='frame_sequence'&&impactRefs.length<2)fail('Senku frame_sequence impact requires multiple frames');
for(const [animName,anim] of Object.entries(senku.animation_standard?.animations||{})){
  if(animName==='jutsu'){
    for(const [jutsuName,jutsuAnim] of Object.entries(anim||{}))for(const [i,rel] of (jutsuAnim?.frames||[]).entries())await requireUnitAsset('senku',rel,`Senku animation ${jutsuName} frame[${i}]`);
  }else{
    for(const [i,rel] of (anim?.frames||[]).entries())await requireUnitAsset('senku',rel,`Senku animation ${animName} frame[${i}]`);
  }
}
for(const [vfxName,vfx] of Object.entries(senku.animation_standard?.vfx||{}))for(const [i,rel] of (vfx?.frames||[]).entries())await requireUnitAsset('senku',rel,`Senku VFX ${vfxName} frame[${i}]`);

const resourceIds=new Set();
let shellResourceCount=0;
const collect=async(entry,label)=>{
  if(!entry?.resource_id)fail(`${label} is missing resource_id`);
  if(resourceIds.has(entry.resource_id))fail(`duplicate resource id ${entry.resource_id}`);
  if(entry.type==='legacy_embedded')fail(`legacy_embedded resource is not allowed: ${entry.resource_id}`);
  if(entry.type==='runtime_shell'){
    shellResourceCount++;
    if(!entry.renderer)fail(`runtime_shell resource ${entry.resource_id} must name its current renderer`);
    if(!entry.migration_note)fail(`runtime_shell resource ${entry.resource_id} must explain its extraction target`);
  }
  if(entry.path&&!(await exists(entry.path)))fail(`missing asset path ${entry.path}`);
  if(!entry.path&&!entry.type)fail(`${entry.resource_id} must define either path or type`);
  resourceIds.add(entry.resource_id);
};
for(const [groupName,group] of Object.entries(assetManifest.shared||{}))for(const [name,entry] of Object.entries(group||{}))await collect(entry,`shared.${groupName}.${name}`);
for(const [unitId,unitManifest] of Object.entries(assetManifest.units||{}))for(const groupName of ['animations','vfx'])for(const [name,entry] of Object.entries(unitManifest?.[groupName]||{}))await collect(entry,`${unitId}.${groupName}.${name}`);

const runtimeMaps={};
for(const [unitId,entry] of Object.entries(unitEntries)){
  const mapPath=`assets/characters/${unitId}/data/runtime-map.json`;
  if(!(await exists(mapPath)))fail(`${unitId} runtime-map.json missing`);
  const runtimeMap=await readJson(mapPath);
  runtimeMaps[unitId]=runtimeMap;
  if(Number(runtimeMap.schema_version||0)<3)fail(`${unitId} runtime map must use schema_version 3+`);
  if(runtimeMap.unit_id!==unitId)fail(`${unitId} runtime map unit_id mismatch`);
  if(runtimeMap.source_unit_data!==entry.path)fail(`${unitId} runtime map source_unit_data must be ${entry.path}`);

  const canonicalAbilityIds=new Set(Object.values(units[unitId].abilities||{}).map(a=>a?.id).filter(Boolean));
  const mappedAbilityIds=new Set(Object.keys(runtimeMap.abilities||{}));
  for(const abilityId of canonicalAbilityIds)if(!mappedAbilityIds.has(abilityId))fail(`${unitId} runtime map is missing canonical ability ${abilityId}`);
  for(const abilityId of mappedAbilityIds)if(!canonicalAbilityIds.has(abilityId))fail(`${unitId} runtime map references unknown ability ${abilityId}`);

  for(const [abilityId,mapping] of Object.entries(runtimeMap.abilities||{})){
    if(!mapping.animation_id||!resourceIds.has(mapping.animation_id))fail(`${unitId}.${abilityId} references unknown animation ${mapping.animation_id}`);
    for(const resourceId of Object.values(mapping.vfx||{}))if(!resourceIds.has(resourceId))fail(`${unitId}.${abilityId} references unknown VFX ${resourceId}`);
    for(const action of mapping.gameplay_actions||[])if(!actionRegistry.actions?.[action.action_id])fail(`${unitId}.${abilityId} references unknown action ${action.action_id}`);
    if(mapping.execution_status==='declared_not_wired'){
      if((mapping.gameplay_actions||[]).length)fail(`${unitId}.${abilityId} is declared_not_wired but also declares gameplay actions`);
      if(!mapping.migration_note)fail(`${unitId}.${abilityId} declared_not_wired must include a migration_note`);
    }else if(!(mapping.gameplay_actions||[]).length){
      fail(`${unitId}.${abilityId} must declare at least one gameplay action`);
    }
  }
  for(const [stateId,resourceId] of Object.entries(runtimeMap.states||{}))if(!resourceIds.has(resourceId))fail(`${unitId}.${stateId} references unknown state resource ${resourceId}`);
}

// The old aggregate registry was superseded by unit-index + per-character unit.json.
if(await exists('assets/data/units_registry.json'))fail('legacy assets/data/units_registry.json must stay removed; use runtime/registry/unit-index.json and canonical unit.json files');

const forbidden=['Revival Formula','revival_formula','heal_all_allies_full'];
for(const token of forbidden){
  const canonical=JSON.stringify({units,runtimeMaps,assetManifest});
  if(canonical.includes(token))fail(`legacy token remains in canonical runtime data: ${token}`);
}

console.log(`Runtime validation PASS: ${seen.size} units, ${resourceIds.size} resources, ${Object.keys(runtimeMaps).length} runtime maps, ${shellResourceCount} explicit runtime-shell extraction targets, no aggregate registry, no legacy_embedded resources.`);
