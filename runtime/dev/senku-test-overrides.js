(()=>{
  if(window.__SENKU_TEST_OVERRIDES__) return;

  const TARGET_CHAKRA=4;
  const TARGET_SPEED=240;
  const seen=new WeakSet();
  let lastFound=0;

  const isObj=v=>v&&typeof v==='object';
  const lower=v=>String(v??'').toLowerCase();
  const isSenku=o=>{
    if(!isObj(o)) return false;
    const keys=['id','unit_id','unitId','key','name','display_name','displayName','character','characterId','slug'];
    return keys.some(k=>lower(o[k]).includes('senku'));
  };

  function setNum(o,key,value,mode='set'){
    if(!isObj(o)||!(key in o)||typeof o[key]!=='number') return false;
    try{
      o[key]=mode==='min'?Math.max(o[key],value):value;
      return true;
    }catch(_){return false;}
  }

  function boostSenku(o){
    let changes=0;
    const speedKeys=['speed','spd','meterSpeed','turnSpeed','initiativeSpeed','gaugeSpeed'];
    const chakraKeys=['chakra','currentChakra','chakraCurrent','energy','currentEnergy'];

    speedKeys.forEach(k=>{if(setNum(o,k,TARGET_SPEED))changes++;});
    chakraKeys.forEach(k=>{if(setNum(o,k,TARGET_CHAKRA,'min'))changes++;});

    for(const childKey of ['stats','combat','battle','runtime','state','resources','meters']){
      const child=o[childKey];
      if(!isObj(child)) continue;
      speedKeys.forEach(k=>{if(setNum(child,k,TARGET_SPEED))changes++;});
      chakraKeys.forEach(k=>{if(setNum(child,k,TARGET_CHAKRA,'min'))changes++;});
    }

    // Common max/current pairings: never lower max below the turn-one test requirement.
    for(const k of ['chakraMax','maxChakra','chakra_max','energyMax','maxEnergy']){
      if(setNum(o,k,TARGET_CHAKRA,'min'))changes++;
    }
    return changes;
  }

  function walk(root,maxDepth=4,maxNodes=7000){
    const queue=[{v:root,d:0}], localSeen=new WeakSet();
    let nodes=0,found=0,changes=0;
    while(queue.length&&nodes<maxNodes){
      const {v,d}=queue.shift();
      if(!isObj(v)||localSeen.has(v))continue;
      localSeen.add(v);nodes++;
      if(isSenku(v)){
        found++;
        changes+=boostSenku(v);
      }
      if(d>=maxDepth)continue;
      let keys=[];
      try{keys=Array.isArray(v)?Object.keys(v).slice(0,80):Object.keys(v).slice(0,120);}catch(_){continue;}
      for(const k of keys){
        if(k==='window'||k==='self'||k==='parent'||k==='top'||k==='frames'||k==='document'||k==='ownerDocument')continue;
        let child;try{child=v[k];}catch(_){continue;}
        if(isObj(child)&&!(child instanceof Node))queue.push({v:child,d:d+1});
      }
    }
    return {found,changes,nodes};
  }

  function apply(){
    let result={found:0,changes:0,nodes:0};
    try{
      // Scan app-owned globals individually instead of traversing browser internals from Window itself.
      const roots=[];
      for(const k of Object.keys(window)){
        if(/^webkit|^on|^HTML|^SVG|^CSS|^Intl|^performance$|^location$|^navigator$|^history$|^screen$/.test(k))continue;
        let v;try{v=window[k];}catch(_){continue;}
        if(isObj(v)&&!(v instanceof Node)&&v!==window)roots.push(v);
        if(roots.length>=250)break;
      }
      for(const root of roots){
        const r=walk(root,4,900);
        result.found+=r.found;result.changes+=r.changes;result.nodes+=r.nodes;
        if(result.nodes>7000)break;
      }
    }catch(e){
      window.__BLAZING_DEV_MONITOR__?.record('warn',`Senku test override scan error • ${e.message||e}`);
    }
    if(result.found&&(!lastFound||result.changes)){
      window.__BLAZING_DEV_MONITOR__?.record('ok',`Senku TEST override • chakra ≥${TARGET_CHAKRA} • speed ${TARGET_SPEED} • matches ${result.found}`);
    }
    lastFound=result.found;
    return result;
  }

  const api={apply,TARGET_CHAKRA,TARGET_SPEED};
  window.__SENKU_TEST_OVERRIDES__=api;
  [100,300,700,1200,2000,3500].forEach(ms=>setTimeout(apply,ms));
  setInterval(apply,1200);
})();