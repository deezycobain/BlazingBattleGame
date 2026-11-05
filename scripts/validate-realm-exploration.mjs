import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd(),read=file=>fs.readFile(path.join(root,file),'utf8');
const runtime=await read('runtime/modes/realm-exploration.js');
const configSource=await read('runtime/modes/realm-exploration-config.js');
const post=await read('scripts/realm-exploration-postprocess.mjs');
const buildPost=await read('scripts/postprocess-build.mjs');
const results=await read('runtime/ui/battle/match-results.js');
const guide=await read('docs/JOURNEY_ENVIRONMENT_ASSET_GUIDE.md');
const pkg=JSON.parse(await read('package.json'));
const context={window:{}};vm.runInNewContext(configSource,context,{filename:'realm-exploration-config.js'});
const config=context.window.BlazingJourneyConfig,route=config?.routes?.forest_approach,segments=route?.segments||[];
function need(text,marker,label){if(!text.includes(marker))throw new Error('Journey validation: '+label+' missing '+marker);}
function assert(value,message){if(!value)throw new Error('Journey validation: '+message);}

assert(config?.version===4,'configuration version must be 4');
assert(segments.length===5,'test route must contain five environment segments');
assert(route.worldWidth===segments.reduce((sum,s)=>sum+s.width,0),'worldWidth must equal the contiguous segment widths');
assert(route.courseLength<=route.worldWidth&&route.courseLength>segments.at(-1).x,'courseLength must end inside the final segment');
const roles=new Set(config.layerSchema);
let expectedX=0;
for(const [index,segment] of segments.entries()){
 assert(segment.x===expectedX,`segment ${segment.id} must begin at ${expectedX}`);expectedX+=segment.width;
 assert(segment.id&&segment.theme&&segment.width>=640,`segment ${index+1} identity/theme/width incomplete`);
 assert(Array.isArray(segment.layers)&&segment.layers.length>=6,`${segment.id} needs the complete layer stack`);
 const seen=new Set();
 for(const layer of segment.layers){
  seen.add(layer.role);assert(roles.has(layer.role),`${segment.id}/${layer.id} uses unknown layer role ${layer.role}`);
  for(const key of ['parallax','offsetY','scale','opacity','z'])assert(Number.isFinite(layer[key]),`${segment.id}/${layer.id} missing numeric ${key}`);
  assert(['no-repeat','repeat-x','repeat-y','repeat'].includes(layer.repeat),`${segment.id}/${layer.id} has unsupported repeat mode`);
  if(layer.asset){assert(!path.isAbsolute(layer.asset),`${segment.id}/${layer.id} asset must be repository-relative`);await fs.access(path.join(root,layer.asset));}
  else assert(layer.gradient,`${segment.id}/${layer.id} needs an asset or procedural gradient`);
 }
 for(const role of roles)assert(seen.has(role),`${segment.id} missing ${role} layer`);
 for(const key of ['ground','platforms','gaps','slopes','boundaries','triggers'])assert(Array.isArray(segment.geometry?.[key]),`${segment.id} geometry missing ${key}`);
 assert(Array.isArray(segment.encounters)&&Array.isArray(segment.resources)&&Array.isArray(segment.hazards),`${segment.id} gameplay collections incomplete`);
 assert(segment.transition&&Object.hasOwn(segment.transition,'next'),`${segment.id} transition metadata missing`);
 assert(segment.checkpoint?.id&&Number.isFinite(segment.checkpoint.localX),`${segment.id} checkpoint missing`);
 if(index<segments.length-1)assert(segment.transition.next===segments[index+1].id,`${segment.id} must transition to ${segments[index+1].id}`);
}
assert(route.streaming?.mountRadius===1&&route.streaming?.preloadAhead>=2,'mobile streaming window is not configured');
assert(route.pickups.length===15,'five-segment resource-node coverage incomplete');
assert(segments.some(s=>s.geometry.gaps.some(g=>g.jumpRequired)),'jump-required geometry missing');
assert(segments.some(s=>s.geometry.platforms.length),'raised-platform schema missing');
assert(segments.some(s=>s.geometry.slopes.length),'slope schema missing');
assert(segments.some(s=>s.hazards.length),'hazard schema missing');
assert(segments.some(s=>s.encounters.length),'segment encounter placement missing');

for(const marker of ["const STORAGE_KEY='bb_realm_run_v1'",'const SEGMENTS=ROUTE.segments','function preloadAsset(src)','function mountSegment(index)','function syncStream(camera)','function streamSnapshot()','function renderWorldGeometry()','function surfaceElevation(distance,lane)','function applyTraversalGeometry(prev,next)','function activateCheckpoints(prev,next)','function restoreCheckpoint(','function renderNexus()','function renderRun()','function grantResource(state,reward)','function completeRoute(evt)','function replayRoute()','function applyEncounterToBattle(state,encounter)','function recordBattleVictory(encounter)','function resumeAfterBattle(result,encounter)','window.BlazingRealmExplorer=Object.freeze'])need(runtime,marker,'runtime');
for(const marker of ["<small>COMING SOON</small>","b.disabled=true","b.setAttribute('aria-disabled','true')","b.onclick=null"])need(runtime,marker,'Journey lock');
assert(!runtime.includes('data-i="0"'),'renderer still hard-codes map-specific segment backgrounds');
for(const marker of ["S.bbRunMode=boss?'castle':bbRealmEncounter?'exploration':'road'",'consumePendingEncounter','applyEncounterToBattle',"S.bbRunMode==='exploration'",'recordBattleVictory','realm-exploration-config.js','realm-exploration.js'])need(post,marker,'postprocess');
for(const marker of ['function returnJourney(s,kind)','resumeAfterBattle','SHINOBI JOURNEY','CONTINUE JOURNEY','RETURN TO ROUTE'])need(results,marker,'match results');
for(const marker of ['Layer deliverables','Portrait-first viewport','Maximum texture dimensions','Compression targets','Segment overlap','Naming convention','Directory layout'])need(guide,marker,'artist guide');
need(String(pkg.scripts?.validate||''),'validate-realm-exploration.mjs','package validate');
need(String(pkg.scripts?.build||''),'realm-exploration-postprocess.mjs','package build');
need(String(pkg.scripts?.['smoke:realm']||''),'realm-exploration-browser-smoke.mjs','package Realm smoke');
assert(pkg.version==='0.8.0','package version must be 0.8.0');
need(buildPost,"const GAME_VERSION='v0.8.0'",'build version');
console.log('Journey validation PASS: Journey is locked as Coming Soon while the five-segment environment system, parallax, streaming, geometry, checkpoints, resources, encounters, and battle return remain preserved behind the disabled entry.');
