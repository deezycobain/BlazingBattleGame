import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const OUT='docs/validation/puppet-atlas-v2';
await fs.mkdir(OUT,{recursive:true});

let browser;
try{
 browser=await chromium.launch({headless:true,timeout:30000});
 const context=await browser.newContext({viewport:{width:980,height:900}});
 await context.addInitScript(()=>localStorage.setItem('bb.scorpion-puppet-atlas.dev','1'));
 const page=await context.newPage();
 page.setDefaultTimeout(30000);
 const pageErrors=[];page.on('pageerror',error=>pageErrors.push(String(error?.message||error)));
 await page.goto(BASE+'/?scorpionPuppetV2=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.BlazingScorpionPuppetAtlasV2==='object',null,{timeout:30000});
 await page.waitForFunction(()=>window.BlazingScorpionPuppetAtlasV2.ready||window.BlazingScorpionPuppetAtlasV2.error,null,{timeout:30000});
 const load=await page.evaluate(()=>({ready:window.BlazingScorpionPuppetAtlasV2.ready,error:window.BlazingScorpionPuppetAtlasV2.error}));
 if(!load.ready)throw new Error('V2 candidate failed to load: '+load.error);
 await page.evaluate(()=>window.BlazingScorpionPuppetAtlasV2.openLab());
 await page.locator('#bb-scorpion-puppet-v2-lab').waitFor({state:'visible'});
 const selectors={master:'[data-master-preview]',neutral:'[data-v2-pose="neutral"]',elbow:'[data-v2-pose="elbow"]',shoulder:'[data-v2-pose="shoulder"]',knee:'[data-v2-pose="knee"]'};
 for(const [name,selector] of Object.entries(selectors)){
  const canvas=page.locator(selector);await canvas.waitFor({state:'visible'});await canvas.screenshot({path:OUT+'/'+name+'.png'});
 }
 await page.locator('#bb-scorpion-puppet-v2-lab').screenshot({path:OUT+'/articulation-gate-full.png'});
 const report=await page.evaluate(()=>{const api=window.BlazingScorpionPuppetAtlasV2;return {version:api.version,ready:api.ready,error:api.error,componentCount:api.components.length,poses:api.poses,neutralDiff:api.neutralDiff,slots:api.components.map(c=>c.slot)};});
 await fs.writeFile(OUT+'/result.json',JSON.stringify(report,null,2));
 if(report.componentCount!==17)throw new Error('Expected 17 V2 components, got '+report.componentCount);
 if(report.poses.map(p=>p.id).join(',')!=='neutral,elbow,shoulder,knee')throw new Error('Unexpected articulation gate poses '+JSON.stringify(report.poses));
 if(!report.neutralDiff?.boundsEqual)throw new Error('V2 neutral native bounds drift from V1 master: '+JSON.stringify(report.neutralDiff));
 if(pageErrors.length)throw new Error('pageerror: '+pageErrors.join(' | '));
 console.log('Scorpion Puppet Atlas V2 browser gate PASS:',JSON.stringify(report));
} finally {
 if(browser)await browser.close().catch(()=>{});
}
