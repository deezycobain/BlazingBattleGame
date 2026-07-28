import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const readJson=async p=>JSON.parse(await fs.readFile(path.join(ROOT,p),'utf8'));
const exists=async p=>{try{await fs.access(path.join(ROOT,p));return true}catch{return false}};
const fail=(msg)=>{throw new Error(`Runtime validation failed: ${msg}`)};

const unitIndex=await readJson('runtime/registry/unit-index.json');
const actionRegistry=await readJson('runtime/registry/action-registry.json');
const assetManifest=await readJson('runtime/registry/asset-manifest.json');

const seen=new Set();
const units={};
for(const entry of unitIndex.units||[]){
  if(!entry?.id||!entry?.path)fail('unit-index contains an invalid entry');
  if(seen.has(entry.id))fail(`duplicate unit id ${entry.id}`);
  seen.add(entry.id);
  if(!(await exists(entry.path)))fail(`missing unit file ${entry.path}`);
  const unit=await readJson(entry.path);
  units[entry.id]=unit;
  if(unit.id!==entry.id)fail(`unit id mismatch for ${entry.path}`);
  if(Number(unit.schema_version||0)<3)fail(`${entry.id} must use schema_version 3+`);
  for(const stat of ['hp','attack','defense','speed'])if(!Number.isFinite(unit.stats?.[stat]))fail(`${entry.id}.stats.${stat} must be numeric`);
  const max=unit.combat?.chakra_max,start=unit.combat?.chakra_start;
  if(!Number.isInteger(max)||max<0)fail(`${entry.id}.combat.chakra_max must be a non-negative integer`);
  if(!Number.isInteger(start)||start<0||start>max)fail(`${entry.id}.combat.chakra_start must be an integer between 0 and chakra_max`);
}

const senku=units.senku;
if(!senku)fail('Senku missing from unit registry');
const heal=senku.abilities?.jutsu;
if(heal?.id!=='ally_heal')fail('Senku jutsu id must be ally_heal');
if(heal?.effect!=='heal_percent_max_hp'||heal?.heal_percent!==0.3)fail('Senku Ally Heal must heal 30% max HP');
if(heal?.target!=='all_living_allies'||heal?.revive!==false)fail('Senku Ally Heal must target living allies and never revive');
if(senku.combat.chakra_start!==8)fail('Senku canonical chakra_start must be 8');

const lebee=units.lebee;
if(!lebee)fail('Lebee missing from unit registry');
if(lebee.abilities?.basic?.id!=='star_blast'||lebee.abilities?.basic?.target_mode!=='multi')fail('Lebee Star Blast must remain multi-target');
if(lebee.combat?.basic_shape?.type!=='rect'||lebee.combat?.basic_rotation_deg!==0)fail('Lebee basic must use a static horizontal rectangle');
if(lebee.abilities?.jutsu?.id!=='meteor_jutsu'||lebee.abilities?.jutsu?.aoe!==true)fail('Lebee Meteor Jutsu must remain battlefield AoE');

const subzero=units.subzero;
if(!subzero)fail('Sub-Zero missing from unit registry');
if(subzero.combat?.basic_shape?.type!=='circle'||subzero.combat?.basic_shape?.r!==72)fail('Sub-Zero basic must use the approved small 72-radius circle');
if(subzero.abilities?.basic?.target_mode!=='single'||subzero.abilities?.basic?.single_target_selector!=='nearest_in_shape')fail('Sub-Zero basic must resolve exactly one nearest target inside the circle');
if(subzero.combat?.jutsu_shape?.type!=='cone'||subzero.combat?.jutsu_shape?.r!==180)fail('Sub-Zero Freeze Blast must use the approved short 180-range cone');
if(subzero.abilities?.jutsu?.id!=='freeze_blast'||subzero.abilities?.jutsu?.target_mode!=='multi')fail('Sub-Zero Freeze Blast must remain multi-target');
if(subzero.abilities?.jutsu?.projectile_behavior!=='single_shot_pierce_targets_in_shape')fail('Sub-Zero Freeze Blast must use one projectile shot across all valid targets in its cone');

const resourceIds=new Set();
const collect=(entry)=>{if(!entry?.resource_id)return;if(resourceIds.has(entry.resource_id))fail(`duplicate resource id ${entry.resource_id}`);resourceIds.add(entry.resource_id)};
for(const group of Object.values(assetManifest.shared||{}))for(const entry of Object.values(group||{}))collect(entry);
for(const unit of Object.values(assetManifest.units||{}))for(const groupName of ['animations','vfx'])for(const entry of Object.values(unit?.[groupName]||{})){collect(entry);if(entry.path&&!(await exists(entry.path)))fail(`missing asset path ${entry.path}`)}

const runtimeMapUnits=['senku','lebee'];
for(const unitId of runtimeMapUnits){
  const mapPath=`assets/characters/${unitId}/data/runtime-map.json`;
  if(!(await exists(mapPath)))fail(`${unitId} runtime-map.json missing`);
  const runtimeMap=await readJson(mapPath);
  if(runtimeMap.unit_id!==unitId)fail(`${unitId} runtime map unit_id mismatch`);
  const unit=units[unitId];
  for(const [abilityId,mapping] of Object.entries(runtimeMap.abilities||{})){
    if(!Object.values(unit.abilities||{}).some(a=>a?.id===abilityId))fail(`runtime map references unknown ${unitId} ability ${abilityId}`);
    if(!resourceIds.has(mapping.animation_id))fail(`${unitId}.${abilityId} references unknown animation ${mapping.animation_id}`);
    for(const resourceId of Object.values(mapping.vfx||{}))if(!resourceIds.has(resourceId))fail(`${unitId}.${abilityId} references unknown VFX ${resourceId}`);
    for(const action of mapping.gameplay_actions||[])if(!actionRegistry.actions?.[action.action_id])fail(`${unitId}.${abilityId} references unknown action ${action.action_id}`);
  }
}

const senkuMap=await readJson('assets/characters/senku/data/runtime-map.json');
const forbidden=['Revival Formula','revival_formula','heal_all_allies_full'];
for(const token of forbidden){
  const canonical=JSON.stringify({senku,senkuMap,assetManifest});
  if(canonical.includes(token))fail(`legacy token remains in canonical runtime data: ${token}`);
}

console.log(`Runtime validation PASS: ${seen.size} units, ${resourceIds.size} resources, canonical Senku Ally Heal, canonical Lebee Star Blast/Meteor, Sub-Zero close single basic + multi-target Freeze Blast cone, explicit chakra starts.`);