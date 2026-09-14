import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const read=rel=>fs.readFile(path.join(root,rel),'utf8');
const readBinary=rel=>fs.readFile(path.join(root,rel));
const fail=msg=>{throw new Error(`Progression validation failed: ${msg}`)};
const js=await read('runtime/ui/progression/progression.js');
const css=await read('runtime/ui/progression/progression.css');
const cinematicJs=await read('runtime/ui/progression/summon-cinematic.js');
const cinematicCss=await read('runtime/ui/progression/summon-cinematic.css');
const pkg=JSON.parse(await read('package.json'));

try{new vm.Script(js)}catch(error){fail(`runtime syntax error: ${error.message}`)}
try{new vm.Script(cinematicJs)}catch(error){fail(`summon cinematic syntax error: ${error.message}`)}

const runtimeMarkers=[
 "KEY='blazing.progression.v1'",'MAX_RESONANCE=5','STAT_BUDGET=12',
 "FIGHTERS=['Crimson','Sub-Zero','Lebee','Senku','Tyler']",'u.resonance<MAX_RESONANCE','u.shards++','u.shiny=true',
 'candidate=rollStats(u.locks,u.roll)','KEEP CURRENT','ACCEPT NEW','summonEmbers=999999','spendEmbers=function()',
 'localStorage.setItem','function applyCombatBonuses()','target.jutsuDamage=Math.round','RESET DEV PROGRESSION',
 "multiSummonBtn.addEventListener('click'",'Array.from({length:10}','CORE RESONANCE BANNER','SKIP TO RESULTS',
 'showSummonResultsNow','bb-shiny-awakening','data-open-forge','cardForSummon=function(name){return CARD_ART[name]',
 'const FORGE_ART=','const SHINY_CUTOUT=','const SHINY_POPOUT_PROFILE=',"'Sub-Zero':'ice-hand'","'Tyler':'head-hand'",
 "'Lebee':'lebee-hand-hair'","'Senku':'senku-hand-hair'",'syncRevealArt','syncResultArt','dataset.popoutProfile',
 'assets/characters/crimson/art/current_collection_art.jpg','assets/characters/subzero/art/full_art_absolute_zero_v2.jpeg',
 'assets/characters/lebee/art/full_art_cosmic_wish.jpeg','assets/characters/senku/cards/senku_card.jpeg',
 'assets/characters/tyler/cards/current_collection_card.png','assets/characters/subzero/art/shiny_foreground_cutout_v2.webp',
 'assets/characters/tyler/art/shiny_foreground_cutout_v1.webp','assets/characters/lebee/art/shiny_foreground_cutout_v3.png',
 'assets/characters/senku/art/shiny_foreground_cutout_v5.png','forgeArtDepth','forgePopout','hasPopout','forgeHoloTexture',
 'summonPullScreen.scrollTop=0','PULL${pulls.length===1','function fitForgeArtwork(image)',
 'image.naturalWidth/image.naturalHeight','--forge-art-max','preloadForgeAsset','syncForgeArtwork',
 'forgeArtRequestedKey','artSwitching','aria-busy'
];
for(const marker of runtimeMarkers)if(!js.includes(marker))fail(`runtime missing ${marker}`);

const styleMarkers=[
 '#coreSummonNotice{display:none!important}','.forgeNode','.forgeCard.shiny','.forgeCandidate.active','.bb-resonance-badge',
 'SUMMON OVERHAUL','.bb-summon-lobby','.bb-skip-reveal','object-fit:contain!important',
 '.bb-shiny-awakening .pullCardWrap::after','animation:bbShinySweep 1.05s','grid-template-columns:repeat(2,minmax(0,1fr))',
 '.bb-shiny-awakening .pullHeroArea::after','@keyframes bbGoldFlow','.forgeArtDepth','.forgePopout',
 '[data-popout-profile="head-hand"]','[data-popout-profile="ice-hand"]','[data-popout-profile="lebee-hand-hair"]',
 '[data-popout-profile="senku-hand-hair"]','radial-gradient(ellipse 24% 11.5% at 40% 0%',
 'radial-gradient(ellipse 24% 10% at 30% 96%','radial-gradient(ellipse 19% 24% at 0% 34%',
 'z-index:5;inset:0;width:100%;height:100%;object-fit:contain;-webkit-mask-image:none;mask-image:none',
 'transform:translate(.39%,2.68%) scale(.997)','transform:translate(-3.23%,2.15%) scale(1.058)','transform:translateY(3.209%)',
 '.forgeCard.shiny.hasPopout .forgeArtStage{inset:10%','width:125%;height:125%',
 '.forgeCard.shiny.hasPopout[data-fighter="senku"] .forgeArtStage{inset:14%','width:138.89%;height:138.89%;left:-19.445%;top:-19.445%',
 '.forgeCard.shiny.hasPopout[data-fighter="subzero"] .forgeArtStage{inset:12%','width:131.58%;height:131.58%',
 'assets/characters/lebee/art/shiny_unified_foil_mask_v3.png','assets/characters/senku/art/shiny_unified_foil_mask_v5.png',
 '.forgeCard.artSwitching .forgeArtDepth{opacity:0;transform:scale(.985);transition:none}',
 '.forgeCard.shiny .forgeHoloTexture','repeating-conic-gradient','@keyframes forgeHoloDrift','overflow-y:auto!important',
 'width:min(100%,var(--forge-art-max,323px))','aspect-ratio:var(--forge-art-ratio,.75)'
];
for(const marker of styleMarkers)if(!css.includes(marker))fail(`style missing ${marker}`);

