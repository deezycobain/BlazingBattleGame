import fs from 'node:fs/promises';
import zlib from 'node:zlib';

const files=[
 'assets/characters/tyler/incoming/0E5871AA-4D45-45B5-AE5B-845C39F08C97.png',
 'assets/characters/tyler/incoming/16CFA5CC-83BA-4C92-9CD8-9AADF0EDC31C.png',
 'assets/characters/tyler/incoming/5F081845-7B27-47AD-944D-E341ED648332.png'
];
function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
function decode(buf){let off=8,w=0,h=0,bit=0,color=0,interlace=0;const idat=[];while(off+12<=buf.length){const len=buf.readUInt32BE(off),type=buf.toString('ascii',off+4,off+8),data=buf.subarray(off+8,off+8+len);off+=12+len;if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);bit=data[8];color=data[9];interlace=data[12];}else if(type==='IDAT')idat.push(data);else if(type==='IEND')break;}const channels={0:1,2:3,4:2,6:4}[color];if(!channels||bit!==8||interlace!==0)throw new Error(`unsupported png color=${color} bit=${bit} interlace=${interlace}`);const raw=zlib.inflateSync(Buffer.concat(idat)),stride=w*channels,rows=[];let pos=0,prev=Buffer.alloc(stride);for(let y=0;y<h;y++){const filter=raw[pos++],src=raw.subarray(pos,pos+stride);pos+=stride;const row=Buffer.alloc(stride);for(let x=0;x<stride;x++){const a=x>=channels?row[x-channels]:0,b=prev[x]||0,c=x>=channels?(prev[x-channels]||0):0;row[x]=(src[x]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;}rows.push(row);prev=row;}return{w,h,color,channels,rows};}
function rgb(img,x,y){const r=img.rows[y],i=x*img.channels;if(img.color===0)return[r[i],r[i],r[i]];if(img.color===4)return[r[i],r[i],r[i]];return[r[i],r[i+1],r[i+2]];}
function ascii(img,cols=64){const rows=Math.max(18,Math.round(cols*(img.h/img.w)*0.46)),chars='@%#*+=-:. ';let out='';for(let yy=0;yy<rows;yy++){const y0=Math.floor(yy*img.h/rows),y1=Math.max(y0+1,Math.floor((yy+1)*img.h/rows));for(let xx=0;xx<cols;xx++){const x0=Math.floor(xx*img.w/cols),x1=Math.max(x0+1,Math.floor((xx+1)*img.w/cols));let sum=0,n=0;for(let y=y0;y<y1;y+=Math.max(1,Math.floor((y1-y0)/3)))for(let x=x0;x<x1;x+=Math.max(1,Math.floor((x1-x0)/3))){const [r,g,b]=rgb(img,x,y);sum+=.2126*r+.7152*g+.0722*b;n++;}const lum=sum/Math.max(1,n);out+=chars[Math.min(chars.length-1,Math.floor(lum/256*chars.length))];}out+='\n';}return out;}
for(const file of files){const buf=await fs.readFile(file),img=decode(buf);console.log(`\nTYLER_VIS ${file} ${img.w}x${img.h} color=${img.color} bytes=${buf.length}\n${ascii(img)}`);}
