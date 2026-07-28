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
const countImageFiles=async p=>{
  const full=path.join(ROOT,p);
  const stat=await fs.stat(full);
  if(!stat.isDirectory())return /\.(png|jpe?g|webp|gif)$/i.test(p)?1:0;
  return (await fs.readdir(full,{withFileTypes:true})).filter(entry=>entry.isFile()&&/\.(png|jpe?g|webp|gif)$/i.test(entry.name)).length;
};

const unitIndex=await readJson('runtime/registry/unit-index.json');
const actionRegistry=await readJson('runtime/registry/action-registry.json');
const assetManifest=await readJson('runtime/registry/asset-manifest.json');
if(Number(assetManifest.schema_version||0)<5)fail('asset-manifest.json must use schema_version 5+ after Pass 2');
if(Number(actionRegistry.schema_version||0)<3)fail('action-registry.json must use schema_version 3+ after Pass 3');
for(const [actionId,definition] of Object.entries(actionRegistry.actions||{})){
  if(!definition?.runtime_handler&&definition?.execution_status!=='declared_not_wired')fail(`action ${actionId} must define runtime_handler or declared_not_wired`);
}

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
let physicalResourceCount=0;
let proceduralResourceCount=0;
const collect=async(entry,label)=>{
  if(!entry?.resource_id)fail(`${label} is missing resource_id`);
  if(resourceIds.has(entry.resource_id))fail(`duplicate resource id ${entry.resource_id}`);
  if(entry.type==='legacy_embedded')fail(`legacy_embedded resource is not allowed: ${entry.resource_id}`);
  if(entry.type==='runtime_shell')fail(`runtime_shell resource is not allowed after Pass 2: ${entry.resource_id}`);
  if(entry.path){
    if(!(await exists(entry.path)))fail(`missing asset path ${entry.path}`);
    physicalResourceCount++;
    if(entry.required_runtime_frames){
      const actual=await countImageFiles(entry.path);
      if(actual<entry.required_runtime_frames)fail(`${entry.resource_id} requires at least ${entry.required_runtime_frames} runtime frames but ${entry.path} contains ${actual}`);
    }
  }else if(entry.type==='procedural'){
    proceduralResourceCount++;
    if(!entry.renderer)fail(`procedural resource ${entry.resource_id} must name its renderer`);
  }else{
    fail(`${entry.resource_id} must define a physical path or procedural type`);
  }
  resourceIds.add(entry.resource_id);
};
for(const [groupName,group] of Object.entries(assetManifest.shared||{}))for(const [name,entry] of Object.entries(group||{}))await collect(entry,`shared.${groupName}.${name}`);
for(const [unitId,unitManifest] of Object.entries(assetManifest.units||{}))for(const groupName of ['animations','vfx'])for(const [name,entry] of Object.entries(unitManifest?.[groupName]||{}))await collect(entry,`${unitId}.${groupName}.${name}`);

const runtimeMaps={};
const referencedActionIds=new Set();
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
    for(const action of mapping.gameplay_actions||[]){
      const definition=actionRegistry.actions?.[action.action_id];
      if(!definition)fail(`${unitId}.${abilityId} references unknown action ${action.action_id}`);
      referencedActionIds.add(action.action_id);
      if(!definition.runtime_handler)fail(`${unitId}.${abilityId} action ${action.action_id} is referenced by production but has no runtime_handler`);
      if(definition.execution_status==='declared_not_wired')fail(`${unitId}.${abilityId} action ${action.action_id} is referenced by production but marked declared_not_wired`);
    }
    if(mapping.execution_status==='declared_not_wired'){
      if((mapping.gameplay_actions||[]).length)fail(`${unitId}.${abilityId} is declared_not_wired but also declares gameplay actions`);
      if(!mapping.migration_note)fail(`${unitId}.${abilityId} declared_not_wired must include a migration_note`);
    }else if(!(mapping.gameplay_actions||[]).length){
      fail(`${unitId}.${abilityId} must declare at least one gameplay action`);
    }
  }
  for(const [stateId,resourceId] of Object.entries(runtimeMap.states||{}))if(!resourceIds.has(resourceId))fail(`${unitId}.${stateId} references unknown state resource ${resourceId}`);
}

