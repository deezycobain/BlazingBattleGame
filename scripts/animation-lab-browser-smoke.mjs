import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=message=>{throw new Error('Animation Lab browser smoke: '+message)};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const full=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(!full.startsWith(root+path.sep))throw new Error('Path denied');
  const data=await fs.readFile(full);
  res.writeHead(200,{'content-type':full.endsWith('.html')?'text/html':full.endsWith('.png')?'image/png':'text/plain'});
  res.end(data);
 }catch{res.writeHead(404);res.end('Missing')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const files=['assets/characters/scorpion/sprites/runtime/idle/frame_01.png',
             'assets/characters/scorpion/sprites/runtime/idle/frame_02.png'].map(f=>path.join(root,f));
try{
 for(const [name,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await browserType.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:1100,height:800}});
   await page.goto('http://127.0.0.1:'+port+'/animation-lab/index.html');
   await page.waitForFunction(()=>document.getElementById('countLabel').textContent==='4 FRAMES');
   await page.locator('#demo').selectOption('road_rookie_idle_pilot');
   await page.locator('#loadDemo').click();
   await page.waitForFunction(()=>document.getElementById('sourceLabel').textContent.includes('dev-only'));
   if(await page.locator('#countLabel').innerText()!=='4 FRAMES')fail(name+' Road Rookie pilot did not load four frames');
   await page.locator('#draft').setInputFiles(files);
   await page.waitForFunction(()=>document.getElementById('countLabel').textContent==='2 FRAMES');
   const qa=await page.locator('#qa').innerText();
   if(!qa.includes('2 frames'))fail(name+' draft QA not updated');
   await page.locator('#next').click();
   if(!(await page.locator('#position').innerText()).includes('2 / 2'))fail(name+' frame advance failed');
   await page.locator('#reference').setInputFiles(files);
   await page.locator('#referencePane').waitFor({state:'visible'});
   if(await page.locator('#referencePane').isHidden())fail(name+' compare reference hidden');
   await page.locator('#play').click();
   await page.waitForTimeout(250);
   await page.locator('#play').click();
   if(await page.locator('#play').innerText()!=='Play')fail(name+' pause control failed');
   if(await page.locator('#export').isDisabled())fail(name+' QA export unavailable');
   const downloadPromise=page.waitForEvent('download');
   await page.locator('#export').click();
   const download=await downloadPromise;
   if(download.suggestedFilename()!=='animation-lab-qa.json')fail(name+' wrong QA export');
   await page.close();
   console.log('Animation Lab '+name+' browser PASS: legacy sample, local upload, scrub, playback, comparison, export');
  }finally{await browser.close()}
 }
}finally{await new Promise(resolve=>server.close(resolve))}
