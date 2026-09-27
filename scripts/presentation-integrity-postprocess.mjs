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

// The updated 12-frame Itachi flock stays compact so it reads as a target-lane strike
// instead of swallowing adjacent units or clipping the scene.
const crowFrameRuntime='ITACHI_CROW_ATTACK_VFX_FRAMES';
const crowFrameDraw='drawItachiCrowFrame';
const crowCompactWidth='const frame=Math.min(frames.length-1,Math.floor(frameT*frames.length)),width=64+16*frameT;';
if(!html.includes(crowFrameRuntime)||!html.includes(crowFrameDraw)||!html.includes(crowCompactWidth))throw new Error('Presentation integrity: Itachi 12-frame crow VFX anchor missing');
const crowFallbackSource='ctx.save();ctx.translate(x,y);ctx.scale(dir*.68,.68);';
const crowFallbackTarget='ctx.save();ctx.translate(x,y);ctx.scale(dir*.54,.54);';
if(html.includes(crowFallbackSource))html=html.replace(crowFallbackSource,crowFallbackTarget);
else if(!html.includes(crowFallbackTarget))throw new Error('Presentation integrity: Itachi crow fallback-scale anchor missing');

// Itachi's six basic PNGs have healthy alpha margins. Keep one body-scale authority for idle,
// basic, and Jutsu so spritePlacement can normalize the authored frames without a second
// attack-only shrink changing his visible body size mid-action.
const itachiBodyScaleStable="name==='Itachi'?1.28:1";
const itachiBodyScaleOld="name==='Itachi'?(ensureAnimState()?.attackPose?.[name]?.kind==='basic_attack'?1.12:1.28):1";
if(html.includes(itachiBodyScaleOld))html=html.split(itachiBodyScaleOld).join(itachiBodyScaleStable);
else if(!html.includes(itachiBodyScaleStable))throw new Error('Presentation integrity: Itachi stable body-scale anchor missing');

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
for(const marker of [crowFrameRuntime,crowFrameDraw,crowCompactWidth,crowFallbackTarget,itachiBodyScaleStable])if(!html.includes(marker))throw new Error(`Presentation integrity: missing ${marker}`);
await fs.writeFile(file,html);
console.log('Presentation integrity PASS: Team/Forge clean art, compact Itachi crow VFX, stable Itachi body scale, iOS Road safety, and Blazing-style summon polish injected.');
