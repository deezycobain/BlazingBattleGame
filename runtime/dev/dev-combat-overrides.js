(()=>{
  if(window.__BB_DEV_COMBAT_OVERRIDES__) return;

  const TARGET_SPEED=200;
  const DEFAULT_MAX_CHAKRA=8;
  const seen=new WeakSet();
  const log=(type,msg)=>{try{window.__BLAZING_DEV_MONITOR__?.record(type,msg);}catch(_){}};
  const isObj=v=>v&&typeof v==='object';

  const speedKeys=['speed','spd','meterSpeed','turnSpeed','initiativeSpeed','gaugeSpeed','atbSpeed','actionSpeed'];
  const chakraKeys=['chakra','currentChakra','chakraCurrent','energy','currentEnergy','ki','currentKi'];
  const maxChakraKeys=['chakraMax','maxChakra','chakra_max','energyMax','maxEnergy','kiMax','maxKi'];
  const hpKeys=['hp','currentHp','currentHP','health','currentHealth','maxHp','maxHP','hpMax'];
  const combatStatKeys=['attack','atk','defense','def','speed','spd'];

  function hasNumericKey(o,keys){
    return keys.some(k=>typeof o?.[k]==='number');
  }

  function isUnitLike(o){
    if(!isObj(o)) return false;
    let signals=0;
    if(hasNumericKey(o,hpKeys)) signals++;
    if(hasNumericKey(o,combatStatKeys)) signals++;
    if(hasNumericKey(o,chakraKeys)||hasNumericKey(o,maxChakraKeys)) signals++;
    const idish=['id','unit_id','unitId','name','display_name','displayName','character','characterId','slug'].some(k=>typeof o[k]==='string');
    if(idish) signals++;
    return signals>=2;
  }

  function setNumber(o,key,value){
    if(!isObj(o)||!(key in o)||typeof o[key]!=='number') return 0;
    try{if(o[key]!==value){o[key]=value;return 1;}}catch(_){}
    return 0;
  }

  function maxChakraFor(o){
    for(const k of maxChakraKeys){
      if(typeof o?.[k]==='number'&&Number.isFinite(o[k])&&o[k]>0) return o[k];
    }
    for(const childKey of ['stats','combat','battle','runtime','state','resources','meters']){
      const child=o?.[childKey];
      if(!isObj(child)) continue;
      for(const k of maxChakraKeys){
        if(typeof child[k]==='number'&&Number.isFinite(child[k])&&child[k]>0) return child[k];
      }
    }
    return DEFAULT_MAX_CHAKRA;
  }

  function boostUnit(o){
    if(!isUnitLike(o)) return 0;
    let changes=0;
    const max=maxChakraFor(o);

    speedKeys.forEach(k=>{changes+=setNumber(o,k,TARGET_SPEED);});
    maxChakraKeys.forEach(k=>{
      if(k in o&&typeof o[k]==='number') changes+=setNumber(o,k,Math.max(o[k],DEFAULT_MAX_CHAKRA));
    });
    chakraKeys.forEach(k=>{
      if(k in o&&typeof o[k]==='number') changes+=setNumber(o,k,max);
    });

    for(const childKey of ['stats','combat','battle','runtime','state','resources','meters']){
      const child=o[childKey];
      if(!isObj(child)) continue;
      speedKeys.forEach(k=>{changes+=setNumber(child,k,TARGET_SPEED);});
      maxChakraKeys.forEach(k=>{
        if(k in child&&typeof child[k]==='number') changes+=setNumber(child,k,Math.max(child[k],DEFAULT_MAX_CHAKRA));
      });
      chakraKeys.forEach(k=>{
        if(k in child&&typeof child[k]==='number') changes+=setNumber(child,k,maxChakraFor(child));
      });
    }
    return changes;
  }

  function walk(root,maxDepth=7,maxNodes=22000){
    const queue=[{v:root,d:0}], localSeen=new WeakSet();
    let nodes=0,units=0,changes=0;
    while(queue.length&&nodes<maxNodes){
      const {v,d}=queue.shift();
      if(!isObj(v)||localSeen.has(v)) continue;
      localSeen.add(v); nodes++;
      if(isUnitLike(v)){units++;changes+=boostUnit(v);}
      if(d>=maxDepth) continue;
      let keys=[];try{keys=Object.keys(v).slice(0,220);}catch(_){continue;}
      for(const k of keys){
        if(['window','self','parent','top','frames','document','ownerDocument'].includes(k)) continue;
        let child;try{child=v[k];}catch(_){continue;}
        if(isObj(child)&&!(child instanceof Node)) queue.push({v:child,d:d+1});
      }
    }
    return {nodes,units,changes};
  }

  function allRoots(){
    const roots=[];
    for(const k of Object.getOwnPropertyNames(window)){
      if(/^on|^webkit|^HTML|^SVG|^CSS|^Intl/.test(k)) continue;
      let v;try{v=window[k];}catch(_){continue;}
      if(isObj(v)&&v!==window&&!(v instanceof Node)) roots.push(v);
      if(roots.length>=600) break;
    }
    return roots;
  }

  function apply(){
    let units=0,changes=0,nodes=0;
    try{
      for(const root of allRoots()){
        const r=walk(root,7,1800);
        units+=r.units;changes+=r.changes;nodes+=r.nodes;
        if(nodes>22000) break;
      }
    }catch(e){log('warn',`DEV combat override scan error • ${e.message||e}`);}
    if(changes) log('ok',`DEV combat overrides • units ${units} • speed ${TARGET_SPEED} • chakra full • changes ${changes}`);
    return {units,changes,nodes};
  }

  // Catch units inserted into arrays/objects after battle initialization.
  const nativePush=Array.prototype.push;
  if(!nativePush.__bbDevWrapped){
    function wrappedPush(...items){
      for(const item of items){
        try{if(isObj(item)){boostUnit(item);walk(item,4,800);}}catch(_){}
      }
      return nativePush.apply(this,items);
    }
    wrappedPush.__bbDevWrapped=true;
    Array.prototype.push=wrappedPush;
  }

  const nativeAssign=Object.assign;
  if(!nativeAssign.__bbDevWrapped){
    function wrappedAssign(target,...sources){
      const result=nativeAssign(target,...sources);
      try{if(isObj(result))boostUnit(result);}catch(_){}
      return result;
    }
    wrappedAssign.__bbDevWrapped=true;
    Object.assign=wrappedAssign;
  }

  window.__BB_DEV_COMBAT_OVERRIDES__={apply,TARGET_SPEED,DEFAULT_MAX_CHAKRA};
  [0,50,150,300,600,1000,1600,2500,4000,6500].forEach(ms=>setTimeout(apply,ms));
  setInterval(apply,350);
  log('ok','DEV combat override active • ALL units • speed 200 • chakra full');
})();