import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Uploaded character motion: '+message)};

const runtime=`
const UPLOADED_CHARACTER_MOTION=(()=>{
 const names=Object.freeze(['Sub-Zero','Scorpion','Mashle','Obito']);
 const ids=Object.freeze({'Sub-Zero':'subzero',Scorpion:'scorpion',Mashle:'mashle',Obito:'obito'});
 const cache=new Map();
 const mobileRendererGuard=()=>window.matchMedia?.('(max-width:700px)').matches===true&&/AppleWebKit/i.test(String(navigator.userAgent||''));
 const mobileSafeName=name=>name==='Scorpion';
 const paths=(name,kind)=>{
  const id=ids[name];if(!id)return [];
  return Array.from({length:12},(_,index)=>'assets/characters/'+id+'/sprites/runtime/v2/'+kind+'/frame_'+String(index+1).padStart(2,'0')+'.png?uploadedMotion=v2');
 };
 // The supplied Scorpion V2 frames are transparent 512x768 canvases, but the
 // figure is offset differently in a few running poses. Re-anchor every frame
 // to one centre/foot point before the battle renderer sees it. This preserves
 // the artist's pixels while removing the side-to-side "clipped" jump.
 const normalizedScorpionFrames=kind=>{
  const key='normalized:Scorpion:'+kind;if(cache.has(key))return cache.get(key);
  const frames=paths('Scorpion',kind).map(src=>{
   const output=new Image(),source=new Image();source.decoding='async';
   const fallback=()=>{if(!output.src)output.src=src;};
   source.addEventListener('load',()=>{try{
    const width=source.naturalWidth||512,height=source.naturalHeight||768,probe=document.createElement('canvas');probe.width=width;probe.height=height;
    const probeCtx=probe.getContext('2d',{willReadFrequently:true});probeCtx.drawImage(source,0,0,width,height);
    const pixels=probeCtx.getImageData(0,0,width,height).data;let minX=width,minY=height,maxX=-1,maxY=-1;
    for(let p=0;p<pixels.length;p+=4){if(pixels[p+3]<=12)continue;const px=(p/4)%width,py=Math.floor((p/4)/width);if(px<minX)minX=px;if(px>maxX)maxX=px;if(py<minY)minY=py;if(py>maxY)maxY=py;}
    if(maxX<minX){fallback();return;}
    const normalized=document.createElement('canvas');normalized.width=512;normalized.height=768;const ctx=normalized.getContext('2d');
    // 256 / 742 match the shared bottom-centre runtime anchor used by Obito.
    ctx.drawImage(source,Math.round(256-(minX+maxX+1)/2),Math.round(742-(maxY+1)));
    output.src=normalized.toDataURL('image/png');
   }catch(_){fallback();}});source.addEventListener('error',fallback);source.src=src;return output;
  });cache.set(key,frames);return frames;
 };
 const frames=(name,kind)=>{
  if(!names.includes(name))return null;
  if(name==='Scorpion')return normalizedScorpionFrames(kind);
  const key=name+':'+kind;
  if(!cache.has(key))cache.set(key,makeImageFrames(paths(name,kind)));
  return cache.get(key);
 };
 // Enabling every V2 set at once exceeded iOS's decoded-image budget. Scorpion
 // is enabled alone, and each sequence remains lazy until that state is used.
 return Object.freeze({has:name=>names.includes(name)&&(!mobileRendererGuard()||mobileSafeName(name)),idle:name=>frames(name,'idle'),run:name=>frames(name,'run'),basic:name=>frames(name,'attack'),recoil:name=>frames(name,'recoil')});
})();
const BLAZING_UPLOADED_VFX=Object.freeze({
 scorpionSpear:'assets/vfx/uploaded-v2/scorpion_chain_spear_vfx_atlas',
 subZeroIceBall:'assets/vfx/uploaded-v2/sub_zero_ice_ball_projectile',
 fireBurst:'assets/vfx/uploaded-v2/anime_fire_burst_sprite_sequence',
 earthSand:'assets/vfx/uploaded-v2/earth_sand_style_12_frame_atlas',
 icyShatter:'assets/vfx/uploaded-v2/six_frame_icy_shatter_vfx_atlas',
 waterStyle:'assets/vfx/uploaded-v2/water_style_attack_12_frame_atlas'
});
window.BlazingUploadedVfx=BLAZING_UPLOADED_VFX;
const UPLOADED_VFX_MOBILE_GUARD=window.matchMedia?.('(max-width:700px)').matches===true&&/AppleWebKit/i.test(String(navigator.userAgent||''));
// Do not instantiate 144 high-resolution VFX frames on iPhone during boot.
// Empty sequences preserve the established renderer fallbacks (rather than a black field).
const UPLOADED_VFX_FRAMES=Object.freeze(Object.fromEntries(Object.entries(BLAZING_UPLOADED_VFX).map(([key,root])=>[key,UPLOADED_VFX_MOBILE_GUARD?[]:makeImageFrames(Array.from({length:12},(_,index)=>root+'/frame_'+String(index+1).padStart(2,'0')+'.png?uploadedVfx=v2'))])));
const UPLOADED_VFX_LAZY_CACHE=new Map();
function uploadedVfxFrames(key){
 const eager=UPLOADED_VFX_FRAMES[key];if(eager?.length)return eager;
 const root=BLAZING_UPLOADED_VFX[key];if(!root)return [];
 if(!UPLOADED_VFX_LAZY_CACHE.has(key))UPLOADED_VFX_LAZY_CACHE.set(key,makeImageFrames(Array.from({length:12},(_,index)=>root+'/frame_'+String(index+1).padStart(2,'0')+'.png?uploadedVfx=lazy-v2')));
 return UPLOADED_VFX_LAZY_CACHE.get(key);
}
`;

