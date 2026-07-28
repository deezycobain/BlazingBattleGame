import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const html=await fs.readFile(path.join(ROOT,'index.html'),'utf8');
const report={};

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
  const rx=new RegExp(`${symbol}\\.src\\s*=\\s*(["'])(data:image\\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)\\1`);
  const m=html.match(rx);
  if(!m)throw new Error(`${symbol}: image declaration not found`);
  return m[2];
}

function frameList(symbol){
  const rx=new RegExp(`const\\s+${symbol}\\s*=\\s*makeImageFrames\\((\\[[\\s\\S]*?\\])\\)\\s*;`);
  return jsonArrayFromMatch(html.match(rx),symbol);
}

function attackFrameList(unitName,key){
  const unit=unitName.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&');
  const rx=new RegExp(`['"]${unit}['"]\\s*:\\s*\\{[\\s\\S]*?\\b${key}\\s*:\\s*makeImageFrames\\((\\[[\\s\\S]*?\\])\\)`);
  return jsonArrayFromMatch(html.match(rx),`${unitName}.${key}`);
}

function optionalHitFrameList(unitName){
  const start=html.indexOf('const HIT_SPRITES=');
  if(start<0)return [];
  const end=html.indexOf('\nconst ',start+20);
  const block=html.slice(start,end>start?end:start+3000000);
  const unit=unitName.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&');
  const patterns=[
    new RegExp(`['"]${unit}['"]\\s*:\\s*makeImageFrames\\((\\[[\\s\\S]*?\\])\\)`),
    new RegExp(`['"]${unit}['"]\\s*:\\s*\\{[\\s\\S]*?frames\\s*:\\s*makeImageFrames\\((\\[[\\s\\S]*?\\])\\)`)
  ];
  for(const rx of patterns){const m=block.match(rx);if(m)return jsonArrayFromMatch(m,`${unitName}.recoil`)}
  return [];
}

async function writeAsset(uri,dest,label){
  const asset=parseDataUri(uri,label);
  const full=path.join(ROOT,dest);
  await fs.mkdir(path.dirname(full),{recursive:true});
  await fs.writeFile(full,asset.bytes);
  return {path:dest,mime:asset.mime,bytes:asset.bytes.length,sha256:asset.sha256};
}

async function writeList(uris,dir,label){
  const out=[];
  for(let i=0;i<uris.length;i++){
    const parsed=parseDataUri(uris[i],`${label}[${i}]`);
    const dest=path.posix.join(dir,`frame_${String(i+1).padStart(2,'0')}.${parsed.ext}`);
    out.push(await writeAsset(uris[i],dest,`${label}[${i}]`));
  }
  return out;
}

report.lebee_star_projectile=[await writeAsset(singleImage('LEBEE_STAR_PROJECTILE'),'assets/characters/lebee/vfx/basic/star_blast/projectile/frame_01.png','LEBEE_STAR_PROJECTILE')];
report.lebee_meteor_frames=await writeList(frameList('LEBEE_METEOR_FRAMES'),'assets/characters/lebee/vfx/jutsu/meteor/meteor','LEBEE_METEOR_FRAMES');
report.lebee_meteor_impact_frames=await writeList(frameList('LEBEE_METEOR_IMPACT_FRAMES'),'assets/characters/lebee/vfx/jutsu/meteor/impact','LEBEE_METEOR_IMPACT_FRAMES');
report.lebee_meteor_finale=[await writeAsset(singleImage('LEBEE_METEOR_IMPACT_COMBO'),'assets/characters/lebee/vfx/jutsu/meteor/finale/frame_01.png','LEBEE_METEOR_IMPACT_COMBO')];
report.lebee_meteor_aftermath=[await writeAsset(singleImage('LEBEE_METEOR_AFTERMATH'),'assets/characters/lebee/vfx/jutsu/meteor/aftermath/frame_01.png','LEBEE_METEOR_AFTERMATH')];
report.subzero_freeze_cast=await writeList(attackFrameList('Sub-Zero','freeze'),'assets/characters/subzero/sprites/runtime/jutsu/freeze_blast/cast','Sub-Zero.freeze');
const recoil=optionalHitFrameList('Sub-Zero');
report.subzero_recoil=recoil.length?await writeList(recoil,'assets/characters/subzero/sprites/runtime/recoil','Sub-Zero.recoil'):[];
report.subzero_recoil_note=recoil.length?'Embedded recoil frames extracted.':'No Sub-Zero HIT_SPRITES frame list found; current recoil presentation is procedural/shell movement only.';

await fs.mkdir(path.join(ROOT,'dev-tools'),{recursive:true});
await fs.writeFile(path.join(ROOT,'dev-tools/pass2-extraction-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([k,v])=>[k,Array.isArray(v)?v.length:v])),null,2));
