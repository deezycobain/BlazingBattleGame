import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const replaceOnce=(oldText,newText,label)=>{
  const count=html.split(oldText).length-1;
  if(count!==1)throw new Error(`Combat polish: expected 1 ${label} anchor, found ${count}`);
  html=html.replace(oldText,newText);
};
const replaceRegexOnce=(rx,newText,label)=>{
  const matches=[...html.matchAll(new RegExp(rx.source,rx.flags.includes('g')?rx.flags:rx.flags+'g'))];
  if(matches.length!==1)throw new Error(`Combat polish: expected 1 ${label} regex anchor, found ${matches.length}`);
  html=html.replace(rx,newText);
};

// Sub-Zero Basic keeps its exact 92 px circle. Freeze Blast uses its canonical
// left/right horizontal rectangle.
replaceOnce(
`function drawShape(p,u,color,alpha=.22,glow=false,visualOffsetY=0){
 return window.BlazingBattlefieldRenderer.drawShape(ctx,{origin:p,shape:u.shape,rotation:u.rotation||0,color,glow,visualOffsetY,bounds:BATTLE_BOUNDS});
}`,
`const SUBZERO_FREEZE_PROJECTILE_FRAMES=[
 'assets/characters/subzero/vfx/jutsu/freeze_blast/projectile/frame_01.png',
 'assets/characters/subzero/vfx/jutsu/freeze_blast/projectile/frame_02.png',
 'assets/characters/subzero/vfx/jutsu/freeze_blast/projectile/frame_03.png'
].map(src=>{const img=new Image();img.src=src;return img;});
function drawShape(p,u,color,alpha=.22,glow=false,visualOffsetY=0){
 let visualShape=u.shape;
 if(S.action!=='jutsu'&&u?.name==='Sub-Zero'&&visualShape?.type==='circle'){
  let visualScale=1;
  try{visualScale=canonicalUnit(u.name)?.abilities?.basic?.presentation?.range_visual_scale??1}catch(_){}
  visualShape={...visualShape,r:visualShape.r*visualScale};
 }
 return window.BlazingBattlefieldRenderer.drawShape(ctx,{origin:p,shape:visualShape,rotation:u.rotation||0,color,glow,visualOffsetY,bounds:BATTLE_BOUNDS});
}`,
'Sub-Zero range presentation'
);

