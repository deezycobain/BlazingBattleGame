(()=>{
'use strict';
const ROOT='assets/characters/scorpion/puppet/v1';
const BODY_IMAGE=ROOT+'/body/scorpion_puppet_body_atlas_v1.png';
const BODY_MAP=ROOT+'/body/scorpion_puppet_body_atlas_v1.json';
const MODE_KEY='bb.scorpion-puppet-atlas.mode';
const DEV_KEY='bb.scorpion-puppet-atlas.dev';
const BLANK_NAME='__bbScorpionPuppetTransparent';
const state={mode:'FRAME',ready:false,failed:false,error:null,bodyImage:null,bodyMap:null,metrics:{puppetDraws:0,lastVisibleParts:0,lastDrawBounds:null,lastFeet:null,footSamples:[]}};
try{state.mode=localStorage.getItem(MODE_KEY)==='PUPPET'?'PUPPET':'FRAME'}catch(_){}
const devEnabled=()=>{try{const query=new URLSearchParams(location.search);return query.has('scorpionPuppetAB')||localStorage.getItem(DEV_KEY)==='1'||['localhost','127.0.0.1','::1'].includes(location.hostname)}catch(_){return false}};
function setMode(mode){
 state.mode=mode==='PUPPET'&&state.ready&&!state.failed?'PUPPET':'FRAME';
 try{localStorage.setItem(MODE_KEY,state.mode)}catch(_){}
 const button=document.getElementById('bb-scorpion-puppet-ab-switch');
 if(button)button.textContent='SCORPION · '+state.mode+' (A/B)';
 return state.mode;
}
function ensureSwitch(){
 if(!devEnabled()||document.getElementById('bb-scorpion-puppet-ab-switch'))return;
 const button=document.createElement('button');
 button.id='bb-scorpion-puppet-ab-switch';button.type='button';
 button.title='Development-only Scorpion atlas prototype A/B switch';
 button.style.cssText='position:fixed;z-index:2147483000;right:10px;bottom:10px;padding:7px 9px;border:1px solid #f0b43c;border-radius:6px;background:#15110a;color:#ffe3a4;font:700 10px/1.1 system-ui;letter-spacing:.06em;box-shadow:0 2px 12px #0009';
 button.addEventListener('click',()=>setMode(state.mode==='FRAME'?'PUPPET':'FRAME'));
 document.body.appendChild(button);setMode(state.mode);
}
function imageReady(src){return new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not load '+src));image.src=src;});}
function validateRectangleMap(map,image){
 if(!map||!Array.isArray(map.canvas)||map.canvas.length!==2||!map.parts)throw new Error('Body rectangle map shape is invalid');
 const atlasWidth=Number(map.canvas[0]),atlasHeight=Number(map.canvas[1]);
 if(atlasWidth!==image.naturalWidth||atlasHeight!==image.naturalHeight)throw new Error('Body atlas dimensions do not match its rectangle map');
 for(const [name,rect] of Object.entries(map.parts)){
  for(const key of ['x','y','w','h'])if(!Number.isFinite(rect[key]))throw new Error('Invalid rectangle '+name);
  if(rect.x<0||rect.y<0||rect.w<=0||rect.h<=0||rect.x+rect.w>atlasWidth||rect.y+rect.h>atlasHeight)throw new Error('Out-of-bounds rectangle '+name);
 }
 return true;
}
async function loadBodyAtlas(){
 try{
  const [response,image]=await Promise.all([fetch(BODY_MAP,{cache:'no-store'}),imageReady(BODY_IMAGE)]);
  if(!response.ok)throw new Error('Could not load '+BODY_MAP+' ('+response.status+')');
  const map=await response.json();validateRectangleMap(map,image);
  state.bodyMap=map;state.bodyImage=image;state.ready=true;setMode(state.mode);
 }catch(error){
  state.failed=true;state.error=String(error&&error.message||error);setMode('FRAME');
  console.warn('Scorpion Puppet Atlas V1 disabled; retaining frame animation fallback.',error);
 }finally{ensureSwitch();}
}
const skeleton=Object.freeze({
 root:{parent:null,x:0,y:12},pelvis:{parent:'root',x:0,y:-21},torso:{parent:'pelvis',x:0,y:-17},head:{parent:'torso',x:0,y:-18},
 leftShoulder:{parent:'torso',x:-12,y:-8},leftElbow:{parent:'leftShoulder',x:-7,y:14},leftWrist:{parent:'leftElbow',x:-4,y:14},
 rightShoulder:{parent:'torso',x:12,y:-8},rightElbow:{parent:'rightShoulder',x:7,y:14},rightWrist:{parent:'rightElbow',x:4,y:14},
 leftHip:{parent:'pelvis',x:-7,y:3},leftKnee:{parent:'leftHip',x:-2,y:17},leftAnkle:{parent:'leftKnee',x:1,y:1},
 rightHip:{parent:'pelvis',x:7,y:3},rightKnee:{parent:'rightHip',x:2,y:17},rightAnkle:{parent:'rightKnee',x:-1,y:1}
});
const children=Object.freeze(Object.keys(skeleton).reduce((tree,name)=>{const parent=skeleton[name].parent;if(parent)(tree[parent]||(tree[parent]=[])).push(name);return tree;},{}));
const cutouts=Object.freeze({
 pelvis:[['body_07',27,18,.5,.53]],torso:[['body_02',31,32,.5,.62],['body_03',29,25,.5,.73]],head:[['body_01',25,23,.5,.72]],
 leftShoulder:[['body_04',15,12,.50,.55]],leftElbow:[['body_10',12,21,.50,.16]],leftWrist:[['body_11',10,18,.50,.16]],
 rightShoulder:[['body_05',15,12,.50,.55]],rightElbow:[['body_27',12,21,.50,.16]],rightWrist:[['body_12',10,18,.50,.16]],
 leftHip:[['body_08',14,21,.50,.13]],leftKnee:[['body_23',12,20,.50,.13]],leftAnkle:[['body_21',17,8,.50,1]],
 rightHip:[['body_06',14,21,.50,.13]],rightKnee:[['body_16',12,20,.50,.13]],rightAnkle:[['body_22',17,8,.50,1]]
});
const idleKeys=Object.freeze([
 {t:0,torso:0,head:-.018,leftShoulder:.055,leftElbow:-.03,leftWrist:.02,rightShoulder:-.04,rightElbow:.025,rightWrist:-.02},
 {t:.25,torso:-.020,head:-.042,leftShoulder:.105,leftElbow:-.065,leftWrist:.035,rightShoulder:-.075,rightElbow:.05,rightWrist:-.03},
 {t:.50,torso:.012,head:.018,leftShoulder:.016,leftElbow:-.012,leftWrist:.008,rightShoulder:-.012,rightElbow:.01,rightWrist:-.008},
 {t:.75,torso:.028,head:.047,leftShoulder:-.055,leftElbow:.036,leftWrist:-.021,rightShoulder:.070,rightElbow:-.046,rightWrist:.026}
]);
function idlePose(now){
 const scaled=(((now%1800)+1800)%1800/1800)*idleKeys.length,index=Math.floor(scaled)%idleKeys.length,next=idleKeys[(index+1)%idleKeys.length],current=idleKeys[index],raw=scaled-index,ease=raw*raw*(3-2*raw),pose={};
 for(const name of Object.keys(skeleton)){const a=Number(current[name]||0),b=Number(next[name]||0);pose[name]=a+(b-a)*ease;}return pose;
}
function drawCutout(ctx,image,map,key,width,height,pivotX,pivotY,unit){
 const rect=map.parts[key];if(!rect)throw new Error('Missing required puppet cutout '+key);
 const w=width*unit,h=height*unit;ctx.drawImage(image,rect.x,rect.y,rect.w,rect.h,-w*pivotX,-h*pivotY,w,h);
}
function drawPuppet(ctx,image,map,width,height){
 const unit=height/68,pose=idlePose(performance.now());let visible=0;
 const visit=name=>{const bone=skeleton[name];ctx.save();ctx.translate(bone.x*unit,bone.y*unit);ctx.rotate(pose[name]||0);for(const piece of cutouts[name]||[]){drawCutout(ctx,image,map,piece[0],piece[1],piece[2],piece[3],piece[4],unit);visible++;}for(const child of children[name]||[])visit(child);ctx.restore();};
 ctx.save();visit('root');ctx.restore();
 state.metrics.puppetDraws++;state.metrics.lastVisibleParts=visible;state.metrics.lastDrawBounds={left:-17*unit,right:17*unit,top:-62*unit,bottom:12*unit};state.metrics.lastFeet={left:12*unit,right:12*unit};
 if(state.metrics.footSamples.length<120)state.metrics.footSamples.push({left:12*unit,right:12*unit});
}
function canRenderPuppet(args){
 const visual=args[5],name=args[6],isEnemy=args[7];
 if(state.mode!=='PUPPET'||!state.ready||state.failed||name!=='Scorpion'||isEnemy||visual)return false;
 try{const battle=window.eval('S');return !battle?.anim?.attackPose?.Scorpion&&!battle?.anim?.unitFX?.Scorpion;}catch(_){return false;}
}
function installRenderer(){
 let original,ctx,sprites;try{original=window.eval('drawUnit');ctx=window.eval('ctx');sprites=window.eval('SPRITES');}catch(error){state.failed=true;state.error='Renderer seam unavailable: '+String(error&&error.message||error);return;}
 if(typeof original!=='function'||!ctx||!sprites){state.failed=true;state.error='Renderer seam unavailable';return;}
 const blank=document.createElement('canvas');blank.width=1;blank.height=1;sprites[BLANK_NAME]=blank;
 window.__bbScorpionPuppetDrawUnit=function(...args){
  if(!canRenderPuppet(args))return original.apply(this,args);
  const previousDrawImage=ctx.drawImage;let failed=false,result;
  ctx.drawImage=function(image,...drawArgs){
   if(image===blank&&drawArgs.length===4&&Number(ctx.globalAlpha)>=.98){
    try{drawPuppet(ctx,state.bodyImage,state.bodyMap,Number(drawArgs[2]),Number(drawArgs[3]));}
    catch(error){failed=true;state.failed=true;state.error='Puppet draw failed: '+String(error&&error.message||error);}
   }
   return previousDrawImage.call(ctx,image,...drawArgs);
  };
  try{const puppetArgs=args.slice();puppetArgs[5]={scale:1,rot:0,lift:0};puppetArgs[6]=BLANK_NAME;result=original.apply(this,puppetArgs);}
  catch(error){failed=true;state.failed=true;state.error='Puppet renderer failed: '+String(error&&error.message||error);}
  finally{ctx.drawImage=previousDrawImage;}
  return failed?original.apply(this,args):result;
 };
 try{window.eval('drawUnit=window.__bbScorpionPuppetDrawUnit');}catch(error){state.failed=true;state.error='Could not attach renderer: '+String(error&&error.message||error);}
}
function footDrift(){const samples=state.metrics.footSamples;if(!samples.length)return {samples:0,left:0,right:0,max:0};const values=samples.flatMap(sample=>[sample.left,sample.right]),min=Math.min(...values),max=Math.max(...values);return {samples:samples.length,left:0,right:0,max:max-min};}
window.BlazingScorpionPuppetAtlasV1=Object.freeze({
 version:'v1',durationMs:1800,joints:Object.freeze(Object.keys(skeleton)),get mode(){return state.mode},get ready(){return state.ready&&!state.failed},get error(){return state.error},get bodyAtlas(){return {src:BODY_IMAGE,width:state.bodyImage?.naturalWidth||0,height:state.bodyImage?.naturalHeight||0}},get metrics(){return {...state.metrics,footDrift:footDrift()}},setMode,validate:()=>state.bodyImage&&state.bodyMap?validateRectangleMap(state.bodyMap,state.bodyImage):false,footDrift,idleFootBaselines:()=>idleKeys.map(()=>({left:12,right:12})),get rectangleMap(){return state.bodyMap;}
});
installRenderer();loadBodyAtlas();ensureSwitch();
})();