for(const obsolete of ['installTylerPopoutFraming','bbTylerSelectivePopoutV3','bbTylerPopLayer','bbTylerPopFx','bbTylerPopHand','bbTylerPopHair','MutationObserver']){
 if(js.includes(obsolete)||css.includes(obsolete))fail(`stacked pop-out implementation survived: ${obsolete}`);
}
for(const obsoleteAsset of ['assets/characters/lebee/art/shiny_foreground_cutout_v2.webp','assets/characters/senku/art/shiny_foreground_cutout_v2.webp','assets/characters/senku/art/shiny_foreground_cutout_v3.png','assets/characters/senku/art/shiny_foreground_cutout_v4.png','assets/characters/senku/art/shiny_unified_foil_mask_v4.png']){
 if(js.includes(obsoleteAsset)||css.includes(obsoleteAsset))fail(`obsolete Shiny asset survived in runtime: ${obsoleteAsset}`);
}

const popoutProfiles=[...css.matchAll(/\.forgeCard\[data-popout-profile="(?:head-hand|ice-hand|lebee-hand-hair|senku-hand-hair)"\] \.forgePopout\{[^}]+\}/g)].map(match=>match[0]);
if(popoutProfiles.length!==4)fail(`expected 4 profile-driven pop-outs, found ${popoutProfiles.length}`);
if(popoutProfiles.some(rule=>rule.includes('linear-gradient(')||rule.includes('transparent 19%')))fail('broad overlapping pop-out mask survived');

for(const [rel,width,height] of [
 ['assets/characters/subzero/art/shiny_foreground_cutout_v2.webp',1086,1448],
 ['assets/characters/tyler/art/shiny_foreground_cutout_v1.webp',1086,1448]
]){
 const webp=await readBinary(rel);
 if(webp.length<50000)fail(`Shiny cutout too small: ${rel}`);
 if(webp.toString('ascii',0,4)!=='RIFF'||webp.toString('ascii',8,12)!=='WEBP'||webp.toString('ascii',12,16)!=='VP8X')fail(`Shiny cutout is not extended WebP: ${rel}`);
 if(!(webp[20]&16))fail(`Shiny cutout lost alpha transparency: ${rel}`);
 if(webp.readUIntLE(24,3)+1!==width||webp.readUIntLE(27,3)+1!==height)fail(`Shiny cutout dimensions changed: ${rel}`);
}

for(const [rel,width,height,minBytes] of [
 ['assets/characters/lebee/art/shiny_foreground_cutout_v3.png',600,800,500000],
 ['assets/characters/senku/art/shiny_foreground_cutout_v5.png',1402,1158,1500000],
 ['assets/characters/lebee/art/shiny_unified_foil_mask_v3.png',1086,1448,10000],
 ['assets/characters/senku/art/shiny_unified_foil_mask_v5.png',1402,1158,10000]
]){
 const png=await readBinary(rel);
 if(png.length<minBytes)fail(`Shiny PNG too small: ${rel}`);
 if(png.toString('hex',0,8)!=='89504e470d0a1a0a')fail(`Shiny asset is not PNG: ${rel}`);
 if(png.readUInt32BE(16)!==width||png.readUInt32BE(20)!==height)fail(`Shiny PNG dimensions changed: ${rel}`);
 if(![3,6].includes(png[25]))fail(`Shiny PNG lost palette/RGBA transparency: ${rel}`);
 if(png[25]===3&&!png.includes(Buffer.from('tRNS')))fail(`Indexed Shiny PNG lost transparency: ${rel}`);
}

