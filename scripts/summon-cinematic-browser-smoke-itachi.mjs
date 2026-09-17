import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.cwd();
const sourcePath=path.join(root,'scripts','summon-cinematic-browser-smoke.mjs');
const tempPath=path.join(root,'scripts','.summon-cinematic-browser-smoke-itachi-runtime.mjs');
let source=await fs.readFile(sourcePath,'utf8');
const replacements=[
  ["runtime.version!=='5.7.0'","runtime.version!=='5.8.0-itachi'"],
  ["await page.locator('#singleSummonBtn').click();","await page.evaluate(()=>{Math.random=()=>0});\n    await page.locator('#singleSummonBtn').click();"]
];
for(const [from,to] of replacements){
  const hits=source.split(from).length-1;
  if(hits!==1)throw new Error(`Itachi summon smoke compatibility marker expected once: ${from}; found ${hits}`);
  source=source.replace(from,to);
}
await fs.writeFile(tempPath,source);
try{
  await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
}finally{
  await fs.rm(tempPath,{force:true});
}
