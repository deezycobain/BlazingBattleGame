(() => {
  'use strict';

  const BASE = '../';
  const $ = id => document.getElementById(id);
  const els = {
    unitId:$('unitId'), loadUnit:$('loadUnit'), preset:$('preset'), actions:$('actions'),
    prev:$('prev'), next:$('next'), play:$('play'), sequence:$('sequence'), vfxOnly:$('vfxOnly'), resetPos:$('resetPos'),
    stage:$('stage'), actor:$('actorBox'), sprite:$('sprite'), alphaBounds:$('alphaBounds'), dummy:$('dummy'), vfx:$('vfx'),
    frameTag:$('frameTag'), unitStatus:$('unitStatus'), assetStatus:$('assetStatus'), edgeStatus:$('edgeStatus'), playStatus:$('playStatus'), diag:$('diag'),
    frameMs:$('frameMs'), frameMsOut:$('frameMsOut'), scale:$('scale'), scaleOut:$('scaleOut'), anchorX:$('anchorX'), anchorXOut:$('anchorXOut'), anchorY:$('anchorY'), anchorYOut:$('anchorYOut'),
    vfxScale:$('vfxScale'), vfxScaleOut:$('vfxScaleOut'), travelMs:$('travelMs'), travelMsOut:$('travelMsOut'),
    loop:$('loop'), travel:$('travel'), bounds:$('bounds'), origin:$('origin'), alpha:$('alpha'), cleanBleed:$('cleanBleed'), crop:$('crop'), showSprite:$('showSprite'), showVfx:$('showVfx')
  };

  const state = {
    unit:'scorpion', display:'Scorpion', action:'run', manifest:null,
    frames:[], frame:0, playing:true, timer:null, loadToken:0,
    travelStart:null, sequenceToken:0, vfxFrames:[], vfxMode:false,
    lastScan:null, scanCache:new Map()
  };

  const UNIT_ALIASES = {'sub-zero':'subzero','sub_zero':'subzero'};
  const pad = n => String(n).padStart(2,'0');
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const unitRoot = () => `${BASE}assets/characters/${state.unit}/`;

  function normalizeUnit(value){
    const clean = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'');
    return UNIT_ALIASES[clean] || clean;
  }

  async function assetExists(url){
    try{
      const res = await fetch(url,{method:'HEAD',cache:'no-store'});
      const type = (res.headers.get('content-type') || '').toLowerCase();
      if(res.ok && type.startsWith('image/')) return true;
      if(res.ok && !type) {
        return await new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
          img.onerror = () => resolve(false);
          img.src = url;
        });
      }
      return false;
    }catch{return false;}
  }

  async function discoverSequence(base,max=24){
    const urls = Array.from({length:max},(_,i)=>`${base}frame_${pad(i+1)}.png`);
    const exists = await Promise.all(urls.map(assetExists));
    const out=[];
    for(let i=0;i<urls.length;i++){
      if(exists[i]) out.push(urls[i]);
      else if(out.length) break;
    }
    return out;
  }

  async function fetchManifest(){
    try{
      const res = await fetch(unitRoot()+'data/unit.json',{cache:'no-store'});
      if(!res.ok) return null;
      const json = await res.json();
      return json && json.id ? json : null;
    }catch{return null;}
  }

  function manifestFrames(action){
    const key = action === 'attack' ? 'basic_attack' : action;
    const list = state.manifest?.animation_standard?.animations?.[key]?.frames;
    return Array.isArray(list) ? list.map(path => unitRoot()+path.replace(/^\.\//,'')) : [];
  }

  async function discoverFrames(action,token){
    const v2Name = action === 'attack' ? 'attack' : action;
    let frames = await discoverSequence(unitRoot()+`sprites/runtime/v2/${v2Name}/`);
    if(token !== state.loadToken) return [];
    if(!frames.length) frames = manifestFrames(action);
    if(!frames.length){
      const fallback = action === 'attack' ? 'attack/basic' : action;
      frames = await discoverSequence(unitRoot()+`sprites/runtime/${fallback}/`);
    }
    return frames;
  }

  async function discoverVfx(token){
    if(state.unit !== 'scorpion') return [];
    const frames = await discoverSequence(`${BASE}assets/vfx/uploaded-v2/scorpion_chain_spear_vfx_atlas/`);
    return token === state.loadToken ? frames : [];
  }

  function setActionButtons(){
    els.actions.querySelectorAll('[data-action]').forEach(btn => btn.classList.toggle('active',btn.dataset.action === state.action));
  }

  function stopTimer(){
    if(state.timer){ clearInterval(state.timer); state.timer=null; }
  }

  function startTimer(){
    stopTimer();
    updatePlayback();
    if(!state.playing || !state.frames.length) return;
    state.timer = setInterval(() => step(1,true), Number(els.frameMs.value));
  }

  async function loadUnit(unit=els.unitId.value,action=state.action,{cancelSequence=true}={}){
    const id = normalizeUnit(unit);
    if(!id) return;
    if(cancelSequence) state.sequenceToken++;
    stopTimer();
    state.unit=id; state.action=action; state.frame=0; state.travelStart=null;
    state.vfxMode=false; els.vfx.classList.remove('on');
    els.sprite.style.clipPath='';
    const token=++state.loadToken;
    els.unitId.value=id; els.unitStatus.textContent=id; els.assetStatus.textContent='discovering…';
    els.edgeStatus.textContent='checking…'; els.edgeStatus.style.color='';
    els.diag.textContent=`Discovering ${id} ${action} frames…`;

    state.manifest = await fetchManifest();
    if(token !== state.loadToken) return;
    state.display = state.manifest?.display_name || id;

    const [frames,vfxFrames] = await Promise.all([discoverFrames(action,token),discoverVfx(token)]);
    if(token !== state.loadToken) return;
    state.frames=frames; state.vfxFrames=vfxFrames; state.frame=0;
    setActionButtons();

    const manifestMs = state.manifest?.animation_standard?.animations?.[action==='attack'?'basic_attack':action]?.frame_ms;
    if(Number.isFinite(manifestMs) && !frames.some(url=>url.includes('/runtime/v2/'))){
      els.frameMs.value=String(Math.max(35,Math.min(300,manifestMs)));
    }

    if(!frames.length){
      els.sprite.removeAttribute('src');
      els.frameTag.textContent=`${action} · 0/0`;
      els.assetStatus.textContent='NO FRAMES'; els.edgeStatus.textContent='n/a';
      els.diag.textContent=`No frames found.\n\nUnit: ${id}\nAction: ${action}\n\nChecked:\n• sprites/runtime/v2/${action==='attack'?'attack':action}/\n• unit.json animation_standard\n• sprites/runtime fallback\n\nYou can type any unit folder id above and load it directly.`;
      return;
    }
    renderFrame();
    startTimer();
  }

  function step(direction,auto=false){
    if(!state.frames.length) return;
    let next=state.frame+direction;
    if(next>=state.frames.length){
      if(els.loop.checked || state.action==='idle' || state.action==='run') next=0;
      else {
        next=state.frames.length-1;
        if(auto){ state.playing=false; els.play.textContent='Play'; stopTimer(); }
      }
    }
    if(next<0) next=state.frames.length-1;
    state.frame=next;
    renderFrame();
  }

  function renderFrame(){
    const url=state.frames[state.frame];
    if(!url) return;
    els.sprite.style.clipPath='';
    els.sprite.onload=()=>inspectFrame(els.sprite,url);
    els.sprite.src=url;
    els.frameTag.textContent=`${state.action} · ${state.frame+1}/${state.frames.length}`;
    els.assetStatus.textContent=url.split('/').slice(-5).join('/');

    if(state.action==='run' && els.travel.checked) updateRunTravel();
    if(state.action==='attack' && els.showVfx.checked && state.vfxFrames.length) renderAttackVfx();
    else if(!state.vfxMode) els.vfx.classList.remove('on');
  }

  function updateRunTravel(){
    const now=performance.now();
    if(state.travelStart==null) state.travelStart=now;
    const t=((now-state.travelStart)%Number(els.travelMs.value))/Number(els.travelMs.value);
    els.actor.style.left=`${12+63*t}%`;
  }

  function renderAttackVfx(){
    const trigger=Math.max(1,Math.floor(state.frames.length*.28));
    if(state.frame<trigger){els.vfx.classList.remove('on');return;}
    const p=(state.frame-trigger)/Math.max(1,state.frames.length-1-trigger);
    const idx=Math.min(state.vfxFrames.length-1,Math.floor(p*state.vfxFrames.length));
    els.vfx.src=state.vfxFrames[idx];
    placeVfx(p);
    els.vfx.classList.add('on');
  }

  function placeVfx(progress){
    const stage=els.stage.getBoundingClientRect(), actor=els.actor.getBoundingClientRect(), dummy=els.dummy.getBoundingClientRect();
    const x0=actor.left-stage.left+actor.width*.88, x1=dummy.left-stage.left+14;
    const y0=actor.top-stage.top+actor.height*.44, y1=dummy.top-stage.top+dummy.height*.44;
    els.vfx.style.left=`${x0+(x1-x0)*progress}px`;
    els.vfx.style.top=`${y0+(y1-y0)*progress}px`;
  }

  function buildHorizontalSegments(colCounts){
    const segments=[];
    let start=-1,last=-1,gap=0;
    const push=()=>{
      if(start<0||last<start)return;
      let pixels=0;
      for(let x=start;x<=last;x++)pixels+=colCounts[x];
      segments.push({x0:start,x1:last,width:last-start+1,pixels});
    };
    for(let x=0;x<colCounts.length;x++){
      if(colCounts[x]>0){
        if(start<0)start=x;
        last=x; gap=0;
      }else if(start>=0){
        gap++;
        if(gap>12){push();start=-1;last=-1;gap=0;}
      }
    }
    push();
    return segments;
  }

  function scanAlpha(img,url){
    if(state.scanCache.has(url)) return state.scanCache.get(url);
    const w=img.naturalWidth,h=img.naturalHeight;
    if(!w||!h) return null;
    const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true}); ctx.drawImage(img,0,0);
    const data=ctx.getImageData(0,0,w,h).data;
    const colCounts=new Uint32Array(w);
    let minX=w,minY=h,maxX=-1,maxY=-1,count=0;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(data[(y*w+x)*4+3]>10){
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;count++;colCounts[x]++;
    }
    if(maxX<0) return null;
    const margins={l:minX,r:w-1-maxX,t:minY,b:h-1-maxY};
    const touched=[]; if(margins.l<=2)touched.push('LEFT');if(margins.r<=2)touched.push('RIGHT');if(margins.t<=2)touched.push('TOP');if(margins.b<=2)touched.push('BOTTOM');
    const segments=buildHorizontalSegments(colCounts);
    const main=segments.reduce((best,s)=>!best||s.pixels>best.pixels?s:best,null);
    const detached=main?segments.filter(s=>{
      if(s===main)return false;
      const separation=s.x1<main.x0?main.x0-s.x1-1:s.x0>main.x1?s.x0-main.x1-1:0;
      return separation>=8 && s.pixels<=main.pixels*.40 && s.width<=Math.max(32,main.width*.45);
    }):[];
    const scan={w,h,minX,minY,maxX,maxY,margins,touched,count,url,edge:Math.min(margins.l,margins.r,margins.t,margins.b),segments,main,detached};
    state.scanCache.set(url,scan); return scan;
  }

  function shouldCleanBleed(scan){
    return Boolean(
      els.cleanBleed?.checked && scan?.detached?.length &&
      state.unit==='scorpion' && state.action==='run' && state.frame<5
    );
  }

  function applySourceCleanup(scan){
    els.sprite.style.clipPath='';
    if(!shouldCleanBleed(scan)||!scan.main)return false;
    const pad=5;
    const keepMin=Math.max(0,scan.main.x0-pad);
    const keepMax=Math.min(scan.w-1,scan.main.x1+pad);
    const left=(keepMin/scan.w)*100;
    const right=((scan.w-1-keepMax)/scan.w)*100;
    els.sprite.style.clipPath=`inset(0 ${right.toFixed(3)}% 0 ${left.toFixed(3)}%)`;
    return true;
  }

  function inspectFrame(img,url){
    try{
      const scan=scanAlpha(img,url);
      if(!scan){els.diag.textContent='Frame is fully transparent or unreadable.';return;}
      state.lastScan=scan;
      const cleaned=applySourceCleanup(scan);
      positionAlphaBounds();
      if(scan.detached.length){
        els.edgeStatus.textContent=`⚠ detached bleed${cleaned?' · masked':''}`;
        els.edgeStatus.style.color=cleaned?'var(--gold)':'var(--bad)';
      }else{
        els.edgeStatus.textContent=scan.touched.length?`⚠ ${scan.touched.join('+')}`:`safe · min ${scan.edge}px`;
        els.edgeStatus.style.color=scan.touched.length?'var(--bad)':'var(--ok)';
      }
      const rect=img.getBoundingClientRect();
      const islands=scan.detached.length?scan.detached.map(s=>`x ${s.x0}…${s.x1} (${s.pixels.toLocaleString()} px)`).join(', '):'none';
      els.diag.textContent=
`${state.display} · ${state.action}\nframe ${state.frame+1}/${state.frames.length}\nsource ${scan.w}×${scan.h}\nrender box ${Math.round(rect.width)}×${Math.round(rect.height)}\nalpha x ${scan.minX}…${scan.maxX}\nalpha y ${scan.minY}…${scan.maxY}\ngutters L${scan.margins.l} R${scan.margins.r} T${scan.margins.t} B${scan.margins.b}\nopaque pixels ${scan.count.toLocaleString()}\nanchor bottom_center + (${els.anchorX.value}, ${els.anchorY.value})\ndetached islands ${islands}\n${cleaned?'✓ LAB MASK ACTIVE: isolated side bleed removed for diagnosis':scan.detached.length?'⚠ DETACHED ALPHA: likely source-sheet slice contamination':scan.touched.length?'⚠ SOURCE EDGE CONTACT: '+scan.touched.join(', '):'✓ source gutters intact'}\n\n${url}`;
    }catch(err){els.diag.textContent=`Alpha inspector error:\n${String(err)}`;}
  }

  function positionAlphaBounds(){
    const s=state.lastScan;
    if(!s) return;
    const box=els.actor.getBoundingClientRect(), img=els.sprite.getBoundingClientRect();
    const drawScale=Math.min(img.width/s.w,img.height/s.h);
    const drawnW=s.w*drawScale, drawnH=s.h*drawScale;
    const offsetX=(box.width-drawnW)/2, offsetY=box.height-drawnH;
    els.alphaBounds.style.left=`${offsetX+s.minX*drawScale}px`;
    els.alphaBounds.style.top=`${offsetY+s.minY*drawScale}px`;
    els.alphaBounds.style.width=`${Math.max(1,(s.maxX-s.minX+1)*drawScale)}px`;
    els.alphaBounds.style.height=`${Math.max(1,(s.maxY-s.minY+1)*drawScale)}px`;
  }

  function applyTransform(){
    const scale=Number(els.scale.value)/100;
    els.actor.style.transform=`translateX(-50%) translate(${els.anchorX.value}px,${-Number(els.anchorY.value)}px) scale(${scale})`;
    els.scaleOut.value=scale.toFixed(2)+'×'; els.anchorXOut.value=els.anchorX.value+'px'; els.anchorYOut.value=els.anchorY.value+'px';
    requestAnimationFrame(positionAlphaBounds);
  }

  function applyVfxScale(){
    const scale=Math.max(.1,Number(els.vfxScale.value)/100);
    els.vfx.style.transform=`translate(-50%,-50%) scale(${scale})`;
    els.vfxScaleOut.value=scale.toFixed(2)+'×';
  }

  function updatePlayback(){
    const ms=Number(els.frameMs.value);
    els.frameMsOut.value=ms+'ms'; els.travelMsOut.value=els.travelMs.value+'ms';
    els.playStatus.textContent=`${ms} ms · ${(1000/ms).toFixed(1)} fps`;
  }

  async function changeAction(action,cancelSequence=true){
    await loadUnit(state.unit,action,{cancelSequence});
  }

  async function runSequence(){
    const token=++state.sequenceToken;
    state.playing=false; els.play.textContent='Play'; stopTimer(); els.travel.checked=false;

    await changeAction('run',false);
    if(token!==state.sequenceToken || !state.frames.length) return;
    state.playing=false; stopTimer();
    const runCount=state.frames.length, total=Math.max(500,Number(els.travelMs.value));
    for(let i=0;i<runCount;i++){
      if(token!==state.sequenceToken)return;
      state.frame=i; els.actor.style.left=`${12+56*(i/Math.max(1,runCount-1))}%`; renderFrame();
      await sleep(total/runCount);
    }

    await changeAction('attack',false);
    if(token!==state.sequenceToken || !state.frames.length) return;
    state.playing=false; stopTimer();
    for(let i=0;i<state.frames.length;i++){
      if(token!==state.sequenceToken)return;
      state.frame=i; renderFrame(); await sleep(Number(els.frameMs.value));
    }

    await sleep(180);
    if(token!==state.sequenceToken)return;
    els.vfx.classList.remove('on'); els.actor.style.left='12%';
    await changeAction('idle',false);
    if(token!==state.sequenceToken)return;
    state.playing=true; els.play.textContent='Pause'; startTimer();
  }

  async function playVfxOnly(){
    const token=++state.sequenceToken;
    stopTimer(); state.vfxMode=true;
    if(!state.vfxFrames.length) state.vfxFrames=await discoverVfx(state.loadToken);
    if(token!==state.sequenceToken)return;
    if(!state.vfxFrames.length){state.vfxMode=false;els.diag.textContent='No dedicated VFX sequence registered for this unit.';startTimer();return;}
    els.vfx.classList.add('on');
    for(let i=0;i<state.vfxFrames.length;i++){
      if(token!==state.sequenceToken)return;
      const p=i/Math.max(1,state.vfxFrames.length-1);
      els.vfx.src=state.vfxFrames[i]; placeVfx(p); els.frameTag.textContent=`VFX · ${i+1}/${state.vfxFrames.length}`;
      await sleep(Number(els.frameMs.value));
    }
    await sleep(100); state.vfxMode=false; els.vfx.classList.remove('on'); renderFrame(); startTimer();
  }

  els.loadUnit.onclick=()=>loadUnit();
  els.unitId.addEventListener('keydown',e=>{if(e.key==='Enter')loadUnit();});
  els.preset.onchange=()=>{els.unitId.value=normalizeUnit(els.preset.value);loadUnit(els.unitId.value);};
  els.actions.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(btn)changeAction(btn.dataset.action,true);});
  els.prev.onclick=()=>{state.sequenceToken++;state.playing=false;els.play.textContent='Play';stopTimer();step(-1);};
  els.next.onclick=()=>{state.sequenceToken++;state.playing=false;els.play.textContent='Play';stopTimer();step(1);};
  els.play.onclick=()=>{state.sequenceToken++;state.playing=!state.playing;els.play.textContent=state.playing?'Pause':'Play';startTimer();};
  els.sequence.onclick=runSequence; els.vfxOnly.onclick=playVfxOnly;
  els.resetPos.onclick=()=>{state.sequenceToken++;els.actor.style.left='12%';state.travelStart=null;els.vfx.classList.remove('on');renderFrame();};
  els.frameMs.oninput=()=>{updatePlayback();startTimer();}; els.travelMs.oninput=updatePlayback;
  els.scale.oninput=applyTransform; els.anchorX.oninput=applyTransform; els.anchorY.oninput=applyTransform; els.vfxScale.oninput=applyVfxScale;
  els.bounds.onchange=()=>els.actor.classList.toggle('showBounds',els.bounds.checked);
  els.origin.onchange=()=>els.actor.classList.toggle('showOrigin',els.origin.checked);
  els.alpha.onchange=()=>els.actor.classList.toggle('showAlpha',els.alpha.checked);
  els.cleanBleed.onchange=()=>{const url=state.frames[state.frame];if(url&&els.sprite.complete)inspectFrame(els.sprite,url);};
  els.crop.onchange=()=>els.actor.classList.toggle('crop',els.crop.checked);
  els.showSprite.onchange=()=>els.sprite.classList.toggle('hidden',!els.showSprite.checked);
  els.showVfx.onchange=()=>{if(!els.showVfx.checked)els.vfx.classList.remove('on');else renderFrame();};
  window.addEventListener('resize',()=>requestAnimationFrame(positionAlphaBounds));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTimer();else startTimer();});

  applyTransform(); applyVfxScale(); updatePlayback(); loadUnit('scorpion','run',{cancelSequence:false});
})();