// Freeze Blast floater: left/right travel only, using the side chosen by the horizontal
// lane resolver while retaining the authored compact projectile treatment.
const freezeLockNeedle="resolveActionRotation(canonicalUnit(unitName),'jutsu',from,S.enemies||[],0)";
const freezeLockAt=html.indexOf(freezeLockNeedle);
if(freezeLockAt<0)throw new Error('Freeze Blast projectile pass: locked-facing animation not found');
const freezeFnStart=html.lastIndexOf('\nfunction ',freezeLockAt);
const freezeFnEnd=html.indexOf('\nfunction ',freezeLockAt+freezeLockNeedle.length);
if(freezeFnStart<0||freezeFnEnd<0)throw new Error('Freeze Blast projectile pass: animation function bounds not found');
const freezeFn=html.slice(freezeFnStart,freezeFnEnd);
const freezeKindMatches=[...freezeFn.matchAll(/kind:'([^']+)'/g)];
const freezeKindEntry=freezeKindMatches.find(match=>{
  const around=freezeFn.slice(Math.max(0,match.index-100),Math.min(freezeFn.length,match.index+260));
  return /\bfrom\b/.test(around)&&/\bto\b/.test(around)&&/\bduration\b/.test(around);
})||freezeKindMatches[0];
if(!freezeKindEntry)throw new Error('Freeze Blast projectile pass: projectile floater kind not found');
const legacyFreezeKind=freezeKindEntry[1];
const freezeRendererMarker=`else if(f.kind==='${legacyFreezeKind}'){`;
const freezeRendererStart=html.indexOf(freezeRendererMarker);
const freezeRendererEnd=html.indexOf('}else if(',freezeRendererStart+freezeRendererMarker.length);
if(freezeRendererStart<0||freezeRendererEnd<0)throw new Error(`Freeze Blast projectile pass: renderer block for ${legacyFreezeKind} not found`);
const authoredFreezeRenderer=`else if(f.kind==='${legacyFreezeKind}'){
     const t=clamp((performance.now()-f.start)/f.duration,0,1);
     const ease=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
     const from=f.from||{x:f.x||0,y:f.y||0};
     const rawTo=f.to||{x:f.tx??f.x??0,y:f.ty??f.y??0};
     const locked=window.BlazingAttackPresentation.lockedFacing(S.anim,'Sub-Zero');
     const dir=Number.isFinite(locked)?(Math.cos(locked)<0?-1:1):(rawTo.x<from.x?-1:1);
     const travel=Math.max(36,Math.abs(rawTo.x-from.x));
     const to={x:from.x+dir*travel,y:from.y};
     const x=from.x+(to.x-from.x)*ease;
     const y=from.y;
     const angle=dir<0?Math.PI:0;
     const frameIndex=t<.30?0:(t<.68?1:2);
     const img=SUBZERO_FREEZE_PROJECTILE_FRAMES[frameIndex];
     ctx.translate(x,y);ctx.rotate(angle);
     ctx.imageSmoothingEnabled=true;
     const arrival=Math.max(0,(t-.72)/.28);
     const bodyH=frameIndex===2?31:(frameIndex===1?22.5:27);
     const bodyW=frameIndex===2?60.5:(frameIndex===1?56:64.5);
     if(img?.complete&&img.naturalWidth>0){
      ctx.shadowColor='rgba(83,220,255,.95)';ctx.shadowBlur=5+3.5*arrival;
      ctx.globalAlpha=.98;
      ctx.globalCompositeOperation='source-over';
      ctx.drawImage(img,-bodyW*.22,-bodyH/2,bodyW,bodyH);
      ctx.globalAlpha=.30+.14*arrival;
      ctx.globalCompositeOperation='screen';
      ctx.drawImage(img,-bodyW*.26,-bodyH*.57,bodyW*1.06,bodyH*1.14);
     }
     if(arrival>0){
      const burst=Math.sin(Math.PI*Math.min(1,arrival));
      ctx.globalCompositeOperation='screen';
      ctx.globalAlpha=.68*(1-arrival*.60);
      const impactR=10+15*burst;
      const g=ctx.createRadialGradient(bodyW*.58,0,0,bodyW*.58,0,impactR);
      g.addColorStop(0,'rgba(255,255,255,.96)');
      g.addColorStop(.24,'rgba(191,246,255,.84)');
      g.addColorStop(.62,'rgba(74,202,255,.36)');
      g.addColorStop(1,'rgba(40,170,255,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(bodyW*.58,0,impactR,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(220,251,255,.88)';ctx.lineWidth=.8;
      for(let i=0;i<8;i++){
       const a=(Math.PI*2*i/8)+i*.19;
       const inner=6+3.5*burst,outer=14+12*burst;
       ctx.beginPath();ctx.moveTo(bodyW*.58+Math.cos(a)*inner,Math.sin(a)*inner);
       ctx.lineTo(bodyW*.58+Math.cos(a)*outer,Math.sin(a)*outer);ctx.stroke();
      }
     }
   `;
html=html.slice(0,freezeRendererStart)+authoredFreezeRenderer+html.slice(freezeRendererEnd);

// Never let ally proximity steer Sub-Zero. Outside a cast he faces the nearest living enemy
// horizontally; during Freeze Blast the exact locked blast direction wins.
replaceRegexOnce(
 /function bodyFacingRotation\(actor,origin,basicFallbackDeg,jutsuFallbackDeg=basicFallbackDeg\)\{[\s\S]*?\n  \}\n  S\.pairs/,
 `function bodyFacingRotation(actor,origin,basicFallbackDeg,jutsuFallbackDeg=basicFallbackDeg){
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
  }
  S.pairs`,
 'Sub-Zero enemy-only facing'
);

// Sub-Zero's live preview and committed cast use separate facing channels. The committed
// target lock always wins; otherwise the renderer consumes the current non-sticky preview.
replaceOnce(
 `ctx.scale((flipX||1)*scale*activePulse,scale*activePulse);`,
 `const lockedJutsuFacing=(name==='Sub-Zero'&&S.action==='jutsu')
   ? window.BlazingAttackPresentation.lockedFacing(S.anim,name)
   : null;
 const previewJutsuFacing=(name==='Sub-Zero'&&S.action==='jutsu')
   ? window.BlazingAttackPresentation.previewFacing(S.anim,name)
   : null;
 const subzeroJutsuFacing=Number.isFinite(lockedJutsuFacing)?lockedJutsuFacing:previewJutsuFacing;
 const directionalFlip=Number.isFinite(subzeroJutsuFacing)
   ? (Math.cos(subzeroJutsuFacing)<0?-1:1)
   : (flipX||1);
 ctx.scale(directionalFlip*scale*activePulse,scale*activePulse);`,
 'Sub-Zero preview/locked jutsu sprite facing'
);

