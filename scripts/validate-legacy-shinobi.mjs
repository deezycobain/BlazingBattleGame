import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const ids=['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza'];
const names=['Kakashi','Obito','Jiraiya','Sasuke','Pain','Scorpion','Rock Lee','Mashle','Jackie Chan','Gabimaru','Killua','Zabuza'];
const strips=new Set(['rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza']);
const readJson=async rel=>JSON.parse(await fs.readFile(path.join(ROOT,rel),'utf8'));
const exists=async rel=>{try{await fs.access(path.join(ROOT,rel));return true}catch{return false}};
const assetPath=(id,rel)=>String(rel||'').startsWith('assets/')?String(rel):'assets/characters/'+id+'/'+rel;
const pngDimensions=async rel=>{
 const data=await fs.readFile(path.join(ROOT,rel));
 if(data.length<24||data.toString('ascii',1,4)!=='PNG')throw new Error('Legacy Shinobi validator: invalid PNG '+rel);
 return {width:data.readUInt32BE(16),height:data.readUInt32BE(20)};
};

const audit=await readJson('assets/events/legacy-of-shinobi/sprite-audit.json');
if(audit?.runtime_canvas?.width!==512||audit?.runtime_canvas?.height!==768||audit?.runtime_canvas?.anchor!=='bottom_center'){
 throw new Error('Legacy Shinobi validator: sprite audit canvas contract invalid');
}

const index=await readJson('runtime/registry/unit-index.json');
const indexed=new Set((index.units||[]).map(x=>x.id));
for(const id of ids)if(!indexed.has(id))throw new Error('Legacy Shinobi validator: missing unit-index entry '+id);

for(const id of ids){
 const unit=await readJson('assets/characters/'+id+'/data/unit.json');
 if(unit.id!==id)throw new Error('Legacy Shinobi validator: id mismatch '+id);
 if(!unit.collection?.inventory_visible||!unit.collection?.battle_ready)throw new Error('Legacy Shinobi validator: collection flags invalid '+id);
 if(unit.readiness?.jutsu!==false||unit.assets?.vfx!==null)throw new Error('Legacy Shinobi validator: jutsu/VFX must remain pending '+id);
 if(unit.animation_standard?.version!=='legacy-shinobi-v2-audited')throw new Error('Legacy Shinobi validator: old animation standard '+id);
 if(unit.render?.sprite_anchor!=='bottom_center'||unit.render?.sprite_canvas?.width!==512||unit.render?.sprite_canvas?.height!==768){
  throw new Error('Legacy Shinobi validator: render canvas invalid '+id);
 }
 const unitAudit=audit.units?.[id];
 if(!unitAudit)throw new Error('Legacy Shinobi validator: audit entry missing '+id);
 if(!unitAudit.card?.size||Math.min(...unitAudit.card.size)<512||!unitAudit.card.sha256)throw new Error('Legacy Shinobi validator: card audit invalid '+id);

 for(const kind of ['idle','basic_attack']){
  const source=unit.animation_standard?.source_sheets?.[kind];
  const expected=strips.has(id)?{columns:6,rows:1}:{columns:3,rows:2};
  if(!source||source.columns!==expected.columns||source.rows!==expected.rows){
   throw new Error('Legacy Shinobi validator: '+id+' '+kind+' layout invalid; expected '+expected.columns+'x'+expected.rows);
  }
  if(!String(source.path||'').startsWith('assets/events/legacy-of-shinobi/'))throw new Error('Legacy Shinobi validator: '+id+' '+kind+' source path not canonical');
  if(!await exists(source.path))throw new Error('Legacy Shinobi validator: missing '+source.path);
  if(source.normalized_canvas?.[0]!==512||source.normalized_canvas?.[1]!==768||source.anchor!=='bottom_center'){
   throw new Error('Legacy Shinobi validator: '+id+' '+kind+' normalized metadata invalid');
  }

  const frames=unit.animation_standard?.animations?.[kind]?.frames;
  if(!Array.isArray(frames)||frames.length!==6)throw new Error('Legacy Shinobi validator: '+id+' '+kind+' frame list invalid');
  const audited=unitAudit?.[kind]?.audit_frames;
  if(!Array.isArray(audited)||audited.length!==6)throw new Error('Legacy Shinobi validator: '+id+' '+kind+' audit list invalid');

  for(let i=0;i<frames.length;i++){
   const framePath=assetPath(id,frames[i]);
   if(!await exists(framePath))throw new Error('Legacy Shinobi validator: missing '+framePath);
   const {width,height}=await pngDimensions(framePath);
   if(width!==512||height!==768)throw new Error('Legacy Shinobi validator: '+id+' '+kind+' frame '+(i+1)+' expected 512x768, got '+width+'x'+height);
   const box=audited[i]?.output_bbox;
   if(!Array.isArray(box)||box.length!==4||box[0]<=1||box[1]<=1||box[2]>=511||box[3]>=767){
    throw new Error('Legacy Shinobi validator: '+id+' '+kind+' frame '+(i+1)+' touches normalized canvas edge');
   }
   const visibleW=box[2]-box[0],visibleH=box[3]-box[1];
   const minHeight=kind==='idle'?300:180;
   if(visibleW<70||visibleH<minHeight)throw new Error('Legacy Shinobi validator: '+id+' '+kind+' frame '+(i+1)+' fighter unexpectedly small '+visibleW+'x'+visibleH);
   if((audited[i]?.component?.component_area||0)<5000)throw new Error('Legacy Shinobi validator: '+id+' '+kind+' frame '+(i+1)+' selected a tiny disconnected component');
  }
 }

 const art=assetPath(id,unit.assets?.art);
 if(!unit.assets?.art||!await exists(art))throw new Error('Legacy Shinobi validator: missing card art '+id);
}

const progression=await fs.readFile(path.join(ROOT,'runtime/ui/progression/progression.js'),'utf8');
for(const name of names)if(!progression.includes("'"+name+"'"))throw new Error('Legacy Shinobi validator: summon pool missing '+name);
for(const marker of ['LEGACY_FIGHTERS','SUMMON_FIGHTERS=LEGACY_FIGHTERS','LEGACY OF THE','12 UNIT EVENT POOL']){
 if(!progression.includes(marker))throw new Error('Legacy Shinobi validator: progression marker missing '+marker);
}

const home=await fs.readFile(path.join(ROOT,'runtime/ui/home/home-v9-runtime.js'),'utf8');
for(const marker of ['bb-home-v9-legacy-banner','LEGACY OF THE SHINOBI','12 NEW FIGHTERS']){
 if(!home.includes(marker))throw new Error('Legacy Shinobi validator: Home marker missing '+marker);
}
const escaped=String.fromCharCode(92)+'$'+'{';
if(home.includes(escaped+'SHELL_ID}')||home.includes(escaped+'FONT}'))throw new Error('Legacy Shinobi validator: escaped Home CSS template placeholder survived');

const adapter=await fs.readFile(path.join(ROOT,'scripts/legacy-shinobi-postprocess.mjs'),'utf8');
for(const marker of ['LEGACY_SHINOBI_BODY_RUNTIME','legacySpriteAudit=v3',...ids,...names]){
 if(!adapter.includes(marker))throw new Error('Legacy Shinobi validator: battle adapter missing '+marker);
}

console.log('Legacy Shinobi PASS: all 12 cards and 24 source sheets audited; mixed 3x2/6x1 layouts mapped explicitly; 144 runtime frames normalized to 512x768 bottom-center canvases; banner, inventory, roster, and battle adapters validated.');
