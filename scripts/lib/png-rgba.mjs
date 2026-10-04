import zlib from 'node:zlib';

const SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};

export function decodePngRgba(buffer){
 if(!buffer.subarray(0,8).equals(SIGNATURE))throw new Error('Not a PNG');
 let offset=8,width=0,height=0,bitDepth=0,colorType=0,interlace=0;const idat=[];
 while(offset<buffer.length){
  const length=buffer.readUInt32BE(offset),type=buffer.toString('ascii',offset+4,offset+8),data=buffer.subarray(offset+8,offset+8+length);offset+=12+length;
  if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];interlace=data[12];}
  else if(type==='IDAT')idat.push(data);else if(type==='IEND')break;
 }
 if(!width||!height)throw new Error('PNG missing IHDR');
 if(bitDepth!==8||colorType!==6||interlace!==0)throw new Error(`PNG must be non-interlaced 8-bit RGBA (got bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace})`);
 const raw=zlib.inflateSync(Buffer.concat(idat)),stride=width*4,expected=(stride+1)*height;if(raw.length!==expected)throw new Error(`Unexpected PNG data length ${raw.length} != ${expected}`);
 const out=Buffer.alloc(width*height*4),prev=Buffer.alloc(stride);let src=0;
 for(let y=0;y<height;y++){
  const filter=raw[src++],row=Buffer.alloc(stride);raw.copy(row,0,src,src+stride);src+=stride;
  for(let x=0;x<stride;x++){
   const left=x>=4?row[x-4]:0,up=prev[x],upLeft=x>=4?prev[x-4]:0;
   if(filter===1)row[x]=(row[x]+left)&255;
   else if(filter===2)row[x]=(row[x]+up)&255;
   else if(filter===3)row[x]=(row[x]+Math.floor((left+up)/2))&255;
   else if(filter===4)row[x]=(row[x]+paeth(left,up,upLeft))&255;
   else if(filter!==0)throw new Error('Unsupported PNG filter '+filter);
  }
  row.copy(out,y*stride);row.copy(prev);
 }
 return {width,height,data:out};
}

const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=buffer=>{let c=0xffffffff;for(const byte of buffer)c=crcTable[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
const chunk=(type,data)=>{const typeBuf=Buffer.from(type,'ascii'),out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length,0);typeBuf.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([typeBuf,data])),8+data.length);return out;};
export function encodePngRgba(width,height,data){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)throw new Error('Invalid PNG dimensions');
 if(!Buffer.isBuffer(data))data=Buffer.from(data);
 if(data.length!==width*height*4)throw new Error('RGBA byte length mismatch');
 const stride=width*4,raw=Buffer.alloc((stride+1)*height);
 for(let y=0;y<height;y++){const dst=y*(stride+1);raw[dst]=0;data.copy(raw,dst+1,y*stride,(y+1)*stride);}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
 return Buffer.concat([SIGNATURE,chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
