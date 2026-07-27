(()=>{
  if(window.__SENKU_TEST_OVERRIDES__) return;

  const TARGET_SPEED=200;
  const TARGET_CHAKRA=8;
  let lastFound=0;
  const isObj=v=>v&&typeof v==='object';
  const lower=v=>String(v??'').toLowerCase();
  const isSenku=o=>{if(!isObj(o))return false;const keys=['id','unit_id','unitId','key','name','display_name','displayName','character','characterId','slug'];return keys.some(k=>lower(o[k]).includes('senku'));};

  function setNum(o,key,value){if(!isObj(o)||!(key in o)||typeof o[key]!=='number')return false;try{o[key]=value;return true;}catch(_){return false;}}
  function boostSenku(o){
    let changes=0;
    const speedKeys=['speed','spd','meterSpeed','turnSpeed','initiativeSpeed','gaugeSpeed'];
    const currentKeys=['chakra','currentChakra','chakraCurrent','energy','currentEnergy'];
    const maxKeys=['chakraMax','maxChakra','chakra_max','energyMax','maxEnergy'];
    speedKeys.forEach(k=>{if(setNum(o,k,TARGET_SPEED))changes++;});
    maxKeys.forEach(k=>{if(setNum(o,k,TARGET_CHAKRA))changes++;});
    currentKeys.forEach(k=>{if(setNum(o,k,TARGET_CHAKRA))changes++;});
    for(const childKey of ['stats','combat','battle','runtime','state','resources','meters']){
      const child=o[childKey];if(!isObj(child))continue;
      speedKeys.forEach(k=>{if(setNum(child,k,TARGET_SPEED))changes++;});
      maxKeys.forEach(k=>{if(setNum(child,k,TARGET_CHAKRA))changes++;});
      currentKeys.forEach(k=>{if(setNum(child,k,TARGET_CHAKRA))changes++;});
    }
    return changes;
  }

  function walk(root,maxDepth=5,maxNodes=10000){
    const queue=[{v:root,d:0}],seen=new WeakSet();let nodes=0,found=0,changes=0;
    while(queue.length&&nodes<maxNodes){
      const {v,d}=queue.shift();if(!isObj(v)||seen.has(v))continue;seen.add(v);nodes++;
      if(isSenku(v)){found++;changes+=boostSenku(v);}
      if(d>=maxDepth)continue;
      let keys=[];try{keys=Object.keys(v).slice(0,160);}catch(_){continue;}
      for(const k of keys){
        if(['window','self','parent','top','frames','document','ownerDocument'].includes(k))continue;
        let child;try{child=v[k];}catch(_){continue;}
        if(isObj(child)&&!(child instanceof Node))queue.push({v:child,d:d+1});
      }
    }
    return {found,changes,nodes};
  }

  function apply(){
    let result={found:0,changes:0,nodes:0};
    try{
      const roots=[];
      for(const k of Object.keys(window)){
        if(/^webkit|^on|^HTML|^SVG|^CSS|^Intl|^performance$|^location$|^navigator$|^history$|^screen$/.test(k))continue;
        let v;try{v=window[k];}catch(_){continue;}
        if(isObj(v)&&!(v instanceof Node)&&v!==window)roots.push(v);
        if(roots.length>=350)break;
      }
      for(const root of roots){const r=walk(root,5,1400);result.found+=r.found;result.changes+=r.changes;result.nodes+=r.nodes;if(result.nodes>10000)break;}
    }catch(e){window.__BLAZING_DEV_MONITOR__?.record('warn',`Senku dev boost scan error • ${e.message||e}`);}
    if(result.found&&(!lastFound||result.changes))window.__BLAZING_DEV_MONITOR__?.record('ok',`Senku DEV boost • chakra ${TARGET_CHAKRA}/${TARGET_CHAKRA} • speed ${TARGET_SPEED} • matches ${result.found}`);
    lastFound=result.found;return result;
  }

  window.__SENKU_TEST_OVERRIDES__={apply,TARGET_CHAKRA,TARGET_SPEED};
  [50,150,300,600,1000,1800,3000,5000].forEach(ms=>setTimeout(apply,ms));
  setInterval(apply,500);
})();