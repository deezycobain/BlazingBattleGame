import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const fail=msg=>{throw new Error(`Pass 4 rendering validation failed: ${msg}`)};
const exists=async rel=>{try{await fs.access(path.join(ROOT,rel));return true}catch{return false}};

const modules=[
  'runtime/rendering/battlefield-renderer.js',
  'runtime/rendering/battle-ui-renderer.js'
];
for(const rel of modules)if(!(await exists(rel)))fail(`missing runtime module ${rel}`);

const shell=await fs.readFile(path.join(ROOT,'index.html'),'utf8');
for(const rel of modules)if(!shell.includes(rel))fail(`index.html does not load ${rel}`);

const requiredMarkers=[
  'window.BlazingBattlefieldRenderer.drawField',
  'window.BlazingBattlefieldRenderer.drawShape',
  'window.BlazingBattlefieldRenderer.drawOverheadLinkIcon',
  'window.BlazingBattlefieldRenderer.drawPlayerResources',
  'window.BlazingBattlefieldRenderer.drawMoveReturnCue',
  'window.BlazingBattlefieldRenderer.drawVictoryOverlay',
  'window.BlazingBattleUiRenderer.renderTacticalTicker',
  'window.BlazingBattleUiRenderer.renderBossHealth',
  'window.BlazingBattleUiRenderer.renderActionControls'
];
for(const marker of requiredMarkers)if(!shell.includes(marker))fail(`missing shell delegation marker ${marker}`);

const forbiddenInline=[
  "const img=S.bossBattle?ANUBIS_PORTRAIT_MAP:LEVEL1_PORTRAIT_MAP;\n   if(img.complete && img.naturalWidth>0)",
  "ctx.fillStyle='rgba(4,9,13,.72)';\n  ctx.fillRect(x-hpW/2,hpY,hpW,hpH);",
  "ctx.translate(S.dragOrigin.x,S.dragOrigin.y+18);",
  "ctx.fillText('VICTORY',0,0);\n    ctx.restore();\n  }\n\n  ctx.restore();\n}\n\nfunction render()"
];
for(const token of forbiddenInline)if(shell.includes(token))fail(`migrated inline renderer implementation returned: ${token.slice(0,70)}...`);

// Explicitly document seams deliberately left for a later pass so validation does not
// accidentally claim full scene/body extraction.
for(const retained of ['function drawUnit(','// Target feedback is part of the enemy\'s world layer.','if(showAllyHealTargets){']){
  if(!shell.includes(retained))fail(`expected retained shell seam missing: ${retained}`);
}

console.log('Pass 4 structure PASS: battlefield wrappers and battle DOM UI delegate to runtime; character-body and scene-local target overlays remain intentionally shell-owned.');
