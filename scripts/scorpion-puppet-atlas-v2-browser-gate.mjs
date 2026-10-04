import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const OUT='docs/validation/scorpion-puppet-atlas-v2';
await fs.mkdir(OUT,{recursive:true});

async function launchBrowser(){
  try{return await chromium.launch({headless:true,channel:'chrome'});}
  catch(channelError){
    try{return await chromium.launch({headless:true});}
    catch(defaultError){
      throw new Error('Could not launch Chrome/Chromium for V2 gate: '+channelError.message+' | '+defaultError.message);
    }
  }
}

const browser=await launchBrowser();
let page;
try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error?.message||error)));
  await page.goto(BASE+'/?scorpionPuppetV2=1',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>typeof window.BlazingScorpionPuppetAtlasV2==='object',null,{timeout:30000});
  await page.waitForFunction(()=>window.BlazingScorpionPuppetAtlasV2.ready||window.BlazingScorpionPuppetAtlasV2.error,null,{timeout:30000});

  const report=await page.evaluate(()=>{
    const api=window.BlazingScorpionPuppetAtlasV2;
    if(!api.ready)throw new Error(api.error||'V2 articulation gate did not become ready');
    const ids=api.poses.map(p=>p.id);
    const jointByPose={elbow:'leftElbow',shoulder:'leftShoulder',knee:'leftKnee'};
    const alphaAround=(surface,boneId,radius=14)=>{
      const matrix=surface.pose?.bones?.[boneId];
      if(!matrix)throw new Error('Missing pose bone '+boneId);
      const cx=Math.round(matrix[4]-surface.bounds.x),cy=Math.round(matrix[5]-surface.bounds.y);
      const ctx=surface.canvas.getContext('2d',{willReadFrequently:true});
      const data=ctx.getImageData(0,0,surface.canvas.width,surface.canvas.height).data;
      let samples=0,opaque=0,strong=0,alphaSum=0;
      for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){
        if(x*x+y*y>radius*radius)continue;
        const px=cx+x,py=cy+y;if(px<0||py<0||px>=surface.canvas.width||py>=surface.canvas.height)continue;
        const alpha=data[(py*surface.canvas.width+px)*4+3];samples++;alphaSum+=alpha;if(alpha>16)opaque++;if(alpha>128)strong++;
      }
      return {boneId,sourcePoint:{x:matrix[4],y:matrix[5]},canvasPoint:{x:cx,y:cy},radius,samples,opaque,strong,opaqueRatio:samples?opaque/samples:0,strongRatio:samples?strong/samples:0,meanAlpha:samples?alphaSum/samples:0};
    };
    const neutralSurface=api.articulationSurface('neutral');
    const articulation={};
    for(const id of ['elbow','shoulder','knee']){
      const surface=api.articulationSurface(id),bone=jointByPose[id];
      const neutral=alphaAround(neutralSurface,bone),posed=alphaAround(surface,bone);
      articulation[id]={bone,neutral,posed,opaqueRetention:neutral.opaque?posed.opaque/neutral.opaque:0,strongRetention:neutral.strong?posed.strong/neutral.strong:0,nativeBounds:surface.bounds};
    }
    return {
      version:api.version,
      ready:api.ready,
      components:api.components.length,
      poses:api.poses,
      neutralDiff:api.neutralDiff,
      articulation,
      note:'Alpha-around-joint metrics are diagnostics only. Final elbow/shoulder/knee acceptance remains a visual inspection gate.'
    };
  });

  if(report.version!=='scorpion-puppet-atlas-v2-articulation-gate')throw new Error('Wrong V2 runtime '+report.version);
  if(report.components!==17)throw new Error('Expected 17 authored V2 pieces, got '+report.components);
  if(JSON.stringify(report.poses.map(p=>p.id))!==JSON.stringify(['neutral','elbow','shoulder','knee']))throw new Error('Unexpected V2 pose surface '+JSON.stringify(report.poses));
  if(!report.neutralDiff?.exact||!report.neutralDiff?.boundsEqual||report.neutralDiff.changedPixels!==0)throw new Error('V2 zero-transform does not exactly match approved V1 neutral: '+JSON.stringify(report.neutralDiff));
  for(const [id,stats] of Object.entries(report.articulation)){
    if(stats.neutral.opaque<=0||stats.posed.opaque<=0)throw new Error(id+' joint lost all opaque coverage: '+JSON.stringify(stats));
  }
  if(pageErrors.length)throw new Error('Browser page errors: '+pageErrors.join(' | '));

  await page.evaluate(()=>window.BlazingScorpionPuppetAtlasV2.openLab());
  await page.locator('#bb-scorpion-puppet-v2-lab').waitFor({state:'visible',timeout:5000});
  await page.locator('#bb-scorpion-puppet-v2-lab').screenshot({path:OUT+'/scorpion-v2-articulation-gate.png'});
  for(const id of ['neutral','elbow','shoulder','knee'])await page.locator(`[data-v2-pose="${id}"]`).screenshot({path:OUT+'/pose-'+id+'.png'});
  await fs.writeFile(OUT+'/gate-report.json',JSON.stringify(report,null,2));
  console.log('Scorpion Puppet Atlas V2 browser gate PASS: exact zero-transform match; 17-piece authored candidate; elbow/shoulder/knee evidence captured. Visual articulation acceptance is still required before Idle/Run.');
  console.log(JSON.stringify(report));
} finally {
  await browser.close().catch(()=>{});
}
