import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const ARCHIVE='assets/characters/senku/sprites/source/retreat_run/retreat_run_assets.tar.gz';
const PREFIX='assets/characters/senku/sprites/';

const EXPECTED=new Map([
  ['assets/characters/senku/sprites/source/retreat_run/source_sheet.jpg','f4590db32748b712095873a4992129dac4281dfc'],
  ['assets/characters/senku/sprites/runtime/movement/retreat_run/frame_01.webp','a7ea447ce174545433e82ea2ba04b019bcfa40fa'],
  ['assets/characters/senku/sprites/runtime/movement/retreat_run/frame_02.webp','420b6e17384ba42a12139dc6322301087830678b'],
  ['assets/characters/senku/sprites/runtime/movement/retreat_run/frame_03.webp','795b3dc88d65a27115df1103eca530e38089228a'],
  ['assets/characters/senku/sprites/runtime/movement/retreat_run/frame_04.webp','31f3d958d9bfb23740760dc87bc63622f30b510d'],
  ['assets/characters/senku/sprites/runtime/movement/retreat_run/frame_05.webp','720ebd97ff33abb3f81fffc0be21c2f19b8a0cc3'],
  ['assets/characters/senku/sprites/runtime/movement/retreat_run/frame_06.webp','78572fcd734f7eaa458df89ff253cf191301df9a']
]);

function gitBlobSha(bytes){
  const prefix=Buffer.from(`blob ${bytes.length}\0`);
  return crypto.createHash('sha1').update(prefix).update(bytes).digest('hex');
}

function readString(buf,start,length){
  const slice=buf.subarray(start,start+length);
  const zero=slice.indexOf(0);
  return slice.subarray(0,zero<0?slice.length:zero).toString('utf8');
}

function readOctal(buf,start,length){
  const raw=readString(buf,start,length).trim().replace(/\0/g,'');
  return raw?Number.parseInt(raw,8):0;
}

function parseTar(tar){
  const entries=[];
  let offset=0;
  while(offset+512<=tar.length){
    const header=tar.subarray(offset,offset+512);
    if(header.every(byte=>byte===0))break;
    const name=readString(header,0,100);
    const prefix=readString(header,345,155);
    const fullName=prefix?`${prefix}/${name}`:name;
    const size=readOctal(header,124,12);
    const type=readString(header,156,1)||'0';
    const dataStart=offset+512;
    const dataEnd=dataStart+size;
    if(dataEnd>tar.length)throw new Error(`Truncated tar entry: ${fullName}`);
    entries.push({name:fullName,type,data:tar.subarray(dataStart,dataEnd)});
    offset=dataStart+Math.ceil(size/512)*512;
  }
  return entries;
}

function assertSafeName(name){
  if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').includes('..')){
    throw new Error(`Unsafe Senku retreat archive path: ${name}`);
  }
  if(!name.startsWith(PREFIX))throw new Error(`Archive path escaped Senku sprite tree: ${name}`);
}

const archivePath=path.join(ROOT,ARCHIVE);
const compressed=await fs.readFile(archivePath);
const tar=zlib.gunzipSync(compressed);
const entries=parseTar(tar);
const seen=new Set();

for(const entry of entries){
  assertSafeName(entry.name);
  if(entry.type!=='0'&&entry.type!=='')continue;
  const expected=EXPECTED.get(entry.name);
  if(!expected)throw new Error(`Unexpected file in Senku retreat archive: ${entry.name}`);
  const actual=gitBlobSha(entry.data);
  if(actual!==expected)throw new Error(`Hash mismatch for ${entry.name}: expected ${expected}, got ${actual}`);
  const out=path.join(ROOT,entry.name);
  await fs.mkdir(path.dirname(out),{recursive:true});
  await fs.writeFile(out,entry.data);
  seen.add(entry.name);
}

for(const expectedName of EXPECTED.keys()){
  if(!seen.has(expectedName))throw new Error(`Senku retreat archive missing ${expectedName}`);
}

console.log(`Senku retreat assets materialized: ${seen.size} verified files from ${ARCHIVE}.`);
