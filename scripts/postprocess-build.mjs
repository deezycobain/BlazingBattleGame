import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const file=path.join(ROOT,'dist','index.html');
let html=await fs.readFile(file,'utf8');
const branch=process.env.WORKERS_CI_BRANCH||process.env.BB_BRANCH||'local';
const commit=process.env.WORKERS_CI_COMMIT_SHA||'local';
const isProduction=branch==='main';
const GAME_VERSION='v0.7.0';
const readJson=async p=>JSON.parse(await fs.readFile(path.join(ROOT,p),'utf8'));
const replaceRequired=(oldText,newText,label)=>{if(!html.includes(oldText))throw new Error(`Postprocess anchor missing: ${label}`);html=html.replace(oldText,newText);};

const versionRx=/Blazing Battle v\d+\.\d+\.\d+ MOBILE/g;
if(!versionRx.test(html))throw new Error('Postprocess: visible game version label not found');
html=html.replace(versionRx,`Blazing Battle ${GAME_VERSION} MOBILE`);

const unitIndex=await readJson('runtime/registry/unit-index.json');
const unitTag=/(<script id="blazing-unit-data">window\.BLAZING_UNIT_DATA=)(\{.*?\})(;<\/script>)/s;
const match=html.match(unitTag);if(!match)throw new Error('Postprocess: embedded unit data tag missing');
const embedded=JSON.parse(match[2]);
for(const entry of unitIndex.units||[]){const unit=await readJson(entry.path);if(unit.id!==entry.id)throw new Error(`Postprocess: unit id mismatch for ${entry.path}`);embedded[entry.id]=unit;}
html=html.replace(unitTag,(_,a,_json,c)=>a+JSON.stringify(embedded)+c);
console.log(`Canonical unit sync applied: ${(unitIndex.units||[]).map(x=>x.id).join(', ')}`);

// Future-proof character details foundation. The screen consumes only canonical unit data;
// adding a unit to unit-index automatically makes it compatible with this UI contract.
const detailsCss=await fs.readFile(path.join(ROOT,'runtime/ui/unit-details.css'),'utf8');
const detailsVm=await fs.readFile(path.join(ROOT,'runtime/ui/unit-details.js'),'utf8');
const detailsScreen=await fs.readFile(path.join(ROOT,'runtime/ui/unit-details-screen.js'),'utf8');
html=html.replace(/<\/head>/i,`<style id="bb-unit-details-style">${detailsCss}</style></head>`);
html=html.replace(/<\/body>/i,`<script id="bb-unit-details-model">${detailsVm}</script><script id="bb-unit-details-screen">${detailsScreen}</script></body>`);
console.log('Generic unit-details model + Overview/Stats/Abilities screen registered');

