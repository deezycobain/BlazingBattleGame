import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.cwd();
const sourcePath=path.join(root,'scripts','validate-progression.mjs');
const tempPath=path.join(root,'scripts','.validate-progression-itachi-runtime.mjs');
let source=await fs.readFile(sourcePath,'utf8');
const replacements=[
  ["\"const VERSION='5.7.0'\"","\"const VERSION='5.8.0-itachi'\""],
  ["\"FIGHTERS=['Crimson','Sub-Zero','Lebee','Senku','Tyler']\"","\"FIGHTERS=['Crimson','Sub-Zero','Lebee','Senku','Tyler','Itachi']\""],
  ["'summon-cinematic-browser-smoke.mjs'","'summon-cinematic-browser-smoke-itachi.mjs'"]
];
for(const [from,to] of replacements){
  const hits=source.split(from).length-1;
  if(hits!==1)throw new Error(`Itachi progression validator expected one compatibility marker: ${from}; found ${hits}`);
  source=source.replace(from,to);
}
await fs.writeFile(tempPath,source);
try{
  await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
}finally{
  await fs.rm(tempPath,{force:true});
}
