// Portable production metadata and QA. No game, DOM, storage or network dependencies.
export const PROFILE_VERSION = '1.0.0';
export const LANDMARKS = ['head','neck','torso','pelvis', ...['near','far'].flatMap(side => ['shoulder','elbow','wrist','hand','hip','knee','ankle','foot'].map(joint => `${side}_${joint}`))];
export const BONES = [['head','neck'],['neck','torso'],['torso','pelvis'], ...['near','far'].flatMap(s => [['neck',`${s}_shoulder`],[`${s}_shoulder`,`${s}_elbow`],[`${s}_elbow`,`${s}_wrist`],[`${s}_wrist`,`${s}_hand`],['pelvis',`${s}_hip`],[`${s}_hip`,`${s}_knee`],[`${s}_knee`,`${s}_ankle`],[`${s}_ankle`,`${s}_foot`]])];
export const RUN_POSES = ['Near contact / far recovery','Near compression / opposite arm forward','Near passing / far knee forward','Near push-off / flight','Far contact / near recovery','Far compression / opposite arm forward','Far passing / near knee forward','Far push-off / flight'];
export const clone = value => structuredClone(value);
export const median = values => { const s=[...values].sort((a,b)=>a-b), m=Math.floor(s.length/2);return s.length ? (s.length%2?s[m]:(s[m-1]+s[m])/2) : 0; };
export const totalMs = timeline => timeline.reduce((sum,slot)=>sum+slot.durationMs,0);
export function frameAt(timeline, elapsedMs, loop=true) {
  if(!timeline.length)return {index:-1,frame:-1,startMs:0,ended:true};
  const total=totalMs(timeline), ended=elapsedMs>=total;
  let t=loop?((elapsedMs%total)+total)%total:Math.max(0,Math.min(elapsedMs,total-.000001));
  let startMs=0;
  for(let index=0;index<timeline.length;index++) {const slot=timeline[index];if(t<slot.durationMs)return {index,frame:slot.frame,startMs,ended:!loop&&ended};t-=slot.durationMs;startMs+=slot.durationMs;}
  return {index:0,frame:timeline[0].frame,startMs:0,ended:false};
}
export const timelineFor = (count,durationMs,order=Array.from({length:count},(_,i)=>i)) => order.map(frame=>({frame,durationMs}));
export function pngInfo(buffer) {
  const a=new Uint8Array(buffer),v=new DataView(a.buffer,a.byteOffset,a.byteLength);
  if(a.length<33 || [137,80,78,71,13,10,26,10].some((n,i)=>a[i]!==n) || String.fromCharCode(...a.slice(12,16))!=='IHDR' || v.getUint32(8)!==13)throw new Error('File is not a PNG with a valid IHDR');
  return {width:v.getUint32(16),height:v.getUint32(20),bitDepth:a[24],colorType:a[25],rgba:a[25]===6};
}
export async function inspectPixels({data,width,height},header) {
  let left=width,top=height,right=-1,bottom=-1,clear=0,partial=0,visible=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {const a=data[(y*width+x)*4+3];if(a===0)clear++;else if(a<255)partial++;if(a>12){visible++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
  const mask=[];
  for(let y=0;y<96;y++)for(let x=0;x<64;x++)mask.push(data[(Math.min(height-1,Math.floor((y+.5)*height/96))*width+Math.min(width-1,Math.floor((x+.5)*width/64)))*4+3]>12?1:0);
  const digest=await globalThis.crypto.subtle.digest('SHA-256',data);
  const fingerprint=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  const bounds=right<left?null:[left,top,right+1,bottom+1];
  return {width,height,header,bounds,bodyHeight:bounds?bottom-top+1:0,centerX:bounds?(left+right+1)/2:null,feetY:bounds?bottom+1:null,margins:bounds?[left,top,width-right-1,height-bottom-1]:[],occupancy:visible/(width*height),clearPixels:clear,partialAlphaPixels:partial,fingerprint,mask};
}
export function validateSequence(sequence, standard) {
  const errors=[],warnings=[],frames=sequence.frames,valid=frames.map(f=>f.metrics).filter(m=>m?.bounds);
  const cfg=standard.source_frame,production=sequence.production===true;
  if(!frames.length)errors.push('No frames loaded');
  if(production&&frames.length>0&&frames.length<6)warnings.push('Below the initial 6–8 distinct-frame production target; additional illustrated poses may be needed (target, not a hard limit)');
  const indices=frames.map(f=>f.name.match(/(?:frame_|_f)(\d+)\.png$/i)?.[1]).filter(Boolean).map(Number);
  if(indices.length===frames.length&&indices.length){if(new Set(indices).size!==indices.length)errors.push('Duplicate numbered frame indices');const sorted=[...new Set(indices)].sort((a,b)=>a-b);if(sorted.some((n,i)=>i&&n!==sorted[i-1]+1))errors.push('Missing numbered frames');}
  const seen=new Map();
  frames.forEach((f,i)=>{
    const m=f.metrics,label=`${i+1}. ${f.name}`;
    if(f.error||!m){errors.push(`${label}: ${f.error||'Frame could not be decoded'}`);return;}
    if(!m.header?.rgba)errors.push(`${label}: PNG must encode true RGBA (IHDR color type 6)`);
    if(production&&(m.width!==cfg.width_px||m.height!==cfg.height_px))errors.push(`${label}: requires ${cfg.width_px}×${cfg.height_px}`);
    if(!production&&(m.width!==cfg.width_px||m.height!==cfg.height_px))warnings.push(`${label}: preserved legacy/reference canvas ${m.width}×${m.height}`);
    if(!m.clearPixels)errors.push(`${label}: no fully transparent background pixels`);
    if(!m.bounds){errors.push(`${label}: empty visible frame`);return;}
    if(Math.min(...m.margins)<4)errors.push(`${label}: silhouette touches/approaches canvas edge; inspect cropping`);
    else if(Math.min(...m.margins)<cfg.minimum_transparent_gutter_px)warnings.push(`${label}: transparent gutter below ${cfg.minimum_transparent_gutter_px}px`);
    if(production&&Math.abs(m.bodyHeight-cfg.standard_body_height_px)>cfg.standard_body_height_tolerance_px)warnings.push(`${label}: visible height ${m.bodyHeight}px outside 600±30; pose review required`);
    if(production&&sequence.animation==='idle'&&Math.abs(m.feetY-cfg.feet_baseline_y_px)>cfg.feet_baseline_tolerance_px)warnings.push(`${label}: neutral feet ${m.feetY}px differ from 700±8`);
    const key=`${m.width}:${m.height}:${m.fingerprint}`;
    if(seen.has(key))warnings.push(`${label}: duplicate pixels of source frame ${seen.get(key)+1}; intentional holds belong in the timeline`);else seen.set(key,i);
  });
  if(new Set(frames.filter(f=>f.metrics).map(f=>`${f.metrics.width}×${f.metrics.height}`)).size>1)errors.push('Inconsistent canvas dimensions across sequence');
  if(valid.length>1){
    const range=k=>Math.max(...valid.map(m=>m[k]))-Math.min(...valid.map(m=>m[k]));
    if(range('centerX')>20)warnings.push('Horizontal silhouette registration varies by >20px; inspect intended movement');
    if(range('feetY')>16)warnings.push('Vertical silhouette registration varies by >16px; run/jump lift may be intentional');
    if(range('bodyHeight')>30)warnings.push('Silhouette height varies by >30px; inspect compression and scale pumping');
    if(range('occupancy')>median(valid.map(m=>m.occupancy))*.25)warnings.push('Body occupancy varies by >25% of median; inspect pose/silhouette changes');
    const delta=(a,b)=>a.mask.reduce((s,n,i)=>s+(n!==b.mask[i]?1:0),0)/a.mask.length;
    const playback=sequence.timeline.map(s=>frames[s.frame]?.metrics).filter(m=>m?.bounds);
    const adjacent=playback.slice(1).map((m,i)=>delta(playback[i],m)),loop=playback.length>1?delta(playback.at(-1),playback[0]):0;
    if(loop>Math.max(.08,median(adjacent)*1.75))warnings.push(`Loop boundary silhouette change ${(loop*100).toFixed(1)}% warrants visual review`);
  }
  const timelineErrors=validateTimeline(sequence.timeline,frames.length);errors.push(...timelineErrors);
  return {schemaVersion:PROFILE_VERSION,scope:production?'new-production':'legacy-reference',animation:sequence.animation,frame_count:frames.length,playback_slots:sequence.timeline.length,durationMs:totalMs(sequence.timeline),technicalPass:errors.length===0,artApproval:'pending-human-review',errors,warnings,manualReview:['Anatomy and near/far limb continuity','Character identity and approved outfit','Loop continuity, weight, contacts and opposite-arm swing','VFX separation and actual gameplay readability'],frames:frames.map(f=>({name:f.name,error:f.error||null,...f.metrics,mask:undefined}))};
}
export function validateTimeline(timeline,count) {
  const errors=[];if(!timeline.length)errors.push('Playback timeline is empty');
  timeline.forEach((s,i)=>{if(!Number.isInteger(s.frame)||s.frame<0||s.frame>=count)errors.push(`Slot ${i+1}: invalid source frame`);if(!Number.isFinite(s.durationMs)||s.durationMs<1||s.durationMs>60000)errors.push(`Slot ${i+1}: duration must be 1–60000ms`);});return errors;
}
export function resolveProfile(profile, lookup, chain=[]) {
  if(profile.schemaVersion!==PROFILE_VERSION)throw new Error('Unsupported motion-profile version');
  if(chain.includes(profile.id))throw new Error('Motion-profile inheritance cycle');
  const parent=profile.extends?lookup(profile.extends):null;if(profile.extends&&!parent)throw new Error(`Missing parent profile: ${profile.extends}`);
  const base=parent?resolveProfile(parent,lookup,[...chain,profile.id]):{};
  const animations=clone(base.animations||{});
  for(const [name,override] of Object.entries(profile.animations||{}))animations[name]={...(animations[name]||{}),...clone(override)};
  return {...clone(base),...clone(profile),animations};
}
export function inheritTiming(template,count) {
  if(count<1)throw new Error('Import artwork before inheriting timing');
  // Preserve relative gold timing while mapping phases onto the new artwork count.
  const total=totalMs(template.timeline),weights=Array.from({length:count},(_,i)=>template.timeline[frameAt(template.timeline,(i+.5)*total/count).index].durationMs),sum=weights.reduce((a,b)=>a+b,0);
  return weights.map((w,frame)=>({frame,durationMs:total*w/sum}));
}
export function scaffold(width,height) {
  const points={head:[.5,.20],neck:[.5,.29],torso:[.5,.41],pelvis:[.5,.57]};
  for(const [s,dir] of [['near',-1],['far',1]])Object.assign(points,{[`${s}_shoulder`]:[.5+dir*.12,.32],[`${s}_elbow`]:[.5+dir*.17,.45],[`${s}_wrist`]:[.5+dir*.19,.56],[`${s}_hand`]:[.5+dir*.20,.60],[`${s}_hip`]:[.5+dir*.075,.58],[`${s}_knee`]:[.5+dir*.10,.73],[`${s}_ankle`]:[.5+dir*.11,.88],[`${s}_foot`]:[.5+dir*.14,.91]});
  return Object.fromEntries(Object.entries(points).map(([k,[x,y]])=>[k,{x:x*width,y:y*height,status:'unverified-scaffold'}]));
}
export function validateLandmarks(points,width,height){
  for(const [name,p] of Object.entries(points)){if(!LANDMARKS.includes(name)||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>width||p.y>height)throw new Error(`Invalid landmark: ${name}`);}
}