// Pass 2 modules and source-shell delegation remain part of the production contract.
for(const modulePath of ['runtime/animation/frame-runtime.js','runtime/rendering/vfx-renderer.js'])if(!(await exists(modulePath)))fail(`missing Pass 2 runtime module ${modulePath}`);
const shell=await fs.readFile(path.join(ROOT,'index.html'),'utf8');
for(const modulePath of ['runtime/animation/frame-runtime.js','runtime/rendering/vfx-renderer.js'])if(!shell.includes(modulePath))fail(`index.html does not load ${modulePath}`);
for(const marker of [
  'window.BlazingFrameRuntime.loadFrames',
  'window.BlazingVfxRenderer.drawLebeeStarProjectile',
  'window.BlazingVfxRenderer.drawLebeeMeteor',
  'window.BlazingVfxRenderer.drawSubzeroFreezeProjectile'
])if(!shell.includes(marker))fail(`index.html is missing Pass 2 delegation marker ${marker}`);
if(/LEBEE_STAR_PROJECTILE\.src\s*=\s*["']data:image/.test(shell))fail('Lebee Star Blast projectile must not return to embedded shell data');
for(const symbol of ['LEBEE_METEOR_FRAMES','LEBEE_METEOR_IMPACT_FRAMES']){
  const start=shell.indexOf(`const ${symbol}=makeImageFrames(`);
  if(start<0)fail(`${symbol} declaration missing from shell compatibility layer`);
  const end=shell.indexOf(');',start);
  if(end<0)fail(`${symbol} declaration boundary missing`);
  if(shell.slice(start,end+2).includes('data:image'))fail(`${symbol} must use physical runtime paths, not embedded data`);
}
const freezeMarker="freeze:makeImageFrames([\"assets/characters/subzero/sprites/runtime/jutsu/freeze_blast/cast/frame_01.png\"";
if(!shell.includes(freezeMarker))fail('Sub-Zero Freeze Blast cast frames are not routed to canonical physical paths');

// Pass 3 combat runtime owns deterministic combat math and mutations.
const combatPath='runtime/combat/combat-runtime.js';
if(!(await exists(combatPath)))fail(`missing Pass 3 runtime module ${combatPath}`);
if(!shell.includes(combatPath))fail(`index.html does not load ${combatPath}`);
const combatSource=await fs.readFile(path.join(ROOT,combatPath),'utf8');
for(const actionId of referencedActionIds)if(!combatSource.includes(`case '${actionId}'`))fail(`combat runtime does not implement referenced action ${actionId}`);
for(const marker of [
  'window.BlazingCombatRuntime.computeScaledDamage',
  'window.BlazingCombatRuntime.computeBuffedNormalDamage',
  'window.BlazingCombatRuntime.spendChakra',
  'window.BlazingCombatRuntime.gainChakra',
  "window.BlazingCombatRuntime.execute('damage_target'",
  "window.BlazingCombatRuntime.execute('reduce_target_gauge'",
  'window.BlazingCombatRuntime.healPercentMaxHp(ally,1'
])if(!shell.includes(marker))fail(`index.html is missing Pass 3 combat delegation marker ${marker}`);
for(const legacyMutation of [
  'enemy.hp=Math.max(0,enemy.hp-u.jutsuDamage);',
  'enemy.hp=Math.max(0,enemy.hp-hDamage);',
  'enemy.hp=Math.max(0,enemy.hp-dmg);',
  'victim.hp=Math.max(0,victim.hp-attacker.attack);',
  'enemy.gauge=Math.max(0,(enemy.gauge||0)-35);',
  'u.chakra-=u.jutsuCost;',
  'u.chakra=Math.min(u.maxChakra,u.chakra+chakraGain);',
  'ally.hp=ally.maxHp;'
])if(shell.includes(legacyMutation))fail(`legacy shell combat mutation returned: ${legacyMutation}`);
const cloudflareBuild=await fs.readFile(path.join(ROOT,'scripts/build-cloudflare.mjs'),'utf8');
if(!cloudflareBuild.includes("BlazingCombatRuntime.execute('heal_party_percent'"))fail('production Ally Heal does not delegate to Pass 3 combat runtime');
if(cloudflareBuild.includes('ally.hp=Math.min(ally.maxHp,ally.hp+healAmount)'))fail('production Ally Heal inline HP mutation must not return');

// The old aggregate registry was superseded by unit-index + per-character unit.json.
if(await exists('assets/data/units_registry.json'))fail('legacy assets/data/units_registry.json must stay removed; use runtime/registry/unit-index.json and canonical unit.json files');

const forbidden=['Revival Formula','revival_formula','heal_all_allies_full'];
for(const token of forbidden){
  const canonical=JSON.stringify({units,runtimeMaps,assetManifest});
  if(canonical.includes(token))fail(`legacy token remains in canonical runtime data: ${token}`);
}

console.log(`Runtime validation PASS: ${seen.size} units, ${resourceIds.size} resources (${physicalResourceCount} physical, ${proceduralResourceCount} procedural), ${Object.keys(runtimeMaps).length} runtime maps, ${referencedActionIds.size} executable action IDs, 0 runtime-shell resources, Pass 2/3 delegation verified.`);
