import fs from 'node:fs/promises';import path from 'node:path';
const file=path.join(process.cwd(),'dist','index.html');let html=await fs.readFile(file,'utf8');const fail=message=>{throw new Error(`Combat stabilization integration: ${message}`)};
const replaceOne=(source,target,label)=>{const count=html.split(source).length-1;if(count===1)html=html.replace(source,target);else if(count===0&&html.includes(target))return;else fail(`${label} expected once, found ${count}`)};
const script='<script src="runtime/combat/combat-presentation-controller.js"></script>';
if(!html.includes(script)){const anchor='<script src="runtime/combat/combat-runtime.js"></script>';if(!html.includes(anchor))fail('combat runtime script anchor missing');html=html.replace(anchor,anchor+'\n'+script)}
replaceOne(`function clampToBattlefield(pos){
 return {
   x:clamp(pos.x,BATTLE_BOUNDS.left,BATTLE_BOUNDS.right),
   y:clamp(pos.y,BATTLE_BOUNDS.top,BATTLE_BOUNDS.bottom)
 };
}`,`function clampToBattlefield(pos,from=null,padding=4){
 return window.BlazingCombatPresentation.constrainPoint({state:S,point:pos,from,bounds:BATTLE_BOUNDS,padding});
}`,'authoritative battlefield geometry');
const lunge=/function animateLunge\(unitName,from,to,onImpact,onDone,attackKind='punch'\)\{[\s\S]*?\n\}\nfunction addImpactFlash/;const found=html.match(lunge);if(!found)fail('animateLunge function missing');const legacyBody=found[0].slice(0,-'\nfunction addImpactFlash'.length).replace('function animateLunge','function animateLegacyLunge');
html=html.replace(lunge,`${legacyBody}
function animateLunge(unitName,from,to,onImpact,onDone,attackKind='punch'){
 let data=null,frames=[];try{data=canonicalUnit(unitName);frames=unitAttackFrames(unitName,attackKind)||[]}catch(_){}
 const token=ACTIVE_ACTION_TOKEN;
 if(window.BlazingCombatPresentation.runConfiguredAttack({unitData:data,unitName,from,target:to,frames,tokenAlive:()=>actionTokenAlive(token),onImpact,onDone,ensureState:ensureAnimState,lockFacing:(state,name,a,b)=>window.BlazingAttackPresentation.lockFacing(state,name,a,b),clearFacing:(state,name)=>window.BlazingAttackPresentation.clearFacing(state,name)}))return;
 return animateLegacyLunge(unitName,from,to,onImpact,onDone,attackKind);
}
function addImpactFlash`);
replaceOne(` } else {
   ctx.beginPath();
   ctx.arc(0,0,16,0,Math.PI*2);`,` } else if(window.BlazingCombatPresentation.allowFallbackToken()) {
   ctx.beginPath();
   ctx.arc(0,0,16,0,Math.PI*2);`,'fallback token gate');
replaceOne(` setTimeout(()=>{
   // Reinitialize every battle from its canonical state. This intentionally`,` setTimeout(async()=>{
   // Reinitialize every battle from its canonical state. This intentionally`,'async battle initialization');
replaceOne(`   S.bbRoadMapSource=setBattleMap(boss?'boss':'road',S.bbRoadStage||1);
   gameStarted=true;

   battleScreen.classList.remove('visible');`,`   S.bbRoadMapSource=setBattleMap(boss?'boss':'road',S.bbRoadStage||1);
   battleScreen.classList.remove('visible');
   battleScreen.classList.add('active');
   menuScreen.style.display='none';
   try{
    const actors=[];
    for(const pair of S.pairs||[])for(const unit of pair.units||[])actors.push({idle:unitIdleFrames(unit.name),attack:unitAttackFrames(unit.name,'basic_attack')});
    for(const enemy of S.enemies||[])actors.push({idle:unitIdleFrames(enemy.spriteKey||enemy.name),attack:unitAttackFrames(enemy.spriteKey||enemy.name,'basic_attack')});
    const mapImage=boss?ANUBIS_PORTRAIT_MAP:LEVEL1_PORTRAIT_MAP;
    await window.BlazingCombatPresentation.prepareEncounter({mapImage,actors});
   }catch(error){menuTransitioning=false;gameStarted=false;S.log='Battle assets failed to load. Retry the encounter.';updateUI();return}
   S._chargeSince=performance.now();
   gameStarted=true;

   battleScreen.classList.remove('visible');`,'battle asset-ready gate');
replaceOne(`   battleScreen.classList.add('active');
   menuScreen.style.display='none';

   requestAnimationFrame(()=>requestAnimationFrame(()=>{`,`   requestAnimationFrame(()=>requestAnimationFrame(()=>{`,'duplicate battle activation removal');
for(const marker of ['BlazingCombatPresentation.prepareEncounter','function animateLegacyLunge','runConfiguredAttack','allowFallbackToken','constrainPoint'])if(!html.includes(marker))fail(`final shell missing ${marker}`);
await fs.writeFile(file,html);console.log('Combat stabilization integration PASS: readiness, configured attacks, sprite fallback policy, and terrain geometry have one authority.');
