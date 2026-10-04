import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const OUT='docs/validation/puppet-atlas-v2';
await fs.mkdir(OUT,{recursive:true});
async function launchBrowser(){try{return await chromium.launch({headless:true,channel:'chrome',timeout:30000});}catch(channelError){try{return await chromium.launch({headless:true,timeout:30000});}catch(defaultError){throw new Error('Could not launch Chrome/Chromium for V2 gate: '+channelError.message+' | '+defaultError.message);}}}

let browser;
try{
 browser=await launchBrowser();
 const context=await browser.newContext({viewport:{width:980,height:900}});
 await context.addInitScript(()=>localStorage.setItem('bb.scorpion-puppet-atlas.dev','1'));
 const page=await context.newPage();page.setDefaultTimeout(30000);const pageErrors=[];page.on('pageerror',error=>pageErrors.push(String(error?.message||error)));
 await page.goto(BASE+'/?scorpionPuppetV2=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.BlazingScorpionPuppetAtlasV2==='object',null,{timeout:30000});
 await page.waitForFunction(()=>window.BlazingScorpionPuppetAtlasV2.ready||window.BlazingScorpionPuppetAtlasV2.error,null,{timeout:30000});
 const load=await page.evaluate(()=>({ready:window.BlazingScorpionPuppetAtlasV2.ready,error:window.BlazingScorpionPuppetAtlasV2.error}));
 if(!load.ready)throw new Error('V2 candidate failed to load: '+load.error);

 await page.evaluate(()=>window.BlazingScorpionPuppetAtlasV2.openLab());
 await page.locator('#bb-scorpion-puppet-v2-lab').waitFor({state:'visible'});
 const selectors={master:'[data-master-preview]',neutral:'[data-v2-pose="neutral"]',elbow:'[data-v2-pose="elbow"]',shoulder:'[data-v2-pose="shoulder"]',knee:'[data-v2-pose="knee"]'};
 for(const [name,selector] of Object.entries(selectors)){const canvas=page.locator(selector);await canvas.waitFor({state:'visible'});await canvas.screenshot({path:OUT+'/'+name+'.png'});}
 await page.locator('#bb-scorpion-puppet-v2-lab').screenshot({path:OUT+'/articulation-gate-full.png'});

 await page.waitForFunction(()=>typeof window.BlazingScorpionPuppetAtlasV2Motion==='object',null,{timeout:30000});
 await page.waitForFunction(()=>window.BlazingScorpionPuppetAtlasV2Motion.ready||window.BlazingScorpionPuppetAtlasV2Motion.error,null,{timeout:30000});
 const motionLoad=await page.evaluate(()=>({ready:window.BlazingScorpionPuppetAtlasV2Motion.ready,error:window.BlazingScorpionPuppetAtlasV2Motion.error}));
 if(!motionLoad.ready)throw new Error('V2 skeletal motion preview failed to load: '+motionLoad.error);
 await page.evaluate(()=>window.BlazingScorpionPuppetAtlasV2Motion.openLab());
 await page.locator('#bb-scorpion-puppet-v2-motion-lab').waitFor({state:'visible'});
 for(const id of ['idle','run']){const canvas=page.locator(`[data-v2-motion="${id}"]`);await canvas.waitFor({state:'visible'});await page.waitForTimeout(250);await canvas.screenshot({path:OUT+'/motion-'+id+'.png'});}
 await page.locator('#bb-scorpion-puppet-v2-motion-lab').screenshot({path:OUT+'/motion-preview-full.png'});

 const report=await page.evaluate(()=>{
  const api=window.BlazingScorpionPuppetAtlasV2,motionApi=window.BlazingScorpionPuppetAtlasV2Motion,jointByPose={elbow:'leftElbow',shoulder:'leftShoulder',knee:'leftKnee'};
  const alphaAround=(surface,boneId,radius=14)=>{
   const matrix=surface.pose?.bones?.[boneId];if(!matrix)throw new Error('Missing pose bone '+boneId);
   const cx=Math.round(matrix[4]-surface.bounds.x),cy=Math.round(matrix[5]-surface.bounds.y),ctx=surface.canvas.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,surface.canvas.width,surface.canvas.height).data;
   let samples=0,opaque=0,strong=0,alphaSum=0;
   for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){if(x*x+y*y>radius*radius)continue;const px=cx+x,py=cy+y;if(px<0||py<0||px>=surface.canvas.width||py>=surface.canvas.height)continue;const alpha=data[(py*surface.canvas.width+px)*4+3];samples++;alphaSum+=alpha;if(alpha>16)opaque++;if(alpha>128)strong++;}
   return {boneId,sourcePoint:{x:matrix[4],y:matrix[5]},canvasPoint:{x:cx,y:cy},radius,samples,opaque,strong,opaqueRatio:samples?opaque/samples:0,strongRatio:samples?strong/samples:0,meanAlpha:samples?alphaSum/samples:0};
  };
  const neutralSurface=api.articulationSurface('neutral'),articulation={};
  for(const id of ['elbow','shoulder','knee']){const surface=api.articulationSurface(id),bone=jointByPose[id],neutral=alphaAround(neutralSurface,bone),posed=alphaAround(surface,bone);articulation[id]={bone,neutral,posed,opaqueRetention:neutral.opaque?posed.opaque/neutral.opaque:0,strongRetention:neutral.strong?posed.strong/neutral.strong:0,nativeBounds:surface.bounds};}
  const motion={version:motionApi.version,motions:motionApi.motions,frames:{}};
  for(const descriptor of motionApi.motions){motion.frames[descriptor.id]=[];for(let frame=0;frame<descriptor.frames;frame++){const surface=motionApi.frameSurface(descriptor.id,frame),data=surface.canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,surface.canvas.width,surface.canvas.height).data;let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i]>16)opaque++;motion.frames[descriptor.id].push({frame,bounds:surface.bounds,opaque});}}
  return {version:api.version,ready:api.ready,error:api.error,componentCount:api.components.length,poses:api.poses,neutralDiff:api.neutralDiff,authoring:api.authoring,slots:api.components.map(c=>c.slot),articulation,motion,note:'Articulation and skeletal motion metrics are diagnostics only. Final visual acceptance remains required before production wiring.'};
 });
 await fs.writeFile(OUT+'/result.json',JSON.stringify(report,null,2));
 if(report.componentCount!==15)throw new Error('Expected 15 canonical V2 components, got '+report.componentCount);
 if(report.poses.map(p=>p.id).join(',')!=='neutral,elbow,shoulder,knee')throw new Error('Unexpected articulation gate poses '+JSON.stringify(report.poses));
 if(report.authoring?.automaticAlphaIslandMapping!==false||report.authoring?.authoringMode!=='manual-canonical-source-rects-v2'||report.authoring?.sourceSheetApproved!==true)throw new Error('V2 authoring contract drift: '+JSON.stringify(report.authoring));
 if(!report.neutralDiff?.accepted||!report.neutralDiff?.boundsEqual||report.neutralDiff.silhouetteMismatch!==0||report.neutralDiff.referenceOpaque!==report.neutralDiff.candidateOpaque||report.neutralDiff.maxChannelDelta>4||report.neutralDiff.changedRatio>0.02)throw new Error('V2 zero-transform is outside the authored neutral reference tolerance: '+JSON.stringify(report.neutralDiff));
 for(const [id,stats] of Object.entries(report.articulation)){if(stats.neutral.opaque<=0||stats.posed.opaque<=0)throw new Error(id+' joint lost all opaque coverage: '+JSON.stringify(stats));if(stats.opaqueRetention<0.65)throw new Error(id+' joint coverage retention too low: '+JSON.stringify(stats));}
 if(report.motion?.version!=='scorpion-puppet-atlas-v2-motion-preview'||report.motion.motions.map(m=>m.id).join(',')!=='idle,run'||report.motion.motions.some(m=>m.frames!==12))throw new Error('Unexpected V2 skeletal motion surface '+JSON.stringify(report.motion?.motions));
 for(const [id,frames] of Object.entries(report.motion.frames))for(const frame of frames){const b=frame.bounds;if(!Number.isFinite(b.x)||!Number.isFinite(b.y)||b.w<=0||b.h<=0||b.w>650||b.h>980||frame.opaque<100000)throw new Error(id+' skeletal frame failed native integrity: '+JSON.stringify(frame));}
 if(pageErrors.length)throw new Error('pageerror: '+pageErrors.join(' | '));
 console.log('Scorpion Puppet Atlas V2 browser gate PASS: authored neutral match; 15 canonical pieces; articulation gate intact; 12-sample skeletal Idle and Run previews render without native-bound failure. Visual motion acceptance is still required before production wiring.');
 console.log(JSON.stringify(report));
} finally {if(browser)await browser.close().catch(()=>{});}