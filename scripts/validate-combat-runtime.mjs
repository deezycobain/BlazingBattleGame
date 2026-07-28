import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=process.cwd();
const source=await fs.readFile(path.join(ROOT,'runtime/combat/combat-runtime.js'),'utf8');
const context=vm.createContext({window:{}});
vm.runInContext(source,context,{filename:'runtime/combat/combat-runtime.js'});
const combat=context.window.BlazingCombatRuntime;
const fail=message=>{throw new Error(`Combat runtime validation failed: ${message}`)};
const assert=(condition,message)=>{if(!condition)fail(message)};

assert(combat&&typeof combat.execute==='function','runtime did not expose BlazingCombatRuntime.execute');
assert(combat.computeScaledDamage(38,1)===38,'scaled basic damage changed');
assert(combat.computeScaledDamage(32,2.4)===77,'scaled Jutsu rounding changed');
assert(combat.computeBuffedNormalDamage(40,0.25)===50,'linked normal damage rounding changed');

const damageTarget={hp:30,maxHp:30};
const damageResult=combat.execute('damage_target',{target:damageTarget,damage:38});
assert(damageTarget.hp===0&&damageResult.amount===30&&damageResult.defeated===true,'damage_target must clamp HP at zero');

const targets=[{hp:100,maxHp:100},{hp:20,maxHp:20}];
const multi=combat.execute('damage_targets',{targets,damage:25});
assert(targets[0].hp===75&&targets[1].hp===0&&multi.length===2,'damage_targets mutation changed');

const senku={hp:90,maxHp:180};
const heal=combat.execute('heal_party_percent',{targets:[senku],parameters:{percent_of_max_hp:0.30}})[0];
assert(senku.hp===144&&heal.amount===54,'Senku 30% max-HP heal must equal 54 at 180 max HP');
const capped={hp:170,maxHp:180};
const cappedHeal=combat.healPercentMaxHp(capped,0.30);
assert(capped.hp===180&&cappedHeal.amount===10,'heal must cap at max HP');
const defeated={hp:0,maxHp:180};
const skipped=combat.healPercentMaxHp(defeated,0.30);
assert(defeated.hp===0&&skipped.amount===0&&skipped.skipped===true,'heal must not revive defeated units');

const chakra={chakra:8,maxChakra:8};
const spend=combat.spendChakra(chakra,4);
assert(spend.ok===true&&chakra.chakra===4,'chakra spend changed');
const insufficient=combat.spendChakra(chakra,5);
assert(insufficient.ok===false&&chakra.chakra===4,'insufficient chakra must not mutate unit');
const gain=combat.gainChakra(chakra,10);
assert(chakra.chakra===8&&gain.amount===4,'chakra gain must cap at max');

const frozen={gauge:20};
const gauge=combat.execute('reduce_target_gauge',{target:frozen,parameters:{amount:35,minimum_gauge:0}});
assert(frozen.gauge===0&&gauge.amount===20,'Freeze Blast gauge reduction must floor at zero');

let unsupported=false;
try{combat.execute('declared_future_action',{})}catch{unsupported=true}
assert(unsupported,'unsupported combat actions must fail closed');

console.log('Combat runtime smoke PASS: damage, multi-target damage, link scaling, Ally Heal, chakra, and Freeze gauge semantics verified.');
