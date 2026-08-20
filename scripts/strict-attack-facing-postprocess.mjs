import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

const current=`function bodyFacingRotation(actor,origin,basicFallbackDeg,jutsuFallbackDeg=basicFallbackDeg){
    const authored=authoredAttackRotation(actor,basicFallbackDeg,jutsuFallbackDeg);
    try{
      if(actor?.name==='Sub-Zero'){
        if(S.action==='jutsu'){
          const unit=canonicalUnit(actor.name);
          const presentation=unit?.abilities?.jutsu?.presentation||{};
          if(presentation.body_facing_mode==='jutsu_direction_locked'){
            return window.BlazingAttackPresentation.resolveActionRotation(unit,'jutsu',origin,S.enemies||[],authored);
          }
        }
        const enemies=(S.enemies||[]).filter(e=>e&&e.hp>0);
        if(enemies.length){
          const nearest=[...enemies].sort((a,b)=>d(origin,a)-d(origin,b))[0];
          return nearest.x<origin.x?Math.PI:0;
        }
      }
      if(S.action==='jutsu'&&actor?.name){
        const unit=canonicalUnit(actor.name);
        const presentation=unit?.abilities?.jutsu?.presentation||{};
        if(presentation.body_facing_mode==='jutsu_direction_locked'){
          return window.BlazingAttackPresentation.resolveActionRotation(unit,'jutsu',origin,S.enemies||[],authored);
        }
      }
    }catch(_){}
    return authored;
  }`;

const strict=`function bodyFacingRotation(actor,origin,basicFallbackDeg,jutsuFallbackDeg=basicFallbackDeg){
    const authored=authoredAttackRotation(actor,basicFallbackDeg,jutsuFallbackDeg);
    try{
      if(actor?.name){
        // Global priority rule: once an attack has committed a direction, that lock is
        // authoritative until the attack runtime clears it. Never let proximity steering
        // or a different enemy flip the visible attacker during the animation.
        const committed=window.BlazingAttackPresentation.lockedFacing(S.anim,actor.name);
        if(Number.isFinite(committed))return committed;

        const unit=canonicalUnit(actor.name);
        const action=S.action==='jutsu'?'jutsu':'basic';
        const presentation=action==='jutsu'?(unit?.abilities?.jutsu?.presentation||{}):(unit?.abilities?.basic?.presentation||{});
        if(presentation.body_facing_mode==='jutsu_direction_locked'){
          const attackDirection=window.BlazingAttackPresentation.resolveActionRotation(unit,action,origin,S.enemies||[],authored);
          return window.BlazingAttackPresentation.lockRotation(S.anim,actor.name,attackDirection);
        }

        // Outside an attack-direction lock, player units may face living enemies only.
        // Allies are deliberately excluded from this decision.
        const enemies=(S.enemies||[]).filter(e=>e&&e.hp>0);
        if(enemies.length){
          const nearest=[...enemies].sort((a,b)=>d(origin,a)-d(origin,b))[0];
          return nearest.x<origin.x?Math.PI:0;
        }
      }
    }catch(_){}
    return authored;
  }`;

const count=html.split(current).length-1;
if(count!==1)throw new Error(`Strict attack facing: expected one bodyFacingRotation anchor, found ${count}`);
html=html.replace(current,strict);
await fs.writeFile(file,html);
console.log('Strict attack facing applied globally: committed attack direction > living-enemy facing > authored fallback; allies cannot steer facing.');