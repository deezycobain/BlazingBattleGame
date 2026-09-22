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
assert(combat.STAT_MAX===100,'combat stat cap must remain 100');
assert(combat.computeScaledDamage(38,1)===38,'scaled basic damage changed');
assert(combat.computeScaledDamage(32,2.4)===77,'scaled Jutsu rounding changed');
assert(combat.computeScaledDamage(132,1)===100,'Attack input must clamp to the 100-point stat ceiling');
assert(combat.computeBuffedNormalDamage(40,0.25)===50,'linked normal damage rounding changed');
assert(Math.abs(combat.defenseMitigation(50)-0.225)<1e-9,'50 Defense must mitigate 22.5% damage');
assert(Math.abs(combat.defenseMitigation(100)-0.45)<1e-9,'100 Defense must cap at 45% mitigation');

const damageTarget={hp:100,maxHp:100,defense:50};
const damageResult=combat.execute('damage_target',{target:damageTarget,damage:40});
assert(damageTarget.hp===69&&damageResult.amount===31&&damageResult.defeated===false,'Defense must reduce incoming damage before HP mutation');

const lethal={hp:20,maxHp:20,defense:0};
const lethalResult=combat.execute('damage_target',{target:lethal,damage:38});
assert(lethal.hp===0&&lethalResult.amount===20&&lethalResult.defeated===true,'damage_target must clamp HP at zero');

const targets=[{hp:100,maxHp:100,defense:0},{hp:20,maxHp:20,defense:0}];
const multi=combat.execute('damage_targets',{targets,damage:25});
assert(targets[0].hp===75&&targets[1].hp===0&&multi.length===2,'damage_targets mutation changed');

const senku={hp:41,maxHp:82};
const heal=combat.execute('heal_party_percent',{targets:[senku],parameters:{percent_of_max_hp:0.30}})[0];
assert(senku.hp===66&&heal.amount===25,'Senku 30% max-HP heal must use the normalized HP scale');
const capped={hp:80,maxHp:82};
const cappedHeal=combat.healPercentMaxHp(capped,0.30);
assert(capped.hp===82&&cappedHeal.amount===2,'heal must cap at max HP');
const defeated={hp:0,maxHp:82};
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

const statusTarget={hp:50,gauge:80};
const stun=combat.execute('apply_status',{target:statusTarget,parameters:{effect:'stun',turns:1,source:'itachi'}});
assert(stun.after===1&&combat.hasStatus(statusTarget,'stun'),'stun must register as a reusable one-turn status effect');
const consumed=combat.consumeStatusTurn(statusTarget,'stun');
assert(consumed.consumed===true&&consumed.after===0&&!combat.hasStatus(statusTarget,'stun'),'one-turn stun must expire after consuming exactly one turn');
const statusTargets=[{hp:10},{hp:10}];
const multiStatus=combat.execute('apply_status_targets',{targets:statusTargets,parameters:{effect:'stun',turns:2}});
assert(multiStatus.length===2&&statusTargets.every(target=>combat.getStatus(target,'stun')?.turns===2),'multi-target status application changed');
combat.execute('apply_status',{target:statusTargets[0],parameters:{effect:'stun',turns:1}});
assert(combat.getStatus(statusTargets[0],'stun')?.turns===2,'reapplying a shorter stun must not shorten an existing status');

let unsupported=false;
try{combat.execute('declared_future_action',{})}catch{unsupported=true}
assert(unsupported,'unsupported combat actions must fail closed');

console.log('Combat runtime smoke PASS: normalized damage, healing, chakra, gauge control, and reusable turn-based status effects verified.');
