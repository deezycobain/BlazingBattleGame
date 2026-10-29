import {PROFILE_VERSION,LANDMARKS,BONES,RUN_POSES,clone,median,totalMs,frameAt,timelineFor,pngInfo,inspectPixels,validateSequence,validateTimeline,resolveProfile,inheritTiming,scaffold,validateLandmarks,matchedViewTransforms} from './core.mjs';
const $=id=>document.getElementById(id), root=new URL('../',import.meta.url);
const state={a:null,b:null,elapsed:0,playing:false,lastStamp:null,raf:null,loading:0,generation:{a:0,b:0},reports:{},undo:[],library:null,standard:null,gold:null};
const cache=new Map();
function notice(message,error=false){$('notice').textContent=message;$('notice').className=error?'error':'';}
async function json(path){const response=await fetch(new URL(path,root));if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);return response.json();}
function canvas(width,height){return Object.assign(document.createElement('canvas'),{width,height});}
async function metricsFor(image,header){const c=canvas(image.width||image.naturalWidth,image.height||image.naturalHeight),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);return inspectPixels(ctx.getImageData(0,0,c.width,c.height),header);}
async function decode(buffer,name,url=null){
  let objectUrl;
  try {
    const header=pngInfo(buffer);
    // Bound decoded allocations in this inspection workstation, not the artwork standard.
    if(!header.width||!header.height||header.width>4096||header.height>4096||header.width*header.height>8_388_608)throw new Error('Frame exceeds workstation limit (4096px side / 8MP); prepare smaller review frames');
    objectUrl=URL.createObjectURL(new Blob([buffer],{type:'image/png'}));
    const img=new Image();img.src=objectUrl;await img.decode();
    const metrics=await metricsFor(img,header);
    return {name,url:objectUrl,sourcePath:url,img,metrics,width:img.naturalWidth,height:img.naturalHeight,landmarks:{},pose:'',header};
  }catch(error){if(objectUrl)URL.revokeObjectURL(objectUrl);return {name,sourcePath:url,error:error.message,width:512,height:768,landmarks:{},pose:''};}
}
async function loadPaths(paths){return Promise.all(paths.map(async path=>{try{const res=await fetch(new URL(path,root));if(!res.ok)throw new Error(`HTTP ${res.status}`);return decode(await res.arrayBuffer(),path.split('/').at(-1),path);}catch(error){return {name:path.split('/').at(-1),sourcePath:path,error:error.message,width:512,height:768,landmarks:{},pose:''};}}));}
function dispose(seq){if(seq?.local)seq.frames.forEach(f=>{if(f.url)URL.revokeObjectURL(f.url);});}
async function prepare(sequence){
  if(sequence.normalization==='none'){sequence.prepared=sequence.frames;return sequence;}
  const cleaned=await Promise.all(sequence.frames.map(async f=>{
    if(!f.img)return f;
    const c=canvas(f.width,f.height),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(f.img,0,0);
    if(sequence.normalization==='quality-sequence'){
      const data=ctx.getImageData(0,0,c.width,c.height).data,columns=new Uint32Array(c.width),runs=[];
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>12)columns[x]++;
      let x=0;while(x<c.width){while(x<c.width&&!columns[x])x++;if(x>=c.width)break;const start=x;let mass=0;while(x<c.width&&columns[x])mass+=columns[x++];runs.push({start,end:x-1,mass});}
      const main=runs.reduce((best,run)=>!best||run.mass>best.mass?run:best,null);
      for(const run of runs)if(run!==main&&(run.start<=Math.max(3,c.width*.04)||run.end>=c.width-1-Math.max(3,c.width*.04))&&run.mass<main.mass*.14&&run.end-run.start+1<c.width*.14)ctx.clearRect(run.start,0,run.end-run.start+1,c.height);
    }
    return {...f,img:c,metrics:await metricsFor(c,f.header)};
  }));
  const valid=cleaned.map(f=>f.metrics).filter(m=>m?.bounds);
  if(!valid.length){sequence.prepared=sequence.frames;return sequence;}
  const kind=sequence.animation,maxWidth=kind==='basic'?448:kind==='run'?440:420;
  const scale=Math.min(1.6,600/Math.max(...valid.map(m=>m.bodyHeight)),maxWidth/Math.max(...valid.map(m=>m.bounds[2]-m.bounds[0])));
  const dx=Math.round(256-median(valid.map(m=>m.centerX))*scale),dy=Math.round(700-median(valid.map(m=>m.feetY))*scale);
  sequence.preparationTransform=sequence.normalization==='quality-sequence'?{scale,dx,dy,scope:'whole-sequence'}:{scope:'legacy-per-frame; never applied to production imports'};
  sequence.prepared=await Promise.all(cleaned.map(async f=>{
    if(!f.img||!f.metrics?.bounds)return f;
    const c=canvas(512,768),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(sequence.normalization==='quality-sequence')ctx.drawImage(f.img,dx,dy,f.width*scale,f.height*scale);
    else ctx.drawImage(f.img,Math.round(256-f.metrics.centerX),Math.round(742-f.metrics.feetY));
    return {...f,img:c,width:512,height:768,metrics:await metricsFor(c,{width:512,height:768,rgba:true,colorType:6,bitDepth:8})};
  }));
  return sequence;
}
async function librarySequence(character,animation,timing='runtime'){
  const key=`${character}:${animation}`;
  if(!cache.has(key))cache.set(key,(async()=>{
    const unit=state.library.units[character],spec=unit?.sequences[animation];if(!spec)throw new Error(`${unit?.label||character}: ${animation} artwork unavailable`);
    const sequence={character,animation,label:`${unit.label} / ${animation}`,frames:await loadPaths(spec.paths),timeline:clone(spec.timeline),events:clone(spec.events),loop:spec.loop,normalization:spec.normalization,anchor:unit.anchor,production:false,local:false,notes:spec.notes,manifestFrameMs:spec.manifestFrameMs};
    await prepare(sequence);return sequence;
  })());
  const cached=await cache.get(key),sequence={...cached,frames:cached.frames.map(f=>({...f,landmarks:{},pose:''})),timeline:clone(cached.timeline),events:clone(cached.events)};
  if(timing==='manifest'&&sequence.manifestFrameMs)sequence.timeline=timelineFor(sequence.frames.length,sequence.manifestFrameMs);
  sequence.timing=timing;
  // The real renderer caches idle occupancy, not the animation being inspected.
  if(animation!=='idle')sequence.idleReference=await librarySequence(character,'idle','runtime');
  else sequence.idleReference=null;
  return sequence;
}
function metadata(seq){return {timeline:clone(seq.timeline),events:clone(seq.events),inheritedFrom:seq.inheritedFrom||null,frames:seq.frames.map(f=>({name:f.name,fingerprint:f.metrics?.fingerprint||null,landmarks:clone(f.landmarks),pose:f.pose}))};}
function remember(){if(state.a){state.undo.push(metadata(state.a));if(state.undo.length>30)state.undo.shift();}}
function applyMetadata(seq,data){
  const errors=validateTimeline(data.timeline,seq.frames.length);if(errors.length)throw new Error(errors.join('; '));
  if(!Array.isArray(data.frames)||data.frames.length!==seq.frames.length||data.frames.some((f,i)=>f.name!==seq.frames[i].name))throw new Error('Profile artwork names/order do not match the loaded PNG sources');
  data.frames.forEach((f,i)=>{if(f.fingerprint&&f.fingerprint!==seq.frames[i].metrics?.fingerprint)throw new Error(`Profile source ${f.name} contains different artwork pixels; load the original PNGs`);validateLandmarks(f.landmarks||{},seq.frames[i].width,seq.frames[i].height);});
  checkEvents(data.events||[]);
  seq.timeline=clone(data.timeline);seq.events=clone(data.events||[]);seq.inheritedFrom=data.inheritedFrom||null;
  data.frames.forEach((f,i)=>{seq.frames[i].landmarks=clone(f.landmarks||{});seq.frames[i].pose=String(f.pose||'');});
}
function pause(){state.playing=false;state.lastStamp=null;if(state.raf!==null)cancelAnimationFrame(state.raf);state.raf=null;$('play').textContent='Play';}
async function install(side,promise){
  pause();const token=++state.generation[side];state.loading++;notice('Decoding and measuring complete PNG sequences…');
  try{
    const seq=await promise;if(token!==state.generation[side]){dispose(seq);return;}
    dispose(state[side]);state[side]=seq;
    if(side==='a'){state.elapsed=0;state.undo=[];$('loop').checked=seq.loop;$('events').value=JSON.stringify(seq.events,null,2);$('sourceLabel').textContent=seq.label;$('countLabel').textContent=`${seq.frames.length} FRAMES`;$('roadPlan').hidden=!(seq.local&&state.roadWorkspace);if(seq.local)$('presentation').value='matched';}
    $('referencePane').hidden=!state.b;
    refreshAll();notice(seq.notes||'Frames decoded. Inspect source QA and review artwork before approval.');
  }catch(error){if(token===state.generation[side])notice(error.message,true);}
  finally{state.loading--;}
}
function fillAnimations(character,element){
  const unit=state.library.units[character];element.replaceChildren();element.disabled=!unit;if(!unit){if(character==='road_rookie_pending')element.add(new Option('Approved artwork required','pending'));return;}
  for(const kind of ['idle','run','basic','recoil']){const option=new Option(unit.sequences[kind]?kind:`${kind} · unavailable`,kind);option.disabled=!unit.sequences[kind];element.add(option);}
  element.value=unit.sequences.run?'run':'idle';
}
function loadA(){if($('character').value==='road_rookie_pending')return openRoadWorkspace();return install('a',librarySequence($('character').value,$('animation').value,$('timing').value));}
async function openRoadWorkspace(){
  pause();++state.generation.a;dispose(state.a);state.a=null;state.elapsed=0;state.undo=[];state.roadWorkspace=true;
  $('character').value='road_rookie_pending';fillAnimations('road_rookie_pending',$('animation'));
  $('refCharacter').value='itachi';fillAnimations('itachi',$('refAnimation'));$('refAnimation').value='run';
  $('sourceLabel').textContent='Road Rookie / approved artwork required';$('countLabel').textContent='0 FRAMES';$('events').value='[]';$('loop').checked=true;$('roadPlan').hidden=false;refreshAll();await loadB();
  notice('Rejected Road Rookie artwork removed. Attach the approved master or frame pack in chat before run production; local imports remain on this device.');
}
function loadB(){if($('refCharacter').value==='none'){++state.generation.b;dispose(state.b);state.b=null;$('referencePane').hidden=true;refreshAll();return Promise.resolve();}return install('b',librarySequence($('refCharacter').value,$('refAnimation').value,'runtime'));}
async function loadLocal(input,side){
  const files=[...input.files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}));if(!files.length)return;
  if(files.length>96){notice('Import up to 96 individual PNGs per sequence.',true);return;}
  const kind=$('draftAnimation').value;
  await install(side,(async()=>{const frames=await Promise.all(files.map(async f=>decode(await f.arrayBuffer(),f.name)));return {character:'local',label:`Local artwork / ${kind}`,animation:kind,frames,prepared:frames,timeline:timelineFor(frames.length,120),events:[],loop:['idle','run'].includes(kind),normalization:'none',anchor:[256,700],production:true,local:true,notes:'Local production draft. No artwork or metadata is uploaded.'};})());
}
function current(side){const seq=state[side];if(!seq)return null;let time=state.elapsed;
  if(side==='b'&&$('sync').value==='phase'&&state.a){const aTotal=totalMs(state.a.timeline),phase=$('loop').checked?(time%aTotal)/aTotal:Math.min(1,time/aTotal);time=phase*totalMs(seq.timeline);}
  return {...frameAt(seq.timeline,time,$('loop').checked),time};
}
function sourceFrame(side,prepared=false){const seq=state[side],at=current(side);return seq&&at?.frame>=0?(prepared?seq.prepared:seq.frames)[at.frame]:null;}
function sourceTransform(seq,frame,prepared=false){
  if($('presentation').value==='matched'){const index=seq===state.a?0:1,fit=matchedViewTransforms([state.a,state.b])[index];if(fit)return {...fit,mirror:$('mirror').checked};}
  const fit=Math.min(1,512/frame.width,768/frame.height),anchor=prepared&&seq.normalization==='quality-sequence'?[256,700]:seq.anchor;
  return {scale:fit,dx:256-anchor[0]*fit,dy:700-anchor[1]*fit,mirror:$('mirror').checked};
}
function transformPoint(point,t){const x=t.dx+point.x*t.scale;return {x:t.mirror?512-x:x,y:t.dy+point.y*t.scale};}
function paint(ctx,frame,t,alpha=1){if(!frame?.img)return;ctx.save();ctx.globalAlpha=alpha;if(t.mirror){ctx.translate(512,0);ctx.scale(-1,1);}ctx.drawImage(frame.img,t.dx,t.dy,frame.width*t.scale,frame.height*t.scale);ctx.restore();}
function guides(ctx,frame,t){
  ctx.save();ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.strokeStyle='#78b8a7';ctx.beginPath();ctx.moveTo(0,700);ctx.lineTo(512,700);ctx.moveTo(256,0);ctx.lineTo(256,768);ctx.stroke();ctx.setLineDash([]);
  const m=frame.metrics;if(m?.bounds){const b=m.bounds,p=transformPoint({x:b[0],y:b[1]},t),q=transformPoint({x:b[2],y:b[3]},t);ctx.strokeStyle='#efbd68';ctx.lineWidth=1.4;ctx.strokeRect(Math.min(p.x,q.x),p.y,Math.abs(q.x-p.x),q.y-p.y);}
  ctx.fillStyle='#b0c6c5';ctx.font='12px ui-monospace,monospace';ctx.fillText('viewer ground · source anchor aligned here',10,721);ctx.restore();
}
function drawAnatomy(ctx,frame,t){
  const points=frame.landmarks||{};ctx.save();
  for(const [a,b] of BONES){if(!points[a]||!points[b])continue;const p=transformPoint(points[a],t),q=transformPoint(points[b],t);ctx.strokeStyle=a.startsWith('far')||b.startsWith('far')?'#79badf':'#efbd68';ctx.lineWidth=2;ctx.setLineDash(points[a].status==='unverified-scaffold'||points[b].status==='unverified-scaffold'?[5,4]:[]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
  ctx.setLineDash([]);for(const [name,p] of Object.entries(points)){const q=transformPoint(p,t);ctx.fillStyle=name===$('joint').value?'#fff':name.startsWith('far')?'#79badf':'#efbd68';ctx.beginPath();ctx.arc(q.x,q.y,name===$('joint').value?6:4,0,Math.PI*2);ctx.fill();}ctx.restore();
}
function draw(side){
  const target=$(side==='a'?'stageA':'stageB'),ctx=target.getContext('2d');ctx.clearRect(0,0,512,768);
  const seq=state[side],at=current(side);if(!seq||at.frame<0){if(side==='a'&&state.roadWorkspace){ctx.fillStyle='#a2aeb9';ctx.font='18px system-ui';ctx.fillText('Approved Road Rookie artwork required',20,370);$('labelA').textContent='Road Rookie · awaiting approved art';$('metricsA').textContent='Old pilot removed · no replacement supplied';}return;}
  const prepared=$('presentation').value==='normalized',frames=prepared?seq.prepared:seq.frames,frame=frames[at.frame];
  if(!frame?.img){ctx.fillStyle='#ffa58d';ctx.font='16px system-ui';ctx.fillText('Frame unavailable · see QA report',20,340);return;}
  const t=sourceTransform(seq,frame,prepared);
  if($('onion').checked&&seq.timeline.length>1){const prev=seq.timeline[(at.index-1+seq.timeline.length)%seq.timeline.length].frame;paint(ctx,frames[prev],t,Number($('onionOpacity').value));}
  paint(ctx,frame,t);
  if(side==='a'&&state.b&&Number($('overlay').value)>0){const ref=sourceFrame('b',prepared);if(ref?.img)paint(ctx,ref,sourceTransform(state.b,ref,prepared),Number($('overlay').value));}
  if($('bounds').checked)guides(ctx,frame,t);
  // Guides are source coordinates. Runtime preparation can include cleanup and transformation;
  // editing is intentionally restricted to untouched-source view.
  if(side==='a'&&$('anatomy').checked&& !prepared)drawAnatomy(ctx,seq.frames[at.frame],t);
  const raw=seq.frames[at.frame],m=raw.metrics;
  $(side==='a'?'labelA':'labelB').textContent=seq.label;
  $(side==='a'?'metricsA':'metricsB').textContent=m?`${raw.name} · ${m.width}×${m.height}\nbody ${m.bodyHeight}px · feet ${m.feetY??'empty'} · center X ${m.centerX??'empty'}`:raw.error;
}
function idleGeometry(seq){const idle=seq.idleReference||seq,frames=idle.normalization==='none'?idle.frames:idle.prepared,valid=frames.map(f=>f.metrics).filter(m=>m?.bounds);if(!valid.length)return null;const average=k=>valid.reduce((sum,m)=>sum+m[k],0)/valid.length;return {height:average('height'),bodyHeight:average('bodyHeight'),bottom:average('feetY')-1};}
function drawGame(side){
  const target=$(side==='a'?'gameA':'gameB'),ctx=target.getContext('2d'),seq=state[side],raw=sourceFrame(side,true);ctx.clearRect(0,0,320,200);ctx.strokeStyle='#517466';ctx.beginPath();ctx.moveTo(0,172);ctx.lineTo(320,172);ctx.stroke();if(!seq||!raw?.img)return;
  const m=raw.metrics,standard=state.standard;let scale=96/standard.source_frame.standard_body_height_px,anchor=seq.anchor,mode='96px production target';
  if(!seq.production&&$('gameScale').value==='legacy'&&seq.character!=='road_rookie_pending'&&m?.bounds){
    const idle=idleGeometry(seq),name=state.library.units[seq.character]?.label||seq.character;
    const compensation=standard.legacy_source_compensation[name]??1,sizeClass=standard.runtime.size_classes[standard.runtime.default_size_class];
    const base=68*1.14*1.07*1.09*standard.runtime.base_renderer_scale*compensation*sizeClass;
    const body=idle?base*idle.bodyHeight/idle.height:96;
    scale=body/m.bodyHeight;anchor=[raw.width/2,m.feetY-1];mode=`neutral legacy · ${body.toFixed(1)}px body`;
  }else if(!seq.production&&m?.bounds){
    const idle=idleGeometry(seq);scale=96/(idle?.bodyHeight||600);anchor=seq.normalization==='quality-sequence'?[256,700]:seq.anchor;
  }
  ctx.save();ctx.translate(160,172);if($('mirror').checked)ctx.scale(-1,1);ctx.drawImage(raw.img,-anchor[0]*scale,-anchor[1]*scale,raw.width*scale,raw.height*scale);ctx.restore();
  $(side==='a'?'gameLabelA':'gameLabelB').textContent=`${side.toUpperCase()} · ${mode}`;
}
function selected(){return sourceFrame('a',false);}
function updateJoint(){const frame=selected(),p=frame?.landmarks?.[$('joint').value];$('jointX').value=p?.x?.toFixed(1)||'';$('jointY').value=p?.y?.toFixed(1)||'';$('pose').value=frame?.pose||'';$('guideStatus').textContent=frame?`${Object.keys(frame.landmarks).length}/${LANDMARKS.length} source landmarks · ${p?.status||'selected point not placed'} · anatomy approval pending`:'';}
function renderTimeline(){
  const seq=state.a,container=$('timeline');container.replaceChildren();if(!seq){$('frame').max=Math.max(0,(state.b?.timeline.length||1)-1);$('frame').value=0;$('position').textContent='0 / 0 · reference playback available';$('eventSummary').textContent='Approved artwork required before authoring a timeline.';return;}
  seq.timeline.forEach((slot,index)=>{const f=seq.frames[slot.frame],button=document.createElement('button');button.type='button';button.className='thumbnail';button.dataset.slot=index;button.title=`Slot ${index+1}: source ${slot.frame+1}, ${slot.durationMs}ms`;
    if(f?.url){const image=new Image();image.src=f.url;image.alt=`Source frame ${slot.frame+1}`;button.append(image);}const label=document.createElement('span');label.textContent=`${index+1} · F${slot.frame+1}`;const duration=document.createElement('span');duration.textContent=`${Math.round(slot.durationMs*100)/100} ms`;button.append(label,duration);button.onclick=()=>seekSlot(index);container.append(button);});
  $('frame').max=Math.max(0,seq.timeline.length-1);$('eventSummary').textContent=seq.events.length?seq.events.map(e=>`${e.name} @ ${e.timeMs}ms${e.layer?' ['+e.layer+']':''}`).join(' · '):'No event markers authored.';
}
function reportText(report){return [`${report.technicalPass?'NO HARD TECHNICAL FAILURES':'TECHNICAL FAIL'} · ${report.frame_count} frames · ${report.playback_slots} slots · ${Math.round(report.durationMs)}ms`,`Scope: ${report.scope} | Artwork approval: PENDING`,report.errors.length?'\nHard failures:\n'+report.errors.map(e=>'• '+e).join('\n'):'',report.warnings.length?'\nReview warnings:\n'+report.warnings.map(e=>'• '+e).join('\n'):'','\nHuman review required: '+report.manualReview.join('; ')].filter(Boolean).join('\n');}
function updateQA(){
  for(const side of ['a','b']){const seq=state[side];state.reports[side]=seq?validateSequence(seq,state.standard):null;}
  $('qa').textContent=state.reports.a?reportText(state.reports.a):'Load PNG frames to inspect.';$('qa').classList.toggle('fail',!!state.reports.a?.errors.length);$('qaB').textContent=state.reports.b?reportText(state.reports.b):'No comparison loaded.';
  for(const id of ['export','exportMetrics','exportProfile','inherit','duration'])$(id).disabled=!state.a;
  for(const id of ['play','prev','next'])$(id).disabled=!(state.a||state.b);
}
function refreshFrame(){
  const at=current('a'),seq=state.a;if(seq&&at){$('frame').value=at.index;$('position').textContent=`${at.index+1} / ${seq.timeline.length} slots · source ${at.frame+1} / ${seq.frames.length}`;$('duration').value=Math.round(seq.timeline[at.index].durationMs*1000)/1000;for(const b of $('timeline').children)b.setAttribute('aria-current',Number(b.dataset.slot)===at.index?'true':'false');}
  if(!seq&&state.b){const ref=current('b');$('frame').value=ref.index;$('position').textContent=`Reference ${ref.index+1} / ${state.b.timeline.length} · artwork pending`;}
  $('clock').textContent=`${Math.round(state.elapsed)} ms`;
  draw('a');draw('b');drawGame('a');drawGame('b');updateJoint();
  const t=state.a?.preparationTransform;$('transformNote').textContent=$('presentation').value==='matched'?'Matched sequence body scale: one fixed viewer transform using the sequence median body height. Source dimensions, pixels, pose movement and exported production transforms stay unchanged.':$('presentation').value==='source'?`Untouched source coordinates. Source anchor: ${state.a?.anchor?.join(', ')||'unavailable'}; displayed at viewer ground Y=700.`:t?.scope==='whole-sequence'?`Preview only: one sequence transform, scale ${t.scale.toFixed(5)}, offset (${t.dx}, ${t.dy}). Original PNGs remain unchanged.`:t?`Legacy recoil preparation uses per-frame registration. This is not a production transform for new artwork.`:'No runtime preparation is applied to this source sequence.';
}
function refreshAll(){renderTimeline();updateQA();refreshFrame();const seq=state.a;if(seq){const spec=state.library.units[seq.character]?.sequences[seq.animation];$('timingNote').textContent=`${seq.timing==='manifest'?'Declared manifest':'Effective / edited'}: ${seq.timeline.length} playback slots, ${Math.round(totalMs(seq.timeline))}ms. Manifest: ${spec?.manifestFrameMs?spec.manifestFrameMs.toFixed(2)+'ms/frame':'not declared'}. ${seq.notes||''}${$('sync').value==='phase'?' B is deliberately retimed to A’s cycle phase.':' A/B share elapsed time; each retains its own durations.'}`;}}
function seekSlot(index){pause();const seq=state.a||state.b;if(!seq)return;state.elapsed=seq.timeline.slice(0,index).reduce((sum,s)=>sum+s.durationMs,0);refreshFrame();}
function step(delta){const seq=state.a||state.b;if(!seq)return;const at=current(state.a?'a':'b'),next=(at.index+delta+seq.timeline.length)%seq.timeline.length;seekSlot(next);}
function tick(now){
  if(!state.playing)return;
  if(state.lastStamp!==null)state.elapsed+=Math.max(0,now-state.lastStamp)*Number($('speed').value);state.lastStamp=now;
  const primary=state.a||state.b;if(!$('loop').checked&&primary&&state.elapsed>=totalMs(primary.timeline)){state.elapsed=totalMs(primary.timeline);pause();refreshFrame();return;}
  refreshFrame();state.raf=requestAnimationFrame(tick);
}
function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function profile(){
  const seq=state.a;if(!seq)return null;
  return {schemaVersion:PROFILE_VERSION,id:`${seq.character}-${seq.animation}-draft`,name:seq.label,extends:seq.inheritedFrom||null,sourceCommit:state.library.auditedCommit,reviewStatus:'pending-human-review',productionContract:clone(state.standard),spatialTransform:{scope:'whole-sequence',scale:1,dx:0,dy:0,anchor:seq.anchor},animations:{[seq.animation]:{...metadata(seq),loop:$('loop').checked,artworkReferences:seq.frames.map(f=>f.sourcePath||f.name),artworkEmbedded:false,anatomyStatus:'manual-unverified'}},frameTargets:{idle:[6,8],run:[6,8],basic:[6,8],recoil:[6,8],special:'flexible'},targetsAreLimits:false};
}
function checkEvents(events){if(!Array.isArray(events)||events.some(e=>typeof e?.name!=='string'||!e.name.trim()||!Number.isFinite(e.timeMs)||e.timeMs<0))throw new Error('Events must be an array of {name, timeMs}; timeMs must be finite and nonnegative');}
function guarded(action){return async(...args)=>{try{await action(...args);}catch(error){notice(error.message,true);}};}
function installHandlers(){
  const phoneHeader=()=>document.body.style.setProperty('--phone-header-height',document.querySelector('header').getBoundingClientRect().height+'px');
  const phoneControls=open=>{document.body.classList.toggle('controls-open',open);$('phoneControls').setAttribute('aria-expanded',String(open));$('phoneControls').textContent=open?'Back to viewer':'Characters & import';phoneHeader();};
  $('phoneControls').onclick=()=>phoneControls(!document.body.classList.contains('controls-open'));
  window.addEventListener('resize',()=>{if(innerWidth>640)phoneControls(false);else phoneHeader();});
  window.addEventListener('keydown',event=>{if(event.key==='Escape')phoneControls(false);});
  phoneHeader();
  $('character').onchange=()=>{fillAnimations($('character').value,$('animation'));return loadA();};$('animation').onchange=loadA;$('timing').onchange=loadA;
  $('refCharacter').onchange=()=>{fillAnimations($('refCharacter').value,$('refAnimation'));return loadB();};$('refAnimation').onchange=loadB;
  $('draft').onchange=guarded(()=>loadLocal($('draft'),'a'));$('reference').onchange=guarded(()=>loadLocal($('reference'),'b'));
  $('roadWorkspace').onclick=guarded(openRoadWorkspace);
  $('loadDemo').onclick=guarded(async()=>{
    const id=$('demo').value;
    await install('a',(async()=>{const path=`assets/sprites/enemies/${id}/${id}_idle.png`,res=await fetch(new URL(path,root));if(!res.ok)throw new Error(`HTTP ${res.status}`);const buffer=await res.arrayBuffer(),header=pngInfo(buffer),blobUrl=URL.createObjectURL(new Blob([buffer],{type:'image/png'}));const image=new Image();try{image.src=blobUrl;await image.decode();if(image.naturalWidth!==2172||image.naturalHeight!==724)throw new Error('Unexpected legacy sheet dimensions');const frames=[];for(let i=0;i<4;i++){const c=canvas(543,724);c.getContext('2d').drawImage(image,i*543,0,543,724,0,0,543,724);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));frames.push(await decode(await blob.arrayBuffer(),`${id}_f${String(i).padStart(2,'0')}.png`,path));}return {character:'legacy-enemy',animation:'idle',label:`${id} · legacy enemy reference`,frames,prepared:frames,timeline:timelineFor(4,160),events:[],loop:true,normalization:'none',anchor:[271.5,700],production:false,local:true,notes:`Legacy ${header.width}×${header.height} sheet; reference-only, no artwork approval.`};}finally{URL.revokeObjectURL(blobUrl);}})());
  });
  $('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);
  $('play').onclick=()=>{const primary=state.a||state.b;if(!primary||state.loading)return;if(state.playing)return pause();if(!$('loop').checked&&state.elapsed>=totalMs(primary.timeline))state.elapsed=0;state.playing=true;state.lastStamp=null;$('play').textContent='Pause';state.raf=requestAnimationFrame(tick);};
  $('frame').oninput=()=>seekSlot(Number($('frame').value));
  for(const id of ['bounds','onion','mirror','overlay','onionOpacity','anatomy','presentation','gameScale','loop'])$(id).oninput=refreshFrame;
  $('sync').onchange=refreshAll;$('joint').onchange=()=>{updateJoint();draw('a');};
  $('duration').onchange=guarded(()=>{if(!state.a)return;const value=Number($('duration').value);if(!Number.isFinite(value)||value<1||value>60000)throw new Error('Duration must be 1–60000ms');pause();remember();state.a.timeline[current('a').index].durationMs=value;refreshAll();});
  const move=by=>{if(!state.a)return;pause();const at=current('a'),other=at.index+by;if(other<0||other>=state.a.timeline.length)return;remember();const timeline=state.a.timeline;[timeline[at.index],timeline[other]]=[timeline[other],timeline[at.index]];seekSlot(other);refreshAll();};
  $('moveEarlier').onclick=()=>move(-1);$('moveLater').onclick=()=>move(1);
  $('undo').onclick=guarded(()=>{pause();const previous=state.undo.pop();if(previous){applyMetadata(state.a,previous);$('events').value=JSON.stringify(state.a.events,null,2);state.elapsed=0;refreshAll();}});
  $('reset').onclick=guarded(()=>{if(state.a?.local){notice('To reset local artwork, reimport the original PNGs. Undo restores metadata edits.');return;}return loadA();});
  $('inherit').onclick=guarded(()=>{const seq=state.a,template=state.gold.animations[seq?.animation];if(!seq||!template)throw new Error('Itachi has no authored Gold profile for this animation; keep it pending');pause();remember();seq.timeline=inheritTiming(template,seq.frames.length);seq.events=clone(template.events);seq.inheritedFrom=state.gold.id;state.elapsed=0;$('events').value=JSON.stringify(seq.events,null,2);refreshAll();notice('Gold timing and events inherited. Artwork, anatomy and pose correspondence remain pending review.');});
  $('saveEvents').onclick=guarded(()=>{if(!state.a)return;const events=JSON.parse($('events').value);checkEvents(events);remember();state.a.events=events;refreshAll();});
  $('scaffold').onclick=()=>{const f=selected();if(!f)return;pause();remember();f.landmarks=scaffold(f.width,f.height);$('anatomy').checked=true;$('presentation').value='source';refreshFrame();};
  $('placeJoint').onclick=guarded(()=>setJoint(Number($('jointX').value),Number($('jointY').value)));
  $('deleteJoint').onclick=()=>{const f=selected();if(f){remember();delete f.landmarks[$('joint').value];refreshFrame();}};
  $('pose').onchange=()=>{pause();const f=selected();if(f){remember();f.pose=$('pose').value;}};
  $('export').onclick=()=>download('animation-lab-qa.json',{schemaVersion:PROFILE_VERSION,a:state.reports.a,b:state.reports.b,automatic_checks_only:true});
  $('exportMetrics').onclick=()=>download('blazing-motion-reference-metrics.json',{schemaVersion:PROFILE_VERSION,auditedCommit:state.library.auditedCommit,a:state.reports.a,b:state.reports.b,preparation:{a:state.a?.preparationTransform,b:state.b?.preparationTransform},standard:state.standard});
  $('exportProfile').onclick=()=>download('blazing-motion-profile-v1.json',profile());
  $('importProfile').onchange=guarded(async()=>{if(!state.a)throw new Error('Load artwork first');const file=$('importProfile').files[0];if(!file)return;const data=JSON.parse(await file.text()),resolved=resolveProfile(data,id=>id===state.gold.id?state.gold:null),meta=resolved.animations[state.a.animation];if(!meta)throw new Error('Profile does not contain the loaded animation');remember();applyMetadata(state.a,meta);$('loop').checked=!!meta.loop;$('events').value=JSON.stringify(state.a.events,null,2);state.elapsed=0;refreshAll();notice('Profile metadata restored against matching artwork. Review state remains pending.');});
  let dragging=false;
  const pointerPoint=e=>{const rect=$('stageA').getBoundingClientRect(),f=selected();if(!f||$('presentation').value==='normalized')return null;let x=(e.clientX-rect.left)*512/rect.width;const y=(e.clientY-rect.top)*768/rect.height,t=sourceTransform(state.a,f);if(t.mirror)x=512-x;return {x:(x-t.dx)/t.scale,y:(y-t.dy)/t.scale};};
  $('stageA').onpointerdown=guarded(e=>{if(!$('anatomy').checked)return;if($('presentation').value==='normalized')throw new Error('Switch to Matched body scale or Untouched source to edit source-coordinate landmarks');pause();const p=pointerPoint(e);if(!p)return;const f=selected(),nearest=Object.entries(f.landmarks).map(([name,q])=>({name,d:Math.hypot(q.x-p.x,q.y-p.y)})).sort((a,b)=>a.d-b.d)[0];if(nearest?.d<18)$('joint').value=nearest.name;remember();dragging=true;$('stageA').setPointerCapture(e.pointerId);setJoint(p.x,p.y,false);});
  $('stageA').onpointermove=guarded(e=>{if(!dragging)return;const p=pointerPoint(e);if(p)setJoint(p.x,p.y,false);});
  $('stageA').onpointerup=()=>{dragging=false;};$('stageA').onpointercancel=()=>{dragging=false;};
  $('stageA').onkeydown=guarded(e=>{const deltas={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=deltas[e.key],f=selected(),p=f?.landmarks[$('joint').value];if(d&&p&&$('anatomy').checked){e.preventDefault();setJoint(p.x+d[0]*(e.shiftKey?10:1),p.y+d[1]*(e.shiftKey?10:1));}});
  window.addEventListener('pagehide',()=>{pause();dispose(state.a);dispose(state.b);for(const value of cache.values())value.then(dispose).catch(()=>{});});
}
function setJoint(x,y,history=true){if(history)pause();const f=selected();if(!f)return;const point={x,y,status:'manually-placed; needs-review'};validateLandmarks({[$('joint').value]:point},f.width,f.height);if(history)remember();f.landmarks[$('joint').value]=point;refreshFrame();}
async function init(){
  [state.library,state.standard,state.gold]=await Promise.all([json('animation-lab/reference-library.json'),json('config/fighter-visual-standard.json'),json('animation-lab/profiles/itachi-gold-v1.json')]);
  for(const name of LANDMARKS)$('joint').add(new Option(name.replaceAll('_',' '),name));
  for(const pose of RUN_POSES){$('pose').add(new Option(pose,pose));const li=document.createElement('li');li.textContent=`${pose} — pending illustrated frame and visual review`;$('pendingPoses').append(li);}
  fillAnimations('itachi',$('animation'));fillAnimations('itachi',$('refAnimation'));installHandlers();
  await Promise.all([loadA(),loadB()]);
}
// Read-only diagnostics and deterministic seeking for smoke tests; never touches the game.
window.motionStudio={snapshot:()=>({view:{mode:$('presentation').value,transforms:matchedViewTransforms([state.a,state.b])},loading:state.loading,playing:state.playing,elapsedMs:state.elapsed,a:state.a?{character:state.a.character,animation:state.a.animation,timeline:clone(state.a.timeline),frame:current('a'),paths:state.a.frames.map(f=>f.sourcePath),landmarks:clone(selected()?.landmarks||{}),normalization:state.a.normalization,preparationTransform:clone(state.a.preparationTransform||null)}:null,b:state.b?{character:state.b.character,animation:state.b.animation,frame:current('b'),timeline:clone(state.b.timeline)}:null,reports:clone(state.reports)}),seekTime:ms=>{pause();state.elapsed=Math.max(0,Number(ms)||0);refreshFrame();},exportProfile:profile};
init().catch(error=>notice(`Studio startup failed: ${error.message}`,true));
