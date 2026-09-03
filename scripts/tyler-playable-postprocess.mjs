import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const replaceOne=(from,to,label)=>{const a=html.split(from).length-1,b=html.split(to).length-1;if(a===1){html=html.replace(from,to);return;}if(a===0&&b===1)return;throw new Error(`Tyler playable integration: expected one ${label}, found source=${a}, target=${b}`);};

replaceOne("['crimson','subzero','lebee','senku','anubis']","['crimson','subzero','lebee','senku','tyler','anubis']",'battle roster unit id list');
replaceOne("const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku']);","const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku','Tyler']);",'active playable unit whitelist');
replaceOne("const DEFAULT_ACTIVE_TEAM=Object.freeze(['Senku','Lebee','Sub-Zero']);","const DEFAULT_ACTIVE_TEAM=Object.freeze(['Tyler','Lebee','Sub-Zero']);",'default active team');
replaceOne("const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v2';","const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v4';",'active team storage version');
replaceOne("function fighterDisplayName(name){return owned[name]?.name||name.toUpperCase()}","function fighterDisplayName(name){if(owned[name]?.name)return owned[name].name;try{return canonicalUnit(name)?.display_name||name.toUpperCase()}catch(_){return name.toUpperCase()}}",'team-editor display-name fallback');
const legacyTeamImage="function fighterTeamImage(name){return owned[name]?.card||''}";
const priorTeamImage="function fighterTeamImage(name){if(owned[name]?.card)return owned[name].card;try{const u=canonicalUnit(name),asset=u?.assets?.card||u?.assets?.art||u?.assets?.portrait;return asset?`assets/characters/${u.id}/${asset}`:''}catch(_){return ''}}";
const fullArtTeamImage="function fighterTeamImage(name){try{const u=canonicalUnit(name),candidates=[u?.assets?.art,u?.assets?.portrait,u?.assets?.card],asset=candidates.find(value=>value&&!String(value).endsWith('/'));if(asset)return /^assets\\//.test(asset)?asset:`assets/characters/${u.id}/${asset}`}catch(_){}return owned[name]?.art||owned[name]?.portrait||owned[name]?.card||''}";
if(html.includes(legacyTeamImage))html=html.replace(legacyTeamImage,fullArtTeamImage);
else if(html.includes(priorTeamImage))html=html.replace(priorTeamImage,fullArtTeamImage);
else if(!html.includes(fullArtTeamImage))throw new Error('Tyler playable integration: team-editor image resolver anchor missing');

