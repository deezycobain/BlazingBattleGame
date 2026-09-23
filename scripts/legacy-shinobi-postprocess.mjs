import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Legacy Shinobi integration: '+message)};

const IDS=['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza'];
const NAMES=['Kakashi','Obito','Jiraiya','Sasuke','Pain','Scorpion','Rock Lee','Mashle','Jackie Chan','Gabimaru','Killua','Zabuza'];

const legacyUnits={};
for(const id of IDS){
 const unitPath=path.join(process.cwd(),'assets','characters',id,'data','unit.json');
 legacyUnits[id]=JSON.parse(await fs.readFile(unitPath,'utf8'));
}
const unitTag=/(<script id="blazing-unit-data">window\.BLAZING_UNIT_DATA=)(\{.*?\})(;<\/script>)/s;
const unitMatch=html.match(unitTag);
if(!unitMatch)fail('embedded unit data tag missing');
const embeddedUnits=JSON.parse(unitMatch[2]);
Object.assign(embeddedUnits,legacyUnits);
html=html.replace(unitTag,(_,a,_json,c)=>a+JSON.stringify(embeddedUnits)+c);

const rosterSource="['crimson','subzero','lebee','senku','tyler','itachi','anubis']";
const rosterTarget="['crimson','subzero','lebee','senku','tyler','itachi',"+IDS.map(x=>"'"+x+"'").join(',')+",'anubis']";
if(html.includes(rosterSource))html=html.replace(rosterSource,rosterTarget);
else if(!html.includes(rosterTarget))fail('battle roster id list anchor missing');

const activeRx=/const ACTIVE_PLAYABLE_UNITS=Object\.freeze\(\[([^\]]*)\]\);/;
const active=html.match(activeRx);if(!active)fail('active playable whitelist missing');
const activeNames=[...active[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
for(const name of NAMES)if(!activeNames.includes(name))activeNames.push(name);
html=html.replace(activeRx,"const ACTIVE_PLAYABLE_UNITS=Object.freeze(["+activeNames.map(x=>"'"+x+"'").join(',')+"]);");

const runtime=String.raw`
const LEGACY_SHINOBI_BODY_RUNTIME=(()=>{
 const names=new Set(${JSON.stringify(NAMES)}),cache=new Map();
 const resolve=(name,kind)=>{
  if(!names.has(name))return null;
  let unit=null;try{unit=canonicalUnit(name)}catch(_){return null}
  const rels=unit?.animation_standard?.animations?.[kind]?.frames;
  if(!Array.isArray(rels)||rels.length!==6)return null;
  const key=name+':'+kind;
  if(!cache.has(key)){
   const cacheTag='?legacySpriteAudit=v2';
   const paths=rels.map(rel=>(/^assets\//.test(rel)?rel:'assets/characters/'+unit.id+'/'+rel)+cacheTag);
   cache.set(key,makeImageFrames(paths));
  }
  return cache.get(key);
 };
 return Object.freeze({
  names:Object.freeze([...names]),
  has:name=>names.has(name),
  idle:name=>resolve(name,'idle'),
  basic:name=>resolve(name,'basic_attack')
 });
})();
`;

const idleAnchor='function unitIdleFrames(name){';
const idleAt=html.indexOf(idleAnchor);if(idleAt<0)fail('unitIdleFrames anchor missing');
if(!html.includes('const LEGACY_SHINOBI_BODY_RUNTIME=(()=>{'))html=html.slice(0,idleAt)+runtime+'\n'+html.slice(idleAt);
if(!html.includes("function unitIdleFrames(name){const legacyShinobiIdle=LEGACY_SHINOBI_BODY_RUNTIME.idle(name);"))
 html=html.replace(idleAnchor,"function unitIdleFrames(name){const legacyShinobiIdle=LEGACY_SHINOBI_BODY_RUNTIME.idle(name);if(legacyShinobiIdle?.length)return legacyShinobiIdle;");

const attackAnchor='function unitAttackFrames(name,kind){';
if(!html.includes(attackAnchor))fail('unitAttackFrames anchor missing');
if(!html.includes("function unitAttackFrames(name,kind){const legacyShinobiBasic=LEGACY_SHINOBI_BODY_RUNTIME.basic(name);"))
 html=html.replace(attackAnchor,"function unitAttackFrames(name,kind){const legacyShinobiBasic=LEGACY_SHINOBI_BODY_RUNTIME.basic(name);if(legacyShinobiBasic?.length)return legacyShinobiBasic;");

for(const id of IDS)if(!html.includes('"'+id+'":'))fail('final shell missing canonical unit data '+id);
for(const marker of ['LEGACY_SHINOBI_BODY_RUNTIME','LEGACY OF THE SHINOBI',...IDS,...NAMES])if(!html.includes(marker))fail('final shell missing '+marker);
await fs.writeFile(file,html);
console.log('Legacy Shinobi integration PASS: 12 playable roster entries use prebuilt six-frame idle/basic runtime assets.');
