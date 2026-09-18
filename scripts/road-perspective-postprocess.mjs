import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const source='ctx.scale(directionalFlip*scale*activePulse,scale*activePulse);';
const replacement=`const bbRoadDepthY=ctx.getTransform?.().f;
 const bbRoadDepthScale=(S.bbRunMode==='road'&&Number.isFinite(bbRoadDepthY))
  ? Math.max(.82,Math.min(1.10,Number(window.BlazingRoadContent?.visualScaleForY?.(S.bbRoadContent?.map,bbRoadDepthY))||1))
  : 1;
 ctx.scale(directionalFlip*scale*activePulse*bbRoadDepthScale,scale*activePulse*bbRoadDepthScale);`;
const count=html.split(source).length-1;
if(count===1)html=html.replace(source,replacement);
else if(count===0&&html.includes('const bbRoadDepthScale=')){}
else throw new Error(`Road perspective: expected one battle-sprite scale anchor, found ${count}`);
for(const marker of ['bbRoadDepthY','bbRoadDepthScale','BlazingRoadContent?.visualScaleForY'])if(!html.includes(marker))throw new Error(`Road perspective: built shell missing ${marker}`);
await fs.writeFile(file,html);
console.log('Road perspective PASS: map-authored depth scale is render-only and leaves world coordinates/hit tests unchanged.');
