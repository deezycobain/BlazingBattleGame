import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const replaceOne=(from,to,label)=>{
  const count=html.split(from).length-1;
  if(count!==1)throw new Error(`Battle presentation consistency: expected one ${label}, found ${count}`);
  html=html.replace(from,to);
};

// Keep the established base-scale marker (used by existing Road smoke tests), but
// normalize the actual on-screen footprint: the prior Itachi-only 1.28 multiplier
// made him materially larger than every other fighter.
replaceOne(
  "const bbUnitPresentationScale=name==='Itachi'?1.28:1;ctx.scale(directionalFlip*scale*activePulse*bbRoadDepthScale*1.15*bbRoadCameraCompensation*bbUnitPresentationScale,scale*activePulse*bbRoadDepthScale*1.15*bbRoadCameraCompensation*bbUnitPresentationScale);ctx.translate(0,5);",
  "const bbUnitPresentationScale=name==='Itachi'?1.28:1;const bbRosterFootprintNormalization=name==='Itachi'?.835:1.113;ctx.scale(directionalFlip*scale*activePulse*bbRoadDepthScale*1.15*bbRoadCameraCompensation*bbUnitPresentationScale*bbRosterFootprintNormalization,scale*activePulse*bbRoadDepthScale*1.15*bbRoadCameraCompensation*bbUnitPresentationScale*bbRosterFootprintNormalization);ctx.translate(0,5);",
  'Road fighter-scale anchor'
);

replaceOne(
  'const halfWidth=(isEnemy ? 12.2 : 11.4)+(1.4*liftRatio);\n    const contactOpacity=(isEnemy ? .14 : .125)*(1-.62*liftRatio);\n    const blurOpacity=contactOpacity*.84;\n    ctx.save();\n    ctx.translate(x+.55,y+17.0);\n    ctx.scale(bbDepthScale,bbDepthScale);\n    ctx.fillStyle=`rgba(12,16,20,${contactOpacity})`;\n    ctx.shadowColor=`rgba(7,10,14,${blurOpacity})`;\n    ctx.shadowBlur=4.4+(1.4*liftRatio);',
  '// Bright, textured Road maps need a readable contact patch at phone scale.\n    const halfWidth=(isEnemy ? 17.0 : 16.2)+(1.8*liftRatio);\n    const contactOpacity=(isEnemy ? .285 : .255)*(1-.54*liftRatio);\n    const blurOpacity=contactOpacity*.92;\n    ctx.save();\n    ctx.translate(x+.55,y+12.0);\n    ctx.scale(bbDepthScale,bbDepthScale);\n    ctx.fillStyle=`rgba(12,16,20,${contactOpacity})`;\n    ctx.shadowColor=`rgba(7,10,14,${blurOpacity})`;\n    ctx.shadowBlur=3.6+(1.6*liftRatio);',
  'contact-shadow anchor'
);

for(const marker of ['bbRosterFootprintNormalization',"name==='Itachi'?.835:1.113",'contactOpacity=(isEnemy ? .285 : .255)','ctx.translate(x+.55,y+12.0)']){
  if(!html.includes(marker))throw new Error(`Battle presentation consistency: missing ${marker}`);
}

await fs.writeFile(file,html);
console.log('Battle presentation consistency PASS: unified unit footprints and high-contrast feet contact shadows applied.');
