import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const fail=message=>{throw new Error('Madara archive validation FAIL: '+message)};
const unit=JSON.parse(fs.readFileSync(path.join(root,'assets/characters/madara/data/unit.json'),'utf8'));
const map=JSON.parse(fs.readFileSync(path.join(root,'assets/characters/madara/data/runtime-map.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime/registry/asset-manifest.json'),'utf8'));
if(unit.id!=='madara'||unit.display_name!=='Madara')fail('canonical Madara unit identity missing');
if(unit.collection?.battle_ready!==true||unit.readiness?.jutsu!==true)fail('Madara must be battle-ready with an enabled Jutsu');
if(unit.abilities?.jutsu?.id!=='truth_seeking_orb'||unit.abilities?.jutsu?.presentation?.runtime_driver!=='animateMadaraTruthSeekingOrb')fail('Truth-Seeking Orb routing mismatch');
for(const kind of ['idle','run','basic_attack']){
 const animation=unit.animation_standard?.animations?.[kind];
 if(!animation||animation.frames?.length!==6)fail(`${kind} must contain six frames`);
 for(const rel of animation.frames){
  const full=path.join(root,'assets','characters','madara',rel);
  if(!fs.existsSync(full))fail(`missing ${rel}`);
  const png=fs.readFileSync(full);if(png.toString('hex',0,8)!=='89504e470d0a1a0a')fail(`${rel} is not PNG`);
  if(png.readUInt32BE(16)!==512||png.readUInt32BE(20)!==768)fail(`${rel} must be 512x768`);
 }
}
const orb=path.join(root,'assets/characters/madara/vfx/jutsu/truth_seeking_orb/orb.png');
if(!fs.existsSync(orb))fail('source orb VFX missing');
const orbPng=fs.readFileSync(orb);
if(orbPng.readUInt32BE(16)!==96||orbPng.readUInt32BE(20)!==96)fail('source orb must include the complete 96x96 atlas element');
if(!manifest.units?.madara?.animations?.run||!manifest.units?.madara?.vfx?.truth_seeking_orb)fail('Madara resources missing from asset manifest');
if(map.abilities?.truth_seeking_orb?.gameplay_actions?.[0]?.action_id!=='damage_target')fail('Madara Jutsu damage action missing');
const post=fs.readFileSync(path.join(root,'scripts/madara-archive-postprocess.mjs'),'utf8');
for(const marker of ['MADARA_ARCHIVE_BODY_RUNTIME','animateMadaraTruthSeekingOrb','animateMadaraTruthSeekingStaff','madaraTruthSeekingOrb','madaraTruthSeekingStaff',"actor.name==='Madara'", "'madara','anubis'"])if(!post.includes(marker))fail(`postprocess marker missing: ${marker}`);
console.log('Madara archive validation PASS: Six Paths pilot has a persistent idle loop, a visible source orb, and full Basic/Jutsu routing.');
