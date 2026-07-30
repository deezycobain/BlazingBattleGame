import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

const oldBlock=`       const pixels=cctx.getImageData(0,0,cell.width,cell.height),data=pixels.data;
       let minX=cell.width,minY=cell.height,maxX=-1,maxY=-1;
       for(let p=0;p<data.length;p+=4){
        const r=data[p],g=data[p+1],b=data[p+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
        // The preserved source sheet has a baked near-white checkerboard. Remove that first,
        // then calculate bounds from only the remaining visible Senku pixels.
        if(lo>232&&hi-lo<18)data[p+3]=0;
        if(data[p+3]>8){
         const px=(p/4)%cell.width,py=Math.floor((p/4)/cell.width);
         if(px<minX)minX=px;if(px>maxX)maxX=px;if(py<minY)minY=py;if(py>maxY)maxY=py;
        }
       }
       cctx.putImageData(pixels,0,0);`;

const newBlock=`       const pixels=cctx.getImageData(0,0,cell.width,cell.height),data=pixels.data;
       // First remove the baked near-white/checkerboard background.
       for(let p=0;p<data.length;p+=4){
        const r=data[p],g=data[p+1],b=data[p+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
        if(lo>232&&hi-lo<18)data[p+3]=0;
       }
       // The source sheet also contains a few detached export artifacts (for example a loose
       // shoe and a mirrored frame number). Keep only Senku's largest connected opaque body.
       const pixelCount=cell.width*cell.height;
       const seen=new Uint8Array(pixelCount);
       let bestComponent=[];
       for(let start=0;start<pixelCount;start++){
        if(seen[start]||data[start*4+3]<=8)continue;
        const stack=[start],component=[];seen[start]=1;
        while(stack.length){
         const q=stack.pop();component.push(q);
         const x=q%cell.width,y=Math.floor(q/cell.width);
         if(x>0){const n=q-1;if(!seen[n]&&data[n*4+3]>8){seen[n]=1;stack.push(n);}}
         if(x+1<cell.width){const n=q+1;if(!seen[n]&&data[n*4+3]>8){seen[n]=1;stack.push(n);}}
         if(y>0){const n=q-cell.width;if(!seen[n]&&data[n*4+3]>8){seen[n]=1;stack.push(n);}}
         if(y+1<cell.height){const n=q+cell.width;if(!seen[n]&&data[n*4+3]>8){seen[n]=1;stack.push(n);}}
        }
        if(component.length>bestComponent.length)bestComponent=component;
       }
       const keep=new Uint8Array(pixelCount);
       for(const q of bestComponent)keep[q]=1;
       let minX=cell.width,minY=cell.height,maxX=-1,maxY=-1;
       for(let q=0;q<pixelCount;q++){
        const alpha=q*4+3;
        if(data[alpha]>8&&!keep[q])data[alpha]=0;
        if(keep[q]){
         const px=q%cell.width,py=Math.floor(q/cell.width);
         if(px<minX)minX=px;if(px>maxX)maxX=px;if(py<minY)minY=py;if(py>maxY)maxY=py;
        }
       }
       cctx.putImageData(pixels,0,0);`;

if(!html.includes(oldBlock))throw new Error('Senku retreat artifact-cleanup anchor missing');
html=html.replace(oldBlock,newBlock);
await fs.writeFile(file,html);
console.log('Senku retreat cleanup: detached source-sheet artifacts removed via largest connected component');
