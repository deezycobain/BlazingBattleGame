(()=>{
'use strict';
const decoded=new WeakSet();let encounter={status:'idle',id:0,error:null};
const validImage=image=>!!image&&image.complete&&image.naturalWidth>0&&image.naturalHeight>0;
async function decodeImage(image,label='battle image'){
 if(!image)return;if(validImage(image)){decoded.add(image);return}
 try{if(typeof image.decode==='function')await image.decode();else await new Promise((ok,no)=>{image.addEventListener('load',ok,{once:true});image.addEventListener('error',no,{once:true})});if(!validImage(image))throw new Error('decoded without drawable dimensions');decoded.add(image)}
 catch(error){throw new Error(`${label} failed to decode: ${image.currentSrc||image.src||'unknown source'}`,{cause:error})}
}
function flattenImages(value,out=new Set()){if(!value)return out;if(typeof HTMLImageElement!=='undefined'&&value instanceof HTMLImageElement){out.add(value);return out}if(Array.isArray(value))for(const item of value)flattenImages(item,out);return out}
async function prepareEncounter({mapImage,actors=[]}={}){
 const id=++encounter.id;encounter={status:'loading',id,error:null};const images=new Set();flattenImages(mapImage,images);for(const actor of actors){flattenImages(actor?.idle,images);flattenImages(actor?.attack,images)}
 try{await Promise.all([...images].map((image,index)=>decodeImage(image,`battle asset ${index+1}`)));if(id!==encounter.id)return false;encounter={status:'ready',id,error:null};return true}
 catch(error){if(id===encounter.id)encounter={status:'error',id,error};console.error('[Battle readiness] Encounter blocked because required art is unavailable.',error);throw error}
}
function configuredBasic(unitData){const animation=unitData?.animation_standard?.animations?.basic_attack;return Array.isArray(animation?.frames)&&animation.frames.length?animation:null}
function timelineFor(unitData,frameCount){const animation=configuredBasic(unitData);if(!animation)return null;const frameMs=Math.max(1,Number(animation.frame_ms)||100);const event=(animation.events||[]).find(item=>/apply_melee|apply_damage|release_projectile/.test(item?.event||''));const impactFrame=Math.max(1,Math.min(frameCount,Number(event?.frame)||Math.ceil(frameCount*.6)));const animationMs=Math.max(frameMs,frameCount*frameMs),recoveryMs=Math.max(90,Math.round(frameMs*.9));return Object.freeze({frameMs,impactMs:(impactFrame-1)*frameMs,animationMs,recoveryMs,totalMs:animationMs+recoveryMs})}
function runConfiguredAttack({unitData,unitName,from,target,frames,tokenAlive,onImpact,onDone,ensureState,lockFacing,clearFacing,requestFrame=requestAnimationFrame}){
 const timing=timelineFor(unitData,frames?.length||0);if(!timing)return false;const started=performance.now(),state=ensureState();if(!state.attackPose)state.attackPose={};state.attackPose[unitName]={kind:'basic_attack',start:started,duration:timing.animationMs,frameMs:timing.frameMs};lockFacing(state,unitName,from,target);let impacted=false;
 const step=now=>{if(!tokenAlive())return;const elapsed=now-started;if(!impacted&&elapsed>=timing.impactMs){impacted=true;try{onImpact?.()}catch(error){console.error('Attack impact callback failed:',error);return}}if(elapsed<timing.totalMs)return requestFrame(step);const live=ensureState();if(live.attackPose)delete live.attackPose[unitName];clearFacing(live,unitName);try{onDone?.()}catch(error){console.error('Attack completion callback failed:',error)}};requestFrame(step);return true
}
function constrainPoint({state,point,from,bounds,padding=4}){if(state?.bbRunMode==='road'&&window.BlazingRoadContent?.constrainMovementPoint)return window.BlazingRoadContent.constrainMovementPoint(state.bbRoadContent?.map,point,from||point,{padding});return{x:Math.max(bounds.left,Math.min(bounds.right,point.x)),y:Math.max(bounds.top,Math.min(bounds.bottom,point.y))}}
const allowFallbackToken=()=>encounter.status!=='ready';const snapshot=()=>Object.freeze({...encounter});
window.BlazingCombatPresentation=Object.freeze({decodeImage,prepareEncounter,configuredBasic,timelineFor,runConfiguredAttack,constrainPoint,allowFallbackToken,snapshot,validImage});
})();
