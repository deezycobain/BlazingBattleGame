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
const replaceRequired=(oldText,newText,label)=>{
  if(!html.includes(oldText))throw new Error(`Postprocess anchor missing: ${label}`);
  html=html.replace(oldText,newText);
};

// Keep the visible build label synchronized with the promoted baseline rather than
// leaking a stale legacy version string from the historical monolithic index.
const versionRx=/Blazing Battle v\d+\.\d+\.\d+ MOBILE/g;
if(!versionRx.test(html))throw new Error('Postprocess: visible game version label not found');
html=html.replace(versionRx,`Blazing Battle ${GAME_VERSION} MOBILE`);
console.log(`Visible game version synchronized: ${GAME_VERSION}`);

const unitIndex=await readJson('runtime/registry/unit-index.json');
const unitTag=/(<script id="blazing-unit-data">window\.BLAZING_UNIT_DATA=)(\{.*?\})(;<\/script>)/s;
const match=html.match(unitTag);
if(!match)throw new Error('Postprocess: embedded unit data tag missing');
const embedded=JSON.parse(match[2]);
for(const entry of unitIndex.units||[]){
  const unit=await readJson(entry.path);
  if(unit.id!==entry.id)throw new Error(`Postprocess: unit id mismatch for ${entry.path}`);
  embedded[entry.id]=unit;
}
html=html.replace(unitTag,(_,a,_json,c)=>a+JSON.stringify(embedded)+c);
console.log(`Canonical unit sync applied: ${(unitIndex.units||[]).map(x=>x.id).join(', ')}`);

// Sub-Zero Basic Attack v2: the approved Drive/GitHub upload is a 3x2 source sheet.
// Build-time wiring keeps the source sheet canonical while the browser derives six
// transparent canvas frames at load time. The old two frame files remain a fallback
// until this preview has passed mobile validation.
const subzeroBasic=embedded.subzero?.animation_standard?.animations?.basic_attack;
const subzeroSheet=subzeroBasic?.source_sheet;
if(!subzeroSheet?.path||subzeroSheet.columns!==3||subzeroSheet.rows!==2||subzeroSheet.frame_count!==6){
  throw new Error('Postprocess: Sub-Zero Basic Attack v2 sheet metadata is invalid');
}
const subzeroSheetPath=path.posix.join('assets/characters/subzero',subzeroSheet.path);
const attackFrameAnchor="function unitAttackFrames(name,kind){\n  if(name==='Senku'&&kind==='allyHealCast')return SENKU_CHEM_CAST_FRAMES||[];\n  return CHARACTER_ANIMATION_MAPS[name]?.attack?.[kind]||[];\n}";
const subzeroAttackRuntime=`const SUBZERO_BASIC_ATTACK_RUNTIME=(()=>{
 const cfg=${JSON.stringify({
   path:subzeroSheetPath,
   columns:subzeroSheet.columns,
   rows:subzeroSheet.rows,
   frameWidth:subzeroSheet.frame_width,
   frameHeight:subzeroSheet.frame_height,
   frameCount:subzeroSheet.frame_count
 })};
 const frames=Array.from({length:cfg.frameCount},()=>{const c=document.createElement('canvas');c.width=cfg.frameWidth;c.height=cfg.frameHeight;return c;});
 const state={frames,ready:false};
 const sheet=new Image();
 sheet.addEventListener('load',()=>{
  try{
   for(let i=0;i<cfg.frameCount;i++){
    const sx=(i%cfg.columns)*cfg.frameWidth,sy=Math.floor(i/cfg.columns)*cfg.frameHeight;
    const canvas=frames[i],ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.clearRect(0,0,cfg.frameWidth,cfg.frameHeight);
    ctx.drawImage(sheet,sx,sy,cfg.frameWidth,cfg.frameHeight,0,0,cfg.frameWidth,cfg.frameHeight);
    const pixels=ctx.getImageData(0,0,cfg.frameWidth,cfg.frameHeight),data=pixels.data;
    for(let p=0;p<data.length;p+=4){
     const r=data[p],g=data[p+1],b=data[p+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
     if(lo>235&&hi-lo<12)data[p+3]=0;
    }
    ctx.putImageData(pixels,0,0);
   }
   state.ready=true;
  }catch(err){console.error('Sub-Zero Basic Attack sheet processing failed:',err);}
 });
 sheet.addEventListener('error',()=>console.error('Sub-Zero Basic Attack sheet failed to load:',cfg.path));
 sheet.src=cfg.path;
 return state;
})();
function unitAttackFrames(name,kind){
  if(name==='Senku'&&kind==='allyHealCast')return SENKU_CHEM_CAST_FRAMES||[];
  if(name==='Sub-Zero'&&(kind==='basic'||kind==='normal'||kind==='attack')&&SUBZERO_BASIC_ATTACK_RUNTIME.ready)return SUBZERO_BASIC_ATTACK_RUNTIME.frames;
  return CHARACTER_ANIMATION_MAPS[name]?.attack?.[kind]||[];
}`;
replaceRequired(attackFrameAnchor,subzeroAttackRuntime,'Sub-Zero Basic Attack v2 runtime frames');
console.log(`Sub-Zero Basic Attack v2 sheet wired: ${subzeroSheetPath}`);

