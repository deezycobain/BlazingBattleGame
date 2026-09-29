import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const fail=message=>{throw new Error('Fighter visual standard validation: '+message)};
const contract=JSON.parse(await fs.readFile(path.join(root,'config','fighter-visual-standard.json'),'utf8'));
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const postprocess=await fs.readFile(path.join(root,'scripts','fighter-visual-contract-postprocess.mjs'),'utf8');

if(contract.version!=='1.0.0')fail('version must be 1.0.0');
const source=contract.source_frame||{};
const runtime=contract.runtime||{};
if(source.width_px!==512||source.height_px!==768)fail('source frame must be 512x768');
if(source.format!=='RGBA_PNG')fail('source format must be RGBA_PNG');
if(source.anchor!=='bottom_center')fail('anchor must be bottom_center');
if(source.feet_baseline_y_px!==700||source.feet_baseline_tolerance_px!==8)fail('feet baseline must be 700 ±8px');
if(source.standard_body_height_px!==600||source.standard_body_height_tolerance_px!==30)fail('source body height must be 600 ±30px');
if(source.minimum_transparent_gutter_px<64)fail('transparent gutter cannot be below 64px');
if(source.vfx_baked_into_character_frames!==false)fail('character frames may not bake in VFX');
if(runtime.standard_body_height_logical_px!==96)fail('runtime standard body height must be 96 logical px');
if(runtime.default_size_class!=='standard')fail('default size class must be standard');
for(const key of ['small','standard','large','boss'])if(!Number.isFinite(runtime.size_classes?.[key]))fail('missing size class '+key);
if(runtime.size_classes.standard!==1)fail('standard size class must remain 1.0');
if(!(runtime.size_classes.small<1&&runtime.size_classes.large>1&&runtime.size_classes.boss>runtime.size_classes.large))fail('size class ordering invalid');
if(!Number.isFinite(runtime.base_renderer_scale)||runtime.base_renderer_scale<=0)fail('base renderer scale invalid');
for(const [name,value] of Object.entries(contract.legacy_source_compensation||{})){
  if(!Number.isFinite(value))fail('non-numeric compensation for '+name);
  if(value<runtime.minimum_unapproved_compensation||value>runtime.maximum_unapproved_compensation)fail('unsafe compensation for '+name+': '+value);
}
const rules=contract.rules||{};
for(const key of ['source_canvas_never_sets_world_size','transparent_padding_never_sets_world_size','fighter_and_vfx_layers_are_separate','hitbox_never_derived_from_sprite_bounds','attack_origin_never_derived_from_frame_edge'])if(rules[key]!==true)fail('required invariant disabled: '+key);
if(rules.per_unit_scale_hacks_outside_this_contract!==false)fail('per-unit scale hacks must remain prohibited');

const validateCommand=pkg.scripts?.validate||'';
const buildCommand=pkg.scripts?.build||'';
if(!validateCommand.includes('validate-fighter-visual-standard.mjs'))fail('validator missing from npm validate');
const finalStep='node scripts/fighter-visual-contract-postprocess.mjs';
if(!buildCommand.includes(finalStep))fail('fighter visual postprocess missing from build');
if(buildCommand.trim().split(' && ').at(-1)!==finalStep)fail('fighter visual contract must be the final build postprocess');
for(const marker of ['BLAZING_FIGHTER_VISUAL_STANDARD','bbFighterVisualScale','legacyScaleBlock'])if(!postprocess.includes(marker))fail('postprocess marker missing: '+marker);

console.log('Fighter Visual Standard v1.0 PASS');
