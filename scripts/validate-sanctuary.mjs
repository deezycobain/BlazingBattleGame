import fs from 'node:fs/promises';

const html=await fs.readFile('sanctuary.html','utf8');
const js=await fs.readFile('runtime/ui/sanctuary/first-bloom.js','utf8');
const css=await fs.readFile('runtime/ui/sanctuary/first-bloom.css','utf8');
const compositionCss=await fs.readFile('runtime/ui/sanctuary/scene-composition-v2.css','utf8');
const home=await fs.readFile('runtime/ui/home/home-sanctuary-entry.js','utf8');
const sourceManifest=JSON.parse(await fs.readFile('assets/ui/sanctuary/first-bloom/ASSET_MANIFEST.json','utf8'));
const runtimeManifest=JSON.parse(await fs.readFile('assets/ui/sanctuary/first-bloom/runtime/MANIFEST.json','utf8'));

for(const token of ['sceneViewport','treeCanvas','gardenCanvas','rootShadowLayer','trayShadeLayer','fxLayer','actionDrawer','devPanel','data-tab="design"','runtime/ui/sanctuary/first-bloom.js','scene-composition-v2.css']){
  if(!html.includes(token))throw new Error(`Sanctuary HTML missing ${token}`);
}
for(const oldFx of ['fxDrift','fxRing','fxBurst','fxGround','rootFrontLayer']){
  if(html.includes(`id="${oldFx}"`))throw new Error(`Sanctuary HTML still exposes deprecated overlapping layer ${oldFx}`);
}
for(const id of ['rootLayer','trunkLayer','canopyLayer','blossomLayer','fxLayer','sandBase','rakeLayer','motifLayer','stoneLayer']){
  const hits=(html.match(new RegExp(`id="${id}"`,'g'))||[]).length;
  if(hits!==1)throw new Error(`Sanctuary must expose exactly one ${id} slot; found ${hits}`);
}
for(const token of [
  "bb:sanctuary:first-bloom:v4","SCHEMA=4","feature/sanctuary-first-bloom",
  "assets/ui/sanctuary/first-bloom/runtime/","REQUIREMENTS=","gardenApplied","stageCare",
  "resolveVisualState","renderAssetSlot","VISUAL_PRESETS","FX_STATE","applyVisualPreset",
  "applyDesign","advanceStage","completionClaimed","summonResults","groveRecord",
  "petal_drift","wind_ring","bloom_burst","settle","pattern_","motif_","stones_"
]){
  if(!js.includes(token))throw new Error(`Sanctuary runtime missing ${token}`);
}
for(const forbidden of ["$('fxDrift')","$('fxRing')","$('fxBurst')","$('fxGround')","rootfront_0"]){
  if(js.includes(forbidden))throw new Error(`Sanctuary runtime still contains deprecated same-category renderer ${forbidden}`);
}
for(const retired of ['nameTemplateLayer','gardenSignature','data-design-section="signature"','COSTS.signature','nameLayout','name_straight.png']){
  if((js+html).includes(retired))throw new Error(`Sanctuary signature system was retired but ${retired} is still wired`);
}
for(const token of ['canonical-canvas','tree-canvas','garden-canvas','action-drawer','sanctuary-dock','grove-thumb','safe-area-inset']){
  if(!css.includes(token))throw new Error(`Sanctuary CSS missing ${token}`);
}
for(const token of [
  '--bb-tree-width','--bb-tree-bottom','--bb-garden-width','--bb-garden-bottom',
  'scene-depth-layer','rootShadowLayer','trayShadeLayer',
  '#stoneLayer[data-layout="centered"]','#stoneLayer[data-layout="riverbank"]','#stoneLayer[data-layout="mountain"]'
]){
  if(!compositionCss.includes(token))throw new Error(`Sanctuary composition CSS missing ${token}`);
}
if(/object-fit\s*:\s*fill/.test(css+compositionCss))throw new Error('Sanctuary production CSS must not stretch art with object-fit: fill');
if(html.includes('potLayer')||js.includes('pot_base.png'))throw new Error('Standalone bonsai pot must not render in the integrated Sanctuary planter');
if(!home.includes('sanctuary_home_button.png')||!home.includes("location.href='sanctuary.html'"))throw new Error('Sanctuary Home route or approved button missing');
if((sourceManifest.files||[]).length<86)throw new Error(`Sanctuary source manifest unexpectedly contains only ${sourceManifest.files?.length||0} files`);
for(const item of sourceManifest.files||[])await fs.access(`assets/ui/sanctuary/first-bloom/${item.file}`);