replaceRegexOnce(
 /\s*\/\/ Bubble feedback is isolated so it can never mask the enemy sprite\./,
 `\n      const targetPad=jutsu?(canonicalUnit(activePlayer.name)?.abilities?.jutsu?.presentation?.target_lock_radius_pad_px??8):8;\n      // Bubble feedback is isolated so it can never mask the enemy sprite.`,
 'enemy target lock radius setup'
);
replaceRegexOnce(/ctx\.arc\(pos\.x,pos\.y,\(e\.r\|\|19\)\+14,0,Math\.PI\*2\);/,`ctx.arc(pos.x,pos.y,(e.r||19)+targetPad+4,0,Math.PI*2);`,'enemy target fill radius');
replaceRegexOnce(/ctx\.arc\(pos\.x,pos\.y,\(e\.r\|\|19\)\+10\+1\.5\*Math\.sin\(performance\.now\(\)\/145\),0,Math\.PI\*2\);/,`ctx.arc(pos.x,pos.y,(e.r||19)+targetPad+1.25*Math.sin(performance.now()/145),0,Math.PI*2);`,'enemy target stroke radius');
replaceRegexOnce(/ctx\.shadowBlur\s*=\s*jutsu\?10:\(comboLinked\?8:6\);\s*ctx\.lineWidth\s*=\s*jutsu\?1\.8:1\.45;/,`ctx.shadowBlur=jutsu?14:(comboLinked?12:10);\n      ctx.lineWidth=jutsu?2.35:2.05;`,'enemy target ring strength');

replaceRegexOnce(/const\s+targetGroundY\s*=\s*\(enemy\.feetY\?\?enemy\.groundY\?\?enemy\.y\);/,`const targetGroundY=(enemy.feetY??enemy.groundY??(enemy.y+(enemy.r||19)));`,'Senku target feet baseline');
replaceRegexOnce(/function\s+runAttacker\(\)\{\s*if\(enemy\.hp<=0\|\|attackIndex>=attackers\.length\)return setTimeout\(runTarget,110\);/,`function runAttacker(){\n    if(attackIndex>=attackers.length)return setTimeout(runTarget,110);`,'combo attacker completion guard');
replaceRegexOnce(
 /runBasicAttack\(au\.name,from,basicTarget,\(\)=>\{\s*let result=buffedNormalDamage\(ap\),dmg=result\.damage;\s*window\.BlazingCombatRuntime\.execute\('damage_target',\{target:enemy,damage:dmg\}\);\s*addImpactFlash\(enemy\.x,enemy\.y-8,au\.name==='Crimson'\?'#ff405c':attackIndex>1\?'#ffbd4a':'#ffffff'\);\s*addFloat\(enemy\.x,enemy\.y-34,'-'\+dmg,result\.buff\.bonus>0\?'#65ff9e':attackIndex>1\?'#ffbd4a':'#fff'\);\s*let nDir=Math\.sign\(enemy\.x-ap\.x\)\|\|1;\s*if\(enemy\.hp<=0\)handleEnemyKO\(enemy,nDir\); else recoil\(enemy,\(\)=>\{\},nDir,attackIndex>1\);\s*checkVictoryKillshot\(\);\s*\},\(\)=>setTimeout\(runAttacker,85\),effectiveAnimationKind\)/,
 `runBasicAttack(au.name,from,basicTarget,()=>{\n    if(enemy.hp>0){\n     let result=buffedNormalDamage(ap),dmg=result.damage;\n     window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:dmg});\n     addImpactFlash(enemy.x,enemy.y-8,au.name==='Crimson'?'#ff405c':attackIndex>1?'#ffbd4a':'#ffffff');\n     addFloat(enemy.x,enemy.y-34,'-'+dmg,result.buff.bonus>0?'#65ff9e':attackIndex>1?'#ffbd4a':'#fff');\n     let nDir=Math.sign(enemy.x-ap.x)||1;\n     if(enemy.hp<=0)handleEnemyKO(enemy,nDir); else recoil(enemy,()=>{},nDir,attackIndex>1);\n     checkVictoryKillshot();\n    }\n   },()=>setTimeout(runAttacker,85),effectiveAnimationKind)`,
 'combo damage guard'
);

await fs.writeFile(file,html);
console.log(`Combat polish applied: enemy-only Sub-Zero facing + strict left/right medium Freeze Blast + compact VFX scale + separate live-preview/committed cast facing (${legacyFreezeKind}), target ring, Senku feet impact, full combo sequence.`);