const idleAnchor="function unitIdleFrames(name){const itachiMotionFrames=name==='Itachi'?";
if(!html.includes(idleAnchor))fail('final idle resolver anchor missing');
html=html.replace(idleAnchor,"function unitIdleFrames(name){const uploadedRun=UPLOADED_CHARACTER_MOTION.has(name)&&S?.drag&&S?.dragUnitName===name?UPLOADED_CHARACTER_MOTION.run(name):null;const uploadedIdle=UPLOADED_CHARACTER_MOTION.has(name)?UPLOADED_CHARACTER_MOTION.idle(name):null;if(uploadedRun?.length)return uploadedRun;if(uploadedIdle?.length)return uploadedIdle;const itachiMotionFrames=name==='Itachi'?");
const insertionAt=html.indexOf('function unitIdleFrames(name){');
html=html.slice(0,insertionAt)+runtime+'\n'+html.slice(insertionAt);

const attackAnchor='function unitAttackFrames(name,kind){const madaraArchiveBasic=name===\'Madara\'?MADARA_ARCHIVE_BODY_RUNTIME.basic():null;if(madaraArchiveBasic?.length)return madaraArchiveBasic;const legacyShinobiBasic=LEGACY_SHINOBI_BODY_RUNTIME.basic(name);';
if(!html.includes(attackAnchor))fail('final attack resolver anchor missing');
html=html.replace(attackAnchor,"function unitAttackFrames(name,kind){const uploadedBasic=UPLOADED_CHARACTER_MOTION.has(name)&&kind!=='jutsu'&&kind!=='special'?UPLOADED_CHARACTER_MOTION.basic(name):null;if(uploadedBasic?.length)return uploadedBasic;const madaraArchiveBasic=name==='Madara'?MADARA_ARCHIVE_BODY_RUNTIME.basic():null;if(madaraArchiveBasic?.length)return madaraArchiveBasic;const legacyShinobiBasic=LEGACY_SHINOBI_BODY_RUNTIME.basic(name);");

const cadenceAnchor=' const idleMs=(obitoRunning||itachiRunning)?85:';
if(!html.includes(cadenceAnchor))fail('final motion cadence anchor missing');
html=html.replace(cadenceAnchor," const uploadedRunning=UPLOADED_CHARACTER_MOTION.has(name)&&S?.drag&&S?.dragUnitName===name;\n const idleMs=(obitoRunning||itachiRunning||uploadedRunning)?85:");

const spriteAnchor=' let spriteRef=sprite?getRenderableSprite(sprite,name):null;';
if(!html.includes(spriteAnchor))fail('sprite-selection anchor missing');
html=html.replace(spriteAnchor,` // Uploaded recoil sequences take precedence for a received hit, after idle/attack selection.
 if(!visual&&fx?.kind==='hit'&&UPLOADED_CHARACTER_MOTION.has(name)){
   const recoilFrames=UPLOADED_CHARACTER_MOTION.recoil(name);
   const recoilIndex=Math.min(recoilFrames.length-1,Math.floor(clamp((performance.now()-fx.start)/Math.max(1,fx.duration),0,1)*recoilFrames.length));
   const recoilFrame=recoilFrames[recoilIndex];
   if(recoilFrame?.complete&&recoilFrame.naturalWidth>0)sprite=recoilFrame;
 }
${spriteAnchor}`);

const iceFrameAnchor='const img=SUBZERO_FREEZE_PROJECTILE_FRAMES[frameIndex];';
if(!html.includes(iceFrameAnchor))fail('Sub-Zero projectile renderer anchor missing');
html=html.replace(iceFrameAnchor,"const uploadedIceFrames=UPLOADED_VFX_FRAMES.subZeroIceBall;const uploadedIceIndex=Math.min(uploadedIceFrames.length-1,Math.floor(t*uploadedIceFrames.length));const img=uploadedIceFrames[uploadedIceIndex]?.complete&&uploadedIceFrames[uploadedIceIndex].naturalWidth>0?uploadedIceFrames[uploadedIceIndex]:SUBZERO_FREEZE_PROJECTILE_FRAMES[frameIndex];");

