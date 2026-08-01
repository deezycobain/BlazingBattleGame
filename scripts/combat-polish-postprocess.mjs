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

// Sub-Zero Basic keeps its 92 px mechanical range but displays a 35% smaller circle.
// Freeze Blast keeps its canonical cone hit geometry, but the preview is now drawn only
// from the authored ice artwork. The old procedural wireframe cone is intentionally skipped.
replaceOnce(
`function drawShape(p,u,color,alpha=.22,glow=false,visualOffsetY=0){
 return window.BlazingBattlefieldRenderer.drawShape(ctx,{origin:p,shape:u.shape,rotation:u.rotation||0,color,glow,visualOffsetY,bounds:BATTLE_BOUNDS});
}`,
`const SUBZERO_FREEZE_CONE_VFX=new Image();
SUBZERO_FREEZE_CONE_VFX.src='assets/characters/subzero/vfx/jutsu/freeze_blast/cone/ice_cone_composite.png';
const SUBZERO_FREEZE_PROJECTILE_FRAMES=[
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
 const isFreezeCone=S.action==='jutsu'&&u?.name==='Sub-Zero'&&visualShape?.type==='cone';
 if(!isFreezeCone){
  return window.BlazingBattlefieldRenderer.drawShape(ctx,{origin:p,shape:visualShape,rotation:u.rotation||0,color,glow,visualOffsetY,bounds:BATTLE_BOUNDS});
 }
 if(SUBZERO_FREEZE_CONE_VFX.complete&&SUBZERO_FREEZE_CONE_VFX.naturalWidth){
  const r=(visualShape.r||205)*1.08;
  const coneHeight=Math.max(92,2*r*Math.tan((visualShape.a||.52)*.62));
  ctx.save();
  ctx.translate(p.x,p.y+(visualOffsetY||0));
  ctx.rotate(u.rotation||0);
  ctx.imageSmoothingEnabled=true;
  ctx.shadowColor='rgba(76,210,255,.95)';
  ctx.shadowBlur=16;
  ctx.globalAlpha=.94;
  ctx.globalCompositeOperation='source-over';
  ctx.drawImage(SUBZERO_FREEZE_CONE_VFX,-6,-coneHeight/2,r+12,coneHeight);
  ctx.globalAlpha=.38;
  ctx.globalCompositeOperation='screen';
  ctx.drawImage(SUBZERO_FREEZE_CONE_VFX,-10,-coneHeight*.57,r+20,coneHeight*1.14);
  ctx.restore();
 }
 return true;
}`,
'Sub-Zero range presentation'
);

// Replace the legacy Freeze Blast floater renderer in-place. The animation lifecycle,
// damage timing and callbacks stay untouched; only its visual treatment changes.
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
     const to=f.to||{x:f.tx??f.x??0,y:f.ty??f.y??0};
     const x=from.x+(to.x-from.x)*ease;
     const y=from.y+(to.y-from.y)*ease;
     const angle=Math.atan2(to.y-from.y,to.x-from.x);
     const frameIndex=t<.30?0:(t<.68?1:2);
     const img=SUBZERO_FREEZE_PROJECTILE_FRAMES[frameIndex];
     ctx.translate(x,y);ctx.rotate(angle);
     ctx.imageSmoothingEnabled=true;
     const arrival=Math.max(0,(t-.72)/.28);
     const bodyH=frameIndex===2?92:(frameIndex===1?66:80);
     const bodyW=frameIndex===2?178:(frameIndex===1?164:190);
     if(img?.complete&&img.naturalWidth>0){
      ctx.shadowColor='rgba(83,220,255,.98)';ctx.shadowBlur=18+12*arrival;
      ctx.globalAlpha=.98;
      ctx.globalCompositeOperation='source-over';
      ctx.drawImage(img,-bodyW*.22,-bodyH/2,bodyW,bodyH);
      ctx.globalAlpha=.42+.22*arrival;
      ctx.globalCompositeOperation='screen';
      ctx.drawImage(img,-bodyW*.28,-bodyH*.60,bodyW*1.10,bodyH*1.20);
     }
     if(arrival>0){
      const burst=Math.sin(Math.PI*Math.min(1,arrival));
      ctx.globalCompositeOperation='screen';
      ctx.globalAlpha=.82*(1-arrival*.55);
      const g=ctx.createRadialGradient(bodyW*.62,0,0,bodyW*.62,0,34+54*burst);
      g.addColorStop(0,'rgba(255,255,255,.98)');
      g.addColorStop(.24,'rgba(191,246,255,.90)');
      g.addColorStop(.62,'rgba(74,202,255,.44)');
      g.addColorStop(1,'rgba(40,170,255,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(bodyW*.62,0,34+54*burst,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(220,251,255,.92)';ctx.lineWidth=2.2;
      for(let i=0;i<10;i++){
       const a=(Math.PI*2*i/10)+i*.19;
       const inner=20+12*burst,outer=48+44*burst;
       ctx.beginPath();ctx.moveTo(bodyW*.62+Math.cos(a)*inner,Math.sin(a)*inner);
       ctx.lineTo(bodyW*.62+Math.cos(a)*outer,Math.sin(a)*outer);ctx.stroke();
      }
     }
   `;
html=html.slice(0,freezeRendererStart)+authoredFreezeRenderer+html.slice(freezeRendererEnd);

// During the Freeze Blast cast, mirror Sub-Zero's body from the exact locked jutsu angle.
// The sprite stays upright; only its horizontal facing changes toward the chosen target.
replaceOnce(
 `ctx.scale((flipX||1)*scale*activePulse,scale*activePulse);`,
 `const lockedJutsuFacing=(name==='Sub-Zero'&&S.action==='jutsu')
   ? window.BlazingAttackPresentation.lockedFacing(S.anim,name)
   : null;
 const directionalFlip=Number.isFinite(lockedJutsuFacing)
   ? (Math.cos(lockedJutsuFacing)<0?-1:1)
   : (flipX||1);
 ctx.scale(directionalFlip*scale*activePulse,scale*activePulse);`,
 'Sub-Zero locked jutsu sprite facing'
);

// Enemy target highlight remains tied to the assisted aim tolerance.
replaceRegexOnce(
 /\s*\/\/ Bubble feedback is isolated so it can never mask the enemy sprite\./,
 `\n      const targetPad=jutsu?(canonicalUnit(activePlayer.name)?.abilities?.jutsu?.presentation?.target_lock_radius_pad_px??8):8;\n      // Bubble feedback is isolated so it can never mask the enemy sprite.`,
 'enemy target lock radius setup'
);
replaceRegexOnce(/ctx\.arc\(pos\.x,pos\.y,\(e\.r\|\|19\)\+14,0,Math\.PI\*2\);/,`ctx.arc(pos.x,pos.y,(e.r||19)+targetPad+4,0,Math.PI*2);`,'enemy target fill radius');
replaceRegexOnce(/ctx\.arc\(pos\.x,pos\.y,\(e\.r\|\|19\)\+10\+1\.5\*Math\.sin\(performance\.now\(\)\/145\),0,Math\.PI\*2\);/,`ctx.arc(pos.x,pos.y,(e.r||19)+targetPad+1.25*Math.sin(performance.now()/145),0,Math.PI*2);`,'enemy target stroke radius');
replaceRegexOnce(/ctx\.shadowBlur\s*=\s*jutsu\?10:\(comboLinked\?8:6\);\s*ctx\.lineWidth\s*=\s*jutsu\?1\.8:1\.45;/,`ctx.shadowBlur=jutsu?14:(comboLinked?12:10);\n      ctx.lineWidth=jutsu?2.35:2.05;`,'enemy target ring strength');

