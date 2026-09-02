import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const file=path.join(ROOT,'dist','index.html');
let html=await fs.readFile(file,'utf8');
const subzero=JSON.parse(await fs.readFile(path.join(ROOT,'assets/characters/subzero/data/unit.json'),'utf8'));
const presentation=subzero?.abilities?.jutsu?.presentation||{};
const handOffsetY=Number(presentation.projectile_hand_offset_y_px);
const visualScale=Number(presentation.projectile_visual_scale);
if(!Number.isFinite(handOffsetY)||handOffsetY>0||handOffsetY<-60)throw new Error('Sub-Zero freeze alignment: projectile_hand_offset_y_px must be a sane upward offset');
if(!Number.isFinite(visualScale)||visualScale<.65||visualScale>1)throw new Error('Sub-Zero freeze alignment: projectile_visual_scale must be between .65 and 1');

// Commit facing from the actual attack vector: attacker -> resolved target. This is the same
// direction the attack travels, so no nearest-enemy/assisted-target pass can contradict it.
const rosterFacing=`const facing=window.BlazingAttackPresentation.resolveActionRotation(canonicalUnit(unitName),'jutsu',from,S.enemies||[],0);\n   window.BlazingAttackPresentation.lockRotation(state,unitName,facing);`;
const targetFacing=`const facing=window.BlazingAttackPresentation.resolveActionRotation(canonicalUnit(unitName),'jutsu',from,[enemy],0);\n   window.BlazingAttackPresentation.lockRotation(state,unitName,facing);`;
const vectorFacing=`const attackDx=Number(enemy?.x)-Number(from?.x);\n   const facing=Number.isFinite(attackDx)&&attackDx<0?Math.PI:0;\n   window.BlazingAttackPresentation.lockRotation(state,unitName,facing);`;
const rosterFacingCount=html.split(rosterFacing).length-1,targetFacingCount=html.split(targetFacing).length-1,vectorFacingCount=html.split(vectorFacing).length-1;
if(rosterFacingCount===1)html=html.replace(rosterFacing,vectorFacing);
else if(targetFacingCount===1)html=html.replace(targetFacing,vectorFacing);
else if(vectorFacingCount!==1)throw new Error(`Sub-Zero freeze alignment: expected one cast-facing anchor, found roster=${rosterFacingCount}, target=${targetFacingCount}, vector=${vectorFacingCount}`);

// While aiming, face the same left/right direction as the live attack lane. On release the
// committed target-vector lock above becomes authoritative for the entire attack animation.
const previewLock=`if(presentation.body_facing_mode==='jutsu_direction_locked'){
          const attackDirection=window.BlazingAttackPresentation.resolveActionRotation(unit,action,origin,S.enemies||[],authored);
          return window.BlazingAttackPresentation.lockRotation(S.anim,actor.name,attackDirection);
        }`;
const legacyPreviewUnlocked=`if(presentation.body_facing_mode==='jutsu_direction_locked'){
          const previewCandidates=[
            actor?.actionRotation,actor?.aimRotation,actor?.rangeRotation,
            origin?.actionRotation,origin?.aimRotation,origin?.rangeRotation,
            actor?.rotation,origin?.rotation
          ];
          const livePreview=previewCandidates.map(Number).find(Number.isFinite);
          if(S.action==='jutsu'&&actor.name==='Sub-Zero'&&Number.isFinite(livePreview)){
            return Math.cos(livePreview)<0?Math.PI:0;
          }
          return window.BlazingAttackPresentation.resolveActionRotation(unit,action,origin,S.enemies||[],authored);
        }`;
const aimedPreview=`if(presentation.body_facing_mode==='jutsu_direction_locked'){
          if(S.action==='jutsu'&&actor.name==='Sub-Zero'){
            return Math.cos(authored)<0?Math.PI:0;
          }
          return window.BlazingAttackPresentation.resolveActionRotation(unit,action,origin,S.enemies||[],authored);
        }`;
const previousPreviewState=`if(presentation.body_facing_mode==='jutsu_direction_locked'){
          if(S.action==='jutsu'&&actor.name==='Sub-Zero'){
            const previewDirection=Math.cos(authored)<0?Math.PI:0;
            return window.BlazingAttackPresentation.setPreviewRotation(S.anim,actor.name,previewDirection);
          }
          return window.BlazingAttackPresentation.resolveActionRotation(unit,action,origin,S.enemies||[],authored);
        }`;
