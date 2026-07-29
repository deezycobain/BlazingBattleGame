import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const ARCHIVE='assets/characters/senku/sprites/source/retreat_run/retreat_run_assets.tar.gz';
const PREFIX='assets/characters/senku/sprites/';

const EXPECTED=new Map([
  ['assets/characters/senku/sprites/source/retreat_run/source_sheet.jpg','f459dc179a77f0d174a40cd68c861179b8e95c15'],
  ['assets/characters/senku/sprites/runtime/movement/retreat_run/frame_01.webp','a7ea447469141e22c7a31d06e6a85061733c3e90'],
  ['assets/characters/senku/sprites/runtime/movement/retreat_run/frame_02.webp','50e20bbf88d2634eed5df90388493b741e81a2ba'],
  ['assets/characters/senku/sprites/runtime/movement/retreat_run/frame_03.webp','593e97cd41b87841eeb9b8f4dd3938a720259947'],
  ['assets/characters/senku/sprites/runtime/movement/retreat_run/frame_04.webp','bacef60923b2fa62d759c54672903bd9c357977b'],
  ['assets/characters/senku/sprites/runtime/movement/retreat_run/frame_05.webp','a16d8aa19a19d61040353f7827e77c559f7aaec5'],
  ['assets/characters/senku/sprites/runtime/movement/retreat_run/frame_06.webp','67879c77af64997590d28d8e5268e5aff3905bc1']
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

function assertSafeFileName(name){
  if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').includes('..')){
    throw new Error(`Unsafe Senku retreat archive path: ${name}`);
  }
  if(!name.startsWith(PREFIX))throw new Error(`Archive file escaped Senku sprite tree: ${name}`);
}

const archivePath=path.join(ROOT,ARCHIVE);
const compressed=await fs.readFile(archivePath);
const tar=zlib.gunzipSync(compressed);
const entries=parseTar(tar);
const seen=new Set();

for(const entry of entries){
  if(entry.type==='5')continue; // Normal tar directory entry; files are validated below.
  if(entry.type!=='0'&&entry.type!=='')throw new Error(`Unsupported tar entry type ${entry.type} for ${entry.name}`);
  assertSafeFileName(entry.name);
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