// Preserve the approved character animation presentation work.
const subzeroBasic=embedded.subzero?.animation_standard?.animations?.basic_attack;
const subzeroSheet=subzeroBasic?.source_sheet;
if(!subzeroSheet?.path||subzeroSheet.columns!==3||subzeroSheet.rows!==2||subzeroSheet.frame_count!==6)throw new Error('Postprocess: Sub-Zero Basic Attack v2 sheet metadata is invalid');
const subzeroSheetPath=path.posix.join('assets/characters/subzero',subzeroSheet.path);
const senkuRetreatSourcePath='assets/characters/senku/sprites/source/retreat_run/source_sheet.webp';
const attackFrameAnchor="function unitAttackFrames(name,kind){\n  if(name==='Senku'&&kind==='allyHealCast')return SENKU_CHEM_CAST_FRAMES||[];\n  const attackMap=CHARACTER_ANIMATION_MAPS[name]?.attack||{};\n  let unitData=null;\n  try{unitData=canonicalUnit(name)}catch(_){}\n  return window.BlazingAttackPresentation.resolveFrames(unitData,kind,attackMap);\n}";
const tunedAttackRuntime=`const SUBZERO_BASIC_ATTACK_RUNTIME=(()=>{
   const cfg=${JSON.stringify({path:subzeroSheetPath,columns:subzeroSheet.columns,rows:subzeroSheet.rows,frameWidth:subzeroSheet.frame_width,frameHeight:subzeroSheet.frame_height,frameCount:subzeroSheet.frame_count,visualScale:1.12})};
   const frames=Array.from({length:cfg.frameCount},()=>new Image());const state={frames,ready:false,loaded:0};const sheet=new Image();
   sheet.addEventListener('load',()=>{try{for(let i=0;i<cfg.frameCount;i++){const sx=(i%cfg.columns)*cfg.frameWidth,sy=Math.floor(i/cfg.columns)*cfg.frameHeight;const canvas=document.createElement('canvas');canvas.width=cfg.frameWidth;canvas.height=cfg.frameHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,cfg.frameWidth,cfg.frameHeight);ctx.drawImage(sheet,sx,sy,cfg.frameWidth,cfg.frameHeight,0,0,cfg.frameWidth,cfg.frameHeight);const pixels=ctx.getImageData(0,0,cfg.frameWidth,cfg.frameHeight),data=pixels.data;let minX=cfg.frameWidth,minY=cfg.frameHeight,maxX=-1,maxY=-1;for(let p=0;p<data.length;p+=4){const r=data[p],g=data[p+1],b=data[p+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);if(lo>235&&hi-lo<12)data[p+3]=0;if(data[p+3]>8){const px=(p/4)%cfg.frameWidth,py=Math.floor((p/4)/cfg.frameWidth);if(px<minX)minX=px;if(px>maxX)maxX=px;if(py<minY)minY=py;if(py>maxY)maxY=py;}}ctx.putImageData(pixels,0,0);const normalized=document.createElement('canvas');normalized.width=cfg.frameWidth;normalized.height=cfg.frameHeight;const nctx=normalized.getContext('2d');if(maxX>=minX&&maxY>=minY){const bw=maxX-minX+1,bh=maxY-minY+1;const safeScale=Math.min(cfg.visualScale,(cfg.frameWidth*.96)/bw,(cfg.frameHeight*.96)/bh);const drawW=cfg.frameWidth*safeScale,drawH=cfg.frameHeight*safeScale;const bboxCenterX=(minX+maxX+1)/2;const dx=cfg.frameWidth/2-bboxCenterX*safeScale;const dy=cfg.frameHeight*.96-(maxY+1)*safeScale;nctx.drawImage(canvas,0,0,cfg.frameWidth,cfg.frameHeight,dx,dy,drawW,drawH);}else nctx.drawImage(canvas,0,0);const frame=frames[i];frame.addEventListener('load',()=>{state.loaded++;if(state.loaded===cfg.frameCount)state.ready=true;},{once:true});frame.src=normalized.toDataURL('image/png');}}catch(err){console.error('Sub-Zero Basic Attack sheet processing failed:',err);}});sheet.src=cfg.path;return state;
 })();
 const SENKU_RETREAT_TUNED_RUNTIME=(()=>{const cfg={path:${JSON.stringify(senkuRetreatSourcePath)},columns:3,rows:2,frameCount:6,canvasSize:420};const frames=Array.from({length:cfg.frameCount},()=>new Image());const state={frames,ready:false,loaded:0};const sheet=new Image();sheet.addEventListener('load',()=>{try{const cellW=sheet.naturalWidth/cfg.columns,cellH=sheet.naturalHeight/cfg.rows;for(let index=0;index<cfg.frameCount;index++){const sx=(index%cfg.columns)*cellW,sy=Math.floor(index/cfg.columns)*cellH;const cell=document.createElement('canvas');cell.width=Math.round(cellW);cell.height=Math.round(cellH);const cctx=cell.getContext('2d',{willReadFrequently:true});cctx.drawImage(sheet,sx,sy,cellW,cellH,0,0,cell.width,cell.height);const pixels=cctx.getImageData(0,0,cell.width,cell.height),data=pixels.data;let minX=cell.width,minY=cell.height,maxX=-1,maxY=-1;for(let p=0;p<data.length;p+=4){const r=data[p],g=data[p+1],b=data[p+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);if(lo>232&&hi-lo<18)data[p+3]=0;if(data[p+3]>8){const px=(p/4)%cell.width,py=Math.floor((p/4)/cell.width);if(px<minX)minX=px;if(px>maxX)maxX=px;if(py<minY)minY=py;if(py>maxY)maxY=py;}}cctx.putImageData(pixels,0,0);const out=document.createElement('canvas');out.width=cfg.canvasSize;out.height=cfg.canvasSize;const octx=out.getContext('2d');if(maxX>=minX&&maxY>=minY){const padX=Math.max(12,Math.round((maxX-minX+1)*.035)),padY=Math.max(16,Math.round((maxY-minY+1)*.045));const cropX=Math.max(0,minX-padX),cropY=Math.max(0,minY-padY),cropR=Math.min(cell.width,maxX+1+padX),cropB=Math.min(cell.height,maxY+1+padY),bw=cropR-cropX,bh=cropB-cropY,scale=Math.min((cfg.canvasSize*.82)/bw,(cfg.canvasSize*.68)/bh),dw=bw*scale,dh=bh*scale;octx.drawImage(cell,cropX,cropY,bw,bh,(cfg.canvasSize-dw)/2,cfg.canvasSize*.90-dh,dw,dh);}const frame=frames[index];frame.addEventListener('load',()=>{state.loaded++;if(state.loaded===cfg.frameCount)state.ready=true;},{once:true});frame.src=out.toDataURL('image/png');}}catch(err){console.error('Senku retreat rebuild failed:',err);}});sheet.src=cfg.path;return state;})();
 function unitAttackFrames(name,kind){if(name==='Senku'&&kind==='allyHealCast')return SENKU_CHEM_CAST_FRAMES||[];if(name==='Senku'&&kind==='retreat_run'&&SENKU_RETREAT_TUNED_RUNTIME.ready)return SENKU_RETREAT_TUNED_RUNTIME.frames;if(name==='Sub-Zero'&&(kind==='basic'||kind==='normal'||kind==='attack'||kind==='punch')&&SUBZERO_BASIC_ATTACK_RUNTIME.ready)return SUBZERO_BASIC_ATTACK_RUNTIME.frames;const attackMap=CHARACTER_ANIMATION_MAPS[name]?.attack||{};let unitData=null;try{unitData=canonicalUnit(name)}catch(_){}return window.BlazingAttackPresentation.resolveFrames(unitData,kind,attackMap);}`;
