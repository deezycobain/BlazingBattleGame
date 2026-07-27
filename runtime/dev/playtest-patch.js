(()=>{
  'use strict';
  if(window.__BB_DEV_PLAYTEST_PATCH__)return;
  window.__BB_DEV_PLAYTEST_PATCH__=true;

  const frame=document.getElementById('game');
  const boot=document.getElementById('boot');
  if(!frame||!boot)return;

  const BOMB_SCALE=2;
  const DEV_PLAYER_SPEED=200;
  const DEV_BOSS_SPEED=50;
  const JUTSU_PROJECTILE_SIZE=[291,185];
  const JUTSU_IMPACT_SIZE=[396,267];
  const CHAKRA_KEYS=['chakra','currentChakra','chakraCurrent','chakraNow','current_chakra','energy','currentEnergy','ki','currentKi','charge','charges','chakraCount','chakraPoints','chakraGauge','cp','ch','value','current','amount'];
  const CHAKRA_MAX_KEYS=['chakraMax','maxChakra','chakra_max','max_chakra','energyMax','maxEnergy','kiMax','maxKi','maxCharge','maxCharges','max','capacity'];
  const CHAKRA_ARRAY_KEYS=['chakraPips','chakraOrbs','chakraSegments','pips','orbs','segments'];
  let lastTrigger=0,lastSenkuRect=null,lastHydrateLog=0,suppressLegacyRevivalUntil=0;

  const sourceOf=image=>String(image?.currentSrc||image?.src||'');
  const sourceSize=image=>[image?.naturalWidth||image?.videoWidth||image?.width||0,image?.naturalHeight||image?.videoHeight||image?.height||0];
  const matchesSize=(image,size)=>{const [w,h]=sourceSize(image);return w===size[0]&&h===size[1];};
  const logDev=(type,message)=>{try{frame.contentWindow?.__BLAZING_DEV_MONITOR__?.record(type,message);}catch(_){} };

  function isLegacyRevivalVfx(image){
    if(!image)return false;
    const src=sourceOf(image);
    return src.includes('/senku/vfx/jutsu/chemical_reaction/')||
      src.includes('/senku/vfx/jutsu/revival_formula/')||
      matchesSize(image,JUTSU_PROJECTILE_SIZE)||matchesSize(image,JUTSU_IMPACT_SIZE);
  }
  function looksLikeSenkuBody(image){return sourceOf(image).includes('/senku/sprites/runtime/');}
  function looksLikeSenkuBomb(image){
    if(!image||isLegacyRevivalVfx(image))return false;
    const src=sourceOf(image),[w,h]=sourceSize(image);
    return (src.includes('/senku/')&&src.includes('bomb'))||src.includes('projectile_clean')||(w===96&&h===96);
  }
  function destinationFromArgs(ctx,args){
    let dx=0,dy=0,dw=40,dh=40;
    if(args.length===2){[dx,dy]=args;}else if(args.length===4){[dx,dy,dw,dh]=args;}else if(args.length===8){[, , , ,dx,dy,dw,dh]=args;}
    const rect=ctx.canvas.getBoundingClientRect();
    const sx=rect.width/(ctx.canvas.width||rect.width||1),sy=rect.height/(ctx.canvas.height||rect.height||1);
    return {left:rect.left+dx*sx,top:rect.top+dy*sy,width:dw*sx,height:dh*sy};
  }

  function ensureAirburstStyle(doc){
    if(doc.getElementById('bb-revival-airburst-style'))return;
    const style=doc.createElement('style');style.id='bb-revival-airburst-style';
    style.textContent=`.bb-revival-bottle{position:fixed;z-index:2147483000;pointer-events:none;width:38px;height:30px;object-fit:contain;filter:drop-shadow(0 3px 4px rgba(0,0,0,.45));will-change:transform,opacity}.bb-revival-flash{position:fixed;z-index:2147482999;pointer-events:none;width:40px;height:40px;border-radius:50%;transform:translate(-50%,-50%) scale(.2);opacity:0;background:radial-gradient(circle,rgba(238,255,241,.98) 0%,rgba(124,255,151,.92) 20%,rgba(55,223,101,.62) 44%,rgba(44,179,88,.2) 68%,rgba(44,179,88,0) 80%);box-shadow:0 0 34px rgba(80,255,130,.78)}`;
    doc.head.appendChild(style);
  }
  function playGreenFlash(doc,x,y){
    const flash=doc.createElement('div');flash.className='bb-revival-flash';flash.style.left=x+'px';flash.style.top=y+'px';doc.body.appendChild(flash);
    logDev('ok','Revival Formula • shared green heal flash');
    const start=performance.now(),duration=500;
    function tick(t){const q=Math.min(1,(t-start)/duration);const scale=.2+4.4*Math.sin(Math.PI*q);flash.style.transform=`translate(-50%,-50%) scale(${scale})`;flash.style.opacity=String(q<.18?q/.18:1-(q-.18)/.82);if(q<1)requestAnimationFrame(tick);else flash.remove();}
    requestAnimationFrame(tick);
  }
  function launchRevivalAirburst(){
    const now=performance.now();if(now-lastTrigger<700)return;lastTrigger=now;
    suppressLegacyRevivalUntil=now+2200;
    const doc=frame.contentDocument;if(!doc)return;ensureAirburstStyle(doc);
    const vw=doc.documentElement.clientWidth||innerWidth,vh=doc.documentElement.clientHeight||innerHeight;
    const startX=lastSenkuRect?lastSenkuRect.left+lastSenkuRect.width*.55:vw*.22;
    const startY=lastSenkuRect?lastSenkuRect.top+lastSenkuRect.height*.38:vh*.72;
    const endX=startX+(startX>vw*.5?-72:72),endY=Math.max(vh*.30,startY-145);
    const bottle=doc.createElement('img');bottle.className='bb-revival-bottle';
    bottle.src='assets/characters/senku/vfx/jutsu/chemical_reaction/projectile/frame_01.png';
    bottle.style.left=(startX-19)+'px';bottle.style.top=(startY-15)+'px';doc.body.appendChild(bottle);
    logDev('info','Revival Formula • canonical airburst started from actual Jutsu execution');
    const start=performance.now(),duration=650;
    function tick(t){const q=Math.min(1,(t-start)/duration),x=(endX-startX)*q,y=(endY-startY)*q-95*Math.sin(Math.PI*q),rot=360*q;bottle.style.transform=`translate(${x}px,${y}px) rotate(${rot}deg)`;bottle.style.opacity=String(q<.82?1:1-(q-.82)/.18);if(q<1)requestAnimationFrame(tick);else{bottle.remove();playGreenFlash(doc,endX,endY);}}
    requestAnimationFrame(tick);
  }

  function drawBombScaled(original,ctx,image,args){
    if(args.length===2){const [dx,dy]=args,[ow,oh]=sourceSize(image),nw=ow*BOMB_SCALE,nh=oh*BOMB_SCALE;return original.call(ctx,image,dx-(nw-ow)/2,dy-(nh-oh)/2,nw,nh);}
    if(args.length===4){const [dx,dy,dw,dh]=args,nw=dw*BOMB_SCALE,nh=dh*BOMB_SCALE;return original.call(ctx,image,dx-(nw-dw)/2,dy-(nh-dh)/2,nw,nh);}
    if(args.length===8){const [sx,sy,sw,sh,dx,dy,dw,dh]=args,nw=dw*BOMB_SCALE,nh=dh*BOMB_SCALE;return original.call(ctx,image,sx,sy,sw,sh,dx-(nw-dw)/2,dy-(nh-dh)/2,nw,nh);}
    return original.call(ctx,image,...args);
  }
  function isSenkuTurn(doc){return /Senku(?:'|’)?s turn\b/i.test(String(doc.body?.innerText||''));}
  function wrapDrawImage(original){
    if(typeof original!=='function'||original.__bbCanonicalPatchV2)return original;
    function patchedDrawImage(image,...args){
      if(looksLikeSenkuBody(image))lastSenkuRect=destinationFromArgs(this,args);
      if(isLegacyRevivalVfx(image)){
        // The legacy renderer is now only a signal that the actual Revival Formula attack has executed.
        // Replace it at render-time so selection clicks never play the animation and the old VFX never appears.
        if(performance.now()>=suppressLegacyRevivalUntil&&isSenkuTurn(frame.contentDocument))launchRevivalAirburst();
        return;
      }
      if(looksLikeSenkuBomb(image))return drawBombScaled(original,this,image,args);
      return original.call(this,image,...args);
    }
    patchedDrawImage.__bbCanonicalPatchV2=true;return patchedDrawImage;
  }

  function identityStrings(obj){
    const direct=[obj?.id,obj?.unit_id,obj?.unitId,obj?.characterId,obj?.character_id,obj?.name,obj?.display_name,obj?.displayName,obj?.character,obj?.unit,obj?.mark,obj?.key,obj?.slug];
    const nested=[obj?.unitData?.id,obj?.unitData?.display_name,obj?.definition?.id,obj?.definition?.display_name,obj?.data?.id,obj?.data?.display_name];
    let strings=[...direct,...nested].filter(v=>typeof v==='string').map(v=>v.toLowerCase());
    try{for(const v of Object.values(obj).slice(0,60)){if(typeof v==='string'&&v.toLowerCase().includes('/senku/'))strings.push('senku');}}catch(_){}
    return strings;
  }
  function explicitUnitForObject(obj,core){
    const ids=identityStrings(obj);
    for(const unit of Object.values(core||{})){
      const needles=[unit.id,String(unit.name||'').toLowerCase(),unit.id==='senku'?'s':null].filter(Boolean);
      if(ids.some(v=>needles.includes(v)))return unit;
    }
    return null;
  }
  function looksLikeBoss(obj,unitHint){
    if(unitHint?.role==='boss')return true;
    const ids=identityStrings(obj);
    return ids.some(v=>v==='boss'||v==='anubis'||v.includes('boss'));
  }
  function applyDevCoreToObject(obj,unit){
    if(!obj||typeof obj!=='object'||!unit)return 0;
    let changed=0;
    const isBoss=unit.role==='boss'||looksLikeBoss(obj,unit);
    const desiredSpeed=isBoss?DEV_BOSS_SPEED:DEV_PLAYER_SPEED;

    for(const key of CHAKRA_MAX_KEYS){if(Object.prototype.hasOwnProperty.call(obj,key)&&typeof obj[key]==='number'){try{if(obj[key]!==unit.max){obj[key]=unit.max;changed++;}}catch(_){}}}
    if(unit.role==='playable'){
      for(const key of CHAKRA_KEYS){if(Object.prototype.hasOwnProperty.call(obj,key)){try{if(typeof obj[key]==='number'&&obj[key]!==unit.max){obj[key]=unit.max;changed++;}}catch(_){}}}
      for(const key of CHAKRA_ARRAY_KEYS){if(Object.prototype.hasOwnProperty.call(obj,key)&&Array.isArray(obj[key])){try{const boolMode=obj[key].some(v=>typeof v==='boolean');obj[key]=Array(unit.max).fill(boolMode?true:1);changed++;}catch(_){}}}
      // Senku is the migrated unit and some legacy battle copies do not expose a chakra key at the
      // same object level as older embedded units. Seed the canonical aliases on Senku-bearing state
      // objects so child/legacy consumers have a numeric source instead of falling back to zero.
      if(unit.id==='senku'){
        for(const [key,val] of [['chakra',unit.max],['currentChakra',unit.max],['chakraMax',unit.max]]){
          try{if(!Object.prototype.hasOwnProperty.call(obj,key)){obj[key]=val;changed++;}}catch(_){}
        }
      }
    }
    for(const key of ['speed','spd','meterSpeed','turnSpeed','initiativeSpeed','gaugeSpeed','atbSpeed','actionSpeed']){
      if(Object.prototype.hasOwnProperty.call(obj,key)&&typeof obj[key]==='number'&&obj[key]!==desiredSpeed){try{obj[key]=desiredSpeed;changed++;}catch(_){}}
    }
    return changed;
  }
  function hydrateDevUnitState(win){
    const core=win.BB_UNIT_CORE;if(!core)return 0;
    const seen=new WeakSet(),queue=[];let changed=0,nodes=0,senkuObjects=0,bossObjects=0;
    for(const key of ['gameState','state','battleState','battle','units','players','party','team','roster','combatants','characters','allies','actors']){try{const v=win[key];if(v&&typeof v==='object')queue.push({obj:v,hint:null,depth:0});}catch(_){}}
    try{for(const key of Object.getOwnPropertyNames(win)){let v;try{v=win[key];}catch(_){continue;}if(v&&typeof v==='object'&&!v.nodeType&&v!==win.document)queue.push({obj:v,hint:null,depth:0});}}catch(_){}
    while(queue.length&&nodes<16000){
      const item=queue.shift(),obj=item?.obj;if(!obj||typeof obj!=='object'||seen.has(obj))continue;seen.add(obj);nodes++;
      const explicit=explicitUnitForObject(obj,core);const hint=explicit||item.hint;
      if(hint){changed+=applyDevCoreToObject(obj,hint);if(hint.id==='senku')senkuObjects++;if(hint.role==='boss')bossObjects++;}
      let entries=[];try{entries=Array.isArray(obj)?obj.slice(0,120).map((v,i)=>[String(i),v]):Object.entries(obj).slice(0,120);}catch(_){continue;}
      for(const [key,v] of entries){if(!v||typeof v!=='object'||v.nodeType||seen.has(v))continue;let childHint=hint;
        // Do not blindly propagate unit identity through containers that may hold multiple combatants.
        if(['units','players','party','team','roster','combatants','characters','allies','actors'].includes(String(key).toLowerCase()))childHint=null;
        queue.push({obj:v,hint:childHint,depth:item.depth+1});
      }
    }
    if((changed||senkuObjects||bossObjects)&&performance.now()-lastHydrateLog>1200){lastHydrateLog=performance.now();logDev('ok',`unit hydration • fields ${changed} • senku nodes ${senkuObjects} • boss nodes ${bossObjects}`);}
    return changed;
  }

  function installBossStyle(doc){
    if(!doc.getElementById('bb-ornate-boss-style')){const style=doc.createElement('style');style.id='bb-ornate-boss-style';style.textContent=`.bb-ornate-boss-hp{position:relative!important;height:18px!important;min-height:18px!important;max-height:18px!important;margin-top:3px!important;overflow:visible!important;border:2px solid #a9772e!important;border-radius:5px!important;background:linear-gradient(180deg,#170708 0%,#090303 55%,#160607 100%)!important}.bb-ornate-boss-hp::before,.bb-ornate-boss-hp::after{content:'';position:absolute;z-index:8;top:50%;width:9px;height:9px;background:#2a130b;border:1px solid #c19443;transform:translateY(-50%) rotate(45deg)}.bb-ornate-boss-hp::before{left:-6px}.bb-ornate-boss-hp::after{right:-6px}.bb-ornate-boss-fill{height:10px!important;top:2px!important;background:linear-gradient(180deg,#ff3b3b 0%,#d51220 46%,#8e0712 100%)!important}.bb-ornate-boss-label{z-index:10!important;color:#f6cf55!important;font-size:13px!important}`;doc.head.appendChild(style);}
    const labels=[...doc.querySelectorAll('*')].filter(el=>el.children.length===0&&el.textContent.trim()==='BOSS');
    labels.forEach(label=>{label.classList.add('bb-ornate-boss-label');let bar=null;for(let el=label.parentElement;el&&el!==doc.body;el=el.parentElement){const r=el.getBoundingClientRect();if(r.width>250&&r.height>=12&&r.height<=55){bar=el;break;}}if(!bar)return;bar.classList.add('bb-ornate-boss-hp');const br=bar.getBoundingClientRect();let fill=null,best=0;[...bar.children].filter(el=>el!==label).forEach(el=>{const r=el.getBoundingClientRect(),score=r.width*r.height;if(r.width>20&&r.height>4&&r.height<=br.height+8&&score>best){best=score;fill=el;}});if(fill)fill.classList.add('bb-ornate-boss-fill');});
  }
  function installDevMonitor(doc){if(doc.getElementById('bb-dev-monitor-loader')||doc.getElementById('bb-dev-monitor'))return;const s=doc.createElement('script');s.id='bb-dev-monitor-loader';s.src='runtime/dev/dev-monitor.js?v=6ca0761';doc.head.appendChild(s);}

  function install(){
    try{
      const win=frame.contentWindow,doc=frame.contentDocument;if(!win||!doc)return;
      ensureAirburstStyle(doc);hydrateDevUnitState(win);
      if(win.CanvasRenderingContext2D){const proto=win.CanvasRenderingContext2D.prototype;if(!proto.__bbCanonicalPatchV2){proto.drawImage=wrapDrawImage(proto.drawImage);proto.__bbCanonicalPatchV2=true;}}
      doc.querySelectorAll('canvas').forEach(c=>{try{const ctx=c.getContext('2d');if(ctx&&!ctx.__bbCanonicalPatchV2){ctx.drawImage=wrapDrawImage(ctx.drawImage);ctx.__bbCanonicalPatchV2=true;}}catch(_){}});
      installBossStyle(doc);installDevMonitor(doc);
      const pre=win.__BB_DEV_PREBOOT__;boot.textContent=pre?'DEV READY • PLAYERS 200 • BOSS 50 • REVIVAL EXECUTION HOOK':'DEV READY • CORE CHECKING';setTimeout(()=>boot.style.opacity='0',2200);
    }catch(e){boot.textContent='DEV PATCH ACCESS ERROR';boot.style.opacity='1';}
  }

  frame.addEventListener('load',()=>{install();[50,150,300,600,1000,1600,2500,4000].forEach(ms=>setTimeout(install,ms));setInterval(install,500);});
  setTimeout(()=>{if(boot.textContent==='DEV LOADING…')boot.textContent='DEV GAME LOAD FAILED';},10000);
})();