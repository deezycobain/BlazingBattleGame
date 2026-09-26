import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

// Make Forge resolve the clean Legacy summon/card art directly. Runtime metadata repair is
// still retained as a compatibility layer, but Forge must not fall back to body-idle sprites.
const progressionFile=path.join(process.cwd(),'dist','runtime','ui','progression','progression.js');
let progression=await fs.readFile(progressionFile,'utf8');
const forgeSource="const data=unitData(name),id=unitId(name),assets=data?.assets||{},clean=assets.forge_art_clean||assets.presentation_art;\n const rel=clean||(LEGACY_FIGHTERS.includes(name)?data?.animation_standard?.animations?.idle?.frames?.[0]:(assets.art||assets.card||assets.portrait));";
const forgeTarget="const data=unitData(name),id=unitId(name),assets=data?.assets||{},clean=assets.forge_art_clean||assets.presentation_art||(LEGACY_FIGHTERS.includes(name)?CARD_ART[name]:'');\n const rel=clean||(LEGACY_FIGHTERS.includes(name)?CARD_ART[name]||data?.animation_standard?.animations?.idle?.frames?.[0]:(assets.art||assets.card||assets.portrait));";
if(progression.includes(forgeSource))progression=progression.replace(forgeSource,forgeTarget);
else if(!progression.includes(forgeTarget))throw new Error('Presentation integrity: Forge clean-art resolver anchor missing');
await fs.writeFile(progressionFile,progression);

// The approved Itachi basic remains dramatic, but the authored flock is intentionally compact
// so it reads as a target-lane strike instead of swallowing adjacent units or clipping the scene.
const crowTravelSource='const frame=Math.min(5,Math.floor(travelT*6)),width=74+13*travelT;';
const crowTravelTarget='const frame=Math.min(5,Math.floor(travelT*6)),width=58+10*travelT;';
if(html.includes(crowTravelSource))html=html.replace(crowTravelSource,crowTravelTarget);
else if(!html.includes(crowTravelTarget))throw new Error('Presentation integrity: Itachi crow travel-size anchor missing');
const crowImpactSource='const frame=6+Math.min(1,Math.floor(impactT*2)),fade=Math.max(.18,1-impactT*.62),width=90+15*impactT;';
const crowImpactTarget='const frame=6+Math.min(1,Math.floor(impactT*2)),fade=Math.max(.18,1-impactT*.62),width=68+10*impactT;';
if(html.includes(crowImpactSource))html=html.replace(crowImpactSource,crowImpactTarget);
else if(!html.includes(crowImpactTarget))throw new Error('Presentation integrity: Itachi crow impact-size anchor missing');
const crowFallbackSource='ctx.save();ctx.translate(x,y);ctx.scale(dir*.68,.68);';
const crowFallbackTarget='ctx.save();ctx.translate(x,y);ctx.scale(dir*.54,.54);';
if(html.includes(crowFallbackSource))html=html.replace(crowFallbackSource,crowFallbackTarget);
else if(!html.includes(crowFallbackTarget))throw new Error('Presentation integrity: Itachi crow fallback-scale anchor missing');

// Keep Itachi's approved idle/Jutsu presence, but shrink only the basic-attack body while the
// six authored lunge frames are active. This adds side breathing room for mirrored/right-facing
// frames without changing his normal battlefield scale or the crow effect itself.
const itachiBodyScaleSource="name==='Itachi'?1.28:1";
const itachiBodyScaleTarget="name==='Itachi'?(ensureAnimState()?.attackPose?.[name]?.kind==='basic_attack'?1.12:1.28):1";
if(html.includes(itachiBodyScaleSource))html=html.split(itachiBodyScaleSource).join(itachiBodyScaleTarget);
else if(!html.includes(itachiBodyScaleTarget))throw new Error('Presentation integrity: Itachi body-scale anchor missing');

const specs=[
 ['bb-legacy-clean-presentation-contract','runtime/ui/legacy-clean-presentation-contract.js'],
 ['bb-road-ios-canvas-safety','runtime/modes/blazing-road-ios-canvas-safety.js'],
 ['bb-summon-blazing-polish','runtime/ui/progression/summon-blazing-polish.js']
];
for(const [id] of specs){
 html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'');
 html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*/>`,'gi'),'');
}
const at=html.toLowerCase().lastIndexOf('</body>');
if(at<0)throw new Error('Presentation integrity: closing body missing');
const tags=specs.map(([id,src])=>`<script id="${id}" src="${src}"></script>`).join('');
html=html.slice(0,at)+tags+html.slice(at);
for(const [id] of specs)if((html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length!==1)throw new Error(`Presentation integrity: ${id} injection not unique`);
for(const marker of [crowTravelTarget,crowImpactTarget,crowFallbackTarget,itachiBodyScaleTarget])if(!html.includes(marker))throw new Error(`Presentation integrity: missing ${marker}`);
await fs.writeFile(file,html);
console.log('Presentation integrity PASS: Team/Forge clean art, compact Itachi crow VFX, basic-body clipping guard, iOS Road safety, and Blazing-style summon polish injected.');
