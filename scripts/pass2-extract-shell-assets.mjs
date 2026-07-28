import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const STAGE=path.join(ROOT,'.pass2-asset-stage');
const html=await fs.readFile(path.join(ROOT,'index.html'),'utf8');
const report={status:'started'};

const escapeRegExp=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function parseDataUri(uri,label){
  const m=String(uri||'').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if(!m)throw new Error(`${label}: expected image data URI`);
  const ext=m[1].includes('png')?'png':m[1].includes('jpeg')||m[1].includes('jpg')?'jpg':m[1].includes('webp')?'webp':'bin';
  const bytes=Buffer.from(m[2],'base64');
  if(!bytes.length)throw new Error(`${label}: decoded empty asset`);
  return {mime:m[1],ext,bytes,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}

function jsonArrayFromMatch(match,label){
  if(!match)throw new Error(`${label}: declaration not found`);
  try{return JSON.parse(match[1])}catch(error){throw new Error(`${label}: could not parse image list: ${error.message}`)}
}

function singleImage(symbol){
  const rx=new RegExp(`${escapeRegExp(symbol)}\\.src\\s*=\\s*(["'])(data:image\\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)\\1`);
  const m=html.match(rx);
  if(!m)throw new Error(`${symbol}: image declaration not found`);
  return m[2];
}

function frameList(symbol){
  const rx=new RegExp(`const\\s+${escapeRegExp(symbol)}\\s*=\\s*makeImageFrames\\((\\[[\\s\\S]*?\\])\\)\\s*;`);
  return jsonArrayFromMatch(html.match(rx),symbol);
}

function attackFrameList(unitName,key){
  const unit=escapeRegExp(unitName), attackKey=escapeRegExp(key);
  const rx=new RegExp(`['"]${unit}['"]\\s*:\\s*\\{[\\s\\S]*?\\b${attackKey}\\s*:\\s*makeImageFrames\\((\\[[\\s\\S]*?\\])\\)`);
  return jsonArrayFromMatch(html.match(rx),`${unitName}.${key}`);
}

function optionalHitFrameList(unitName){
  const start=html.indexOf('const HIT_SPRITES=');
  if(start<0)return [];
  const end=html.indexOf('\nconst ',start+20);
  const block=html.slice(start,end>start?end:start+3000000);
  const unit=escapeRegExp(unitName);
  const patterns=[
    new RegExp(`['"]${unit}['"]\\s*:\\s*makeImageFrames\\((\\[[\\s\\S]*?\\])\\)`),
    new RegExp(`['"]${unit}['"]\\s*:\\s*\\{[\\s\\S]*?frames\\s*:\\s*makeImageFrames\\((\\[[\\s\\S]*?\\])\\)`)
  ];
  for(const rx of patterns){const m=block.match(rx);if(m)return jsonArrayFromMatch(m,`${unitName}.recoil`)}
  return [];
}

async function writeStagedAsset(uri,dest,label){
  const asset=parseDataUri(uri,label);
  const full=path.join(STAGE,dest);
  await fs.mkdir(path.dirname(full),{recursive:true});
  await fs.writeFile(full,asset.bytes);
  return {path:dest,mime:asset.mime,bytes:asset.bytes.length,sha256:asset.sha256};
}

async function writeStagedList(uris,dir,label){
  const out=[];
  for(let i=0;i<uris.length;i++){
    const parsed=parseDataUri(uris[i],`${label}[${i}]`);
    const dest=path.posix.join(dir,`frame_${String(i+1).padStart(2,'0')}.${parsed.ext}`);
    out.push(await writeStagedAsset(uris[i],dest,`${label}[${i}]`));
  }
  return out;
}

async function copyStage(current=STAGE){
  for(const entry of await fs.readdir(current,{withFileTypes:true})){
    const src=path.join(current,entry.name);
    const rel=path.relative(STAGE,src);
    const dest=path.join(ROOT,rel);
    if(entry.isDirectory()){
      await fs.mkdir(dest,{recursive:true});
      await copyStage(src);
    }else if(entry.isFile()){
      await fs.mkdir(path.dirname(dest),{recursive:true});
      await fs.copyFile(src,dest);
    }
  }
}

await fs.rm(STAGE,{recursive:true,force:true});
await fs.mkdir(STAGE,{recursive:true});
try{
  report.lebee_star_projectile=[await writeStagedAsset(singleImage('LEBEE_STAR_PROJECTILE'),'assets/characters/lebee/vfx/basic/star_blast/projectile/frame_01.png','LEBEE_STAR_PROJECTILE')];
  report.lebee_meteor_frames=await writeStagedList(frameList('LEBEE_METEOR_FRAMES'),'assets/characters/lebee/vfx/jutsu/meteor/meteor','LEBEE_METEOR_FRAMES');
  report.lebee_meteor_impact_frames=await writeStagedList(frameList('LEBEE_METEOR_IMPACT_FRAMES'),'assets/characters/lebee/vfx/jutsu/meteor/impact','LEBEE_METEOR_IMPACT_FRAMES');
  report.lebee_meteor_finale=[await writeStagedAsset(singleImage('LEBEE_METEOR_IMPACT_COMBO'),'assets/characters/lebee/vfx/jutsu/meteor/finale/frame_01.png','LEBEE_METEOR_IMPACT_COMBO')];
  report.lebee_meteor_aftermath=[await writeStagedAsset(singleImage('LEBEE_METEOR_AFTERMATH'),'assets/characters/lebee/vfx/jutsu/meteor/aftermath/frame_01.png','LEBEE_METEOR_AFTERMATH')];
  report.subzero_freeze_cast=await writeStagedList(attackFrameList('Sub-Zero','freeze'),'assets/characters/subzero/sprites/runtime/jutsu/freeze_blast/cast','Sub-Zero.freeze');
  const recoil=optionalHitFrameList('Sub-Zero');
  report.subzero_recoil=recoil.length?await writeStagedList(recoil,'assets/characters/subzero/sprites/runtime/recoil','Sub-Zero.recoil'):[];
  report.subzero_recoil_note=recoil.length?'Embedded recoil frames extracted.':'No Sub-Zero HIT_SPRITES frame list found; current recoil is movement/hit-reaction behavior rather than a physical body-frame resource.';
  await copyStage();
  report.status='success';
}catch(error){
  report.status='failed';
  report.error=error instanceof Error?error.message:String(error);
}
await fs.rm(STAGE,{recursive:true,force:true});
await fs.mkdir(path.join(ROOT,'dev-tools'),{recursive:true});
await fs.writeFile(path.join(ROOT,'dev-tools/pass2-extraction-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
