import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Legacy Shinobi integration: '+message)};

const IDS=['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza'];
const NAMES=['Kakashi','Obito','Jiraiya','Sasuke','Pain','Scorpion','Rock Lee','Mashle','Wong Fei-Hung','Gabimaru','Killua','Zabuza'];

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
 const names=new Set(${JSON.stringify(NAMES)}),attackScales=Object.freeze({"Kakashi":1.025,"Obito":1.107,"Jiraiya":1.128,"Sasuke":1,"Pain":1.001,"Scorpion":1.148,"Rock Lee":1.021,"Mashle":1.04,"Wong Fei-Hung":1.09,"Gabimaru":1.144,"Killua":1,"Zabuza":1.18}),cache=new Map();
 const resolve=(name,kind)=>{
  if(!names.has(name))return null;
  let unit=null;try{unit=canonicalUnit(name)}catch(_){return null}
  const rels=unit?.animation_standard?.animations?.[kind]?.frames;
  if(!Array.isArray(rels)||rels.length!==6)return null;
  const key=name+':'+kind;
  if(!cache.has(key)){
   const cacheTag='?legacySpriteAudit=v4';
   const paths=rels.map(rel=>(/^assets\//.test(rel)?rel:'assets/characters/'+unit.id+'/'+rel)+cacheTag);
   cache.set(key,makeImageFrames(paths));
  }
  return cache.get(key);
 };
 const drunkenPatterns=Object.freeze({
  idle:Object.freeze([0,0,1,1,1,2,3,3,4,4,5,5]),
  basic_attack:Object.freeze([0,1,2,3,4,5])
 });
 const sequence=(name,kind,frames)=>{
  if(name!=='Wong Fei-Hung'||!Array.isArray(frames)||frames.length!==6)return frames;
  const pattern=drunkenPatterns[kind];
  return pattern?pattern.map(index=>frames[index]).filter(Boolean):frames;
 };
 return Object.freeze({
  names:Object.freeze([...names]),
  has:name=>names.has(name),
  attackScale:name=>attackScales[name]||1,
  idle:name=>resolve(name,'idle'),
  basic:name=>resolve(name,'basic_attack'),
  sequence
 });
})();
`;

const idleAnchor='function unitIdleFrames(name){';
const idleAt=html.indexOf(idleAnchor);if(idleAt<0)fail('unitIdleFrames anchor missing');
if(!html.includes('const LEGACY_SHINOBI_BODY_RUNTIME=(()=>{'))html=html.slice(0,idleAt)+runtime+'\n'+html.slice(idleAt);
if(!html.includes("function unitIdleFrames(name){const legacyShinobiIdle=LEGACY_SHINOBI_BODY_RUNTIME.idle(name);"))
 html=html.replace(idleAnchor,"function unitIdleFrames(name){const legacyShinobiIdle=LEGACY_SHINOBI_BODY_RUNTIME.idle(name);if(legacyShinobiIdle?.length)return LEGACY_SHINOBI_BODY_RUNTIME.sequence(name,'idle',legacyShinobiIdle);");

const attackAnchor='function unitAttackFrames(name,kind){';
if(!html.includes(attackAnchor))fail('unitAttackFrames anchor missing');
if(!html.includes("function unitAttackFrames(name,kind){const legacyShinobiBasic=LEGACY_SHINOBI_BODY_RUNTIME.basic(name);"))
 html=html.replace(attackAnchor,"function unitAttackFrames(name,kind){const legacyShinobiBasic=LEGACY_SHINOBI_BODY_RUNTIME.basic(name);if(legacyShinobiBasic?.length)return LEGACY_SHINOBI_BODY_RUNTIME.sequence(name,'basic_attack',legacyShinobiBasic);");


/* Legacy attack renderer visual-state bridge.
   The battle renderer passes a non-null visual transform while animateLunge is moving
   the fighter. The legacy attack-frame branch was gated by !visual, so the six loaded
   attack frames were never selected during a real normal attack. */
const legacyAttackVisualGate='if(!visual&&attackState){';
const legacyAttackVisualTarget='if((!visual||LEGACY_SHINOBI_BODY_RUNTIME.has(name))&&attackState){';
if(html.includes(legacyAttackVisualGate))html=html.replace(legacyAttackVisualGate,legacyAttackVisualTarget);
else if(!html.includes(legacyAttackVisualTarget))fail('Legacy attack visual-state renderer gate missing');

/* Give the six-frame Legacy attack sheet enough screen time to read.
   Wong Fei-Hung uses repeated frame holds around the authored six poses so his
   motion lingers, then snaps through the contact poses. Each attack also receives
   a small timing variance so the Drunken Master rhythm never feels metronomic. */
const lungeTimingSource="let start=performance.now(),dur=unitName==='Tyler'?360:175,backDur=unitName==='Tyler'?340:145,lungeHold=unitName==='Tyler'?100:65;";
const lungeTimingTarget="const legacyShinobiAttack=LEGACY_SHINOBI_BODY_RUNTIME.has(unitName),drunkenMasterAttack=unitName==='Wong Fei-Hung',drunkenVariance=drunkenMasterAttack?(.90+Math.random()*.20):1,drunkenHoldVariance=drunkenMasterAttack?(.96+Math.random()*.10):1;let start=performance.now(),dur=drunkenMasterAttack?Math.round(300*drunkenVariance):(legacyShinobiAttack?205:(unitName==='Tyler'?360:175)),backDur=drunkenMasterAttack?Math.round(340*(2-drunkenVariance)):(legacyShinobiAttack?240:(unitName==='Tyler'?340:145)),lungeHold=drunkenMasterAttack?Math.round(350*drunkenHoldVariance):(legacyShinobiAttack?185:(unitName==='Tyler'?100:65));";
if(html.includes(lungeTimingSource))html=html.replace(lungeTimingSource,lungeTimingTarget);
else if(!html.includes(lungeTimingTarget))fail('Legacy animateLunge timing anchor missing');

for(const id of IDS)if(!html.includes('"'+id+'":'))fail('final shell missing canonical unit data '+id);
for(const marker of ['LEGACY_SHINOBI_BODY_RUNTIME','LEGACY OF THE SHINOBI',...IDS,...NAMES])if(!html.includes(marker))fail('final shell missing '+marker);
await fs.writeFile(file,html);
console.log('Legacy Shinobi integration PASS: 12 playable roster entries use prebuilt six-frame idle/basic runtime assets.');
await import('./combat-stabilization-postprocess.mjs');
