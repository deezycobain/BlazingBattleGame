import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('./blazing-road-postprocess.mjs',import.meta.url),'utf8');
for(const marker of [
  'Road entry recovery: rebuilding saved run.',
  'Saved run was reset for compatibility.',
  'try{beginRoadBattle()}catch(error)'
]){
  if(!source.includes(marker))throw new Error(`Road entry recovery validation failed: missing ${marker}`);
}
console.log('Road entry recovery validation PASS');
