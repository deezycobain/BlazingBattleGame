import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

const replaceOne=(from,to,label)=>{
  const sourceCount=html.split(from).length-1;
  const targetCount=html.split(to).length-1;
  if(sourceCount===1){html=html.replace(from,to);return;}
  if(sourceCount===0&&targetCount===1)return;
  throw new Error(`Tyler playable integration: expected one ${label}, found source=${sourceCount}, target=${targetCount}`);
};

replaceOne(
  "['crimson','subzero','lebee','senku','anubis']",
  "['crimson','subzero','lebee','senku','tyler','anubis']",
  'battle roster unit id list'
);
replaceOne(
  "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku']);",
  "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku','Tyler']);",
  'active playable unit whitelist'
);
replaceOne(
  "const DEFAULT_ACTIVE_TEAM=Object.freeze(['Senku','Lebee','Sub-Zero']);",
  "const DEFAULT_ACTIVE_TEAM=Object.freeze(['Tyler','Lebee','Sub-Zero']);",
  'default active team'
);
replaceOne(
  "const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v2';",
  "const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v4';",
  'active team storage version'
);

replaceOne(
  "function fighterDisplayName(name){return owned[name]?.name||name.toUpperCase()}",
  "function fighterDisplayName(name){if(owned[name]?.name)return owned[name].name;try{return canonicalUnit(name)?.display_name||name.toUpperCase()}catch(_){return name.toUpperCase()}}",
  'team-editor display-name fallback'
);
replaceOne(
  "function fighterTeamImage(name){return owned[name]?.card||''}",
  "function fighterTeamImage(name){if(owned[name]?.card)return owned[name].card;try{const u=canonicalUnit(name),asset=u?.assets?.card||u?.assets?.art||u?.assets?.portrait;return asset?`assets/characters/${u.id}/${asset}`:''}catch(_){return ''}}",
  'team-editor canonical art fallback'
);

const idlePath='assets/characters/tyler/sprites/source/idle_sheet.png';
const basicPath='assets/characters/tyler/sprites/source/basic_attack_sheet.png';

const tylerRuntime=String.raw`const TYLER_BODY_RUNTIME=(()=>{
 const CANVAS=420,FOOT_Y=398;
 const isBackground=(r,g,b)=>{const hi=Math.max(r,g,b),lo=Math.min(r,g,b);return lo>228&&hi-lo<26;};
 function cleanConnectedBackground(image){
   const w=image.width,h=image.height,data=image.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
   let head=0,tail=0;
   const add=(x,y)=>{
     if(x<0||x>=w||y<0||y>=h)return;
     const p=y*w+x;if(seen[p])return;
     const i=p*4;if(!isBackground(data[i],data[i+1],data[i+2]))return;
     seen[p]=1;queue[tail++]=p;
   };
   for(let x=0;x<w;x++){add(x,0);add(x,h-1);}
   for(let y=1;y<h-1;y++){add(0,y);add(w-1,y);}
   while(head<tail){
     const p=queue[head++],x=p%w,y=(p/w)|0,i=p*4;
     data[i+3]=0;
     add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);
   }
 }
 function buildSheet(path,columns,rows,count,contentTop){
   const state={frames:Array.from({length:count},()=>new Image()),ready:false,loaded:0,error:false};
   const sheet=new Image();
   sheet.addEventListener('load',()=>{
     try{
       const usableH=Math.max(1,sheet.naturalHeight-contentTop);
       const cellW=sheet.naturalWidth/columns,cellH=usableH/rows;
       for(let index=0;index<count;index++){
         const col=index%columns,row=Math.floor(index/columns);
         const sx=col*cellW,sy=contentTop+row*cellH;
         const cell=document.createElement('canvas');
         cell.width=Math.max(1,Math.round(cellW));cell.height=Math.max(1,Math.round(cellH));
         const cctx=cell.getContext('2d',{willReadFrequently:true});
         cctx.drawImage(sheet,sx,sy,cellW,cellH,0,0,cell.width,cell.height);
         const pixels=cctx.getImageData(0,0,cell.width,cell.height);
         cleanConnectedBackground(pixels);cctx.putImageData(pixels,0,0);
         const data=pixels.data;let minX=cell.width,minY=cell.height,maxX=-1,maxY=-1;
         for(let p=0;p<data.length;p+=4){
           if(data[p+3]<=12)continue;
           const px=(p/4)%cell.width,py=Math.floor((p/4)/cell.width);
           if(px<minX)minX=px;if(px>maxX)maxX=px;if(py<minY)minY=py;if(py>maxY)maxY=py;
         }
         const out=document.createElement('canvas');out.width=CANVAS;out.height=CANVAS;
         const octx=out.getContext('2d');
         if(maxX>=minX&&maxY>=minY){
           const padX=Math.max(8,Math.round((maxX-minX+1)*.035));
           const padY=Math.max(10,Math.round((maxY-minY+1)*.035));
           const cropX=Math.max(0,minX-padX),cropY=Math.max(0,minY-padY);
           const cropR=Math.min(cell.width,maxX+1+padX),cropB=Math.min(cell.height,maxY+1+padY);
           const bw=cropR-cropX,bh=cropB-cropY;
           const scale=Math.min((CANVAS*.78)/bw,(CANVAS*.88)/bh);
           const dw=bw*scale,dh=bh*scale;
           octx.drawImage(cell,cropX,cropY,bw,bh,(CANVAS-dw)/2,FOOT_Y-dh,dw,dh);
         }
         const frame=state.frames[index];
         frame.addEventListener('load',()=>{state.loaded++;if(state.loaded===count)state.ready=true;},{once:true});
         frame.src=out.toDataURL('image/png');
       }
     }catch(err){state.error=true;console.error('Tyler sheet processing failed:',err);}
   },{once:true});
   sheet.addEventListener('error',()=>{state.error=true;console.error('Tyler sheet failed to load:',path);},{once:true});
   sheet.src=path;return state;
 }
 return Object.freeze({
   idle:buildSheet('${idlePath}',4,2,8,100),
   basic:buildSheet('${basicPath}',5,1,5,100)
 });
})();`;