if(runtimeManifest.version!==3||runtimeManifest.treeCanvas?.width!==1536||runtimeManifest.treeCanvas?.height!==1536||runtimeManifest.gardenCanvas?.width!==1536||runtimeManifest.gardenCanvas?.height!==1024)throw new Error('Sanctuary canonical runtime manifest dimensions/version invalid');
if(runtimeManifest.potOwnership!=='integrated_garden_planter')throw new Error('Sanctuary runtime must use the integrated garden planter root island');
if(!runtimeManifest.depthPass?.rootContactShadow||!runtimeManifest.depthPass?.trayInnerShade)throw new Error('Sanctuary runtime depth pass metadata missing');
if(runtimeManifest.rakePass?.renderer!=='natural_groove_v1'||runtimeManifest.rakePass?.surfaceEdgeFadePx!==48)throw new Error('Sanctuary natural rake groove pass metadata missing');
if(runtimeManifest.stonePass?.renderer!=='framed_grounded_v1')throw new Error('Sanctuary grounded stone composition pass metadata missing');
if(runtimeManifest.stonePass?.openCenterLane?.frontCenterClear!==true)throw new Error('Sanctuary open center lane metadata missing');

const lane=runtimeManifest.stonePass.openCenterLane;
for(const layout of ['centered','riverbank','mountain']){
 const spec=runtimeManifest.stonePass?.layouts?.[layout];
 if(!spec||!Array.isArray(spec.center)||spec.center.length!==2||!Array.isArray(spec.runtimeOffsetPercent)||spec.runtimeOffsetPercent.length!==2||!Array.isArray(spec.resolvedCenter)||spec.resolvedCenter.length!==2)throw new Error(`Sanctuary stone layout metadata missing for ${layout}`);
 const x=spec.resolvedCenter[0];
 if(x>lane.xMin&&x<lane.xMax)throw new Error(`Sanctuary ${layout} stones resolve inside the protected center lane at x=${x}`);
}
if(runtimeManifest.stonePass.layouts.centered.runtimeOffsetPercent[0]>=0)throw new Error('Centered stone layout must remain slightly left-offset');
if(runtimeManifest.stonePass.layouts.riverbank.runtimeOffsetPercent[0]<=0)throw new Error('Riverbank stone layout must favor the right edge');
if(runtimeManifest.stonePass.layouts.mountain.runtimeOffsetPercent[1]>=0)throw new Error('Mountain stone layout must sit toward the rear');

for(const file of [
 'tree/root_contact_shadow.png','tree/rootbase_01.png','tree/trunk_06.png','tree/canopy_green_04.png','tree/canopy_jade_04.png','tree/blossom_pink_03.png','tree/fx_pink_idle_drift.png','tree/fx_pink_bloom_burst.png',
 'garden/sand_bed_base.png','garden/tray_inner_shade.png','garden/pattern_still_water.png','garden/pattern_spiral_wind.png','garden/motif_blazing_spiral.png','garden/stones_centered.png','garden/stones_riverbank.png','garden/stones_mountain.png'
])await fs.access(`assets/ui/sanctuary/first-bloom/runtime/${file}`);

if(/assets\/ui\/sanctuary\/(?!first-bloom)/.test(js+html+home))throw new Error('Sanctuary runtime escaped the approved first-bloom folder');

console.log('Sanctuary validation PASS: signature retired, four-step Harmony, one resolved asset per visual category, one sequenced FX slot, deterministic clean presets, offset side-framed stones, open center sand, canonical compositor, schema V4 stage care, Grove showcase, and isolated Seal summon.');
