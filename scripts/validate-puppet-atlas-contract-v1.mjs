import fs from 'node:fs/promises';
import path from 'node:path';
import '../runtime/rendering/puppet-atlas-contract-v1.js';
export const contract=globalThis.BlazingPuppetAtlasContractV1;
export const schema=JSON.parse(await fs.readFile('config/puppet-atlas-contract-v1.schema.json','utf8'));
export async function validateFile(file){
 const manifest=JSON.parse(await fs.readFile(file,'utf8'));
 const png=await fs.readFile(manifest.atlas.image),map=JSON.parse(await fs.readFile(manifest.atlas.map,'utf8'));
 if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Puppet body must be PNG');
 const result=contract.validate(manifest,schema,{width:png.readUInt32BE(16),height:png.readUInt32BE(20),map});
 return {file,...result};
}
export async function validateAll(){
 const results=[];
 for(const unit of await fs.readdir('assets/characters')){
  const file=path.join('assets/characters',unit,'data/puppet-atlas-v1.json');
  try{await fs.access(file);}catch{continue;}
  const m=JSON.parse(await fs.readFile(file,'utf8'));if(m.unitId!==unit)throw new Error('Puppet manifest owner mismatch '+file);
  results.push(await validateFile(file));
 }
 if(!results.length)throw new Error('No Puppet Atlas Contract v1 manifests found');
 return results;
}
if(process.argv[1]?.endsWith('validate-puppet-atlas-contract-v1.mjs'))console.log('Puppet Atlas Contract v1 PASS',JSON.stringify(await validateAll()));
