import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const indexPath=path.join(ROOT,'index.html');
let html=await fs.readFile(indexPath,'utf8');
const replacements={};

function replaceRx(rx,replacement,label){
  const matches=html.match(new RegExp(rx.source,rx.flags.includes('g')?rx.flags:rx.flags+'g'))||[];
  if(matches.length!==1)throw new Error(`${label}: expected 1 match, found ${matches.length}`);
  html=html.replace(rx,replacement);
  replacements[label]=1;
}

function replaceText(oldText,newText,label){
  const count=html.split(oldText).length-1;
  if(count!==1)throw new Error(`${label}: expected 1 occurrence, found ${count}`);
  html=html.replace(oldText,newText);
  replacements[label]=1;
}

if(!html.includes('runtime/rendering/battlefield-renderer.js')){
  const vfxTag=html.match(/<script[^>]+src=["']runtime\/rendering\/vfx-renderer\.js["'][^>]*><\/script>/i)?.[0];
  if(!vfxTag)throw new Error('runtime script anchor: vfx-renderer tag not found');
  html=html.replace(vfxTag,`${vfxTag}\n<script src="runtime/rendering/battlefield-renderer.js"></script>\n<script src="runtime/rendering/battle-ui-renderer.js"></script>`);
  replacements['runtime script tags']=1;
}

replaceRx(
  /function drawField\(\)\{.*?\n\}\nfunction drawShape/s,
  `function drawField(){\n return window.BlazingBattlefieldRenderer.drawField(ctx,{image:S.bossBattle?ANUBIS_PORTRAIT_MAP:LEVEL1_PORTRAIT_MAP,W,H,mapZoom:MAP_ZOOM});\n}\nfunction drawShape`,
  'drawField delegation'
);

replaceRx(
  /function drawShape\(p,u,color,alpha=\.22,glow=false,visualOffsetY=0\)\{.*?\n\}\nfunction actorPos/s,
  `function drawShape(p,u,color,alpha=.22,glow=false,visualOffsetY=0){\n return window.BlazingBattlefieldRenderer.drawShape(ctx,{origin:p,shape:u.shape,rotation:u.rotation||0,color,glow,visualOffsetY,bounds:BATTLE_BOUNDS});\n}\nfunction actorPos`,
  'drawShape delegation'
);

replaceRx(
  /function drawOverheadLinkIcon\(x,y,strength\)\{.*?\n\}\n\nfunction drawActiveLinkSummary/s,
  `function drawOverheadLinkIcon(x,y,strength){\n return window.BlazingBattlefieldRenderer.drawOverheadLinkIcon(ctx,{x,y,strength});\n}\n\nfunction drawActiveLinkSummary`,
  'link icon delegation'
);

replaceRx(
  /function drawPlayerResources\(p,u,linkState=\{linked:false,count:0\},active=false,pairRef=null\)\{.*?\n\}\n\nfunction drawMoveReturnCue/s,
  `function drawPlayerResources(p,u,linkState={linked:false,count:0},active=false,pairRef=null){\n const strength=pairRef?linkVisualStrength(pairRef):0;\n const spriteTop=linkState.linked?(pairRef?playerSpriteTopY(pairRef,active):p.y-56):null;\n return window.BlazingBattlefieldRenderer.drawPlayerResources(ctx,{x:p.x,y:p.y,hp:u.hp,maxHp:u.maxHp,chakra:u.chakra,maxChakra:u.maxChakra,linked:!!linkState.linked,linkStrength:strength,spriteTop});\n}\n\nfunction drawMoveReturnCue`,
  'player HUD delegation'
);

replaceRx(
  /function drawMoveReturnCue\(\)\{.*?\n\}\n\n\nfunction startVictorySequence/s,
  `function drawMoveReturnCue(){\n if(!S.drag||!S.dragOrigin||S.ready?.kind!=='pair')return;\n const p=S.ready.ref;\n return window.BlazingBattlefieldRenderer.drawMoveReturnCue(ctx,{origin:S.dragOrigin,distance:d(p,S.dragOrigin),hintRadius:MOVE_RETURN_HINT_RADIUS,cancelRadius:MOVE_CANCEL_RADIUS});\n}\n\n\nfunction startVictorySequence`,
  'move return cue delegation'
);

replaceRx(
  /function drawVictoryOverlay\(\)\{.*?\n\}\n\nfunction render\(\)/s,
  `function drawVictoryOverlay(){\n return window.BlazingBattlefieldRenderer.drawVictoryOverlay(ctx,{victoryFX:S.victoryFX,victoryImage:VICTORY_IMAGE,W,H});\n}\n\nfunction render()`,
  'victory overlay delegation'
);

replaceText(
`  // Start every frame from a known-good canvas state.\n  ctx.globalAlpha=1;\n  ctx.globalCompositeOperation='source-over';\n  ctx.shadowBlur=0;\n  updateFacing();\n  drawField();\n  if(S.jutsuDim){\n    const now=performance.now();\n    const elapsed=now-S.jutsuDim.start;\n    const fadeIn=clamp(elapsed/220,0,1);\n    const fadeOut=S.jutsuDim.end?clamp((now-S.jutsuDim.end)/260,0,1):0;\n    const a=(S.jutsuDim.alpha||.42)*fadeIn*(1-fadeOut);\n    if(a>0){ctx.save();ctx.fillStyle=\`rgba(3,2,10,\${a})\`;ctx.fillRect(0,0,W,H);ctx.restore()}\n    if(S.jutsuDim.end&&fadeOut>=1)S.jutsuDim=null;\n  }`,
`  // Start every frame from a known-good canvas state.\n  window.BlazingBattlefieldRenderer.resetCanvasState(ctx);\n  updateFacing();\n  drawField();\n  if(S.jutsuDim){\n    const dim=window.BlazingBattlefieldRenderer.drawJutsuDim(ctx,{state:S.jutsuDim,W,H});\n    if(dim.expired)S.jutsuDim=null;\n  }`,
  'frame reset and Jutsu dim delegation'
);

replaceRx(
  /    \/\/ Target feedback is part of the enemy's world layer\.\n    if\(liveHit\)\{.*?\n    \}\n\n    ctx\.save\(\);/s,
  `    // Target feedback is part of the enemy's world layer.\n    if(liveHit){\n      const jutsu=S.action==='jutsu';\n      const linkedCount=comboMembers(e,activePair).length;\n      const comboLinked=linkedCount>1;\n      window.BlazingBattlefieldRenderer.drawTargetBubble(ctx,{x:pos.x,y:pos.y,r:e.r||19,jutsu,ultimate:isUltimateAction(activePlayer),comboLinked});\n    }\n\n    ctx.save();`,
  'target bubble delegation'
);

replaceRx(
  /    if\(showAllyHealTargets\)\{.*?\n    \}\n\n    const linkState=playerLinkState\(p\);/s,
  `    if(showAllyHealTargets){\n      window.BlazingBattlefieldRenderer.drawAllyHealTarget(ctx,{x:pos.x,y:pos.y});\n    }\n\n    const linkState=playerLinkState(p);`,
  'ally heal target delegation'
);

replaceText(
`    ctx.save();\n    ctx.globalAlpha=S.phase==='player'?.92:1;\n    ctx.fillStyle='#222';\n    ctx.fillRect(pos.x-27,pos.y+29,54,6);\n    ctx.fillStyle='#ffbd4a';\n    ctx.fillRect(pos.x-27,pos.y+29,54*(e.hp/e.maxHp),6);\n    ctx.restore();`,
`    window.BlazingBattlefieldRenderer.drawEnemyHealthBar(ctx,{x:pos.x,y:pos.y,hp:e.hp,maxHp:e.maxHp,alpha:S.phase==='player'?.92:1});`,
  'enemy health bar delegation'
);

replaceRx(
  /function updateTacticalTicker\(\)\{.*?\n\}\n\nfunction updateUI\(\)\{.*?\n\}\n\nfunction addFloat/s,
  `function updateTacticalTicker(){\n window.BlazingBattleUiRenderer.renderTacticalTicker(tacticalTicker,tacticalTickerItems());\n}\n\nfunction updateUI(){\n updateMeter();\n updateTacticalTicker();\n\n const boss=S.bossBattle?S.enemies.find(e=>e.boss||e.name==='Anubis'):null;\n window.BlazingBattleUiRenderer.renderBossHealth(bossHpHud,bossHpFill,boss);\n\n let active=S.ready?.kind==='pair'?front(S.ready.ref):S.ready?.ref;\n const phaseText=S.phase==='charge'?'Turn meter charging…'\n   :S.phase==='player'?\`${'${active.name}'}'s turn — Basic builds chakra; closer linked allies can amplify Link Attack buffs. Choose an action, preview its range, then drag and release.\`\n   :S.phase==='cpu'?\`${'${active.name}'} is acting…\`:'Resolving attack…';\n const can=S.phase==='player'&&!S.drag&&!S.anim?.settle;\n let jutsuLabel='Jutsu',canJutsu=false;\n if(S.ready?.kind==='pair'){\n   const u=front(S.ready.ref);\n   jutsuLabel=\`${'${u.jutsuName||\'Jutsu\'}'} · ${'${u.jutsuCost}'} ◆\`;\n   canJutsu=can&&u.chakra>=u.jutsuCost;\n }\n const canSwap=can&&S.ready?.kind==='pair'&&back(S.ready.ref).hp>0;\n const statusHtml=S.pairs.map((p,i)=>{\n   if(!pairAlive(p))return \`<div class="card pair"><b>Pair ${'${i+1}'} defeated</b><br><span class="muted">Both fighters KO</span></div>\`;\n   ensureFront(p);\n   const f=front(p),b=back(p);\n   if(b.name==='—')return \`<div class="card pair ${'${S.ready?.ref===p?\'activePair\':\'\'}'}">\n    <b>${'${f.name}'}</b><br>\n    <span class="muted">${'${f.hp}'}/${'${f.maxHp}'} HP · ${'${f.speed}'} SPD · <span class="chakraText">${'${f.chakra}'}/${'${f.maxChakra}'} ◆</span></span>\n   </div>\`;\n   return \`<div class="card pair ${'${S.ready?.ref===p?\'activePair\':\'\'}'}">\n    <b>${'${f.name}'}</b> / ${'${b.name}'}<br>\n    <span class="muted">${'${f.hp}'}/${'${f.maxHp}'} HP · ${'${f.speed}'} SPD · <span class="chakraText">${'${f.chakra}'}/${'${f.maxChakra}'} ◆</span></span><br>\n    <span class="muted">Rear ${'${b.name}'}: ${'${b.hp}'}/${'${b.maxHp}'} HP · ${'${b.chakra}'}/${'${b.maxChakra}'} ◆</span>\n   </div>\`;\n }).join('');\n window.BlazingBattleUiRenderer.renderActionControls(\n   {phaseEl,logEl,normalBtn,jutsuBtn,swapBtn,statusEl},\n   {phaseText,logText:S.log,action:S.action,canAct:can,canSwap,canJutsu,jutsuLabel,statusHtml}\n );\n}\n\nfunction addFloat`,
  'battle UI delegation'
);

for(const marker of [
  'window.BlazingBattlefieldRenderer.drawField',
  'window.BlazingBattlefieldRenderer.drawShape',
  'window.BlazingBattlefieldRenderer.drawPlayerResources',
  'window.BlazingBattlefieldRenderer.drawTargetBubble',
  'window.BlazingBattlefieldRenderer.drawAllyHealTarget',
  'window.BlazingBattlefieldRenderer.drawEnemyHealthBar',
  'window.BlazingBattlefieldRenderer.drawVictoryOverlay',
  'window.BlazingBattleUiRenderer.renderActionControls'
])if(!html.includes(marker))throw new Error(`migration verification missing ${marker}`);

await fs.writeFile(indexPath,html);
await fs.mkdir(path.join(ROOT,'dev-tools'),{recursive:true});
await fs.writeFile(path.join(ROOT,'dev-tools','pass4-migration-report.json'),JSON.stringify({status:'success',replacements},null,2)+'\n');
console.log(JSON.stringify({status:'success',replacements},null,2));
