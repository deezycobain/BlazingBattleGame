import fs from 'node:fs/promises';
import vm from 'node:vm';

const files=['runtime/modes/battle-economy.js','runtime/progression/unit-progression.js'];
const storage=new Map();
const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail}}
const context={console,Date,Math,JSON,CustomEvent,localStorage,dispatchEvent(){}};
context.window=context;
vm.createContext(context);
for(const file of files)vm.runInContext(await fs.readFile(file,'utf8'),context,{filename:file});

const P=context.BlazingUnitProgression,E=context.BlazingEconomy;
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
assert(P&&E,'progression/economy runtimes did not register');
assert(JSON.stringify(P.AWAKENING_COSTS)==='[1,1,1,1,2]','Awakening costs must be 1/1/1/1/2');
assert(JSON.stringify(P.CAPS)==='[10,20,30,40,50,50]','level caps must be 10/20/30/40/50');
assert(P.xpForNextLevel(1)===100,'Lv1 XP requirement must start at 100');
assert(P.xpForNextLevel(49)>P.xpForNextLevel(9),'late levels must require more XP');

let xp=P.grantXp('Lebee',180);
assert(xp.level===2&&xp.xp===80,'Road Stage 1 scale should move fresh Lebee to Lv2 with 80 XP carried');
P.grantXp('Lebee',999999);
let lebee=P.unit('Lebee');
assert(lebee.level===10&&lebee.xp===0,'XP must hard-stop at Lv10 before Awakening I');
assert(P.isAtGate(lebee),'Lv10 should be an Awakening gate');
assert(!P.canAwaken('Lebee').ok,'Awakening must require a duplicate');
P.addDuplicate('Lebee',1);
let awake=P.awaken('Lebee');
assert(awake.ok&&awake.awakening===1&&awake.newCap===20,'Awakening I should unlock Lv20 cap');
assert(P.unit('Lebee').copies===0,'Awakening I should consume one copy');

for(const expected of [2,3,4]){
  P.grantXp('Lebee',999999);P.addDuplicate('Lebee',1);awake=P.awaken('Lebee');
  assert(awake.ok&&awake.awakening===expected,`Awakening ${expected} failed`);
}
P.grantXp('Lebee',999999);
lebee=P.unit('Lebee');
assert(lebee.level===50&&lebee.awakening===4&&!lebee.shiny,'Lv50 should require the final Shiny Awakening');
P.addDuplicate('Lebee',1);
assert(!P.canAwaken('Lebee').ok,'final Shiny Awakening must require two copies');
P.addDuplicate('Lebee',1);awake=P.awaken('Lebee');
assert(awake.ok&&awake.awakening===5&&awake.shiny,'two final copies should unlock Shiny');
assert(P.unit('Lebee').level===50,'Shiny must remain Lv50');
const growth=P.statMultipliers(P.unit('Lebee'));
assert(growth.coreGrowth>=.219&&growth.coreGrowth<=.221,'level + Awakening core growth should cap near 22%');
assert(growth.speedGrowth<=.051,'speed progression must remain deliberately restrained');

P.reset();E.reset();E.grantMarks(1000,'VALIDATION');
P.grantXp('Tyler',50);
const full=P.fullMarkCost(1),finish=P.markCostToFinish('Tyler');
assert(finish<full&&finish>=15,'partial XP should reduce Battle Mark finish cost');
const before=E.balance(),bought=P.buyLevel('Tyler');
assert(bought.ok&&bought.level===2,'Battle Marks should finish the current level');
assert(E.balance()===before-bought.cost,'level purchase must deduct exact Battle Marks');

E.reset();E.grantMarks(E.EMBER_COST*12,'VALIDATION');
for(let i=0;i<E.EMBER_WEEKLY_CAP;i++)assert(E.purchaseEmber().ok,`Ember purchase ${i+1} should succeed`);
const capped=E.purchaseEmber();
assert(!capped.ok&&capped.reason==='WEEKLY_CAP','Ember exchange must stop at weekly cap');
assert(E.emberBalance()===E.EMBER_WEEKLY_CAP,'Ember bank should equal purchased weekly cap');

console.log('Unit progression PASS: XP bands, 1/1/1/1/2 duplicate gates, Lv50 Shiny cap, ~22% core growth, Battle Mark leveling, and weekly Ember exchange verified.');
