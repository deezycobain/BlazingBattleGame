import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=process.cwd();
const CHARACTER_ROOT=path.resolve(process.env.ATLAS_CONTRACT_CHARACTER_ROOT||path.join(ROOT,'assets','characters'));
const CONTRACT='blazing-battle-character-atlas-v1';
const ANIMATION_TYPES=new Set(['idle','basic_attack','special','jutsu']);
const fail=message=>{throw new Error(`Atlas Contract v1: ${message}`)};
const PNG_SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);

async function readPngDimensions(file,label){
 const header=await fs.readFile(file);
 if(header.length<24||!header.subarray(0,8).equals(PNG_SIGNATURE)||header.toString('ascii',12,16)!=='IHDR')fail(`${label} atlas must be a PNG with an IHDR header`);
 const width=header.readUInt32BE(16),height=header.readUInt32BE(20);
 if(!width||!height)fail(`${label} atlas PNG dimensions must be positive`);
 return {width,height};
}

export async function validateAtlasContracts(characterRoot=CHARACTER_ROOT){
 for(const entry of await fs.readdir(characterRoot,{withFileTypes:true})){
 if(!entry.isDirectory())continue;
 const file=path.join(characterRoot,entry.name,'data','atlas-contract-v1.json');
 try{await fs.access(file)}catch{continue}
 let manifest;try{manifest=JSON.parse(await fs.readFile(file,'utf8'))}catch(error){fail(`${entry.name} metadata is malformed JSON: ${error.message}`)}
 if(manifest.contract_version!==CONTRACT)fail(`${entry.name} must declare contract_version ${CONTRACT}`);
 if(manifest.unit_id!==entry.name)fail(`${entry.name} unit_id must match its character directory`);
 if(!Array.isArray(manifest.animations)||!manifest.animations.length)fail(`${entry.name} must declare at least one animation`);
 const unitRoot=path.join(characterRoot,entry.name);
 const animationIds=new Set();
 for(const animation of manifest.animations){
  const label=`${entry.name}/${animation?.id||'unknown'}`;
  if(typeof animation?.id!=='string'||!animation.id.trim())fail(`${label} must declare a non-empty animation id`);
  if(animationIds.has(animation.id))fail(`${label} duplicates an animation id in the same manifest`);
  animationIds.add(animation.id);
  if(!ANIMATION_TYPES.has(animation?.type))fail(`${label} has unsupported animation type`);
  if(animation.frame_count!==6||animation.rows!==2||animation.columns!==3)fail(`${label} must use exactly six frames in a 3x2 atlas`);
  if(!Number.isInteger(animation.frame_width)||animation.frame_width<=0||animation.frame_width!==animation.frame_height)fail(`${label} must declare positive square frame dimensions`);
  if(!Number.isFinite(animation.frame_ms)||animation.frame_ms<=0)fail(`${label} must declare positive frame_ms`);
  if(typeof animation.loop!=='boolean')fail(`${label} must declare loop as boolean`);
  if(animation.anchor_x!=='center'||animation.anchor_y!=='feet')fail(`${label} must use center/feet anchors`);
  if(!Number.isFinite(animation.combat_visual_height)||animation.combat_visual_height<=0)fail(`${label} must declare positive combat_visual_height`);
  if(typeof animation.atlas!=='string'||!animation.atlas)fail(`${label} must declare an atlas path`);
  if(path.extname(animation.atlas).toLowerCase()!=='.png')fail(`${label} atlas must use the Contract-v1 PNG format`);
  const atlas=path.resolve(path.dirname(file),animation.atlas);
  const unitRelative=path.relative(unitRoot,atlas);
  if(!unitRelative||unitRelative.startsWith(`..${path.sep}`)||path.isAbsolute(unitRelative))fail(`${label} atlas must stay inside its owning unit directory`);
  try{await fs.access(atlas)}catch{fail(`${label} atlas file is missing: ${animation.atlas}`)}
  const dimensions=await readPngDimensions(atlas,label);
  if(dimensions.width!==animation.frame_width*animation.columns||dimensions.height!==animation.frame_height*animation.rows)fail(`${label} atlas PNG dimensions must equal frame dimensions multiplied by its 3x2 grid`);
  if(animation.type==='basic_attack'&&(!Number.isInteger(animation.hit_frame)||animation.hit_frame<0||animation.hit_frame>=6))fail(`${label} must declare hit_frame from 0 through 5`);
 if(animation.type!=='basic_attack'&&animation.hit_frame!=null)fail(`${label} may only declare hit_frame for basic_attack`);
 }
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 await validateAtlasContracts();
 console.log('Atlas Contract v1 validation PASS: legacy assets exempt; every declared Contract-v1 atlas is structurally valid.');
}
