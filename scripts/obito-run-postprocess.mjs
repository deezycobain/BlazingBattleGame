import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Obito run integration: '+message)};

// Expose the authored run sequence through the existing Legacy sprite resolver.
const basicExport="  basic:name=>resolve(name,'basic_attack'),\n  sequence";
const runExport="  basic:name=>resolve(name,'basic_attack'),\n  run:name=>resolve(name,'run'),\n  sequence";
if(html.includes(basicExport))html=html.replace(basicExport,runExport);
else if(!html.includes(runExport))fail('Legacy run resolver export anchor missing');

// While Obito is actively picked up, the ordinary idle renderer consumes his run loop.
// Everyone else keeps the existing idle path until their own run assets are authored.
const idleSource="function unitIdleFrames(name){const legacyShinobiIdle=LEGACY_SHINOBI_BODY_RUNTIME.idle(name);if(legacyShinobiIdle?.length)return LEGACY_SHINOBI_BODY_RUNTIME.sequence(name,'idle',legacyShinobiIdle);";
const idleTarget="function unitIdleFrames(name){const legacyShinobiRun=(name==='Obito'&&typeof S!=='undefined'&&S?.drag&&S?.ready?.ref?.name===name)?LEGACY_SHINOBI_BODY_RUNTIME.run(name):null;if(legacyShinobiRun?.length)return legacyShinobiRun;const legacyShinobiIdle=LEGACY_SHINOBI_BODY_RUNTIME.idle(name);if(legacyShinobiIdle?.length)return LEGACY_SHINOBI_BODY_RUNTIME.sequence(name,'idle',legacyShinobiIdle);";
if(html.includes(idleSource))html=html.replace(idleSource,idleTarget);
else if(!html.includes(idleTarget))fail('unitIdleFrames drag-state anchor missing');

// Track horizontal drag direction from the real pointer stream. The run art is authored
// facing right and mirrors for left, matching the Naruto-Blazing-style picked-up movement.
const moveSource=" let p=S.ready.ref,pt=inputPoint(latest),v=S.dragVisual;";
const moveTarget=" let p=S.ready.ref,pt=inputPoint(latest),v=S.dragVisual;\n const previousDragX=v?.lastX??pt.x;\n if(p?.name==='Obito'&&Math.abs(pt.x-previousDragX)>=1.25)S.dragFacing=pt.x<previousDragX?-1:1;";
if(html.includes(moveSource))html=html.replace(moveSource,moveTarget);
else if(!html.includes('previousDragX=v?.lastX??pt.x'))fail('pointermove direction anchor missing');

const flipSource=` const directionalFlip=Number.isFinite(subzeroJutsuFacing)
   ? (Math.cos(subzeroJutsuFacing)<0?-1:1)
   : (flipX||1);
 ctx.scale(directionalFlip*scale*activePulse,scale*activePulse);`;
const flipTarget=` const draggedObitoFacing=(name==='Obito'&&S.drag&&S.ready?.ref?.name===name&&Number.isFinite(S.dragFacing))?S.dragFacing:null;
 const directionalFlip=Number.isFinite(draggedObitoFacing)
   ? draggedObitoFacing
   : Number.isFinite(subzeroJutsuFacing)
    ? (Math.cos(subzeroJutsuFacing)<0?-1:1)
    : (flipX||1);
 ctx.scale(directionalFlip*scale*activePulse,scale*activePulse);`;
if(html.includes(flipSource))html=html.replace(flipSource,flipTarget);
else if(!html.includes('const draggedObitoFacing='))fail('renderer facing anchor missing');

// Clear movement-facing state when the drag ends so attack facing remains authoritative.
html=html.replaceAll('S.dragGrabOffset=null;','S.dragGrabOffset=null;S.dragFacing=null;');
if(!html.includes('S.dragGrabOffset=null;S.dragFacing=null;'))fail('drag release cleanup anchor missing');

for(const marker of ["run:name=>resolve(name,'run')","name==='Obito'&&typeof S!=='undefined'&&S?.drag","previousDragX=v?.lastX??pt.x","const draggedObitoFacing="])if(!html.includes(marker))fail('missing final marker '+marker);

await fs.writeFile(file,html);
console.log('Obito run integration PASS: picked-up Obito loops authored run frames, mirrors with drag direction, and returns to idle on release.');
