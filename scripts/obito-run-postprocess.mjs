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

// Own the held-unit identity explicitly for the whole drag. S.ready.ref is an input helper and
// can change during the gesture; the animation renderer needs a persistent movement state.
const downSource=" S.dragOrigin={x:p.x,y:p.y};\n S.dragGrabOffset={x:p.x-pt.x,y:p.y-pt.y};";
const downTarget=" S.dragOrigin={x:p.x,y:p.y};\n S.dragUnitName=p.name||null;\n S.dragUnitRef=p;\n S.dragGhost={name:p.name||null,x:p.x,y:p.y};\n S.dragGrabOffset={x:p.x-pt.x,y:p.y-pt.y};";
if(html.includes(downSource))html=html.replace(downSource,downTarget);
else if(!html.includes('S.dragUnitName=p.name||null;'))fail('pointerdown persistent held-unit anchor missing');

// While Obito is actively held, the ordinary body renderer consumes his authored run loop.
// Everyone else keeps the existing idle path until their own movement assets are authored.
const idleSource="function unitIdleFrames(name){const legacyShinobiIdle=LEGACY_SHINOBI_BODY_RUNTIME.idle(name);if(legacyShinobiIdle?.length)return LEGACY_SHINOBI_BODY_RUNTIME.sequence(name,'idle',legacyShinobiIdle);";
const idleTarget="function unitIdleFrames(name){const legacyShinobiRun=(name==='Obito'&&typeof S!=='undefined'&&S?.drag&&S?.dragUnitName===name)?LEGACY_SHINOBI_BODY_RUNTIME.run(name):null;if(legacyShinobiRun?.length)return LEGACY_SHINOBI_BODY_RUNTIME.sequence(name,'run',legacyShinobiRun);const legacyShinobiIdle=LEGACY_SHINOBI_BODY_RUNTIME.idle(name);if(legacyShinobiIdle?.length)return LEGACY_SHINOBI_BODY_RUNTIME.sequence(name,'idle',legacyShinobiIdle);";
if(html.includes(idleSource))html=html.replace(idleSource,idleTarget);
else if(!html.includes("S?.drag&&S?.dragUnitName===name"))fail('unitIdleFrames held-run anchor missing');

// Track horizontal drag direction from the real pointer stream. The run art is authored
// facing right and the authoritative body-facing resolver mirrors it when moving left.
const moveSource=" let p=S.ready.ref,pt=inputPoint(latest),v=S.dragVisual;";
const moveTarget=" let p=S.ready.ref,pt=inputPoint(latest),v=S.dragVisual;\n const held=S.dragUnitRef||p;\n const previousDragX=v?.lastX??pt.x;\n if(held?.name==='Obito'&&Math.abs(pt.x-previousDragX)>=1.25)S.dragFacing=pt.x<previousDragX?-1:1;";
if(html.includes(moveSource))html=html.replace(moveSource,moveTarget);
else if(!html.includes('const held=S.dragUnitRef||p;'))fail('pointermove direction anchor missing');

// Naruto-Blazing-style origin ghost. It is rendered in world space from the original feet
// anchor so it remains attached to the map while the live Obito runs under the pointer.
const shadowMarker='  // VISIBLE WORLD-SPACE CONTACT SHADOW';
const ghostBlock=`  // OBITO PICKUP ORIGIN GHOST\n  if(!isEnemy&&name==='Obito'&&S.drag&&S.dragGhost?.name==='Obito'){\n    const ghostFrames=LEGACY_SHINOBI_BODY_RUNTIME.idle('Obito');\n    const ghostFrame=ghostFrames?.[Math.floor(performance.now()/145)%Math.max(1,ghostFrames?.length||1)];\n    if(ghostFrame?.complete&&ghostFrame.naturalWidth>0&&ghostFrame.naturalHeight>0){\n      const gx=S.dragGhost.x,gy=S.dragGhost.y;\n      const ghostDepth=(S.bbRunMode==='road'&&window.BlazingRoadContent?.visualScaleForY)\n        ? Math.max(.82,Math.min(1.08,Number(window.BlazingRoadContent.visualScaleForY(S.bbRoadContent?.map,gy))||1))\n        : 1;\n      const ghostH=132*ghostDepth,ghostW=ghostH*(ghostFrame.naturalWidth/ghostFrame.naturalHeight);\n      ctx.save();\n      ctx.globalAlpha=.28;\n      ctx.filter='grayscale(.18) brightness(1.12)';\n      ctx.translate(gx,gy+17);\n      ctx.drawImage(ghostFrame,-ghostW/2,-ghostH,ghostW,ghostH);\n      ctx.restore();\n    }\n  }\n\n`;
if(html.includes(shadowMarker)&&!html.includes('// OBITO PICKUP ORIGIN GHOST'))html=html.replace(shadowMarker,ghostBlock+shadowMarker);
else if(!html.includes('// OBITO PICKUP ORIGIN GHOST'))fail('world-space ghost renderer anchor missing');

