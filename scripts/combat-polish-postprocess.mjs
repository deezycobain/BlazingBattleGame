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
// Freeze Blast keeps its canonical cone hit geometry while replacing the plain range fill
// with the uploaded transparent ice-cone artwork.
replaceOnce(
`function drawShape(p,u,color,alpha=.22,glow=false,visualOffsetY=0){
 return window.BlazingBattlefieldRenderer.drawShape(ctx,{origin:p,shape:u.shape,rotation:u.rotation||0,color,glow,visualOffsetY,bounds:BATTLE_BOUNDS});
}`,
`const SUBZERO_FREEZE_CONE_VFX=new Image();
SUBZERO_FREEZE_CONE_VFX.src='assets/characters/subzero/vfx/jutsu/freeze_blast/cone/ice_cone_composite.png';
function drawShape(p,u,color,alpha=.22,glow=false,visualOffsetY=0){
 let visualShape=u.shape;
 if(S.action!=='jutsu'&&u?.name==='Sub-Zero'&&visualShape?.type==='circle'){
  let visualScale=1;
  try{visualScale=canonicalUnit(u.name)?.abilities?.basic?.presentation?.range_visual_scale??1}catch(_){}
  visualShape={...visualShape,r:visualShape.r*visualScale};
 }
 const isFreezeCone=S.action==='jutsu'&&u?.name==='Sub-Zero'&&visualShape?.type==='cone';
 const result=window.BlazingBattlefieldRenderer.drawShape(ctx,{origin:p,shape:visualShape,rotation:u.rotation||0,color,glow:!isFreezeCone&&glow,visualOffsetY,bounds:BATTLE_BOUNDS});
 if(isFreezeCone&&SUBZERO_FREEZE_CONE_VFX.complete&&SUBZERO_FREEZE_CONE_VFX.naturalWidth){
  const r=visualShape.r||205;
  const coneHeight=Math.max(72,2*r*Math.tan(visualShape.a||.52));
  ctx.save();
  ctx.translate(p.x,p.y+(visualOffsetY||0));
  ctx.rotate(u.rotation||0);
  ctx.globalAlpha=.68;
  ctx.globalCompositeOperation='screen';
  ctx.drawImage(SUBZERO_FREEZE_CONE_VFX,0,-coneHeight/2,r,coneHeight);
  ctx.restore();
 }
 return result;
}`,
'Sub-Zero range presentation'
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
console.log('Combat polish applied: uploaded Sub-Zero Freeze Blast cone VFX, assisted target ring, Senku feet impact, full combo sequence.');