replaceRequired(attackFrameAnchor,tunedAttackRuntime,'character presentation-normalized runtime frames');

replaceRequired("const DEFAULT_ACTIVE_TEAM=Object.freeze(['Crimson','Lebee','Sub-Zero']);","const DEFAULT_ACTIVE_TEAM=Object.freeze(['Senku','Lebee','Sub-Zero']);",'default active team');
replaceRequired("const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v1';","const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v2';",'active team storage version');
replaceRequired('<div class="teamActions">\n      <button id="saveTeamBtn" class="saveTeamBtn">SAVE ACTIVE TEAM</button>\n      <div id="teamSaved" class="teamSaved" aria-live="polite"></div>\n    </div>','<div class="teamActions">\n      <div id="teamSaved" class="teamSaved" aria-live="polite"></div>\n      <button id="saveTeamBtn" class="saveTeamBtn">SAVE ACTIVE TEAM</button>\n    </div>','team save confirmation placement');
const teamUiStyle=`<style id="bb-team-mobile-fit">#teamScreen .teamActions{display:flex;flex-direction:column;gap:8px;padding-bottom:max(12px,env(safe-area-inset-bottom));}#teamScreen #teamSaved{order:0;min-height:20px;margin:0;text-align:center;line-height:1.3;font-size:11px;font-weight:800;color:#85f0a5;}#teamScreen #saveTeamBtn{order:1;flex:0 0 auto;}@media(max-width:700px){#teamScreen .teamBody{padding-bottom:calc(18px + env(safe-area-inset-bottom));}#teamScreen .teamActions{position:relative;z-index:2;}}</style>`;
html=html.replace(/<\/head>/i,`${teamUiStyle}</head>`);

const meta=`<script>window.BB_BUILD_META=Object.freeze({version:${JSON.stringify('v0.7.0')},branch:${JSON.stringify(branch)},commit:${JSON.stringify(commit)},environment:${JSON.stringify(isProduction?'production':'preview')},canonicalRuntime:true});<\/script>`;
html=html.replace(/<head([^>]*)>/i,`<head$1>${meta}`);
if(!isProduction){const spawnRx=/function teamSpawnOptions\(name\)\{.*?\n\}/s;if(!spawnRx.test(html))throw new Error('Dev postprocess: teamSpawnOptions anchor missing');html=html.replace(spawnRx,"function teamSpawnOptions(name){\n return {startingChakra:'full'};\n}");const speedAnchor="mark:d.combat.mark,speed:d.stats.speed,attack:d.stats.attack,defense:d.stats.defense,";if(!html.includes(speedAnchor))throw new Error('Dev postprocess: runtime speed anchor missing');html=html.replace(speedAnchor,"mark:d.combat.mark,speed:(d.role==='playable'?200:(d.role==='boss'?50:d.stats.speed)),attack:d.stats.attack,defense:d.stats.defense,");const bossAnchor="speed:canonicalUnit('anubis').stats.speed,attack:canonicalUnit('anubis').stats.attack";if(html.includes(bossAnchor))html=html.replace(bossAnchor,"speed:50,attack:canonicalUnit('anubis').stats.attack");const devConfig=`<script>window.BB_DEV_CONFIG=Object.freeze({enabled:true,startPlayableAtMaxChakra:true,playerSpeed:200,bossSpeed:50});<\/script>`;html=html.replace(/<head([^>]*)>/i,`<head$1>${devConfig}</head>`.replace('</head></head>','</head>'));}
await fs.writeFile(file,html);
console.log(`Build metadata embedded: version=${GAME_VERSION} branch=${branch} commit=${commit.slice(0,12)}`);
