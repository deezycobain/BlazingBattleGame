import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const fail=message=>{throw new Error('Legacy Shinobi integration: '+message)};

const IDS=['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza'];
const NAMES=['Kakashi','Obito','Jiraiya','Sasuke','Pain','Scorpion','Rock Lee','Mashle','Jackie Chan','Gabimaru','Killua','Zabuza'];
const DEFINITIONS={
 'Kakashi':{idle:'assets/events/legacy-of-shinobi/package-v1/legacy_of_the_shinobi_banner_pack_v1_under25/kakashi/idle_6f.png',basic:'assets/events/legacy-of-shinobi/package-v1/legacy_of_the_shinobi_banner_pack_v1_under25/kakashi/basic_attack_6f.png'},
 'Obito':{idle:'assets/events/legacy-of-shinobi/package-v1/legacy_of_the_shinobi_banner_pack_v1_under25/obito/idle_6f.png',basic:'assets/events/legacy-of-shinobi/package-v1/legacy_of_the_shinobi_banner_pack_v1_under25/obito/basic_attack_6f.png'},
 'Jiraiya':{idle:'assets/events/legacy-of-shinobi/package-v1/legacy_of_the_shinobi_banner_pack_v1_under25/jiraiya/idle_6f.png',basic:'assets/events/legacy-of-shinobi/package-v1/legacy_of_the_shinobi_banner_pack_v1_under25/jiraiya/basic_attack_6f.png'},
 'Sasuke':{idle:'assets/events/legacy-of-shinobi/package-v1/legacy_of_the_shinobi_banner_pack_v1_under25/sasuke/idle_6f.png',basic:'assets/events/legacy-of-shinobi/package-v1/legacy_of_the_shinobi_banner_pack_v1_under25/sasuke/basic_attack_6f.png'},
 'Pain':{idle:'assets/events/legacy-of-shinobi/package-v1/legacy_of_the_shinobi_banner_pack_v1_under25/pain/idle_6f.png',basic:'assets/events/legacy-of-shinobi/package-v1/legacy_of_the_shinobi_banner_pack_v1_under25/pain/basic_attack_6f.png'},
 'Scorpion':{idle:'assets/events/legacy-of-shinobi/package-v1/legacy_of_the_shinobi_banner_pack_v1_under25/scorpion/idle_6f.png',basic:'assets/events/legacy-of-shinobi/package-v1/legacy_of_the_shinobi_banner_pack_v1_under25/scorpion/basic_attack_6f.png'},
 'Rock Lee':{idle:'assets/events/legacy-of-shinobi/package-v2/legacy_of_the_shinobi_banner_pack_v2/rock_lee/idle_6f.png',basic:'assets/events/legacy-of-shinobi/package-v2/legacy_of_the_shinobi_banner_pack_v2/rock_lee/basic_attack_6f.png'},
 'Mashle':{idle:'assets/events/legacy-of-shinobi/package-v2/legacy_of_the_shinobi_banner_pack_v2/mashle/idle_6f.png',basic:'assets/events/legacy-of-shinobi/package-v2/legacy_of_the_shinobi_banner_pack_v2/mashle/basic_attack_6f.png'},
 'Jackie Chan':{idle:'assets/events/legacy-of-shinobi/package-v2/legacy_of_the_shinobi_banner_pack_v2/jackie_chan/idle_6f.png',basic:'assets/events/legacy-of-shinobi/package-v2/legacy_of_the_shinobi_banner_pack_v2/jackie_chan/basic_attack_6f.png'},
 'Gabimaru':{idle:'assets/events/legacy-of-shinobi/package-v3/legacy_of_the_shinobi_banner_pack_v3_clean_cards/gabimaru/idle_6f.png',basic:'assets/events/legacy-of-shinobi/package-v3/legacy_of_the_shinobi_banner_pack_v3_clean_cards/gabimaru/basic_attack_6f.png'},
 'Killua':{idle:'assets/events/legacy-of-shinobi/package-v3/legacy_of_the_shinobi_banner_pack_v3_clean_cards/killua/idle_6f.png',basic:'assets/events/legacy-of-shinobi/package-v3/legacy_of_the_shinobi_banner_pack_v3_clean_cards/killua/basic_attack_6f.png'},
 'Zabuza':{idle:'assets/events/legacy-of-shinobi/package-v3/legacy_of_the_shinobi_banner_pack_v3_clean_cards/zabuza/idle_6f.png',basic:'assets/events/legacy-of-shinobi/package-v3/legacy_of_the_shinobi_banner_pack_v3_clean_cards/zabuza/basic_attack_6f.png'}
};

const rosterSource="['crimson','subzero','lebee','senku','tyler','itachi','anubis']";
const rosterTarget="['crimson','subzero','lebee','senku','tyler','itachi',"+IDS.map(x=>"'"+x+"'").join(',')+",'anubis']";
if(html.includes(rosterSource))html=html.replace(rosterSource,rosterTarget);
else if(!html.includes(rosterTarget))fail('battle roster id list anchor missing');

