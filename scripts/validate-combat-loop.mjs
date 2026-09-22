import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile('runtime/combat/combat-loop-runtime.js','utf8');
const sandbox={window:{}};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'combat-loop-runtime.js'});
const loop=sandbox.window.BlazingCombatLoop;
if(!loop)throw new Error('Combat loop runtime did not initialize');

const unit=(name,{hp=100,speed=10}={})=>({name,hp,maxHp:100,speed});
const pair=(name,{hp=100,speed=10,gauge=0}={})=>({units:[unit(name,{hp,speed})],active:0,gauge});
const enemy=(name,{hp=100,speed=10,gauge=0}={})=>({...unit(name,{hp,speed}),gauge});

const alpha=pair('Alpha',{speed:10,gauge:92});
const beta=pair('Beta',{speed:30,gauge:30});
const ko=pair('KO Ally',{hp:0,speed:100,gauge:100});
const red=enemy('Red',{speed:20,gauge:80});
const blue=enemy('Blue',{speed:5,gauge:95});
const state={pairs:[alpha,beta,ko],enemies:[red,blue],phase:'player',ready:{kind:'pair',ref:alpha,g:100}};

const snap=loop.snapshot(state,{limit:5});
if(snap.phase.label!=='YOUR TURN'||snap.current?.name!=='Alpha')throw new Error(`Current player turn was not canonical: ${JSON.stringify(snap)}`);
if(snap.queue.some(item=>item.name==='KO Ally'))throw new Error('KO fighter survived actionable turn queue');
if(snap.queue[0]?.name!=='Alpha'||!snap.queue[0]?.current)throw new Error(`Ready actor did not own queue head: ${JSON.stringify(snap.queue)}`);
const predicted=snap.queue.slice(1).map(item=>item.name);
if(predicted.join(',')!=='Blue,Red,Beta')throw new Error(`Gauge/speed readiness order is wrong: ${JSON.stringify(predicted)}`);

state.phase='cpu';state.ready={kind:'enemy',ref:red,g:100};
const enemySnap=loop.snapshot(state,{limit:5});
if(enemySnap.phase.label!=='ENEMY TURN'||enemySnap.current?.name!=='Red')throw new Error(`Enemy turn ownership was not canonical: ${JSON.stringify(enemySnap)}`);

const victory={pairs:[pair('Alive')],enemies:[enemy('Down',{hp:0})],phase:'resolve',ready:null};
if(loop.outcome(victory)!=='victory'||loop.phase(victory).label!=='VICTORY')throw new Error('Victory outcome contract failed');
const defeat={pairs:[pair('Down',{hp:0})],enemies:[enemy('Alive')],phase:'resolve',ready:null};
if(loop.outcome(defeat)!=='defeat'||loop.phase(defeat).label!=='DEFEAT')throw new Error('Defeat outcome contract failed');

const roadAlive={bbRunMode:'road',bbRoadTeamHp:80,pairs:[pair('Road A',{hp:0}),pair('Road B',{hp:0})],enemies:[enemy('Road Enemy')],phase:'player',ready:{kind:'pair',ref:null}};
roadAlive.ready.ref=roadAlive.pairs[0];
const roadSnap=loop.snapshot(roadAlive,{limit:4});
if(loop.outcome(roadAlive)!=='ongoing'||!roadSnap.queue.some(item=>item.name==='Road A')||!roadSnap.queue.some(item=>item.name==='Road B'))throw new Error(`Road shared-team HP did not keep player units actionable: ${JSON.stringify(roadSnap)}`);
roadAlive.bbRoadTeamHp=0;
if(loop.outcome(roadAlive)!=='defeat')throw new Error('Road team did not defeat as one shared HP pool');

// Road authored initiative must consume a reusable stun exactly when that actor's turn arrives.
const combatSource=await fs.readFile('runtime/combat/combat-runtime.js','utf8');
const roadTurnsSource=await fs.readFile('runtime/combat/road-round-turns.js','utf8');
const roadSandbox={
 window:{addEventListener:()=>{}},
 console,
 S:null,
 document:{
  readyState:'loading',
  addEventListener:()=>{},
  getElementById:id=>id==='battleScreen'?{classList:{contains:value=>value==='active'}}:null
 }
};
vm.createContext(roadSandbox);
vm.runInContext(combatSource,roadSandbox,{filename:'combat-runtime.js'});
const stunnedEnemy=enemy('Stunned Enemy',{speed:90,gauge:0});
const nextEnemy=enemy('Next Enemy',{speed:80,gauge:0});
const roadPair=pair('Road Hero',{speed:70,gauge:0});
roadSandbox.S={bbRunMode:'road',bbRoadTeamHp:100,bbRoadStage:1,bbRoadRun:{run_id:'stun-test'},pairs:[roadPair],enemies:[stunnedEnemy,nextEnemy],phase:'charge',ready:null,log:''};
roadSandbox.window.BlazingCombatRuntime.applyStatus(stunnedEnemy,'stun',{turns:1,source:'validator'});
vm.runInContext(roadTurnsSource,roadSandbox,{filename:'road-round-turns.js'});
const roadTurns=roadSandbox.window.BlazingRoadTurns;
const stunSnap=roadTurns.sync()&&roadTurns.snapshot({limit:3});
if(!stunSnap?.active||stunSnap.current?.name!=='Next Enemy')throw new Error(`One-turn stun did not skip the stunned Road actor: ${JSON.stringify(stunSnap)}`);
if(roadSandbox.window.BlazingCombatRuntime.hasStatus(stunnedEnemy,'stun'))throw new Error('Road initiative did not consume the stunned actor\'s one-turn status');
if(!/stunned and loses the turn/i.test(roadSandbox.S.log))throw new Error(`Road stun skip did not publish a combat log message: ${roadSandbox.S.log}`);

const dock=await fs.readFile('runtime/ui/battle/battle-dock.js','utf8');
for(const marker of ['BlazingCombatLoop','bb-dock-turns','bb-turn-queue','BlazingRoadSharedHp','toggleJutsu','YOUR TURN','ENEMY TURN'])if(!dock.includes(marker))throw new Error(`Battle dock missing combat-loop marker: ${marker}`);
const css=await fs.readFile('runtime/ui/battle/battle-dock.css','utf8');
for(const marker of ['.bb-dock-turns','.bb-turn-chip.current','.bb-dock-unit.armed','.bb-dock-actions{display:none'])if(!css.includes(marker))throw new Error(`Battle dock CSS missing combat-loop marker: ${marker}`);
const post=await fs.readFile('scripts/battle-mobile-controls-postprocess.mjs','utf8');
for(const marker of ['runtime/combat/combat-loop-runtime.js','bb-combat-loop-runtime','runtime/modes/blazing-road-battle-refinements.js','bb-blazing-road-battle-refinements'])if(!post.includes(marker))throw new Error(`Production build does not inject combat-loop marker: ${marker}`);

console.log('Combat loop validation PASS: canonical ordering, Road shared-team HP, reusable one-turn stun skips, portrait jutsu wiring, and victory/defeat outcomes.');
