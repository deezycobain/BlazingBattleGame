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

// The cast must lock to the enemy that the attack actually resolved, never to a second
// assisted-target pass over the whole enemy roster. That second pass is what could make
// Sub-Zero face right while a committed Freeze Blast was traveling left (or vice versa).
const rosterFacing=`const facing=window.BlazingAttackPresentation.resolveActionRotation(canonicalUnit(unitName),'jutsu',from,S.enemies||[],0);\n   window.BlazingAttackPresentation.lockRotation(state,unitName,facing);`;
const targetFacing=`const facing=window.BlazingAttackPresentation.resolveActionRotation(canonicalUnit(unitName),'jutsu',from,[enemy],0);\n   window.BlazingAttackPresentation.lockRotation(state,unitName,facing);`;
const rosterFacingCount=html.split(rosterFacing).length-1;
const targetFacingCount=html.split(targetFacing).length-1;
if(rosterFacingCount===1)html=html.replace(rosterFacing,targetFacing);
else if(targetFacingCount!==1)throw new Error(`Sub-Zero freeze alignment: expected one cast-facing anchor, found roster=${rosterFacingCount}, target=${targetFacingCount}`);

// Preview facing is driven by the authored attack aim itself. Do not run a second enemy
// selection pass here: it can choose another nearby enemy and visually flip Sub-Zero away
// from the lane the player is actually aiming. The committed cast above remains authoritative
// once the attack starts, so preview -> cast -> projectile uses one smooth direction agenda.
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
const previewLockCount=html.split(previewLock).length-1;
const legacyPreviewCount=html.split(legacyPreviewUnlocked).length-1;
const aimedPreviewCount=html.split(aimedPreview).length-1;
if(previewLockCount===1)html=html.replace(previewLock,aimedPreview);
else if(legacyPreviewCount===1)html=html.replace(legacyPreviewUnlocked,aimedPreview);
else if(aimedPreviewCount!==1)throw new Error(`Sub-Zero freeze alignment: expected one preview-facing anchor, found locked=${previewLockCount}, legacy=${legacyPreviewCount}, aimed=${aimedPreviewCount}`);

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
console.log(`Sub-Zero Freeze Blast alignment applied: authored preview aim -> actual-target cast lock -> held projectile direction + hand lift ${handOffsetY}px + visual scale ${visualScale}.`);