const activeRx=/const ACTIVE_PLAYABLE_UNITS=Object\.freeze\(\[([^\]]*)\]\);/;
const active=html.match(activeRx);if(!active)fail('active playable whitelist missing');
const activeNames=[...active[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
for(const name of NAMES)if(!activeNames.includes(name))activeNames.push(name);
html=html.replace(activeRx,"const ACTIVE_PLAYABLE_UNITS=Object.freeze(["+activeNames.map(x=>"'"+x+"'").join(',')+"]);");

const runtime=String.raw`
const LEGACY_SHINOBI_BODY_RUNTIME=(()=>{
 const defs=${JSON.stringify(DEFINITIONS)},cache=new Map(),COUNT=6,COLS=3,ROWS=2,CANVAS=420;
 const names=Object.freeze(Object.keys(defs));
 const transparentEdge=(image)=>{
  const w=image.width,h=image.height,d=image.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
  const light=(i)=>{const r=d[i],g=d[i+1],b=d[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);return d[i+3]<=8||(lo>225&&hi-lo<34)};
  const add=(x,y)=>{if(x<0||x>=w||y<0||y>=h)return;const p=y*w+x;if(seen[p])return;const i=p*4;if(!light(i))return;seen[p]=1;queue[tail++]=p};
  for(let x=0;x<w;x++){add(x,0);add(x,h-1)}for(let y=1;y<h-1;y++){add(0,y);add(w-1,y)}
  while(head<tail){const p=queue[head++],x=p%w,y=(p/w)|0,i=p*4;d[i+3]=0;add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1)}
 };
 const build=(src)=>{
  const frames=Array.from({length:COUNT},()=>new Image());let resolveReady;
  const state={frames,ready:false,error:false,readyPromise:new Promise(resolve=>resolveReady=resolve)};
  const sheet=new Image();
  sheet.addEventListener('load',()=>{
   try{
    const cw=sheet.naturalWidth/COLS,ch=sheet.naturalHeight/ROWS;let loaded=0;
    for(let index=0;index<COUNT;index++){
     const sx=(index%COLS)*cw,sy=Math.floor(index/COLS)*ch;
     const cell=document.createElement('canvas');cell.width=Math.round(cw);cell.height=Math.round(ch);
     const cctx=cell.getContext('2d',{willReadFrequently:true});cctx.clearRect(0,0,cell.width,cell.height);cctx.drawImage(sheet,sx,sy,cw,ch,0,0,cell.width,cell.height);
     const pixels=cctx.getImageData(0,0,cell.width,cell.height);transparentEdge(pixels);cctx.putImageData(pixels,0,0);
     let minX=cell.width,minY=cell.height,maxX=-1,maxY=-1,data=pixels.data;
     for(let p=0;p<data.length;p+=4)if(data[p+3]>10){const x=(p/4)%cell.width,y=Math.floor((p/4)/cell.width);if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}
     const out=document.createElement('canvas');out.width=CANVAS;out.height=CANVAS;const o=out.getContext('2d');
     if(maxX>=minX&&maxY>=minY){const bw=maxX-minX+1,bh=maxY-minY+1,scale=Math.min((CANVAS*.88)/bw,(CANVAS*.92)/bh);const dw=bw*scale,dh=bh*scale;o.drawImage(cell,minX,minY,bw,bh,(CANVAS-dw)/2,CANVAS*.96-dh,dw,dh)}
     else o.drawImage(cell,0,0,cell.width,cell.height,0,0,CANVAS,CANVAS);
     frames[index].addEventListener('load',()=>{loaded++;if(loaded===COUNT){state.ready=true;resolveReady(true)}},{once:true});
     frames[index].src=out.toDataURL('image/png');
    }
   }catch(error){state.error=true;resolveReady(false);console.error('Legacy Shinobi sheet processing failed:',error)}
  },{once:true});
  sheet.addEventListener('error',()=>{state.error=true;resolveReady(false);console.error('Legacy Shinobi sheet failed to load:',src)},{once:true});
  sheet.src=src;return state;
 };
 const ensure=(name,kind)=>{const def=defs[name];if(!def)return null;const key=name+':'+kind;if(!cache.has(key))cache.set(key,build(def[kind]));return cache.get(key)};
 const warm=name=>{const idle=ensure(name,'idle');ensure(name,'basic');return idle};
 return Object.freeze({names,has:name=>!!defs[name],idle:name=>warm(name),basic:name=>ensure(name,'basic'),ready:name=>Promise.all([ensure(name,'idle')?.readyPromise,ensure(name,'basic')?.readyPromise])});
})();
`;
const idleAnchor='function unitIdleFrames(name){';
const idleAt=html.indexOf(idleAnchor);if(idleAt<0)fail('unitIdleFrames anchor missing');
if(!html.includes('const LEGACY_SHINOBI_BODY_RUNTIME=(()=>{'))html=html.slice(0,idleAt)+runtime+'\n'+html.slice(idleAt);
if(!html.includes("function unitIdleFrames(name){const legacyShinobiIdle=LEGACY_SHINOBI_BODY_RUNTIME.idle(name);"))
 html=html.replace(idleAnchor,"function unitIdleFrames(name){const legacyShinobiIdle=LEGACY_SHINOBI_BODY_RUNTIME.idle(name);if(legacyShinobiIdle?.ready)return legacyShinobiIdle.frames;");

const attackAnchor='function unitAttackFrames(name,kind){';
if(!html.includes(attackAnchor))fail('unitAttackFrames anchor missing');
if(!html.includes("function unitAttackFrames(name,kind){const legacyShinobiBasic=LEGACY_SHINOBI_BODY_RUNTIME.basic(name);"))
 html=html.replace(attackAnchor,"function unitAttackFrames(name,kind){const legacyShinobiBasic=LEGACY_SHINOBI_BODY_RUNTIME.basic(name);if(legacyShinobiBasic?.ready)return legacyShinobiBasic.frames;");

for(const marker of ['LEGACY_SHINOBI_BODY_RUNTIME','12 NEW FIGHTERS','LEGACY OF THE SHINOBI',...IDS,...NAMES])if(!html.includes(marker))fail('final shell missing '+marker);
await fs.writeFile(file,html);
console.log('Legacy Shinobi integration PASS: 12 playable roster entries plus lazy 3x2 six-frame idle/basic runtime.');
