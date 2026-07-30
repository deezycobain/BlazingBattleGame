import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const replaceOnce=(oldText,newText,label)=>{
  const count=html.split(oldText).length-1;
  if(count!==1)throw new Error(`Combat polish: expected 1 ${label} anchor, found ${count}`);
  html=html.replace(oldText,newText);
};

// 1) Sub-Zero: preserve the 92 px mechanical melee range, but make the displayed
// Basic range bubble 35% smaller via canonical presentation metadata.
replaceOnce(
`function drawShape(p,u,color,alpha=.22,glow=false,visualOffsetY=0){
 return window.BlazingBattlefieldRenderer.drawShape(ctx,{origin:p,shape:u.shape,rotation:u.rotation||0,color,glow,visualOffsetY,bounds:BATTLE_BOUNDS});
}`,
`function drawShape(p,u,color,alpha=.22,glow=false,visualOffsetY=0){
 let visualShape=u.shape;
 if(S.action!=='jutsu'&&u?.name==='Sub-Zero'&&visualShape?.type==='circle'){
  let visualScale=1;
  try{visualScale=canonicalUnit(u.name)?.abilities?.basic?.presentation?.range_visual_scale??1}catch(_){}
  visualShape={...visualShape,r:visualShape.r*visualScale};
 }
 return window.BlazingBattlefieldRenderer.drawShape(ctx,{origin:p,shape:visualShape,rotation:u.rotation||0,color,glow,visualOffsetY,bounds:BATTLE_BOUNDS});
}`,
'Sub-Zero visual range scale'
);

// 2) Enemy target highlight: retain the existing target-selection circle, but strengthen
// its stroke/glow so the selected enemy is clearly readable again on mobile.
replaceOnce(
`ctx.shadowBlur=jutsu?10:(comboLinked?8:6);
      ctx.lineWidth=jutsu?1.8:1.45;`,
`ctx.shadowBlur=jutsu?14:(comboLinked?12:10);
      ctx.lineWidth=jutsu?2.35:2.05;`,
'enemy target ring strength'
);

// 3) Senku impact: enemy x/y are collision-circle center coordinates. When an explicit
// feet/ground point is not authored, use the bottom of that circle as the feet baseline.
replaceOnce(
`const targetGroundY=(enemy.feetY??enemy.groundY??enemy.y);`,
`const targetGroundY=(enemy.feetY??enemy.groundY??(enemy.y+(enemy.r||19)));`,
'Senku target feet baseline'
);

// 4) Three-person combos: do not abort the already-committed sequence merely because an
// earlier member landed the KO. Every linked member still performs their attack animation.
// Damage/KO effects only execute while the target is alive.
replaceOnce(
`function runAttacker(){
    if(enemy.hp<=0||attackIndex>=attackers.length)return setTimeout(runTarget,110);`,
`function runAttacker(){
    if(attackIndex>=attackers.length)return setTimeout(runTarget,110);`,
'combo attacker completion guard'
);
replaceOnce(
`runBasicAttack(au.name,from,basicTarget,()=>{
    let result=buffedNormalDamage(ap),dmg=result.damage;
    window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:dmg});
    addImpactFlash(enemy.x,enemy.y-8,au.name==='Crimson'?'#ff405c':attackIndex>1?'#ffbd4a':'#ffffff');
    addFloat(enemy.x,enemy.y-34,'-'+dmg,result.buff.bonus>0?'#65ff9e':attackIndex>1?'#ffbd4a':'#fff');
    let nDir=Math.sign(enemy.x-ap.x)||1;
    if(enemy.hp<=0)handleEnemyKO(enemy,nDir); else recoil(enemy,()=>{},nDir,attackIndex>1);
    checkVictoryKillshot();
   },()=>setTimeout(runAttacker,85),effectiveAnimationKind)`,
`runBasicAttack(au.name,from,basicTarget,()=>{
    if(enemy.hp>0){
     let result=buffedNormalDamage(ap),dmg=result.damage;
     window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:dmg});
     addImpactFlash(enemy.x,enemy.y-8,au.name==='Crimson'?'#ff405c':attackIndex>1?'#ffbd4a':'#ffffff');
     addFloat(enemy.x,enemy.y-34,'-'+dmg,result.buff.bonus>0?'#65ff9e':attackIndex>1?'#ffbd4a':'#fff');
     let nDir=Math.sign(enemy.x-ap.x)||1;
     if(enemy.hp<=0)handleEnemyKO(enemy,nDir); else recoil(enemy,()=>{},nDir,attackIndex>1);
     checkVictoryKillshot();
    }
   },()=>setTimeout(runAttacker,85),effectiveAnimationKind)`,
'combo damage guard'
);

await fs.writeFile(file,html);
console.log('Combat polish applied: Sub-Zero visual range -35%, target ring restored, Senku feet-centered impact, full committed combo sequence.');
