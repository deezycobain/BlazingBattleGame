import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const ids=['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza'];
const names=['Kakashi','Obito','Jiraiya','Sasuke','Pain','Scorpion','Rock Lee','Mashle','Jackie Chan','Gabimaru','Killua','Zabuza'];
const readJson=async rel=>JSON.parse(await fs.readFile(path.join(ROOT,rel),'utf8'));
const exists=async rel=>{try{await fs.access(path.join(ROOT,rel));return true}catch{return false}};
const index=await readJson('runtime/registry/unit-index.json');
const indexed=new Set((index.units||[]).map(x=>x.id));
for(const id of ids)if(!indexed.has(id))throw new Error('Legacy Shinobi validator: missing unit-index entry '+id);

for(const id of ids){
 const rel='assets/characters/'+id+'/data/unit.json';
 const unit=await readJson(rel);
 if(unit.id!==id)throw new Error('Legacy Shinobi validator: id mismatch '+id);
 if(!unit.collection?.inventory_visible||!unit.collection?.battle_ready)throw new Error('Legacy Shinobi validator: collection flags invalid '+id);
 if(unit.readiness?.jutsu!==false||unit.readiness?.vfx!==false)throw new Error('Legacy Shinobi validator: jutsu/VFX must remain pending '+id);
 for(const kind of ['idle','basic_attack']){
  const spec=unit.animation_standard?.animations?.[kind]?.source_sheet;
  if(!spec||spec.columns!==3||spec.rows!==2||spec.frame_count!==6)throw new Error('Legacy Shinobi validator: '+id+' '+kind+' sheet metadata invalid');
  if(!String(spec.path||'').startsWith('assets/events/legacy-of-shinobi/'))throw new Error('Legacy Shinobi validator: '+id+' '+kind+' path not canonical');
  if(!await exists(spec.path))throw new Error('Legacy Shinobi validator: missing '+spec.path);
 }
 const art=unit.assets?.art;
 if(!art||!await exists(art))throw new Error('Legacy Shinobi validator: missing card art for '+id);
}
const progression=await fs.readFile(path.join(ROOT,'runtime/ui/progression/progression.js'),'utf8');
for(const name of names)if(!progression.includes("'"+name+"'"))throw new Error('Legacy Shinobi validator: summon pool missing '+name);
for(const marker of ['LEGACY_FIGHTERS','SUMMON_FIGHTERS=LEGACY_FIGHTERS','LEGACY OF THE','12 UNIT EVENT POOL'])if(!progression.includes(marker))throw new Error('Legacy Shinobi validator: progression marker missing '+marker);
const home=await fs.readFile(path.join(ROOT,'runtime/ui/home/home-v9-runtime.js'),'utf8');
for(const marker of ['bb-home-v9-legacy-banner','LEGACY OF THE SHINOBI','12 NEW FIGHTERS'])if(!home.includes(marker))throw new Error('Legacy Shinobi validator: Home marker missing '+marker);
const adapter=await fs.readFile(path.join(ROOT,'scripts/legacy-shinobi-postprocess.mjs'),'utf8');
for(const marker of ['LEGACY_SHINOBI_BODY_RUNTIME',...ids,...names])if(!adapter.includes(marker))throw new Error('Legacy Shinobi validator: battle adapter missing '+marker);
console.log('Legacy Shinobi PASS: 12 canonical units, card art, six-frame idle/basic sources, Home banner, summon pool, and battle adapter validated.');
