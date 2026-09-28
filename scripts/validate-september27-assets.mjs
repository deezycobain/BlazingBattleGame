import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const fail=message=>{throw new Error('September 27 asset validation: '+message)};
const readJson=async rel=>JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));
const pngSize=async rel=>{
 const data=await fs.readFile(path.join(root,rel));
 if(data.toString('ascii',1,4)!=='PNG')fail('invalid PNG '+rel);
 return [data.readUInt32BE(16),data.readUInt32BE(20)];
};
const countFrames=async rel=>(await fs.readdir(path.join(root,rel))).filter(name=>/^frame_\d+\.png$/.test(name)).length;

const index=await readJson('runtime/registry/unit-index.json');
const ids=new Set((index.units||[]).map(entry=>entry.id));
for(const id of ['gaara','naruto_solar'])if(!ids.has(id))fail('unit index missing '+id);

for(const [id,name,jutsu] of [['gaara','Egyptian Gaara','sand_blast'],['naruto_solar','Solar Pharaoh Naruto','sun_rasengan']]){
 const unit=await readJson(`assets/characters/${id}/data/unit.json`),map=await readJson(`assets/characters/${id}/data/runtime-map.json`);
 if(unit.display_name!==name||unit.abilities?.jutsu?.id!==jutsu||unit.collection?.battle_ready!==true)fail(id+' canonical unit data is incomplete');
 if(!map.abilities?.[jutsu]||map.abilities?.[jutsu]?.gameplay_actions?.[0]?.action_id!=='damage_target')fail(id+' Jutsu runtime map is incomplete');
 const basicDriver=id==='gaara'?'animateGaaraSandBlast':'animateSolarNarutoRasengan';
 if(unit.abilities?.basic?.presentation?.runtime_driver!==basicDriver||unit.abilities?.basic?.delivery!=='projectile')fail(id+' Basic must own its supplied elemental VFX');
 if(unit.abilities?.jutsu?.presentation?.runtime_driver!=='animateLunge')fail(id+' Jutsu must remain neutral until its dedicated design is supplied');
 const frameCounts=id==='gaara'?{idle:6,run:10,'attack/basic':12,recoil:8}:{idle:8,run:10,'attack/basic':12,recoil:8};
 for(const [kind,expectedFrames] of Object.entries(frameCounts)){
  const directory=`assets/characters/${id}/sprites/runtime/v1/${kind}`;
  if(await countFrames(directory)!==expectedFrames)fail(id+' '+kind+' must contain '+expectedFrames+' runtime frames');
  for(let frame=1;frame<=expectedFrames;frame++){
   const rel=`${directory}/frame_${String(frame).padStart(2,'0')}.png`;
   const [width,height]=await pngSize(rel);
   if(width!==512||height!==768)fail(rel+' must be 512x768');
  }
 }
}

for(const [rel,count] of [
 ['assets/vfx/uploaded-v3/fireball/projectile',8],['assets/vfx/uploaded-v3/fireball/impact',8],
 ['assets/vfx/uploaded-v3/sand/blast',12],['assets/vfx/uploaded-v3/common/ground_dust_slash',12],
 ['assets/vfx/uploaded-v3/rasengan/projectile',6],['assets/vfx/uploaded-v3/rasengan/impact',6],
 ['assets/vfx/uploaded-v3/lightning/lightning_projectile_8f',8],['assets/vfx/uploaded-v3/lightning/lightning_hit_burst_10f',10],
 ['assets/vfx/uploaded-v3/lightning/lightning_charge_aura_12f',12],['assets/vfx/uploaded-v3/lightning/lightning_pillar_strike_10f',10],
 ['assets/vfx/uploaded-v3/lightning/lightning_spark_particles_8f',8]
])if(await countFrames(rel)!==count)fail(rel+' must contain '+count+' runtime frames');

const itachi=await readJson('assets/characters/itachi/data/unit.json');
if(itachi.abilities?.jutsu?.id!=='amaterasu'||itachi.abilities?.jutsu?.presentation?.runtime_driver!=='animateItachiAmaterasu')fail('Itachi must route Chakra/Jutsu to Amaterasu');
const post=await fs.readFile(path.join(root,'scripts/september27-asset-integration-postprocess.mjs'),'utf8');
for(const marker of ['SEPTEMBER27_BODY_RUNTIME','frames.slice(1,-1).reverse()','bbSeptember27Scale','SEPTEMBER27_VFX','animateItachiAmaterasu','animateGaaraSandBlast','animateSolarNarutoRasengan',"au.name==='Egyptian Gaara'","au.name==='Solar Pharaoh Naruto'","kind:'uploadedFireball'","f.kind==='gaaraSandBlast'","f.kind==='solarNarutoRasengan",'lazy VFX decoding'])if(!post.includes(marker))fail('postprocess marker missing: '+marker);
console.log('September 27 asset validation PASS: smooth Egyptian idle sequences, balanced Gaara scale, Basic-owned Sand Blast/Sun Rasengan VFX, and neutral placeholder Jutsu contracts are intact.');