const spearRendererAnchor="}else if(f.kind==='iceProjectile'){";
if(!html.includes(spearRendererAnchor))fail('Scorpion spear renderer anchor missing');
html=html.replace(spearRendererAnchor,`}else if(f.kind==='uploadedScorpionSpear'){
     const t=clamp((performance.now()-f.start)/Math.max(1,f.duration),0,1),ease=1-Math.pow(1-t,2.2),from=f.from,to=f.to;
     const x=from.x+(to.x-from.x)*ease,y=from.y+(to.y-from.y)*ease,dir=to.x<from.x?-1:1;
     const frames=uploadedVfxFrames('scorpionSpear'),index=Math.min(frames.length-1,Math.floor(t*frames.length)),img=frames[index];
     ctx.translate(x,y-17);ctx.scale(dir,1);ctx.globalAlpha=.98;ctx.imageSmoothingEnabled=true;
     if(img?.complete&&img.naturalWidth>0){ctx.shadowColor='rgba(255,182,42,.76)';ctx.shadowBlur=5;ctx.drawImage(img,-56,-31,112,62);}else{ctx.save();ctx.strokeStyle='rgba(255,192,68,.96)';ctx.shadowColor='rgba(255,120,16,.92)';ctx.shadowBlur=6;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-52,0);ctx.lineTo(14,0);ctx.stroke();for(let n=0;n<6;n++){ctx.beginPath();ctx.arc(-45+n*10,0,2.3,0,Math.PI*2);ctx.fillStyle=n%2?'#ffd37a':'#71351d';ctx.fill()}ctx.fillStyle='#f2b133';ctx.beginPath();ctx.moveTo(25,0);ctx.lineTo(10,-7);ctx.lineTo(10,7);ctx.closePath();ctx.fill();ctx.restore();}
    ${spearRendererAnchor}`);

const scorpionDriverAnchor='function animateObitoFireball(unitName,from,enemy,onImpact,onDone,attackKind=\'basic_attack\'){';
if(!html.includes(scorpionDriverAnchor))fail('Scorpion spear animation anchor missing');
html=html.replace(scorpionDriverAnchor,`function animateScorpionSpearStrike(unitName,from,enemy,onImpact,onDone,attackKind='basic_attack'){
 const token=ACTIVE_ACTION_TOKEN,state=ensureAnimState(),releaseDelay=420,flightDuration=480,impactHold=420;
 if(!state.attackPose)state.attackPose={};state.attackPose[unitName]={kind:'basic_attack',start:performance.now(),duration:releaseDelay+flightDuration+impactHold,frameMs:105};
 window.BlazingAttackPresentation.lockFacing(state,unitName,from,enemy);
 setTimeout(()=>{if(!actionTokenAlive(token))return;const fx={kind:'uploadedScorpionSpear',from:{x:from.x,y:from.y-29},to:{x:enemy.x,y:enemy.y-22},start:performance.now(),duration:flightDuration,life:1};S.floaters.push(fx);setTimeout(()=>{if(!actionTokenAlive(token))return;try{onImpact&&onImpact()}catch(err){console.error('Scorpion spear impact failed:',err);return recoverAction('Scorpion spear impact')}setTimeout(()=>{S.floaters=S.floaters.filter(x=>x!==fx);const st=ensureAnimState();if(st.attackPose)delete st.attackPose[unitName];window.BlazingAttackPresentation.clearFacing(st,unitName);if(actionTokenAlive(token))try{onDone&&onDone()}catch(err){recoverAction('Scorpion spear completion')}},impactHold)},flightDuration)},releaseDelay);
}
${scorpionDriverAnchor}`);

const basicDriverAnchor="}else if(au.name==='Obito'){\n      runBasicAttack=animateObitoFireball;basicTarget=enemy;";
if(!html.includes(basicDriverAnchor))fail('basic attack routing anchor missing');
html=html.replace(basicDriverAnchor,"}else if(au.name==='Scorpion'){\n      runBasicAttack=animateScorpionSpearStrike;basicTarget=enemy;\n    }else if(au.name==='Obito'){\n      runBasicAttack=animateObitoFireball;basicTarget=enemy;");

for(const marker of ['UPLOADED_CHARACTER_MOTION','mobileSafeName','normalizedScorpionFrames','256 / 742','BLAZING_UPLOADED_VFX','UPLOADED_VFX_FRAMES','uploadedVfxFrames','uploadedScorpionSpear','animateScorpionSpearStrike','releaseDelay=420','scorpionSpear','subZeroIceBall','uploadedRunning','uploadedBasic','recoilFrames'])if(!html.includes(marker))fail('missing '+marker);
await fs.writeFile(file,html);
console.log('Uploaded character motion PASS: twelve-frame idle/run/basic/recoil packs are isolated and active; Scorpion spear and Sub-Zero ice ball use supplied VFX; elemental sequences are reusable.');