// Dropping the held Obito back on the original anchor cancels the gesture before normal
// move resolution. No movement is committed and therefore no turn/action is consumed.
const pointerUp="cvs.addEventListener('pointerup',ev=>{";
const cancelBlock=`cvs.addEventListener('pointerup',ev=>{\n const returningObito=(S.drag&&S.dragUnitName==='Obito'&&S.dragUnitRef&&S.dragOrigin)?S.dragUnitRef:null;\n if(returningObito){\n  const returnRadius=28;\n  const returnDistance=Math.hypot(returningObito.x-S.dragOrigin.x,returningObito.y-S.dragOrigin.y);\n  if(returnDistance<=returnRadius){\n   returningObito.x=S.dragOrigin.x;returningObito.y=S.dragOrigin.y;\n   S.drag=false;S.dragVisual=null;S.dragGrabOffset=null;S.dragFacing=null;\n   S.dragGhost=null;S.dragUnitName=null;S.dragUnitRef=null;S.dragOrigin=null;\n   try{if(cvs.hasPointerCapture?.(ev.pointerId))cvs.releasePointerCapture(ev.pointerId)}catch(_e){}\n   S.log='Movement cancelled';\n   return;\n  }\n }`;
if(html.includes(pointerUp)&&!html.includes('const returningObito='))html=html.replace(pointerUp,cancelBlock);
else if(!html.includes('const returningObito='))fail('pointerup no-turn cancel anchor missing');

// Drag-facing itself is resolved by strict-attack-facing-postprocess. Verify that contract
// is present in the generated runtime rather than patching the renderer a second time here.
if(!html.includes("actor.name==='Obito'&&S.drag&&S.dragUnitName===actor.name&&Number.isFinite(S.dragFacing)")){
  fail('authoritative drag-facing contract missing');
}

// Clear all movement-only state after a normal release/cancel so attack facing and idle
// presentation immediately regain authority.
html=html.replaceAll('S.dragVisual=null;S.dragOrigin=null;','S.dragVisual=null;S.dragOrigin=null;S.dragGhost=null;S.dragUnitName=null;S.dragUnitRef=null;');
html=html.replaceAll('S.dragGrabOffset=null;S.dragFacing=null;','S.dragGrabOffset=null;S.dragFacing=null;S.dragGhost=null;S.dragUnitName=null;S.dragUnitRef=null;');
if(!html.includes('S.dragGhost=null;S.dragUnitName=null;S.dragUnitRef=null;'))fail('drag release cleanup anchor missing');

for(const marker of [
  "run:name=>resolve(name,'run')",
  "S?.drag&&S?.dragUnitName===name",
  'S.dragUnitName=p.name||null;',
  'S.dragGhost={name:p.name||null,x:p.x,y:p.y};',
  'const held=S.dragUnitRef||p;',
  '// OBITO PICKUP ORIGIN GHOST',
  'const returnRadius=28;',
  "actor.name==='Obito'&&S.drag&&S.dragUnitName===actor.name"
])if(!html.includes(marker))fail('missing final marker '+marker);

await fs.writeFile(file,html);
console.log('Obito run integration PASS: held-unit state owns the run loop, live drag direction mirrors it, origin ghost stays planted, and return-to-origin cancels without spending the turn.');