// Senku explosion uses the target's feet baseline.
replaceRegexOnce(/const\s+targetGroundY\s*=\s*\(enemy\.feetY\?\?enemy\.groundY\?\?enemy\.y\);/,`const targetGroundY=(enemy.feetY??enemy.groundY??(enemy.y+(enemy.r||19)));`,'Senku target feet baseline');

// Every committed combo member completes their animation after an earlier KO.
replaceRegexOnce(/function\s+runAttacker\(\)\{\s*if\(enemy\.hp<=0\|\|attackIndex>=attackers\.length\)return setTimeout\(runTarget,110\);/,`function runAttacker(){\n    if(attackIndex>=attackers.length)return setTimeout(runTarget,110);`,'combo attacker completion guard');
replaceRegexOnce(
 /runBasicAttack\(au\.name,from,basicTarget,\(\)=>\{\s*let result=buffedNormalDamage\(ap\),dmg=result\.damage;\s*window\.BlazingCombatRuntime\.execute\('damage_target',\{target:enemy,damage:dmg\}\);\s*addImpactFlash\(enemy\.x,enemy\.y-8,au\.name==='Crimson'\?'#ff405c':attackIndex>1\?'#ffbd4a':'#ffffff'\);\s*addFloat\(enemy\.x,enemy\.y-34,'-'\+dmg,result\.buff\.bonus>0\?'#65ff9e':attackIndex>1\?'#ffbd4a':'#fff'\);\s*let nDir=Math\.sign\(enemy\.x-ap\.x\)\|\|1;\s*if\(enemy\.hp<=0\)handleEnemyKO\(enemy,nDir\); else recoil\(enemy,\(\)=>\{\},nDir,attackIndex>1\);\s*checkVictoryKillshot\(\);\s*\},\(\)=>setTimeout\(runAttacker,85\),effectiveAnimationKind\)/,
 `runBasicAttack(au.name,from,basicTarget,()=>{\n    if(enemy.hp>0){\n     let result=buffedNormalDamage(ap),dmg=result.damage;\n     window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:dmg});\n     addImpactFlash(enemy.x,enemy.y-8,au.name==='Crimson'?'#ff405c':attackIndex>1?'#ffbd4a':'#ffffff');\n     addFloat(enemy.x,enemy.y-34,'-'+dmg,result.buff.bonus>0?'#65ff9e':attackIndex>1?'#ffbd4a':'#fff');\n     let nDir=Math.sign(enemy.x-ap.x)||1;\n     if(enemy.hp<=0)handleEnemyKO(enemy,nDir); else recoil(enemy,()=>{},nDir,attackIndex>1);\n     checkVictoryKillshot();\n    }\n   },()=>setTimeout(runAttacker,85),effectiveAnimationKind)`,
 'combo damage guard'
);

await fs.writeFile(file,html);
console.log(`Combat polish applied: authored Sub-Zero preview + three-frame Freeze Blast projectile/impact (${legacyFreezeKind}), locked cast-facing, assisted target ring, Senku feet impact, full combo sequence.`);