const idleAnchor='function unitIdleFrames(name){';
if(!html.includes('const TYLER_BODY_RUNTIME=(()=>{')){
  const at=html.indexOf(idleAnchor);
  if(at<0)throw new Error('Tyler playable integration: unitIdleFrames anchor missing');
  html=html.slice(0,at)+tylerRuntime+'\n '+html.slice(at);
}
if(!html.includes("function unitIdleFrames(name){if(name==='Tyler'&&TYLER_BODY_RUNTIME.idle.ready)return TYLER_BODY_RUNTIME.idle.frames;")){
  replaceOne(
    'function unitIdleFrames(name){',
    "function unitIdleFrames(name){if(name==='Tyler'&&TYLER_BODY_RUNTIME.idle.ready)return TYLER_BODY_RUNTIME.idle.frames;",
    'Tyler idle runtime hook'
  );
}
if(!html.includes("function unitAttackFrames(name,kind){if(name==='Tyler'&&TYLER_BODY_RUNTIME.basic.ready)return TYLER_BODY_RUNTIME.basic.frames;")){
  replaceOne(
    'function unitAttackFrames(name,kind){',
    "function unitAttackFrames(name,kind){if(name==='Tyler'&&TYLER_BODY_RUNTIME.basic.ready)return TYLER_BODY_RUNTIME.basic.frames;",
    'Tyler Basic Attack runtime hook'
  );
}

for(const marker of [
  "['crimson','subzero','lebee','senku','tyler','anubis']",
  "['Crimson','Sub-Zero','Lebee','Senku','Tyler']",
  "['Tyler','Lebee','Sub-Zero']",
  "activeTeam.v4",
  'art/current_collection_art.png',
  idlePath,
  basicPath,
  'TYLER_BODY_RUNTIME'
])if(!html.includes(marker))throw new Error(`Tyler playable integration: final shell missing ${marker}`);

await fs.writeFile(file,html);
console.log('Tyler playable integration applied: canonical roster/team identity, authored art, 8-frame idle sheet, 5-frame Basic Attack sheet, and v4 saved-team migration.');