const idlePath='assets/characters/tyler/sprites/source/20AAB6CC-D064-4F8A-A155-BC2A55A831C5.png';
const basicPath='assets/characters/tyler/sprites/source/basic_attack_sheet.png';
const runtime=String.raw`const TYLER_BODY_RUNTIME=(()=>{
 const CANVAS=420,FOOT_Y=402;
 const lightNeutral=(r,g,b)=>{const hi=Math.max(r,g,b),lo=Math.min(r,g,b);return lo>205&&hi-lo<48;};
 function pruneTinyComponents(image){
  const w=image.width,h=image.height,d=image.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h),components=[];
  for(let seed=0;seed<w*h;seed++){
   if(seen[seed]||d[seed*4+3]<=12)continue;
   let head=0,tail=0;queue[tail++]=seed;seen[seed]=1;const pixels=[];
   while(head<tail){const p=queue[head++];pixels.push(p);const x=p%w,y=(p/w)|0;for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){if(!ox&&!oy)continue;const nx=x+ox,ny=y+oy;if(nx<0||nx>=w||ny<0||ny>=h)continue;const np=ny*w+nx;if(seen[np]||d[np*4+3]<=12)continue;seen[np]=1;queue[tail++]=np;}}
   components.push(pixels);
  }
  if(!components.length)return;
  components.sort((a,b)=>b.length-a.length);const largest=components[0].length,minimum=Math.max(18,Math.floor(largest*.018));
  for(let i=1;i<components.length;i++)if(components[i].length<minimum)for(const p of components[i])d[p*4+3]=0;
 }
 function edgeBackground(image){
  const w=image.width,h=image.height,d=image.data,seen=new Uint8Array(w*h),q=new Int32Array(w*h);let head=0,tail=0;
  const samples=[];const grab=(x,y)=>{const i=(y*w+x)*4;if(d[i+3]>8)samples.push([d[i],d[i+1],d[i+2]]);};
  const s=Math.max(2,Math.min(10,Math.floor(Math.min(w,h)*.04)));
  for(let y=0;y<s;y++)for(let x=0;x<s;x++){grab(x,y);grab(w-1-x,y);grab(x,h-1-y);grab(w-1-x,h-1-y);}
  const bg=[0,1,2].map(c=>{const a=samples.map(v=>v[c]).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:245;});
  const bgDistance=(i)=>{const dr=d[i]-bg[0],dg=d[i+1]-bg[1],db=d[i+2]-bg[2];return dr*dr+dg*dg+db*db;};
  const bgLike=(i)=>{if(d[i+3]<=8)return true;return bgDistance(i)<6400||lightNeutral(d[i],d[i+1],d[i+2]);};
  const add=(x,y)=>{if(x<0||x>=w||y<0||y>=h)return;const p=y*w+x;if(seen[p])return;const i=p*4;if(!bgLike(i))return;seen[p]=1;q[tail++]=p;};
  for(let x=0;x<w;x++){add(x,0);add(x,h-1);}for(let y=1;y<h-1;y++){add(0,y);add(w-1,y);}
  while(head<tail){const p=q[head++],x=p%w,y=(p/w)|0,i=p*4;d[i+3]=0;add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);}
  for(let p=0;p<w*h;p++){const i=p*4;if(d[i+3]<=8)continue;if(lightNeutral(d[i],d[i+1],d[i+2])&&bgDistance(i)<8200)d[i+3]=0;}
  for(let pass=0;pass<2;pass++){const clear=[];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=y*w+x,i=p*4;if(d[i+3]<=8||!lightNeutral(d[i],d[i+1],d[i+2]))continue;const n=[p-1,p+1,p-w,p+w];if(n.some(v=>d[v*4+3]<=8))clear.push(i);}for(const i of clear)d[i+3]=0;}
  pruneTinyComponents(image);
 }
 function buildSheet(src,columns,rows,count,contentTop,sequence){
  const baseFrames=Array.from({length:count},()=>new Image());const state={frames:[],ready:false,loaded:0,error:false,sourceFrames:count};const sheet=new Image();
  sheet.addEventListener('load',()=>{try{const usableH=Math.max(1,sheet.naturalHeight-contentTop),cellW=sheet.naturalWidth/columns,cellH=usableH/rows,inset=Math.max(8,Math.round(Math.min(cellW,cellH)*.025));for(let index=0;index<count;index++){
   const col=index%columns,row=Math.floor(index/columns),sx=col*cellW+inset,sy=contentTop+row*cellH+inset,sw=Math.max(1,cellW-inset*2),sh=Math.max(1,cellH-inset*2);
   const cell=document.createElement('canvas');cell.width=Math.round(sw);cell.height=Math.round(sh);const c=cell.getContext('2d',{willReadFrequently:true});c.drawImage(sheet,sx,sy,sw,sh,0,0,cell.width,cell.height);
   const pixels=c.getImageData(0,0,cell.width,cell.height);edgeBackground(pixels);c.putImageData(pixels,0,0);const d=pixels.data;let minX=cell.width,minY=cell.height,maxX=-1,maxY=-1;
   for(let p=0;p<d.length;p+=4){if(d[p+3]<=12)continue;const px=(p/4)%cell.width,py=Math.floor((p/4)/cell.width);if(px<minX)minX=px;if(px>maxX)maxX=px;if(py<minY)minY=py;if(py>maxY)maxY=py;}
   const out=document.createElement('canvas');out.width=CANVAS;out.height=CANVAS;const o=out.getContext('2d');if(maxX>=minX&&maxY>=minY){const padX=Math.max(8,Math.round((maxX-minX+1)*.03)),padY=Math.max(10,Math.round((maxY-minY+1)*.035)),cx=Math.max(0,minX-padX),cy=Math.max(0,minY-padY),cr=Math.min(cell.width,maxX+1+padX),cb=Math.min(cell.height,maxY+1+padY),bw=cr-cx,bh=cb-cy,scale=Math.min((CANVAS*.86)/bw,(CANVAS*.92)/bh),dw=bw*scale,dh=bh*scale;o.drawImage(cell,cx,cy,bw,bh,(CANVAS-dw)/2,FOOT_Y-dh,dw,dh);}
   const frame=baseFrames[index];frame.addEventListener('load',()=>{state.loaded++;if(state.loaded===count){state.frames=sequence.map(i=>baseFrames[i]||baseFrames[0]);state.ready=true;}},{once:true});frame.src=out.toDataURL('image/png');
  }}catch(err){state.error=true;console.error('Tyler sheet processing failed:',err);}},{once:true});sheet.addEventListener('error',()=>{state.error=true;console.error('Tyler sheet failed to load:',src);},{once:true});sheet.src=src;return state;
 }
 return Object.freeze({
  idle:buildSheet('${idlePath}',5,1,5,100,[0,1,2,3,4,3,2,1]),
  basic:buildSheet('${basicPath}',4,2,8,100,[0,0,1,2,3,4,5,6,7,7])
 });
})();`;
if(!html.includes('const TYLER_BODY_RUNTIME=(()=>{')){const at=html.indexOf('function unitIdleFrames(name){');if(at<0)throw new Error('Tyler playable integration: idle anchor missing');html=html.slice(0,at)+runtime+'\n '+html.slice(at);}
if(!html.includes("function unitIdleFrames(name){if(name==='Tyler'&&TYLER_BODY_RUNTIME.idle.ready)return TYLER_BODY_RUNTIME.idle.frames;"))replaceOne('function unitIdleFrames(name){',"function unitIdleFrames(name){if(name==='Tyler'&&TYLER_BODY_RUNTIME.idle.ready)return TYLER_BODY_RUNTIME.idle.frames;",'Tyler idle runtime hook');
if(!html.includes("function unitAttackFrames(name,kind){if(name==='Tyler'&&TYLER_BODY_RUNTIME.basic.ready)return TYLER_BODY_RUNTIME.basic.frames;"))replaceOne('function unitAttackFrames(name,kind){',"function unitAttackFrames(name,kind){if(name==='Tyler'&&TYLER_BODY_RUNTIME.basic.ready)return TYLER_BODY_RUNTIME.basic.frames;",'Tyler Basic Attack runtime hook');
for(const marker of ["['crimson','subzero','lebee','senku','tyler','anubis']","['Crimson','Sub-Zero','Lebee','Senku','Tyler']","['Tyler','Lebee','Sub-Zero']",'activeTeam.v4',idlePath,basicPath,"[0,1,2,3,4,3,2,1]","[0,0,1,2,3,4,5,6,7,7]",'pruneTinyComponents','bgDistance','CANVAS*.86','CANVAS*.92'])if(!html.includes(marker))throw new Error(`Tyler playable integration: final shell missing ${marker}`);
await fs.writeFile(file,html);console.log('Tyler playable integration applied: new ping-pong idle sheet, larger battle rendering, existing Basic Attack sheet, enclosed-white cleanup, and tiny sheet-artifact pruning.');