replaceRequired(
  "const DEFAULT_ACTIVE_TEAM=Object.freeze(['Crimson','Lebee','Sub-Zero']);",
  "const DEFAULT_ACTIVE_TEAM=Object.freeze(['Senku','Lebee','Sub-Zero']);",
  'default active team'
);
replaceRequired(
  "const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v1';",
  "const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v2';",
  'active team storage version'
);

replaceRequired(
  '<div class="teamActions">\n      <button id="saveTeamBtn" class="saveTeamBtn">SAVE ACTIVE TEAM</button>\n      <div id="teamSaved" class="teamSaved" aria-live="polite"></div>\n    </div>',
  '<div class="teamActions">\n      <div id="teamSaved" class="teamSaved" aria-live="polite"></div>\n      <button id="saveTeamBtn" class="saveTeamBtn">SAVE ACTIVE TEAM</button>\n    </div>',
  'team save confirmation placement'
);
const teamUiStyle=`<style id="bb-team-mobile-fit">
#teamScreen .teamActions{display:flex;flex-direction:column;gap:8px;padding-bottom:max(12px,env(safe-area-inset-bottom));}
#teamScreen #teamSaved{order:0;min-height:20px;margin:0;text-align:center;line-height:1.3;font-size:11px;font-weight:800;color:#85f0a5;}
#teamScreen #saveTeamBtn{order:1;flex:0 0 auto;}
@media(max-width:700px){#teamScreen .teamBody{padding-bottom:calc(18px + env(safe-area-inset-bottom));}#teamScreen .teamActions{position:relative;z-index:2;}}
</style>`;
html=html.replace(/<\/head>/i,`${teamUiStyle}</head>`);
console.log('Base team updated to Senku/Lebee/Sub-Zero; team-save feedback moved above button');

const meta=`<script>window.BB_BUILD_META=Object.freeze({version:${JSON.stringify('v0.7.0')},branch:${JSON.stringify(branch)},commit:${JSON.stringify(commit)},environment:${JSON.stringify(isProduction?'production':'preview')},canonicalRuntime:true});<\/script>`;
html=html.replace(/<head([^>]*)>/i,`<head$1>${meta}`);

if(!isProduction){
  const spawnRx=/function teamSpawnOptions\(name\)\{.*?\n\}/s;
  if(!spawnRx.test(html))throw new Error('Dev postprocess: teamSpawnOptions anchor missing');
  html=html.replace(spawnRx,"function teamSpawnOptions(name){\n // Preview/dev only: all playable units start at max chakra.\n return {startingChakra:'full'};\n}");

  const speedAnchor="mark:d.combat.mark,speed:d.stats.speed,attack:d.stats.attack,defense:d.stats.defense,";
  if(!html.includes(speedAnchor))throw new Error('Dev postprocess: runtime speed anchor missing');
  html=html.replace(speedAnchor,"mark:d.combat.mark,speed:(d.role==='playable'?200:(d.role==='boss'?50:d.stats.speed)),attack:d.stats.attack,defense:d.stats.defense,");

  const bossAnchor="speed:canonicalUnit('anubis').stats.speed,attack:canonicalUnit('anubis').stats.attack";
  if(html.includes(bossAnchor))html=html.replace(bossAnchor,"speed:50,attack:canonicalUnit('anubis').stats.attack");

  const devConfig=`<script>window.BB_DEV_CONFIG=Object.freeze({enabled:true,startPlayableAtMaxChakra:true,playerSpeed:200,bossSpeed:50});<\/script>`;
  html=html.replace(/<head([^>]*)>/i,`<head$1>${devConfig}`);
  console.log(`Preview overrides applied for ${branch}: playable chakra=max, player speed=200, boss speed=50`);
}else{
  console.log('Production build: canonical unit starts/speeds only; no dev combat overrides');
}

await fs.writeFile(file,html);
console.log(`Build metadata embedded: version=${GAME_VERSION} branch=${branch} commit=${commit.slice(0,12)}`);
