import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),fail=message=>{throw new Error('Scorpion Puppet Atlas V1 validation: '+message);},read=rel=>fs.readFile(path.join(root,rel),'utf8'),readJson=async rel=>JSON.parse(await read(rel));
const bodyRel='assets/characters/scorpion/puppet/v1/body/scorpion_puppet_body_atlas_v1.json',weaponRel='assets/characters/scorpion/puppet/v1/weapons/scorpion_weapon_atlas_v1.json',vfxRel='assets/characters/scorpion/puppet/v1/vfx/scorpion_vfx_atlas_v1.json';
for(const rel of ['Scorpion_Puppet_Atlas_V1_GitHub_Pack.zip',bodyRel,'assets/characters/scorpion/puppet/v1/body/scorpion_puppet_body_atlas_v1.png',weaponRel,'assets/characters/scorpion/puppet/v1/weapons/scorpion_weapon_atlas_v1.png',vfxRel,'assets/characters/scorpion/puppet/v1/vfx/scorpion_vfx_atlas_v1.png','runtime/rendering/scorpion-puppet-atlas.js','scripts/scorpion-puppet-atlas-postprocess.mjs','scripts/scorpion-puppet-atlas-browser-smoke.mjs','scripts/create-scorpion-puppet-contact-sheet.swift','docs/scorpion-puppet-atlas-v1.md','docs/validation/scorpion-puppet-atlas-v1/scorpion-puppet-body-contact-sheet.png']){try{await fs.access(path.join(root,rel));}catch{fail('missing '+rel);}}
for(const rel of [bodyRel,weaponRel,vfxRel]){
 const map=await readJson(rel);if(!Array.isArray(map.canvas)||map.canvas.length!==2||!map.parts)fail(rel+' has no usable canvas/parts map');const [width,height]=map.canvas;
 for(const [name,rect] of Object.entries(map.parts)){if(!['x','y','w','h'].every(key=>Number.isFinite(rect[key])))fail(rel+' invalid rectangle '+name);if(rect.x<0||rect.y<0||rect.w<=0||rect.h<=0||rect.x+rect.w>width||rect.y+rect.h>height)fail(rel+' rectangle outside atlas: '+name);}
}
const runtime=await read('runtime/rendering/scorpion-puppet-atlas.js');
for(const marker of ['BlazingPuppetAtlasContractV1','contract.compile','contract.rasterize','contract.verifyPixels','contract.render','componentAssignments','openLab','wantsPuppet','render(ctx'])if(!runtime.includes(marker))fail('runtime is missing '+marker);
for(const forbidden of ['candidateComponents','extractBodyComponents','widthScale','idleKeys','__bbScorpionPuppetTransparent','ctx.drawImage=function','weapon_atlas_v1.png','vfx_atlas_v1.png'])if(runtime.includes(forbidden))fail('production adapter retains forbidden behavior '+forbidden);
const {validateAll}=await import('./validate-puppet-atlas-contract-v1.mjs');
await validateAll();
const renderer=await read('index.html');
for(const marker of ['const bbPuppet=','const bbPuppetRequested=','bbPuppet.render(ctx,{bodyHeight:bbPuppetBodyHeight})','ctx.restore();\n     return;'])if(!renderer.includes(marker))fail('drawUnit atlas seam is missing '+marker);
for(const forbidden of ['__bbScorpionPuppetTransparent','window.__bbScorpionPuppetDrawUnit'])if(renderer.includes(forbidden))fail('drawUnit retains fabricated puppet renderer '+forbidden);
const postprocess=await read('scripts/scorpion-puppet-atlas-postprocess.mjs');
if(!postprocess.includes('contract-v1'))fail('postprocess cache marker is not Contract v1');
const pkg=JSON.parse(await read('package.json'));
if(!pkg.scripts.validate.includes('validate-scorpion-puppet-atlas-v1.mjs'))fail('npm validate does not include puppet validator');
if(!pkg.scripts.build.includes('scorpion-puppet-atlas-postprocess.mjs'))fail('npm build does not inject puppet renderer');
if(pkg.scripts.build.indexOf('scorpion-puppet-atlas-postprocess.mjs')>pkg.scripts.build.indexOf('fighter-visual-contract-postprocess.mjs'))fail('puppet renderer must be injected before final fighter visual authority');
console.log('Scorpion Puppet Atlas Contract v1 PASS: explicit anatomy, native crops, static neutral, separate assets, existing FRAME seam and final fighter authority.');
