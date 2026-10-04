import fs from 'node:fs/promises';
import {decodePngRgba,encodePngRgba} from './lib/png-rgba.mjs';

export const SOURCE='assets/characters/scorpion/puppet/v2/source/scorpion_puppet_v2_master.png';
export const MAP='assets/characters/scorpion/puppet/v2/runtime/scorpion_puppet_v2_runtime_atlas.json';
export const OUTPUT='assets/characters/scorpion/puppet/v2/runtime/scorpion_puppet_v2_runtime_atlas.png';

export async function generateScorpionPuppetRuntimeAtlasV2(){
 const map=JSON.parse(await fs.readFile(MAP,'utf8'));
 if(map.metadata?.approvedSourceMaster!==SOURCE)throw new Error('Scorpion V2 packed map source-master drift');
 if(map.metadata?.authoringMode!=='manual-semantic-runtime-pack-v2'||map.metadata?.automaticAlphaIslandMapping!==false)throw new Error('Scorpion V2 packed map authoring mode drift');
 const source=decodePngRgba(await fs.readFile(SOURCE)),[width,height]=map.canvas,out=Buffer.alloc(width*height*4);
 for(const id of map.metadata.packingOrder){
  const part=map.parts[id],src=part?.sourceRect;if(!part||!src)throw new Error('Missing packed semantic part '+id);
  if(src.w!==part.w||src.h!==part.h)throw new Error('Packed part must preserve native dimensions '+id);
  if(src.x<0||src.y<0||src.x+src.w>source.width||src.y+src.h>source.height)throw new Error('Source crop outside approved master '+id);
  if(part.x<0||part.y<0||part.x+part.w>width||part.y+part.h>height)throw new Error('Runtime crop outside atlas '+id);
  for(let y=0;y<part.h;y++){
   const sourceStart=((src.y+y)*source.width+src.x)*4,destStart=((part.y+y)*width+part.x)*4;
   source.data.copy(out,destStart,sourceStart,sourceStart+part.w*4);
  }
 }
 await fs.writeFile(OUTPUT,encodePngRgba(width,height,out));
 return {output:OUTPUT,width,height,parts:map.metadata.packingOrder.length};
}

if(process.argv[1]?.endsWith('generate-scorpion-puppet-runtime-atlas-v2.mjs'))console.log('Scorpion Puppet V2 runtime atlas generated',await generateScorpionPuppetRuntimeAtlasV2());