const livePreviewState=`if(presentation.body_facing_mode==='jutsu_direction_locked'){
          if(S.action==='jutsu'&&actor.name==='Sub-Zero'){
            const liveAim=Number(actor?.rotation);
            const previewSource=Number.isFinite(liveAim)?liveAim:authored;
            const previewDirection=Math.cos(previewSource)<0?Math.PI:0;
            return window.BlazingAttackPresentation.setPreviewRotation(S.anim,actor.name,previewDirection);
          }
          return window.BlazingAttackPresentation.resolveActionRotation(unit,action,origin,S.enemies||[],authored);
        }`;
const directPreviewState=`if(presentation.body_facing_mode==='jutsu_direction_locked'){
          if(S.action==='jutsu'&&actor.name==='Sub-Zero'){
            const attackRotation=Number(actor?.rotation);
            const laneRotation=Number.isFinite(attackRotation)?attackRotation:authored;
            return window.BlazingAttackPresentation.setPreviewRotation(S.anim,actor.name,Math.cos(laneRotation)<0?Math.PI:0);
          }
          return window.BlazingAttackPresentation.resolveActionRotation(unit,action,origin,S.enemies||[],authored);
        }`;
const candidates=[previewLock,legacyPreviewUnlocked,aimedPreview,previousPreviewState,livePreviewState];
let replaced=false;
for(const candidate of candidates){if(html.includes(candidate)){html=html.replace(candidate,directPreviewState);replaced=true;break;}}
if(!replaced&&!html.includes(directPreviewState))throw new Error('Sub-Zero freeze alignment: preview-facing anchor missing');

// Tune only the final authored Freeze Blast floater. Gameplay coordinates/timing stay
// untouched; this is a visual hand-origin lift plus a modest size reduction.
const projectileNeedle="const locked=window.BlazingAttackPresentation.lockedFacing(S.anim,'Sub-Zero');";
const projectileAt=html.indexOf(projectileNeedle);
if(projectileAt<0)throw new Error('Sub-Zero freeze alignment: Freeze Blast renderer not found');
const rendererStart=html.lastIndexOf("else if(f.kind==='",projectileAt);
const rendererEnd=html.indexOf('}else if(',projectileAt);
if(rendererStart<0||rendererEnd<0)throw new Error('Sub-Zero freeze alignment: Freeze Blast renderer bounds not found');
let renderer=html.slice(rendererStart,rendererEnd);
const translateOld='ctx.translate(x,y);ctx.rotate(angle);';
const translateNew=`const freezeMeta=canonicalUnit('subzero')?.abilities?.jutsu?.presentation||{};
     const projectileHandOffsetY=Number.isFinite(Number(freezeMeta.projectile_hand_offset_y_px))?Number(freezeMeta.projectile_hand_offset_y_px):${handOffsetY};
     const projectileVisualScale=Number.isFinite(Number(freezeMeta.projectile_visual_scale))?Number(freezeMeta.projectile_visual_scale):${visualScale};
     ctx.translate(x,y+projectileHandOffsetY);ctx.rotate(angle);`;
if(renderer.includes(translateOld))renderer=renderer.replace(translateOld,translateNew);
else if(!renderer.includes('projectileHandOffsetY'))throw new Error('Sub-Zero freeze alignment: projectile translate anchor missing');
const heightOld='const bodyH=frameIndex===2?31:(frameIndex===1?22.5:27);';
const heightNew='const baseBodyH=frameIndex===2?31:(frameIndex===1?22.5:27);\n     const bodyH=baseBodyH*projectileVisualScale;';
if(renderer.includes(heightOld))renderer=renderer.replace(heightOld,heightNew);
else if(!renderer.includes('baseBodyH'))throw new Error('Sub-Zero freeze alignment: projectile height anchor missing');
const widthOld='const bodyW=frameIndex===2?60.5:(frameIndex===1?56:64.5);';
const widthNew='const baseBodyW=frameIndex===2?60.5:(frameIndex===1?56:64.5);\n     const bodyW=baseBodyW*projectileVisualScale;';
if(renderer.includes(widthOld))renderer=renderer.replace(widthOld,widthNew);
else if(!renderer.includes('baseBodyW'))throw new Error('Sub-Zero freeze alignment: projectile width anchor missing');
html=html.slice(0,rendererStart)+renderer+html.slice(rendererEnd);

await fs.writeFile(file,html);
console.log(`Sub-Zero Freeze Blast alignment applied: live attack-lane preview -> actual target-vector cast lock -> held projectile direction + hand lift ${handOffsetY}px + visual scale ${visualScale}.`);
