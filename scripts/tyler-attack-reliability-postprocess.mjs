import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

const blocking="runBasicAttack=au.name==='Tyler'?async(...args)=>{await TYLER_BODY_RUNTIME.basic.readyPromise;return animateLunge(...args)}:animateLunge;basicTarget=au.name==='Tyler'&&Math.hypot(to.x-from.x,to.y-from.y)<40?{x:from.x+dx/len*40,y:from.y+dy/len*40}:to;";
const reliable="runBasicAttack=animateLunge;basicTarget=au.name==='Tyler'&&Math.hypot(to.x-from.x,to.y-from.y)<40?{x:from.x+dx/len*40,y:from.y+dy/len*40}:to;";
const sourceCount=html.split(blocking).length-1;
const targetCount=html.split(reliable).length-1;
if(sourceCount===1){
 html=html.replace(blocking,reliable);
}else if(sourceCount===0&&targetCount===1){
 // Idempotent rebuild: the reliable hook is already present.
}else{
 throw new Error(`Tyler attack reliability: expected one attack hook, blocking=${sourceCount}, reliable=${targetCount}`);
}

if(html.includes("runBasicAttack=au.name==='Tyler'?async(...args)=>{await TYLER_BODY_RUNTIME.basic.readyPromise")){
 throw new Error('Tyler attack reliability: sprite readiness still blocks Basic attack execution');
}
if(!html.includes(reliable))throw new Error('Tyler attack reliability: reliable Basic attack hook missing');

await fs.writeFile(file,html);
console.log('Tyler attack reliability PASS: Basic attack enters the normal impact lifecycle immediately; authored Tyler frames remain optional presentation.');
