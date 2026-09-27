import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Itachi motion integration: '+message)};
const replaceOne=(source,target,label)=>{
 const hits=html.split(source).length-1;
 if(hits!==1)fail(`expected one ${label}, found ${hits}`);
 html=html.replace(source,target);
};

// Itachi's motion frames take precedence only while he is the held unit. This intentionally
// keys off the persistent drag identity, not whichever roster entry was last rendered.
const idleSource="function unitIdleFrames(name){const madaraArchiveFrames=name==='Madara'?((S?.drag&&S?.dragUnitName===name)?MADARA_ARCHIVE_BODY_RUNTIME.run():MADARA_ARCHIVE_BODY_RUNTIME.idle()):null;if(madaraArchiveFrames?.length)return madaraArchiveFrames;const legacyShinobiRun=";
const idleTarget="function unitIdleFrames(name){const itachiMotionFrames=name==='Itachi'?((S?.drag&&S?.dragUnitName===name)?ITACHI_RUN_FRAMES:ITACHI_IDLE_FRAMES):null;if(itachiMotionFrames?.length)return itachiMotionFrames;const madaraArchiveFrames=name==='Madara'?((S?.drag&&S?.dragUnitName===name)?MADARA_ARCHIVE_BODY_RUNTIME.run():MADARA_ARCHIVE_BODY_RUNTIME.idle()):null;if(madaraArchiveFrames?.length)return madaraArchiveFrames;const legacyShinobiRun=";
if(html.includes(idleSource))html=html.replace(idleSource,idleTarget);
else if(!html.includes("const itachiMotionFrames=name==='Itachi'"))fail('Itachi frame resolver anchor missing');

const motionSource=" const obitoRunning=Boolean(name==='Obito'&&!isEnemy&&S?.drag&&S?.dragUnitName==='Obito');\n if(obitoRunning){const stride=performance.now()/1020;lift-=Math.abs(Math.sin(stride*Math.PI))*1.1;scale*=1+.004*Math.sin(stride*Math.PI*2);}";
const motionTarget=" const obitoRunning=Boolean(name==='Obito'&&!isEnemy&&S?.drag&&S?.dragUnitName==='Obito');\n const itachiRunning=Boolean(name==='Itachi'&&!isEnemy&&S?.drag&&S?.dragUnitName==='Itachi');\n if(obitoRunning){const stride=performance.now()/1020;lift-=Math.abs(Math.sin(stride*Math.PI))*1.1;scale*=1+.004*Math.sin(stride*Math.PI*2);}\n if(itachiRunning){const stride=performance.now()/1020;lift-=Math.abs(Math.sin(stride*Math.PI))*0.65;scale*=1+.003*Math.sin(stride*Math.PI*2);}";
if(html.includes(motionSource))html=html.replace(motionSource,motionTarget);
else if(!html.includes("const itachiRunning=Boolean(name==='Itachi'"))fail('Itachi held-run motion anchor missing');

const cadenceSource=" const idleMs=obitoRunning?85:(name==='Lebee'?520:(name==='Tyler'?230:185));";
const cadenceTarget=" const idleMs=(obitoRunning||itachiRunning)?85:(name==='Lebee'?520:(name==='Tyler'?230:(name==='Itachi'?100:185)));";
if(html.includes(cadenceSource))html=html.replace(cadenceSource,cadenceTarget);
else if(!html.includes('const idleMs=(obitoRunning||itachiRunning)?85:'))fail('Itachi cadence anchor missing');

// The origin ghost must be idle art. It is a location marker, never a second running body.
const ghostSource='const ghostFrames=unitIdleFrames(name);';
const ghostTarget="const ghostFrames=name==='Itachi'?ITACHI_IDLE_FRAMES:unitIdleFrames(name);";
if(html.includes(ghostSource))replaceOne(ghostSource,ghostTarget,'origin ghost frame resolver');
else if(!html.includes(ghostTarget))fail('Itachi origin ghost anchor missing');

const dragFacingSource="if((heldName==='Obito'||heldName==='Madara')&&Math.abs(pt.x-previousDragX)>=1.25)S.dragFacing=pt.x<previousDragX?-1:1;";
const dragFacingTarget="if((heldName==='Obito'||heldName==='Madara'||heldName==='Itachi')&&Math.abs(pt.x-previousDragX)>=1.25)S.dragFacing=pt.x<previousDragX?-1:1;";
if(html.includes(dragFacingSource))html=html.replace(dragFacingSource,dragFacingTarget);
else if(!html.includes("heldName==='Itachi'"))fail('Itachi drag-facing anchor missing');

const facingSource="if((actor.name==='Obito'||actor.name==='Madara')&&S.drag&&S.dragUnitName===actor.name&&Number.isFinite(S.dragFacing)){\n          return S.dragFacing<0?Math.PI:0;\n        }";
const facingTarget="if((actor.name==='Obito'||actor.name==='Madara'||actor.name==='Itachi')&&S.drag&&S.dragUnitName===actor.name&&Number.isFinite(S.dragFacing)){\n          return S.dragFacing<0?Math.PI:0;\n        }";
if(html.includes(facingSource))html=html.replace(facingSource,facingTarget);
else if(!html.includes("actor.name==='Itachi'"))fail('Itachi body-facing anchor missing');

for(const marker of [
 'ITACHI_IDLE_FRAMES','ITACHI_RUN_FRAMES',"const itachiMotionFrames=name==='Itachi'",'const itachiRunning=Boolean',
 'const idleMs=(obitoRunning||itachiRunning)?85:',"name==='Itachi'?ITACHI_IDLE_FRAMES:unitIdleFrames(name)","heldName==='Itachi'","actor.name==='Itachi'"
])if(!html.includes(marker))fail('generated runtime missing '+marker);

await fs.writeFile(file,html);
console.log('Itachi motion integration PASS: 12-frame idle, held-only 12-frame run, idle origin ghost, and drag-facing are wired.');
await import('./battle-presentation-consistency-postprocess.mjs');
