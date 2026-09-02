import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const DIST=path.join(ROOT,'dist');
const indexPath=path.join(DIST,'index.html');
const gamePath=path.join(DIST,'game.html');
const fail=msg=>{throw new Error(`Boot shell validation failed: ${msg}`)};

const [index,game]=await Promise.all([
  fs.readFile(indexPath,'utf8'),
  fs.readFile(gamePath,'utf8')
]);
const indexBytes=Buffer.byteLength(index),gameBytes=Buffer.byteLength(game);
if(indexBytes>32768)fail(`index.html is ${indexBytes} bytes; budget is 32768`);
if(indexBytes<1000)fail('index.html is unexpectedly small');
if(gameBytes<100000)fail(`game.html is unexpectedly small (${gameBytes} bytes)`);
if(!index.includes('game.html?boot=1'))fail('boot shell does not request game.html');
for(const marker of ['Blazing Battle','Shinobi Battle System','id="bar"','id="retry"','BOOT_SHELL','GAME_FETCH_STARTED','GAME_FETCH_COMPLETE']){
  if(!index.includes(marker))fail(`missing boot marker ${marker}`);
}
for(const bad of [/data:image\//i,/data:font\//i,/base64,/i]){
  if(bad.test(index))fail(`boot shell contains forbidden embedded payload matching ${bad}`);
}
for(const required of ['runtime/ui/shared/cloud-backdrop-hq.png','runtime/ui/home/home-wallpaper-hq.png']){
  if(!game.includes(required))fail(`game.html missing external asset reference ${required}`);
  try{await fs.access(path.join(DIST,required));}catch{fail(`required external asset missing from dist: ${required}`)}
}
if(/data:image\/png;base64,iVBOR/.test(game))fail('game.html still contains embedded PNG payloads');
if(!game.includes('window.BB_BUILD_META'))fail('game.html missing build metadata');
console.log(`Boot shell validation PASS: index ${(indexBytes/1024).toFixed(1)} KiB; game ${(gameBytes/1024).toFixed(1)} KiB; critical assets external and present.`);
