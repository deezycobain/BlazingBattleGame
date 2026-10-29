import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const collection=fs.readFileSync('runtime/core/starter-collection.js','utf8');
const teamPostprocess=fs.readFileSync('scripts/starter-account-postprocess.mjs','utf8');
assert.ok(teamPostprocess.includes("testMode?['Itachi',null,'Obito',null,'Scorpion',null]"),'QA team defaults to three requested fighters');
assert.ok(teamPostprocess.includes('blazingBattle.animationTestTeam.v1'), 'QA team storage stays separate from the normal account');
const economy=fs.readFileSync('runtime/modes/battle-economy.js','utf8');
function boot(entries={},search=''){
 const store=new Map(Object.entries(entries));
 const localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,val)=>store.set(key,String(val)),
  removeItem:key=>store.delete(key)
 };
 const win={location:{search},BLAZING_UNIT_DATA:{tyler:{id:'tyler',display_name:'Tyler',role:'playable'},subzero:{id:'subzero',display_name:'Sub-Zero',role:'playable'},senku:{id:'senku',display_name:'Senku',role:'playable'},scorpion:{id:'scorpion',display_name:'Scorpion',role:'playable'}},addEventListener(){},dispatchEvent(){}};
 const document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 const ctx=vm.createContext({window:win,document,localStorage,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},MutationObserver:class{observe(){}},URLSearchParams,console});
 vm.runInContext(collection,ctx,{filename:'starter-collection.js'});
 vm.runInContext(economy,ctx,{filename:'battle-economy.js'});
 return {win,store};
}
const fresh=boot();
assert.deepEqual(Array.from(fresh.win.BlazingCollection.load().owned),['tyler','subzero','senku']);
assert.equal(fresh.win.BlazingCollection.owns('Scorpion'),false);
assert.equal(fresh.win.BlazingEconomy.balance(),300);
assert.equal(fresh.win.BlazingEconomy.emberBalance(),3);
assert.equal(fresh.win.BlazingEconomy.spendEmbers(3),true);
assert.equal(fresh.win.BlazingEconomy.spendEmbers(1),false);
assert.equal(fresh.win.BlazingEconomy.emberBalance(),0);
assert.equal(fresh.win.BlazingCollection.unlock('Scorpion'),true);
assert.equal(fresh.win.BlazingCollection.unlock('Scorpion'),false);
assert.equal(fresh.win.BlazingCollection.owns('scorpion'),true);
const earned=boot({'blazing.unitProgression.v1':JSON.stringify({units:{Scorpion:{level:2},'Sub-Zero':{level:1}}}),'blazing.economy.v1':JSON.stringify({battleMarks:900,embers:12,lifetimeEarned:900})});
assert.equal(earned.win.BlazingCollection.owns('scorpion'),true);
assert.equal(earned.win.BlazingEconomy.balance(),900);
assert.equal(earned.win.BlazingEconomy.emberBalance(),12);
assert.equal(earned.win.BlazingCollection.owns('Obito'),false);
const tester=boot({},'?bbAnimationTest=1');
assert.equal(tester.win.BlazingCollection.testMode,true);
assert.equal(tester.win.BlazingCollection.owns('Scorpion'),true);
assert.deepEqual(JSON.parse(tester.store.get('blazing.collection.v1')).owned,['tyler','subzero','senku']);
assert.equal(fresh.win.BlazingCollection.testMode,false);
console.log('Starter account contract PASS: 3 fighters, 300 Coins, 3 Embers, unlock persistence and old save compatibility.');
