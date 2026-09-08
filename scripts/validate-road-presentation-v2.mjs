import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile('runtime/modes/blazing-road-content.js','utf8');
const sandbox={window:{}};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'blazing-road-content.js'});
const C=sandbox.window.BlazingRoadContent;
if(!C||typeof C.visualScaleForY!=='function')throw new Error('Road presentation v2: visualScaleForY runtime missing');
for(const stage of [1,2]){
 const map=C.mapForStage(stage),p=map?.perspective;
 if(!p)throw new Error(`Road presentation v2: Stage ${stage} perspective profile missing`);
 const far=C.visualScaleForY(map,p.farY),near=C.visualScaleForY(map,p.nearY),mid=C.visualScaleForY(map,(p.farY+p.nearY)/2);
 if(!(far>=.82&&far<1&&near>1&&near<=1.10&&mid>far&&mid<near))throw new Error(`Road presentation v2: Stage ${stage} depth curve invalid: ${JSON.stringify({far,mid,near,p})}`);
}
for(const stage of [3,4,5])if(C.visualScaleForY(C.mapForStage(stage),300)!==1)throw new Error(`Road presentation v2: Stage ${stage} should remain perspective-neutral until explicitly authored`);

const camera=await fs.readFile('runtime/modes/blazing-road-camera.js','utf8');
for(const marker of ["showWord('3')","showWord('2')","showWord('1')","showWord('FIGHT')",'isCombatLocked','sessionStorage',"introPhase='fight'",'AnimeAce2']){
 if(!camera.includes(marker))throw new Error(`Road presentation v2: camera missing ${marker}`);
}
if(!camera.includes('applyCamera(canvas,combatScale,position,transitionMs)'))throw new Error('Road presentation v2: FIGHT must begin the combat camera transition');
if(!camera.includes("mode='intro'")||!camera.includes("mode='combat'")||!camera.includes("mode='outro'"))throw new Error('Road presentation v2: camera lifecycle modes regressed');

const perspectivePass=await fs.readFile('scripts/road-perspective-postprocess.mjs','utf8');
for(const marker of ['bbRoadDepthY','bbRoadDepthScale','ctx.getTransform?.().f','visualScaleForY'])if(!perspectivePass.includes(marker))throw new Error(`Road presentation v2: perspective postprocess missing ${marker}`);
const countdownPass=await fs.readFile('scripts/road-countdown-lock-postprocess.mjs','utf8');
if(!countdownPass.includes('BlazingRoadCamera?.isCombatLocked?.()'))throw new Error('Road presentation v2: countdown tick gate missing');
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
if(!pkg.scripts?.validate?.includes('validate-road-presentation-v2.mjs'))throw new Error('Road presentation v2 validator is not wired into npm validate');
if(!pkg.scripts?.build?.includes('road-perspective-postprocess.mjs'))throw new Error('Road perspective postprocess is not wired into build');
if(!pkg.scripts?.build?.includes('road-countdown-lock-postprocess.mjs'))throw new Error('Road countdown tick gate is not wired into build');

console.log('Road presentation v2 PASS: per-map render-only depth, 3-2-1-FIGHT intro, camera transition, reload suppression, and combat tick lock are wired.');
