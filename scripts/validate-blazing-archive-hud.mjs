import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const fail=message=>{throw new Error(`Blazing archive HUD validation failed: ${message}`)};
const read=relative=>fs.readFile(path.join(root,relative),'utf8');
const exists=async relative=>{try{await fs.access(path.join(root,relative));return true}catch{return false}};

for(const asset of ['hp-gauge-fill.png','chakra-active.png','chakra-empty.png','portrait-frame.png','status-medallion.png']){
  if(!await exists(`assets/ui/battle/blazing-archive/${asset}`))fail(`missing imported source asset ${asset}`);
}
const renderer=await read('runtime/rendering/blazing-archive-hud.js');
for(const marker of ['BlazingArchiveBattleHud','drawUnitResources','drawEnemyHealth','hp-gauge-fill.png','chakra-active.png']){
  if(!renderer.includes(marker))fail(`runtime HUD marker missing: ${marker}`);
}
if(renderer.includes('/Volumes/'))fail('runtime must not reference the local archive volume');
const field=await read('runtime/rendering/battlefield-renderer.js');
if(!field.includes('BlazingArchiveBattleHud?.drawUnitResources'))fail('shared player HUD renderer is not routed through the archive skin');
const shell=await read('index.html');
if(!shell.includes('runtime/rendering/blazing-archive-hud.js'))fail('archive HUD runtime is not loaded by the game shell');
if(!shell.includes('BlazingArchiveBattleHud?.drawEnemyHealth'))fail('enemy HP renderer is not routed through the archive skin');
const dock=await read('runtime/ui/battle/battle-dock.js');
for(const marker of ['statusMarkup','bb-dock-statuses','statusEffects','bb-status-badge'])if(!dock.includes(marker))fail(`status-dock marker missing: ${marker}`);
const dockCss=await read('runtime/ui/battle/battle-dock.css');
for(const marker of ['portrait-frame.png','status-medallion.png','hp-gauge-fill.png'])if(!dockCss.includes(marker))fail(`archive dock CSS marker missing: ${marker}`);
console.log('Blazing archive HUD validation PASS: official gauge/chakra art is isolated, source-traceable, and wired to player and enemy battle resources.');
