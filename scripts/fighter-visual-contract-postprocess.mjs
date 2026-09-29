import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const file=path.join(root,'dist','index.html');
const contractPath=path.join(root,'config','fighter-visual-standard.json');
const contract=JSON.parse(await fs.readFile(contractPath,'utf8'));
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Fighter visual contract: '+message)};

const runtime=contract?.runtime||{};
const source=contract?.source_frame||{};
const classes=runtime.size_classes||{};
const compensation=contract?.legacy_source_compensation||{};
if(contract.version!=='1.0.0')fail('unsupported contract version');
if(source.width_px!==512||source.height_px!==768)fail('canonical source frame must remain 512x768');
if(source.anchor!=='bottom_center')fail('canonical anchor must remain bottom_center');
if(source.feet_baseline_y_px!==700)fail('canonical feet baseline must remain y=700');
if(source.standard_body_height_px!==600)fail('canonical source body height must remain 600px');
if(runtime.standard_body_height_logical_px!==96)fail('canonical runtime body height must remain 96 logical px');
if(!Number.isFinite(runtime.base_renderer_scale)||runtime.base_renderer_scale<=0)fail('invalid base renderer scale');
for(const [name,value] of Object.entries(compensation)){
  if(!Number.isFinite(value)||value<runtime.minimum_unapproved_compensation||value>runtime.maximum_unapproved_compensation){
    fail(`unsafe legacy compensation for ${name}: ${value}`);
  }
}

const publicContract={
  version:contract.version,
  sourceFrame:{
    width:source.width_px,
    height:source.height_px,
    feetBaselineY:source.feet_baseline_y_px,
    standardBodyHeight:source.standard_body_height_px
  },
  runtimeBodyHeight:runtime.standard_body_height_logical_px,
  defaultSizeClass:runtime.default_size_class,
  baseRendererScale:runtime.base_renderer_scale,
  sizeClasses:classes,
  legacySourceCompensation:compensation
};
const contractScript=`<script id="blazing-fighter-visual-standard">window.BLAZING_FIGHTER_VISUAL_STANDARD=Object.freeze(${JSON.stringify(publicContract)});</script>`;
if(!html.includes('id="blazing-fighter-visual-standard"')){
  const unitTagEnd=html.indexOf('</script>',html.indexOf('<script id="blazing-unit-data">'));
  if(unitTagEnd<0)fail('unit data script anchor missing');
  html=html.slice(0,unitTagEnd+9)+'\n'+contractScript+html.slice(unitTagEnd+9);
}

// Final authority. Everything before this postprocess may integrate assets, but
// it may not decide their world-space size. The base scale preserves the game's
// established normal humanoid footprint; source compensation only corrects old
// packs whose body occupancy predates the 600px source-body standard.
const legacyScaleBlock="const bbUnitPresentationScale=name==='Itachi'?1.28:name==='Scorpion'?1.38:name==='Mashle'?0.92:1;const bbSeptember27Scale=name==='Egyptian Gaara'?1.25:1;const bbRosterFootprintNormalization=name==='Itachi'?.835:1.113;ctx.scale(directionalFlip*scale*activePulse*bbRoadDepthScale*1.15*bbRoadCameraCompensation*bbUnitPresentationScale*bbSeptember27Scale*bbRosterFootprintNormalization,scale*activePulse*bbRoadDepthScale*1.15*bbRoadCameraCompensation*bbUnitPresentationScale*bbSeptember27Scale*bbRosterFootprintNormalization);ctx.translate(0,5);";
const canonicalScaleBlock="const bbVisualContract=window.BLAZING_FIGHTER_VISUAL_STANDARD;let bbSizeClass=bbVisualContract.defaultSizeClass;try{bbSizeClass=canonicalUnit(name)?.render?.size_class||bbSizeClass}catch(_){}const bbSizeClassScale=bbVisualContract.sizeClasses[bbSizeClass]??bbVisualContract.sizeClasses.standard;const bbSourceCompensation=bbVisualContract.legacySourceCompensation[name]??1;const bbFighterVisualScale=bbVisualContract.baseRendererScale*bbSizeClassScale*bbSourceCompensation;ctx.scale(directionalFlip*scale*activePulse*bbRoadDepthScale*bbRoadCameraCompensation*bbFighterVisualScale,scale*activePulse*bbRoadDepthScale*bbRoadCameraCompensation*bbFighterVisualScale);ctx.translate(0,5);";
if(html.includes(legacyScaleBlock))html=html.replace(legacyScaleBlock,canonicalScaleBlock);
else if(!html.includes('const bbFighterVisualScale=bbVisualContract.baseRendererScale'))fail('legacy fighter scale block changed before contract enforcement');

for(const forbidden of ["name==='Mashle'?0.92","name==='Scorpion'?1.38","bbSeptember27Scale","bbRosterFootprintNormalization"]){
  const scaleRegion=html.includes(canonicalScaleBlock)?canonicalScaleBlock:'';
  if(scaleRegion.includes(forbidden))fail('per-unit scale logic survived final authority: '+forbidden);
}
for(const marker of ['BLAZING_FIGHTER_VISUAL_STANDARD','bbFighterVisualScale=bbVisualContract.baseRendererScale'])if(!html.includes(marker))fail('missing final marker '+marker);
for(const [index,script] of [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(code=>code.trim()).entries()){
  try{new vm.Script(script,{filename:`fighter-visual-contract-${index}.js`})}
  catch(error){fail(`generated inline script ${index} has invalid syntax: ${error.message}`)}
}
await fs.writeFile(file,html);
console.log('Fighter Visual Standard v1.0 PASS: 512x768 source, y=700 feet baseline, 600px source body, 96px runtime body, single scale authority.');
