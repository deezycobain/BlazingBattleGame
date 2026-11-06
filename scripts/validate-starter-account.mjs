import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const collection=fs.readFileSync('runtime/core/starter-collection.js','utf8');
const teamPostprocess=fs.readFileSync('scripts/starter-account-postprocess.mjs','utf8');
assert.ok(teamPostprocess.includes("testMode?['Itachi',null,'Obito',null,'Scorpion',null]"),'QA team defaults to three requested fighters');
assert.ok(teamPostprocess.includes('blazingBattle.animationTestTeam.v1'), 'QA team storage stays separate from the normal account');
const economy=fs.readFileSync('runtime/modes/battle-economy.js','utf8');
const road=fs.readFileSync('runtime/modes/blazing-road-run.js','utf8');
function boot(entries={},search=''){
 const store=new Map(Object.entries(entries));
 const localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,val)=>store.set(key,String(val)),
  removeItem:key=>store.delete(key)
 };
 const win={location:{search},localStorage,BLAZING_UNIT_DATA:{tyler:{id:'tyler',display_name:'Tyler',role:'playable'},subzero:{id:'subzero',display_name:'Sub-Zero',role:'playable'},senku:{id:'senku',display_name:'Senku',role:'playable'},scorpion:{id:'scorpion',display_name:'Scorpion',role:'playable'}},addEventListener(){},dispatchEvent(){}};
 const document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 const ctx=vm.createContext({window:win,document,localStorage,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},MutationObserver:class{observe(){}},URLSearchParams,console});
 vm.runInContext(collection,ctx,{filename:'starter-collection.js'});
 vm.runInContext(economy,ctx,{filename:'battle-economy.js'});
 vm.runInContext(road,ctx,{filename:'blazing-road-run.js'});
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
const friend=boot({},'?bbFriendTest=1&bbFriendMap=2');
assert.equal(friend.win.BlazingCollection.testMode,true,'friend link exposes full playable roster');
assert.equal(friend.win.BlazingCollection.owns('Scorpion'),true);
assert.equal(friend.win.BlazingEconomy.friendTest,true);
assert.equal(friend.win.BlazingEconomy.emberBalance(),Infinity);
assert.equal(friend.win.BlazingEconomy.spendEmbers(999999),true);
assert.equal(friend.store.has('blazing.economy.v1'),false,'free friend pulls do not modify the normal wallet');
const testRun=friend.win.BlazingRoadRun.createRun([{name:'Scorpion',hp:100,maxHp:100,maxChakra:6,chakra:3}],{stage:1});
assert.equal(testRun.stage,2,'second map launches directly');
assert.notEqual(friend.win.BlazingRoadRun.STORAGE_KEY,fresh.win.BlazingRoadRun.STORAGE_KEY,'friend and normal Road saves are separate');
assert.equal(fresh.win.BlazingRoadRun.createRun([{name:'Tyler',hp:100,maxHp:100}],{stage:1}).stage,1);
const launcher=fs.readFileSync('friend-test.html','utf8');
assert.ok(launcher.includes('bbFriendMap=1')&&launcher.includes('bbFriendMap=2'),'friend launcher contains both map links');
console.log('Starter account and friend playtest PASS: starter economy protected, full QA roster, infinite free pulls, separate map saves.');
