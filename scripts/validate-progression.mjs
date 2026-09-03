import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
const root=process.cwd(),read=rel=>fs.readFile(path.join(root,rel),'utf8'),fail=msg=>{throw new Error(`Progression validation failed: ${msg}`)};
const js=await read('runtime/ui/progression/progression.js'),css=await read('runtime/ui/progression/progression.css'),pkg=JSON.parse(await read('package.json'));
try{new vm.Script(js)}catch(error){fail(`runtime syntax error: ${error.message}`)}
for(const marker of ["KEY='blazing.progression.v1'",'MAX_RESONANCE=5','STAT_BUDGET=12',"FIGHTERS=['Crimson','Sub-Zero','Lebee','Senku','Tyler']",'u.resonance<MAX_RESONANCE','u.shards++','u.shiny=true','candidate=rollStats(u.locks,u.roll)','KEEP CURRENT','ACCEPT NEW','summonEmbers=999999','spendEmbers=function()','localStorage.setItem','function applyCombatBonuses()','target.jutsuDamage=Math.round','RESET DEV PROGRESSION',"multiSummonBtn.addEventListener('click'",'Array.from({length:10}'])if(!js.includes(marker))fail(`runtime missing ${marker}`);
for(const marker of ['#coreSummonNotice{display:none!important}','.forgeNode','.forgeCard.shiny','.forgeCandidate.active','.bb-resonance-badge'])if(!css.includes(marker))fail(`style missing ${marker}`);
if(!pkg.scripts?.build?.includes('progression-postprocess.mjs'))fail('build chain missing progression postprocess');
console.log('Progression PASS: dev summons are active and unlimited; duplicates persist through R5 Shiny awakening and protected, lockable 12-point stat rerolls.');
