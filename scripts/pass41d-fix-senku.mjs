import fs from 'node:fs/promises';

const shellFile='index.html';
const rendererFile='runtime/rendering/battlefield-renderer.js';
let shell=await fs.readFile(shellFile,'utf8');
let renderer=await fs.readFile(rendererFile,'utf8');
const changes={shellPearHit:0,rendererPearHelper:0,rendererPearPath:0};

function replaceOnce(text,oldText,newText,label){
  const at=text.indexOf(oldText);
  if(at<0)throw new Error(`Pass 4.1d anchor missing: ${label}`);
  if(text.indexOf(oldText,at+oldText.length)>=0)throw new Error(`Pass 4.1d anchor not unique: ${label}`);
  return text.slice(0,at)+newText+text.slice(at+oldText.length);
}

if(!renderer.includes('function pearHalfWidth(')){
  renderer=replaceOnce(
    renderer,
    "  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));",
    `  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));\n\n  function pearHalfWidth(shape,x){\n    const rear=Number(shape?.rear??48),reach=Number(shape?.reach??140),width=Number(shape?.width??102);\n    const curve=Number(shape?.curve??.72),stem=Number(shape?.stem??.52),bulge=Number(shape?.bulge??.72);\n    const span=rear+reach;\n    if(!(span>0)||!(width>0))return 0;\n    const t=(x+rear)/span;\n    if(t<=0||t>=1)return 0;\n    return width*Math.pow(Math.max(0,Math.sin(Math.PI*t)),curve)*(stem+bulge*t);\n  }`,
    'battlefield pear width helper'
  );
  changes.rendererPearHelper=1;
}

if(!renderer.includes("else if(s.type==='pear')")){
  renderer=replaceOnce(
    renderer,
    "      if(s.type==='circle')ctx.arc(0,0,s.r,0,Math.PI*2);\n      else if(s.type==='rect')ctx.rect((s.offset_x||0)-s.w/2,(s.offset_y||0)-s.h/2,s.w,s.h);",
    `      if(s.type==='circle')ctx.arc(0,0,s.r,0,Math.PI*2);\n      else if(s.type==='pear'){\n        const rear=Number(s.rear??48),reach=Number(s.reach??140),segments=40;\n        for(let i=0;i<=segments;i++){\n          const x=-rear+(rear+reach)*(i/segments),y=-pearHalfWidth(s,x);\n          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);\n        }\n        for(let i=segments;i>=0;i--){\n          const x=-rear+(rear+reach)*(i/segments),y=pearHalfWidth(s,x);\n          ctx.lineTo(x,y);\n        }\n        ctx.closePath();\n      }\n      else if(s.type==='rect')ctx.rect((s.offset_x||0)-s.w/2,(s.offset_y||0)-s.h/2,s.w,s.h);`,
    'battlefield pear path'
  );
  changes.rendererPearPath=1;
}

if(!shell.includes("if(s.type==='pear')")){
  shell=replaceOnce(
    shell,
    " if(s.type==='circle')return d(p,e)<=s.r+er;\n if(s.type==='rect'){
",
    ` if(s.type==='circle')return d(p,e)<=s.r+er;\n if(s.type==='pear'){\n  const rear=Number(s.rear??48),reach=Number(s.reach??140),width=Number(s.width??102);\n  const curve=Number(s.curve??.72),stem=Number(s.stem??.52),bulge=Number(s.bulge??.72);\n  if(q.x<-rear-er||q.x>reach+er)return false;\n  const x=clamp(q.x,-rear,reach),span=rear+reach,t=span>0?(x+rear)/span:0;\n  const half=(t>0&&t<1&&width>0)?width*Math.pow(Math.max(0,Math.sin(Math.PI*t)),curve)*(stem+bulge*t):0;\n  return Math.abs(q.y)<=half+er;\n }\n if(s.type==='rect'){\n`,
    'shell pear hit geometry'
  );
  changes.shellPearHit=1;
}

await fs.writeFile(shellFile,shell);
await fs.writeFile(rendererFile,renderer);
console.log(JSON.stringify({status:'success',changes},null,2));
