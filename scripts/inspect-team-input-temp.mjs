import fs from 'node:fs/promises';
import zlib from 'node:zlib';

const files=[
 'assets/characters/tyler/incoming/0E5871AA-4D45-45B5-AE5B-845C39F08C97.png',
 'assets/characters/tyler/incoming/16CFA5CC-83BA-4C92-9CD8-9AADF0EDC31C.png',
 'assets/characters/tyler/incoming/5F081845-7B27-47AD-944D-E341ED648332.png'
];

function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
function inspectPng(buf){
 if(buf.toString('ascii',1,4)!=='PNG')throw new Error('not png');
 let off=8,w=0,h=0,bit=0,color=0,interlace=0;const idat=[];
 while(off+12<=buf.length){const len=buf.readUInt32BE(off),type=buf.toString('ascii',off+4,off+8),data=buf.subarray(off+8,off+8+len);off+=12+len;if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);bit=data[8];color=data[9];interlace=data[12];}else if(type==='IDAT')idat.push(data);else if(type==='IEND')break;}
 const channels={0:1,2:3,4:2,6:4}[color];
 const out={w,h,bit,color,interlace,bytes:buf.length,channels,alpha:null,bbox:null};
 if(!channels||bit!==8||interlace!==0||!idat.length)return out;
 const raw=zlib.inflateSync(Buffer.concat(idat)),stride=w*channels,rows=[];let pos=0,prev=Buffer.alloc(stride),minX=w,minY=h,maxX=-1,maxY=-1,visible=0,alphaSum=0;
 for(let y=0;y<h;y++){const filter=raw[pos++],src=raw.subarray(pos,pos+stride);pos+=stride;const row=Buffer.alloc(stride);for(let x=0;x<stride;x++){const a=x>=channels?row[x-channels]:0,b=prev[x]||0,c=x>=channels?(prev[x-channels]||0):0,v=src[x];row[x]=(v+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0))&255;}rows.push(row);prev=row;for(let x=0;x<w;x++){const alpha=color===6?row[x*channels+3]:color===4?row[x*channels+1]:255;alphaSum+=alpha;if(alpha>16){visible++;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}}}
 out.alpha={visibleFraction:+(visible/(w*h)).toFixed(4),mean:+(alphaSum/(w*h*255)).toFixed(4)};if(maxX>=0)out.bbox={x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,fraction:+(((maxX-minX+1)*(maxY-minY+1))/(w*h)).toFixed(4)};
 return out;
}

for(const file of files){const buf=await fs.readFile(file);console.log('TYLER_PNG',file,JSON.stringify(inspectPng(buf)));}

const html=await fs.readFile('index.html','utf8');
for(const marker of ["['crimson','subzero','lebee','senku','anubis']","const ACTIVE_PLAYABLE_UNITS=",'function fighterTeamImage','setActiveTeam(teamDraft)',"cvs.addEventListener('pointerdown'",'UNIT_TOUCH_RADIUS']){const at=html.indexOf(marker);console.log(`\n===== MARKER ${marker} @ ${at} =====`);if(at>=0)console.log(html.slice(Math.max(0,at-900),Math.min(html.length,at+2600)));}
