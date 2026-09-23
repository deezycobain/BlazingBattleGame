import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const ids=['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza'];
const names=['Kakashi','Obito','Jiraiya','Sasuke','Pain','Scorpion','Rock Lee','Mashle','Jackie Chan','Gabimaru','Killua','Zabuza'];
const readJson=async rel=>JSON.parse(await fs.readFile(path.join(ROOT,rel),'utf8'));
const exists=async rel=>{try{await fs.access(path.join(ROOT,rel));return true}catch{return false}};
const assetPath=(id,rel)=>String(rel||'').startsWith('assets/')?String(rel):'assets/characters/'+id+'/'+rel;
const stripIds=new Set(['rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza']);
const pngDimensions=async rel=>{
 const data=await fs.readFile(path.join(ROOT,rel));
 if(data.length<24||data.toString('ascii',1,4)!=='PNG')throw new Error('Legacy Shinobi validator: invalid PNG '+rel);
 return {width:data.readUInt32BE(16),height:data.readUInt32BE(20)};
};

const index=await readJson('runtime/registry/unit-index.json');
const indexed=new Set((index.units||[]).map(x=>x.id));
for(const id of ids)if(!indexed.has(id))throw new Error('Legacy Shinobi validator: missing unit-index entry '+id);

for(const id of ids){
 const rel='assets/characters/'+id+'/data/unit.json';
 const unit=await readJson(rel);
 if(unit.id!==id)throw new Error('Legacy Shinobi validator: id mismatch '+id);
 if(!unit.collection?.inventory_visible||!unit.collection?.battle_ready)throw new Error('Legacy Shinobi validator: collection flags invalid '+id);
 if(unit.readiness?.jutsu!==false||unit.assets?.vfx!==null)throw new Error('Legacy Shinobi validator: jutsu/VFX must remain pending '+id);

 for(const kind of ['idle','basic_attack']){
  const source=unit.animation_standard?.source_sheets?.[kind];
  const expectedLayout=stripIds.has(id)?{columns:6,rows:1}:{columns:3,rows:2};
  if(!source||source.columns!==expectedLayout.columns||source.rows!==expectedLayout.rows)throw new Error('Legacy Shinobi validator: '+id+' '+kind+' source-sheet metadata invalid');
  if(!String(source.path||'').startsWith('assets/events/legacy-of-shinobi/'))throw new Error('Legacy Shinobi validator: '+id+' '+kind+' source path not canonical');
  if(!await exists(source.path))throw new Error('Legacy Shinobi validator: missing '+source.path);

  const frames=unit.animation_standard?.animations?.[kind]?.frames;
  if(!Array.isArray(frames)||frames.length!==6)throw new Error('Legacy Shinobi validator: '+id+' '+kind+' runtime frame list invalid');
  for(const frame of frames){
   const framePath=assetPath(id,frame);
   if(!await exists(framePath))throw new Error('Legacy Shinobi validator: missing runtime frame '+framePath);
   const {width,height}=await pngDimensions(framePath);
   if(!(width>0&&height>0&&width<height))throw new Error('Legacy Shinobi validator: '+id+' '+kind+' frame must be one portrait pose, got '+width+'x'+height+' at '+framePath);
  }
 }

 const art=assetPath(id,unit.assets?.art);
 if(!unit.assets?.art||!await exists(art))throw new Error('Legacy Shinobi validator: missing card art for '+id);
}

const progression=await fs.readFile(path.join(ROOT,'runtime/ui/progression/progression.js'),'utf8');
for(const name of names)if(!progression.includes("'"+name+"'"))throw new Error('Legacy Shinobi validator: summon pool missing '+name);
for(const marker of ['LEGACY_FIGHTERS','SUMMON_FIGHTERS=LEGACY_FIGHTERS','LEGACY OF THE','12 UNIT EVENT POOL'])if(!progression.includes(marker))throw new Error('Legacy Shinobi validator: progression marker missing '+marker);

const home=await fs.readFile(path.join(ROOT,'runtime/ui/home/home-v9-runtime.js'),'utf8');
for(const marker of ['bb-home-v9-legacy-banner','LEGACY OF THE SHINOBI','12 NEW FIGHTERS'])if(!home.includes(marker))throw new Error('Legacy Shinobi validator: Home marker missing '+marker);
const escaped=String.fromCharCode(92)+'$'+'{';
if(home.includes(escaped+'SHELL_ID}')||home.includes(escaped+'FONT}'))throw new Error('Legacy Shinobi validator: escaped Home CSS template placeholder survived');

const adapter=await fs.readFile(path.join(ROOT,'scripts/legacy-shinobi-postprocess.mjs'),'utf8');
for(const marker of ['LEGACY_SHINOBI_BODY_RUNTIME',...ids,...names])if(!adapter.includes(marker))throw new Error('Legacy Shinobi validator: battle adapter missing '+marker);

console.log('Legacy Shinobi PASS: 12 canonical units, card art, portrait-normalized six-frame idle/basic runtime frames, source-sheet layouts, Home banner, summon pool, and battle adapter validated.');
