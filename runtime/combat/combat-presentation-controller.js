(()=>{
'use strict';
const decoded=new WeakSet(),frameBounds=new WeakMap(),actorReferences=new Map();let encounter={status:'idle',id:0,error:null};
const validImage=image=>!!image&&image.complete&&image.naturalWidth>0&&image.naturalHeight>0;
async function decodeImage(image,label='battle image'){
 if(!image)return;if(validImage(image)){decoded.add(image);return}
 try{if(typeof image.decode==='function')await image.decode();else await new Promise((ok,no)=>{image.addEventListener('load',ok,{once:true});image.addEventListener('error',no,{once:true})});if(!validImage(image))throw new Error('decoded without drawable dimensions');decoded.add(image)}
 catch(error){throw new Error(`${label} failed to decode: ${image.currentSrc||image.src||'unknown source'}`,{cause:error})}
}
function flattenImages(value,out=new Set()){if(!value)return out;if(typeof HTMLImageElement!=='undefined'&&value instanceof HTMLImageElement){out.add(value);return out}if(Array.isArray(value))for(const item of value)flattenImages(item,out);return out}
function measureFrame(image){
 if(!image||frameBounds.has(image))return frameBounds.get(image)||null;
 const width=image.naturalWidth||image.width||0,height=image.naturalHeight||image.height||0;
 if(!width||!height||typeof document==='undefined')return null;
 try{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
  const pixels=context.getImageData(0,0,width,height).data;let left=width,top=height,right=-1,bottom=-1;
  for(let index=3;index<pixels.length;index+=4)if(pixels[index]>12){const pixel=(index-3)/4,x=pixel%width,y=Math.floor(pixel/width);if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y}
  const bounds=right>=left&&bottom>=top?Object.freeze({width,height,left,top,right,bottom,bodyWidth:right-left+1,bodyHeight:bottom-top+1}):null;
  frameBounds.set(image,bounds);return bounds;
 }catch(error){console.warn('[Combat presentation] Unable to measure sprite alpha bounds.',error);frameBounds.set(image,null);return null}
}
function referenceFor(name,idle=[]){
 if(actorReferences.has(name))return actorReferences.get(name);
 const measured=(idle||[]).map(measureFrame).filter(Boolean);if(!measured.length)return null;
 const average=key=>measured.reduce((sum,item)=>sum+item[key],0)/measured.length;
 const reference=Object.freeze({width:average('width'),height:average('height'),bodyHeight:average('bodyHeight'),bottom:average('bottom')});actorReferences.set(name,reference);return reference;
}
function spritePlacement(name,sprite,idle,{baseHeight,footY=12}={}){
 const reference=referenceFor(name,idle),current=measureFrame(sprite);const height=Math.max(1,Number(baseHeight)||1);
 if(!reference||!current||!reference.bodyHeight||!current.bodyHeight)return Object.freeze({height,y:footY-height,scale:1});
 const referenceBodyWorld=height*(reference.bodyHeight/reference.height);
 const normalizedHeight=referenceBodyWorld/(current.bodyHeight/current.height);
 const referenceFoot=footY-height+(height*(reference.bottom/reference.height));
 const y=referenceFoot-(normalizedHeight*(current.bottom/current.height));
 return Object.freeze({height:normalizedHeight,y,scale:normalizedHeight/height});
}
function isConfiguredMeleeBasic(unitData,attackKind){
 const kind=String(attackKind||'').toLowerCase();
 return unitData?.abilities?.basic?.delivery==='melee'&&['punch','kick','basic','basic_attack','attack','melee_lunge','melee_clean'].includes(kind)&&!!configuredBasic(unitData);
}
function contactPoint({from,target,state,bounds,padding=8}={}){
 if(!from||!target)return from;
 const dx=target.x-from.x,sign=dx===0?(from.x<=target.x?-1:1):Math.sign(dx);
 const targetRadius=Math.max(14,Number(target.r)||19),reach=28;
 const desired={x:target.x-sign*(targetRadius+reach),y:target.y};
 return constrainPoint({state,point:desired,from,bounds,padding});
}
async function prepareEncounter({mapImage,actors=[]}={}){
 const id=++encounter.id;encounter={status:'loading',id,error:null};const images=new Set();flattenImages(mapImage,images);for(const actor of actors){flattenImages(actor?.idle,images);flattenImages(actor?.attack,images)}
 try{await Promise.all([...images].map((image,index)=>decodeImage(image,`battle asset ${index+1}`)));for(const actor of actors||[])referenceFor(actor?.name,actor?.idle||[]);if(id!==encounter.id)return false;encounter={status:'ready',id,error:null};return true}
 catch(error){if(id===encounter.id)encounter={status:'error',id,error};console.error('[Battle readiness] Encounter blocked because required art is unavailable.',error);throw error}
}
function configuredBasic(unitData){const animation=unitData?.animation_standard?.animations?.basic_attack;return Array.isArray(animation?.frames)&&animation.frames.length?animation:null}
function timelineFor(unitData,frameCount){const animation=configuredBasic(unitData);if(!animation)return null;const frameMs=Math.max(1,Number(animation.frame_ms)||100);const event=(animation.events||[]).find(item=>/apply_melee|apply_damage|release_projectile/.test(item?.event||''));const impactFrame=Math.max(1,Math.min(frameCount,Number(event?.frame)||Math.ceil(frameCount*.6)));const animationMs=Math.max(frameMs,frameCount*frameMs),recoveryMs=Math.max(90,Math.round(frameMs*.9));return Object.freeze({frameMs,impactMs:(impactFrame-1)*frameMs,animationMs,recoveryMs,totalMs:animationMs+recoveryMs})}
function runConfiguredAttack({unitData,unitName,from,target,frames,attackKind='basic_attack',state,bounds,tokenAlive,onImpact,onDone,ensureState,lockFacing,clearFacing,requestFrame=requestAnimationFrame}){
 const baseTiming=timelineFor(unitData,frames?.length||0);if(!baseTiming||!isConfiguredMeleeBasic(unitData,attackKind))return false;
 const drunkenMaster=unitData?.display_name==='Wong Fei-Hung'||unitName==='Wong Fei-Hung';
 const cadenceScale=drunkenMaster?(.94+Math.random()*.14):1;
 const timing=drunkenMaster?Object.freeze({
  ...baseTiming,
  frameMs:Math.round(baseTiming.frameMs*cadenceScale),
  impactMs:Math.round(baseTiming.impactMs*cadenceScale),
  animationMs:Math.round(baseTiming.animationMs*cadenceScale),
  recoveryMs:Math.round(baseTiming.recoveryMs*(.96+Math.random()*.12)),
  totalMs:0
 }):baseTiming;
 if(drunkenMaster)timing.totalMs=timing.animationMs+timing.recoveryMs;
 const contact=contactPoint({from,target,state,bounds,padding:8}),distance=Math.hypot(contact.x-from.x,contact.y-from.y);
 const normalApproach=Math.max(110,Math.min(260,Math.round(distance*1.45)));
 const hesitationMs=drunkenMaster?Math.round(125+Math.random()*175):0;
 const approachMs=drunkenMaster?Math.round(105+Math.random()*55):normalApproach;
 const returnMs=drunkenMaster?Math.round(280+Math.random()*130):normalApproach;
 let started=performance.now(),phase=drunkenMaster?'hesitate':'approach',attackStart=0,impacted=false;
 const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
 const snapEase=t=>t<.72?.28*Math.pow(t/.72,2):.28+.72*(1-Math.pow(1-(t-.72)/.28,3));
 const step=now=>{if(!tokenAlive())return;const live=ensureState();let elapsed=now-started;
  if(phase==='hesitate'){if(elapsed<hesitationMs)return requestFrame(step);phase='approach';started=now;elapsed=0}
  if(phase==='approach'){const t=Math.min(1,elapsed/approachMs),moveEase=drunkenMaster?snapEase(t):ease(t);live.positions[unitName]={x:from.x+(contact.x-from.x)*moveEase,y:from.y+(contact.y-from.y)*moveEase};if(t<1)return requestFrame(step);phase='attack';attackStart=now;if(!live.attackPose)live.attackPose={};live.attackPose[unitName]={kind:'basic_attack',start:attackStart,duration:timing.animationMs,frameMs:timing.frameMs};lockFacing(live,unitName,contact,target);return requestFrame(step)}
  if(phase==='attack'){elapsed=now-attackStart;if(!impacted&&elapsed>=timing.impactMs){impacted=true;try{onImpact?.()}catch(error){console.error('Attack impact callback failed:',error);return}}if(elapsed<timing.totalMs)return requestFrame(step);phase='return';attackStart=now;if(live.attackPose)delete live.attackPose[unitName];return requestFrame(step)}
  const t=Math.min(1,(now-attackStart)/returnMs),returnEase=drunkenMaster?1-Math.pow(1-t,2):ease(t);live.positions[unitName]={x:contact.x+(from.x-contact.x)*returnEase,y:contact.y+(from.y-contact.y)*returnEase};if(t<1)return requestFrame(step);delete live.positions[unitName];clearFacing(live,unitName);try{onDone?.()}catch(error){console.error('Attack completion callback failed:',error)}
 };requestFrame(step);return true
}
function constrainPoint({state,point,from,bounds,padding=4}){if(state?.bbRunMode==='road'&&window.BlazingRoadContent?.constrainMovementPoint)return window.BlazingRoadContent.constrainMovementPoint(state.bbRoadContent?.map,point,from||point,{padding});return{x:Math.max(bounds.left,Math.min(bounds.right,point.x)),y:Math.max(bounds.top,Math.min(bounds.bottom,point.y))}}
const allowFallbackToken=()=>encounter.status!=='ready';const snapshot=()=>Object.freeze({...encounter});
window.BlazingCombatPresentation=Object.freeze({decodeImage,prepareEncounter,measureFrame,spritePlacement,configuredBasic,isConfiguredMeleeBasic,contactPoint,timelineFor,runConfiguredAttack,constrainPoint,allowFallbackToken,snapshot,validImage});
})();
