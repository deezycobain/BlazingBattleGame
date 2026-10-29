import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {deflateSync} from 'node:zlib';
import {createStudioServer} from './serve-animation-lab.mjs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=path.resolve(process.env.STUDIO_ARTIFACTS||'work/motion-studio/browser');await fs.mkdir(output,{recursive:true});
const server=await createStudioServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,results={browsers:{},checks:0};
const check=(condition,message)=>{assert.ok(condition,message);results.checks++;};
function png(width,height,{rgb=false,empty=false,opaque=false,left=180,right=330,top=100,bottom=700}={}){
 const channels=rgb?3:4,data=Buffer.alloc((width*channels+1)*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const offset=y*(width*channels+1)+1+x*channels,body=!empty&&x>=left&&x<right&&y>=top&&y<bottom;data[offset]=body?180:0;data[offset+1]=body?80:0;data[offset+2]=body?45:0;if(!rgb)data[offset+3]=body||opaque?255:0;}
 const chunk=(type,body)=>{const t=Buffer.from(type),n=Buffer.alloc(4);n.writeUInt32BE(body.length);const bytes=Buffer.concat([t,body]);let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const end=Buffer.alloc(4);end.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([n,bytes,end]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=rgb?2:6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(data)),chunk('IEND',Buffer.alloc(0))]);
}
const upload=(name,buffer)=>({name,mimeType:'image/png',buffer});
try{
 const forbidden=await fetch(`${base}/package.json`);check(forbidden.status===404,'preview must not serve repository sources');check((await fetch(`${base}/animation-lab/core.mjs`,{method:'POST'})).status===405,'preview must reject writes');
 const types=(process.env.STUDIO_BROWSERS||'chromium,webkit').split(',');
 for(const name of types){
  const type={chromium,webkit}[name];if(!type)throw new Error(`Unknown browser ${name}`);
  const browser=await type.launch({headless:true,...(name==='chromium'?{args:['--no-sandbox'],...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})}:{})});
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],badRequests=[],missing=[];
   page.on('pageerror',error=>errors.push(error.message));page.on('request',req=>{if(req.method()!=='GET')badRequests.push(req.url());});page.on('response',res=>{if(res.status()>=400)missing.push(res.url());});
   page.setDefaultTimeout(15000);
   const snap=()=>page.evaluate(()=>window.motionStudio.snapshot());
   const ready=()=>page.waitForFunction(()=>window.motionStudio?.snapshot().loading===0&&window.motionStudio.snapshot().a&&window.motionStudio.snapshot().reports.a);
   const seek=time=>page.evaluate(t=>window.motionStudio.seekTime(t),time);
   const choose=async(character,animation)=>{await page.locator('#character').selectOption(character);await ready();if(animation){await page.locator('#animation').selectOption(animation);await ready();}};
   const exportJson=async id=>{const downloadPromise=page.waitForEvent('download');await page.locator(id).click();const d=await downloadPromise;return JSON.parse(await fs.readFile(await d.path(),'utf8'));};
   await page.goto(`${base}/animation-lab/`);await ready();
   let s=await snap();check(s.a.character==='itachi'&&s.a.animation==='run','default Itachi real run');check(s.a.paths.length===12&&s.a.paths.every(p=>p.includes('/itachi/sprites/runtime/run/')),'active Itachi paths');check(s.reports.a.frames.every(f=>f.width===420&&f.height===420),'Itachi originals retain 420px dimensions');check(s.a.timeline.every(t=>t.durationMs===85),'effective run85');
   await page.locator('#next').click();check((await snap()).a.frame.frame===1,'step forward');await page.locator('#prev').click();check((await snap()).a.frame.frame===0,'step backward');
   await seek(84.999);check((await snap()).a.frame.frame===0,'precise run before boundary');await seek(85);s=await snap();check(s.a.frame.frame===1&&s.b.frame.frame===1,'synchronized elapsed boundary');
   const before=await page.locator('#stageA').evaluate(c=>c.toDataURL());await page.locator('#onion').check();const after=await page.locator('#stageA').evaluate(c=>c.toDataURL());check(before!==after,'onion skin changes actual rendered pixels');await page.locator('#onion').uncheck();
   await choose('obito','run');await seek(85);check((await snap()).a.frame.frame===1,'Obito real run loads');
   await choose('scorpion','run');s=await snap();check(s.a.paths.length===12&&s.a.paths.every(p=>p.includes('/scorpion/sprites/runtime/run/')&&!p.includes('/v2/')),'Scorpion approved direct sources');await seek(850);s=await snap();check(s.a.frame.frame===11&&s.b.frame.frame===10,'each comparison uses its actual cadence');
   await page.locator('#sync').selectOption('phase');s=await snap();check(s.b.frame.frame===11,'phase lock is explicit retiming');await page.locator('#sync').selectOption('elapsed');
   const rawScorpion=await page.locator('#stageA').evaluate(c=>c.toDataURL());await page.locator('#presentation').selectOption('normalized');check((await page.locator('#stageA').evaluate(c=>c.toDataURL()))!==rawScorpion,'runtime normalization preview changes the same source frame');await page.locator('#presentation').selectOption('source');
   const overlayBefore=await page.locator('#stageA').evaluate(c=>c.toDataURL());await page.locator('#overlay').fill('0.4');check((await page.locator('#stageA').evaluate(c=>c.toDataURL()))!==overlayBefore,'reference transparency overlay changes pixels');await page.locator('#mirror').check();await page.locator('#mirror').uncheck();await page.locator('#overlay').fill('0');
   await choose('scorpion','idle');check((await snap()).a.timeline.length===10,'Scorpion idle pingpong');await choose('scorpion','basic');s=await snap();check(s.a.timeline.at(-1).durationMs===510,'Scorpion final body hold includes clamped tail');
   await choose('obito','basic');check((await snap()).a.timeline.length===3,'Obito runtime early body removal');await page.locator('#timing').selectOption('manifest');await ready();check((await snap()).a.timeline.length===6,'manifest mode exposes all six authored poses');await page.locator('#timing').selectOption('runtime');await ready();
   await choose('itachi','idle');check((await snap()).a.timeline[0].durationMs===165,'Itachi actual idle timing');check(await page.locator('#animation option[value=recoil]').isDisabled(),'missing Itachi recoil remains unavailable');
   await page.locator('#roadWorkspace').click();await ready();s=await snap();check(s.a.character==='road_rookie_idle_pilot'&&s.reports.a.frame_count===4&&s.b.animation==='run','Road Rookie pilot vs Gold run');check(await page.locator('#pendingPoses li').count()===8&&await page.locator('#roadPlan').isVisible(),'eight run poses explicitly pending');
   await page.locator('summary').filter({hasText:'Existing enemy references'}).click();await page.locator('#demo').selectOption('road_rookie');await page.locator('#loadDemo').click();await ready();check((await snap()).reports.a.frame_count===4,'legacy enemy sample retained');
   const good=[upload('frame_02.png',png(512,768,{left:181})),upload('frame_01.png',png(512,768))];
   await page.locator('#draft').setInputFiles(good);await ready();s=await snap();check(s.a.character==='local'&&s.reports.a.technicalPass,'local PNG production import passes technical QA');check(s.reports.a.frames[0].name==='frame_01.png','natural source ordering');check(s.reports.a.artApproval==='pending-human-review','technical pass never approves art');
   await page.locator('#inherit').click();s=await snap();check(Math.abs(s.reports.a.durationMs-1020)<1e-8&&s.a.timeline.length===2,'inherit timing without fabricating source frames');
   await seek(0);await page.locator('#duration').fill('200');await page.locator('#duration').press('Tab');check((await snap()).a.timeline[0].durationMs===200,'edit individual duration');
   await page.locator('#moveLater').click();check((await snap()).a.timeline[1].frame===0,'reorder playback source');await page.locator('#undo').click();check((await snap()).a.timeline[0].frame===0,'undo metadata edit');
   await page.locator('#scaffold').click();check(Object.keys((await snap()).a.landmarks).length===20,'editable full humanoid scaffold');await page.locator('#joint').selectOption('near_knee');await page.locator('#jointX').fill('200');await page.locator('#jointY').fill('550');await page.locator('#placeJoint').click();s=await snap();check(s.a.landmarks.near_knee.x===200&&s.a.landmarks.near_knee.y===550,'numeric anatomical placement');
   // A real pointer position must invert the actual canvas CSS geometry correctly.
   await page.locator('#stageA').scrollIntoViewIfNeeded();const box=await page.locator('#stageA').boundingBox();await page.mouse.click(box.x+box.width*220/512,box.y+box.height*540/768);s=await snap();check(Math.abs(s.a.landmarks.near_knee.x-220)<2&&Math.abs(s.a.landmarks.near_knee.y-540)<2,'pointer landmark placement uses source coordinates');
   await page.locator('#events').fill('[{"name":"near_contact","timeMs":0},{"name":"far_contact","timeMs":510}]');await page.locator('#saveEvents').click();
   const profile=await exportJson('#exportProfile');check(profile.schemaVersion==='1.0.0'&&profile.extends==='itachi-gold-v1','portable versioned inherited profile');check(profile.animations.run.frames[0].landmarks.near_knee.status.includes('manually-placed'),'manual coordinates exported');check(profile.animations.run.events.length===2,'events exported');
   await page.locator('#jointX').fill('250');await page.locator('#placeJoint').click();await page.locator('#importProfile').setInputFiles({name:'motion.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(profile))});await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('Profile metadata restored'));check(Math.abs((await snap()).a.landmarks.near_knee.x-220)<2,'profile restores edited anatomy and timing against matching artwork');
   const qa=await exportJson('#export'),metrics=await exportJson('#exportMetrics');check(qa.a.technicalPass&&qa.automatic_checks_only,'QA exports structural report');check(metrics.a.frames[0].fingerprint.length===64&&metrics.auditedCommit==='f2b8759','metrics export real source hashes and provenance');
   await page.locator('#reference').setInputFiles(good);await ready();check(!(await page.locator('#referencePane').isHidden()),'local comparison upload');
   await page.locator('#speed').selectOption('2');await seek(0);await page.locator('#play').click();await page.waitForTimeout(180);await page.locator('#play').click();check((await snap()).elapsedMs>220&&!(await snap()).playing,'speed and pause work');
   // Resume must have exactly one RAF clock, even after rapid pause/play.
   await page.locator('#play').click();await page.locator('#play').click();check(!(await snap()).playing,'rapid pause does not retain a playback loop');
   await page.locator('#loop').uncheck();await seek(5000);check((await snap()).a.frame.frame===1,'nonloop endpoint clamps');await page.locator('#next').click();check((await snap()).a.frame.index===0,'step wraps independently after endpoint');
   const bad=[upload('frame_01.png',png(512,768,{opaque:true})),upload('frame_03.png',png(512,768,{empty:true})),upload('frame_04.png',png(400,768)),upload('frame_05.png',png(512,768,{rgb:true})),upload('frame_06.png',png(512,768,{left:0})),upload('frame_07.png',Buffer.from('renamed text, not PNG'))];
   await page.locator('#draft').setInputFiles(bad);await ready();s=await snap();const issues=s.reports.a.errors.join('\n');for(const expected of ['Missing numbered','transparent','empty','512×768','true RGBA','cropping','valid IHDR'])check(issues.includes(expected),`QA catches ${expected}`);check(s.reports.a.technicalPass===false,'bad imported production sequence fails');
   await page.locator('#draft').setInputFiles([upload('frame_01.png',png(512,768)),upload('frame_02.png',png(512,768))]);await ready();check((await snap()).reports.a.warnings.some(w=>w.includes('duplicate pixels')),'duplicate source pixels warn');
   await page.locator('#importProfile').setInputFiles({name:'wrong-art-profile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(profile))});await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('different artwork pixels'));check((await snap()).reports.a.artApproval==='pending-human-review','saved guides reject different artwork with reused filenames');
   await choose('itachi','run');await page.locator('#refCharacter').selectOption('scorpion');await ready();await page.locator('#refAnimation').selectOption('run');await ready();await seek(425);await page.screenshot({path:path.join(output,`${name}-studio.png`),fullPage:true});
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,`${name}-mobile.png`),fullPage:true});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'390px layout has no horizontal page overflow');
   check(errors.length===0,`no browser exceptions: ${errors.join('; ')}`);check(badRequests.length===0,'studio never sends mutation requests');check(missing.length===0,`all expected studio/reference resources loaded: ${missing.join('; ')}`);
   results.browsers[name]={pass:true,pageErrors:errors,unexpectedRequests:badRequests,missingResources:missing};await context.close();console.log(`Blazing Motion Studio ${name} PASS: references, cadence, comparison, editor, import, QA, profiles, pointer anatomy, exports and mobile layout.`);
  }finally{await browser.close();}
 }
}finally{await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');await new Promise(resolve=>server.close(resolve));}
console.log(`Browser assertions: ${results.checks}`);
