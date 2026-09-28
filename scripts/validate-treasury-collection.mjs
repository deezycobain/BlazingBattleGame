import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const read=rel=>fs.readFile(path.join(root,rel));
const source=async rel=>read(rel).then(buffer=>buffer.toString('utf8'));
const png=async(rel,width,height)=>{
 const data=await read(rel);
 if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(`Treasury validation: ${rel} is not a PNG`);
 if(data.readUInt32BE(16)!==width||data.readUInt32BE(20)!==height)throw new Error(`Treasury validation: unexpected dimensions for ${rel}`);
 if(data.length<500000)throw new Error(`Treasury validation: ${rel} is unexpectedly small`);
};

const cards={
 'tc_001_madara_uchiha.png':'Madara Uchiha',
 'tc_002_hashirama_senju.png':'Hashirama Senju',
 'tc_003_tsunade.png':'Tsunade',
 'tc_004_minato_namikaze.png':'Minato Namikaze'
};
for(const [file,name] of Object.entries(cards)){
 await png(`assets/cards/treasury_collection/${file}`,1536,1024);
 const js=await source('runtime/ui/progression/progression.js');
 if(!js.includes(`'${name}':'assets/cards/treasury_collection/${file}'`))throw new Error(`Treasury validation: card mapping missing for ${name}`);
}
await png('assets/summons/treasury_collection/banner/treasury_collection_01_legends_of_the_leaf_banner.png',1774,887);
await png('assets/summons/treasury_collection/animation/treasury_blank_card_flip_atlas.png',1774,887);
for(const file of ['treasury_seal_charge_atlas.png','treasury_reveal_fx_experimental_atlas.png','treasury_blank_final_reveal_atlas.png'])await png(`assets/summons/treasury_collection/animation/${file}`,2172,724);

const progression=await source('runtime/ui/progression/progression.js');
const cinematic=await source('runtime/ui/progression/summon-cinematic.js');
const css=await source('runtime/ui/progression/treasury-collection-summon.css');
for(const marker of ['TREASURY_FIGHTERS','STATE_FIGHTERS','FORGE_FIGHTERS=FIGHTERS','randomTreasury','treasurySummonOne','treasurySummonTen','collection:\'treasury\''])if(!progression.includes(marker))throw new Error(`Treasury validation: progression marker missing ${marker}`);
for(const marker of ['TREASURY_VFX','prepareTreasuryVfx','buildTreasuryFx','isTreasuryPull','bb-treasury-card'])if(!cinematic.includes(marker))throw new Error(`Treasury validation: cinematic marker missing ${marker}`);
for(const marker of ['.bb-treasury-banner','bbTreasuryAtlas12','data-bb-special-reveal="treasury"','aspect-ratio:3/2!important','.bb-treasury-card'])if(!css.includes(marker))throw new Error(`Treasury validation: style marker missing ${marker}`);

console.log('Treasury Collection PASS: master card art, summon banner, runtime-injected card reveal, and reusable 12-frame FX atlases are present.');
