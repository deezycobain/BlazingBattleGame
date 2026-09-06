(()=>{
'use strict';

const SCHEMA_VERSION=1;
const MODE='blazing-road';
const STORAGE_KEY='blazingBattle.blazingRoad.run.v1';

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const integer=(value,fallback=0)=>Number.isInteger(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const now=()=>new Date().toISOString();

function normalizeId(value){
  return String(value??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function stateUnitId(state){
  if(!state||typeof state!=='object')return '';
  return normalizeId(state.unit_id??state.id??state.unitId??state.name??state.display_name);
}

function readMaxHp(state){
  if(!state||typeof state!=='object')return 0;
  return Math.max(0,finite(state.max_hp??state.maxHp??state.stats?.hp??state.hp,0));
}

function readHp(state,maxHp=readMaxHp(state)){
  if(!state||typeof state!=='object')return 0;
  return clamp(finite(state.hp,maxHp),0,maxHp);
}

function normalizeFighter(input){
  const unit_id=stateUnitId(input);
  if(!unit_id)throw new Error('Blazing Road fighter requires a unit id');
  const max_hp=readMaxHp(input);
  if(max_hp<=0)throw new Error(`Blazing Road fighter ${unit_id} requires positive max HP`);
  const hp=readHp(input,max_hp);
  return Object.freeze({unit_id,max_hp,hp,defeated:hp<=0});
}

function cloneRun(run){
  return {
    schema_version:run.schema_version,
    mode:run.mode,
    run_id:run.run_id,
    stage:run.stage,
    status:run.status,
    fighters:run.fighters.map(f=>({...f})),
    started_at:run.started_at,
    updated_at:run.updated_at
  };
}

function validateRun(run){
  if(!run||typeof run!=='object')throw new Error('Blazing Road run is required');
  if(run.schema_version!==SCHEMA_VERSION)throw new Error(`Unsupported Blazing Road schema ${run.schema_version}`);
  if(run.mode!==MODE)throw new Error(`Invalid Blazing Road mode ${run.mode}`);
  if(typeof run.run_id!=='string'||!run.run_id)throw new Error('Blazing Road run_id is required');
  if(!Number.isInteger(run.stage)||run.stage<1)throw new Error('Blazing Road stage must be a positive integer');
  if(!['active','failed','complete'].includes(run.status))throw new Error(`Invalid Blazing Road status ${run.status}`);
  if(!Array.isArray(run.fighters)||!run.fighters.length)throw new Error('Blazing Road run requires fighters');
  const seen=new Set();
  for(const fighter of run.fighters){
    const normalized=normalizeFighter(fighter);
    if(seen.has(normalized.unit_id))throw new Error(`Duplicate Blazing Road fighter ${normalized.unit_id}`);
    seen.add(normalized.unit_id);
    if(fighter.max_hp!==normalized.max_hp||fighter.hp!==normalized.hp||Boolean(fighter.defeated)!==normalized.defeated){
      throw new Error(`Invalid Blazing Road fighter state for ${normalized.unit_id}`);
    }
  }
  if(run.status==='active'&&!run.fighters.some(f=>f.hp>0))throw new Error('Active Blazing Road run must have a living fighter');
  return run;
}

function createRun(fighters,{stage=1,runId=null,startedAt=null}={}){
  if(!Array.isArray(fighters)||!fighters.length)throw new Error('Blazing Road requires at least one fighter');
  const normalized=fighters.map(normalizeFighter);
  const seen=new Set();
  for(const fighter of normalized){if(seen.has(fighter.unit_id))throw new Error(`Duplicate Blazing Road fighter ${fighter.unit_id}`);seen.add(fighter.unit_id);}
  const startStage=integer(stage,0);
  if(startStage<1)throw new Error('Blazing Road stage must be a positive integer');
  const stamp=startedAt||now();
  const run={
    schema_version:SCHEMA_VERSION,
    mode:MODE,
    run_id:runId||`road-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
    stage:startStage,
    status:normalized.some(f=>f.hp>0)?'active':'failed',
    fighters:normalized.map(f=>({...f})),
    started_at:stamp,
    updated_at:stamp
  };
  return validateRun(run);
}

function fighterFor(run,state){
  const id=stateUnitId(state);
  return run.fighters.find(f=>f.unit_id===id)||null;
}

function applyRunToBattle(run,battlers){
  validateRun(run);
  if(!Array.isArray(battlers))throw new Error('Blazing Road battlers must be an array');
  for(const state of battlers){
    const fighter=fighterFor(run,state);
    if(!fighter)continue;
    const battleMax=readMaxHp(state)||fighter.max_hp;
    const carried=clamp(fighter.hp,0,battleMax);
    state.hp=carried;
    if('max_hp' in state)state.max_hp=battleMax;
    if('maxHp' in state)state.maxHp=battleMax;
    state.bbRoadDefeated=carried<=0;
  }
  return battlers;
}

function recordBattleResult(run,battlers){
  validateRun(run);
  if(!Array.isArray(battlers))throw new Error('Blazing Road battlers must be an array');
  const byId=new Map(battlers.map(state=>[stateUnitId(state),state]).filter(([id])=>id));
  const next=cloneRun(run);
  next.fighters=next.fighters.map(fighter=>{
    const state=byId.get(fighter.unit_id);
    if(!state)return {...fighter};
    const battleMax=readMaxHp(state)||fighter.max_hp;
    const hp=clamp(readHp(state,battleMax),0,fighter.max_hp);
    return {...fighter,hp,defeated:hp<=0};
  });
  if(!next.fighters.some(f=>f.hp>0))next.status='failed';
  next.updated_at=now();
  return validateRun(next);
}

function advanceStage(run){
  validateRun(run);
  if(run.status!=='active')throw new Error(`Cannot advance Blazing Road run with status ${run.status}`);
  if(!run.fighters.some(f=>f.hp>0))throw new Error('Cannot advance Blazing Road without a living fighter');
  const next=cloneRun(run);
  next.stage+=1;
  next.updated_at=now();
  return validateRun(next);
}

function completeRun(run){
  validateRun(run);
  const next=cloneRun(run);
  next.status='complete';
  next.updated_at=now();
  return validateRun(next);
}

function livingFighters(run){validateRun(run);return run.fighters.filter(f=>f.hp>0).map(f=>({...f}));}
function defeatedFighters(run){validateRun(run);return run.fighters.filter(f=>f.hp<=0).map(f=>({...f}));}

function storage(){try{return window.localStorage||null}catch{return null}}
function saveRun(run){validateRun(run);const store=storage();if(!store)return false;store.setItem(STORAGE_KEY,JSON.stringify(run));return true;}
function loadRun(){const store=storage();if(!store)return null;const raw=store.getItem(STORAGE_KEY);if(!raw)return null;try{return validateRun(JSON.parse(raw))}catch(error){console.warn('Discarding invalid Blazing Road run:',error);try{store.removeItem(STORAGE_KEY)}catch{}return null;}}
function clearRun(){const store=storage();if(!store)return false;store.removeItem(STORAGE_KEY);return true;}

window.BlazingRoadRun=Object.freeze({
  SCHEMA_VERSION,
  MODE,
  STORAGE_KEY,
  normalizeId,
  stateUnitId,
  validateRun,
  createRun,
  applyRunToBattle,
  recordBattleResult,
  advanceStage,
  completeRun,
  livingFighters,
  defeatedFighters,
  saveRun,
  loadRun,
  clearRun
});
})();
