import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.cwd();
const sourcePath=path.join(root,'scripts','validate-progression.mjs');
const tempPath=path.join(root,'scripts','.validate-progression-itachi-current-dev-runtime.mjs');
let source=await fs.readFile(sourcePath,'utf8');

const from="\"FIGHTERS=['Crimson','Sub-Zero','Lebee','Senku','Tyler']\"";
const to="\"FIGHTERS=['Crimson','Sub-Zero','Lebee','Senku','Tyler','Itachi']\"";
const hits=source.split(from).length-1;
if(hits!==1)throw new Error(`Itachi progression validator expected one legacy fighter marker, found ${hits}`);
source=source.replace(from,to);

await fs.writeFile(tempPath,source);
try{
  await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
}finally{
  await fs.rm(tempPath,{force:true});
}