if(!pkg.scripts?.build?.includes('progression-postprocess.mjs'))fail('build chain missing progression postprocess');
for(const [rel,width,height] of [
 ['assets/vfx/summon/portal-reveal/summon_portal_base.webp',768,768],
 ['assets/vfx/summon/portal-reveal/ring_ornate_cloud.webp',768,768],
 ['assets/vfx/summon/portal-reveal/ring_outer_navy_gold.webp',768,768],
 ['assets/vfx/summon/portal-reveal/ring_energy_gold.webp',768,768],
 ['assets/vfx/summon/portal-reveal/reveal_impact_burst.webp',768,768],
 ['assets/vfx/summon/portal-reveal/flip_motion_cards.webp',768,960],
 ['assets/vfx/summon/portal-reveal/flip_frame_blue_white.webp',768,960],
 ['assets/vfx/summon/portal-reveal/flip_frame_crimson_gold.webp',768,960],
 ['assets/vfx/summon/portal-reveal/flip_crimson_gold_slash.webp',959,540],
 ['assets/vfx/summon/portal-reveal/flip_reveal_starburst.webp',768,768],
 ['assets/vfx/summon/portal-reveal/flip_particles_gold_crimson.webp',768,768]
]){
 const asset=await readBinary(rel);
 if(asset.length<50000||asset.length>250000)fail(`portal VFX is not mobile-sized: ${rel} (${asset.length} bytes)`);
 if(asset.toString('ascii',0,4)!=='RIFF'||asset.toString('ascii',8,12)!=='WEBP'||asset.toString('ascii',12,16)!=='VP8X')fail(`portal VFX is not extended WebP: ${rel}`);
 if(!(asset[20]&16))fail(`portal VFX lost alpha transparency: ${rel}`);
 if(asset.readUIntLE(24,3)+1!==width||asset.readUIntLE(27,3)+1!==height)fail(`portal VFX dimensions changed: ${rel}`);
}
for(const marker of [
 "const VERSION='5.4.0'",'portal:0','circleSlow:500','circleFast:950','cardEnter:1450','flip:1810','resolve:2260','done:2550',
 "setStage(scene,'portal')","setStage(scene,'circle-slow')","setStage(scene,'circle-fast')","setStage(scene,'card-enter')","setStage(scene,'flip')","setStage(scene,'resolve')",
 'summon_portal_base.webp','ring_ornate_cloud.webp','ring_outer_navy_gold.webp','ring_energy_gold.webp','reveal_impact_burst.webp','flip_motion_cards.webp','flip_frame_blue_white.webp','flip_frame_crimson_gold.webp','flip_crimson_gold_slash.webp','flip_reveal_starburst.webp','flip_particles_gold_crimson.webp',
 '.bb-summon-portal{width:78%}','.bb-portal-ring-ornate{width:74%}','.bb-portal-ring-outer{width:68%}','.bb-portal-ring-energy{width:62%}',
 'await prepareVfx(refs)','await waitForPortalAnimation(refs)','bb-cinematic-preparing .pullCardWrap::before','bbPortalOpen .72s','bbOrnateRingBuild .86s','bbOuterRingCharge 1s','bbEnergyRingCharge .72s','bbMotionCardsBridge .48s','bbFlipFrameAura .86s','bbFlipSlash .34s','bbCardBackEnter .28s','bbPhysicalCardFlip .45s','bbResolveFlash .24s','bbResolveParticles .38s','rotateY(180deg)','@media(prefers-reduced-motion:reduce)'
])if(!cinematicJs.includes(marker)&&!cinematicCss.includes(marker))fail(`summon cinematic missing ${marker}`);
for(const removed of ['bb-paint-stroke','bb-paint-accent','reveal-brush','card-spin-orbit','reveal-resolve-ring','bbBrush','bbCircleCharge','bb-flip-afterimage','flip_shadow_afterimage','flip_impact_burst','rotateY(540deg)','rotateY(720deg)']){
 if(cinematicJs.includes(removed)||cinematicCss.includes(removed))fail(`busy summon effect survived: ${removed}`);
}
for(const expensive of ['clip-path:','mask-image:','-webkit-mask-image:','filter:blur(','will-change:']){
 if(cinematicCss.includes(expensive))fail(`expensive summon animation primitive survived: ${expensive}`);
}
const runtimeCreates=[...cinematicJs.matchAll(/img\(VFX\.(?:portal|ornateRing|outerRing|energyRing|chargeImpact|motionCards|flipFrameCrimson|flipSlash|resolveFlash|resolveParticles),/g)].length;
if(runtimeCreates!==10)fail(`expected ten sequenced VFX DOM layers, found ${runtimeCreates}`);
if(!pkg.scripts?.['smoke:browser']?.includes('summon-cinematic-browser-smoke.mjs'))fail('summon cinematic browser smoke is not wired into smoke:browser');
console.log('Progression PASS: canonical summon art, persistent Resonance rerolls, and the smooth 2.55s brush-free cinematic are enforced.');
