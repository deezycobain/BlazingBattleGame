import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const STYLE_ID='bb-official-dev-shell-style';
const MOBILE_SHELL_ID='bb-mobile-shell-fixes-runtime';
const ECONOMY_ID='bb-battle-economy-runtime';
const RESULTS_ID='bb-match-results-runtime';
const TERRAIN_DEBUG_ID='bb-road-terrain-debug-runtime';
const ROAD_FEEDBACK_ID='bb-road-feedback-fixes-runtime';
const HOME_COMPAT_ID='bb-approved-home-compat-runtime';
const HOME_LIVE_ID='bb-home-live-polish-runtime';
const HOME_V8_ID='bb-home-v8-runtime';
const HOME_V9_ID='bb-home-v9-runtime';
const HOME_V9_LIFECYCLE_ID='bb-home-v9-lifecycle-runtime';
const HOME_FEEDBACK_ID='bb-home-feedback-fixes-runtime';

html=html
  .replace(new RegExp(`<link\\b[^>]*id=["']${STYLE_ID}["'][^>]*>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${MOBILE_SHELL_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${MOBILE_SHELL_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${ECONOMY_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${RESULTS_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${TERRAIN_DEBUG_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${TERRAIN_DEBUG_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${ROAD_FEEDBACK_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${ROAD_FEEDBACK_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_COMPAT_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_COMPAT_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_LIVE_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_LIVE_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_V8_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_V8_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_V9_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_V9_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_V9_LIFECYCLE_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_V9_LIFECYCLE_ID}["'][^>]*/>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_FEEDBACK_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
  .replace(new RegExp(`<script\\b[^>]*id=["']${HOME_FEEDBACK_ID}["'][^>]*/>`,'gi'),'');

const anchor=` const roadRun=recordRoadVictory();\n S.victoryFX={`;
const replacement=` const roadRun=recordRoadVictory();\n const victoryMode=S.bbRunMode==='road'?'road':S.bbRunMode==='castle'?'castle':null;\n const victoryStage=victoryMode==='road'?Math.max(1,Number(roadBeforeStage)||1):1;\n const victoryBoss=victoryMode==='castle'?Math.max(1,Number(S.bbCastleBoss||S.bbBossStage)||1):1;\n S.bbVictoryStage=victoryStage;\n S.bbVictoryBoss=victoryBoss;\n S.bbVictoryReward=victoryMode&&window.BlazingEconomy?window.BlazingEconomy.awardVictory({mode:victoryMode,stage:victoryStage,boss:victoryBoss}):null;\n S.victoryFX={`;
const hits=html.split(anchor).length-1;
if(hits!==1)throw new Error(`Official dev shell: expected one victory anchor, found ${hits}`);
html=html.replace(anchor,replacement);

// Presentation-only fighter enlargement. Road perspective may already have wrapped the final
// sprite scale by the time this pass runs. Preserve that map-authored depth multiplier and
// retain the pre-camera 1.15x size, dividing Road sprites by the authored camera
// target so their final screen size remains unchanged. Actor radii, hitboxes, walkable
// geometry, targeting, movement and shadow logic stay unchanged.
const perspectiveSpriteScaleAnchor='ctx.scale(directionalFlip*scale*activePulse*bbRoadDepthScale,scale*activePulse*bbRoadDepthScale);';
const perspectiveSpriteScaleReplacement='const bbRoadCameraCompensation=S.bbRunMode===\'road\'?1/Math.max(1,Number(S.bbRoadContent?.map?.presentation?.combatScale)||1.18):1;ctx.scale(directionalFlip*scale*activePulse*bbRoadDepthScale*1.15*bbRoadCameraCompensation,scale*activePulse*bbRoadDepthScale*1.15*bbRoadCameraCompensation);ctx.translate(0,5);';
const legacySpriteScaleAnchor='ctx.scale(directionalFlip*scale*activePulse,scale*activePulse);';
const legacySpriteScaleReplacement='ctx.scale(directionalFlip*scale*activePulse*1.15,scale*activePulse*1.15);ctx.translate(0,5);';
const perspectiveScaleHits=html.split(perspectiveSpriteScaleAnchor).length-1;
const legacyScaleHits=html.split(legacySpriteScaleAnchor).length-1;
if(perspectiveScaleHits===1&&legacyScaleHits===0)html=html.replace(perspectiveSpriteScaleAnchor,perspectiveSpriteScaleReplacement);
else if(perspectiveScaleHits===0&&legacyScaleHits===1)html=html.replace(legacySpriteScaleAnchor,legacySpriteScaleReplacement);
else if(perspectiveScaleHits===0&&legacyScaleHits===0&&(html.includes(perspectiveSpriteScaleReplacement)||html.includes(legacySpriteScaleReplacement))){}
else throw new Error(`Official dev shell: expected one battle sprite scale anchor, found perspective=${perspectiveScaleHits} legacy=${legacyScaleHits}`);

const v8File=path.join(process.cwd(),'dist','runtime','ui','home','home-v8-runtime.js');
let v8=await fs.readFile(v8File,'utf8');
const v8LayoutAnchor="shell.dataset.bbHomeLayout='v8-mockup';";
const v8LayoutHits=v8.split(v8LayoutAnchor).length-1;
if(v8LayoutHits!==1)throw new Error(`Official dev shell: expected one Home v8 layout assignment, found ${v8LayoutHits}`);
v8=v8.replace(v8LayoutAnchor,"if(!shell.classList.contains('bb-home-v9')&&shell.dataset.bbHomeLayout!=='v9-polish')shell.dataset.bbHomeLayout='v8-mockup';");
await fs.writeFile(v8File,v8);

// The slight Forge rotation can extend a fraction of a pixel below a desktop viewport.
// Lift only that final row, preserving the approved phone geometry and dock proportions.
const v9File=path.join(process.cwd(),'dist','runtime','ui','home','home-v9-runtime.js');
let v9=await fs.readFile(v9File,'utf8');
const forgeTransformAnchor='transform:rotate(.3deg) translateX(-1px)!important';
const forgeTransformReplacement='transform:rotate(.3deg) translate(-1px,-4px)!important';
const forgeTransformHits=v9.split(forgeTransformAnchor).length-1;
if(forgeTransformHits!==1)throw new Error(`Official dev shell: expected one Home v9 Forge transform, found ${forgeTransformHits}`);
v9=v9.replace(forgeTransformAnchor,forgeTransformReplacement);
await fs.writeFile(v9File,v9);

// Preserve the existing mobile viewport contract while opting into iPhone safe-area coverage.
const viewportMetaRe=/<meta\b[^>]*\bname=["']viewport["'][^>]*>/i;
if(viewportMetaRe.test(html)){
  html=html.replace(viewportMetaRe,tag=>{
    const content=tag.match(/\bcontent=(["'])(.*?)\1/i);
    if(!content)return tag.replace(/>$/, ' content="width=device-width,initial-scale=1,viewport-fit=cover">');
    const parts=content[2].split(',').map(part=>part.trim()).filter(Boolean).filter(part=>!/^viewport-fit\s*=/i.test(part));
    if(!parts.some(part=>/^width\s*=/i.test(part)))parts.unshift('width=device-width');
    if(!parts.some(part=>/^initial-scale\s*=/i.test(part)))parts.push('initial-scale=1');
    parts.push('viewport-fit=cover');
    return tag.replace(content[0],`content=${content[1]}${parts.join(',')}${content[1]}`);
  });
}

const head=html.toLowerCase().lastIndexOf('</head>');
if(head<0)throw new Error('Official dev shell: closing head missing');
const viewportTag=viewportMetaRe.test(html)?'':'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">';
html=html.slice(0,head)+viewportTag+`<link id="${STYLE_ID}" rel="stylesheet" href="runtime/ui/home/home-official-dev.css">`+html.slice(head);
const body=html.toLowerCase().lastIndexOf('</body>');
if(body<0)throw new Error('Official dev shell: closing body missing');
html=html.slice(0,body)+`<script id="${MOBILE_SHELL_ID}" src="runtime/ui/mobile/mobile-shell-fixes.js"></script><script id="${ECONOMY_ID}" src="runtime/modes/battle-economy.js"></script><script id="${RESULTS_ID}" src="runtime/ui/battle/match-results.js"></script><script id="${TERRAIN_DEBUG_ID}" src="runtime/ui/battle/road-terrain-debug.js"></script><script id="${ROAD_FEEDBACK_ID}" src="runtime/ui/battle/road-feedback-fixes.js"></script><script id="${HOME_COMPAT_ID}" src="runtime/ui/home/home-approved-compat.js"></script><script id="${HOME_LIVE_ID}" src="runtime/ui/home/home-live-polish.js"></script><script id="${HOME_V8_ID}" src="runtime/ui/home/home-v8-runtime.js"></script><script id="${HOME_V9_ID}" src="runtime/ui/home/home-v9-runtime.js"></script><script id="${HOME_V9_LIFECYCLE_ID}" src="runtime/ui/home/home-v9-lifecycle.js"></script><script id="${HOME_FEEDBACK_ID}" src="runtime/ui/home/home-feedback-fixes.js"></script>`+html.slice(body);

for(const marker of [STYLE_ID,MOBILE_SHELL_ID,ECONOMY_ID,RESULTS_ID,TERRAIN_DEBUG_ID,ROAD_FEEDBACK_ID,HOME_COMPAT_ID,HOME_LIVE_ID,HOME_V8_ID,HOME_V9_ID,HOME_V9_LIFECYCLE_ID,HOME_FEEDBACK_ID,'viewport-fit=cover','mobile-shell-fixes.js','S.bbVictoryReward','BlazingEconomy.awardVictory','road-terrain-debug.js','road-feedback-fixes.js','home-approved-compat.js','home-live-polish.js','home-v8-runtime.js','home-v9-runtime.js','home-v9-lifecycle.js','home-feedback-fixes.js','*1.15','ctx.translate(0,5)'])if(!html.includes(marker))throw new Error(`Official dev shell: missing ${marker}`);
if(html.includes('bbRoadDepthScale')&&!html.includes('bbRoadDepthScale*1.15'))throw new Error('Official dev shell: Road perspective scale did not retain dev fighter enlargement');
if(!v9.includes(forgeTransformReplacement))throw new Error('Official dev shell: Home v9 Forge safe-area correction missing');
await fs.writeFile(file,html);
console.log('Official dev shell PASS: mobile visual viewport coverage, Home feedback, enlarged fighter sprites with map-authored Road depth, Lantern Garden feedback, Forge safety, live currencies, profile, parallax, Reset, Pause, and post-match controls are integrated.');
