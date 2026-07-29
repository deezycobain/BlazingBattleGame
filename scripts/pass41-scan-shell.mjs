import fs from 'node:fs/promises';

const html=await fs.readFile('index.html','utf8');
const clean=s=>String(s||'').replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,'<embedded-image>');

function sliceAfter(label,startNeedle,endNeedle,from=0){
  const start=html.indexOf(startNeedle,from);
  if(start<0)return `===== ${label} =====\nSTART NOT FOUND: ${startNeedle}\n`;
  const end=html.indexOf(endNeedle,start+startNeedle.length);
  return `===== ${label} @ ${start} =====\n${clean(html.slice(start,end<0?start+7000:end))}\n`;
}
function allAround(label,needle,before=900,after=1700,max=10){
  let out=`===== ${label}: ${needle} =====\n`,from=0,count=0;
  while(count<max){
    const at=html.indexOf(needle,from);if(at<0)break;
    out+=`--- ${count+1} @ ${at} ---\n${clean(html.slice(Math.max(0,at-before),Math.min(html.length,at+after)))}\n`;
    from=at+needle.length;count++;
  }
  return out+`COUNT=${count}\n`;
}

const attackStart=html.indexOf('const ATTACK_SPRITES=');
let report='PASS 4.1 COMPACT PRESENTATION CONTRACT\n\n';
report+=sliceAfter('Sub-Zero ATTACK_SPRITES',"'Sub-Zero':{",'\n  },',attackStart)+'\n';
report+=sliceAfter('Senku ATTACK_SPRITES','Senku:{','\n  }',attackStart)+'\n';
report+=sliceAfter('CHARACTER_ANIMATION_MAPS Sub-Zero',"'Sub-Zero':Object.freeze({",'\n  }),',html.indexOf('const CHARACTER_ANIMATION_MAPS'))+'\n';
report+=sliceAfter('CHARACTER_ANIMATION_MAPS Senku','Senku:Object.freeze({','\n  })',html.indexOf('const CHARACTER_ANIMATION_MAPS'))+'\n';
report+=allAround('drawUnit call sites','drawUnit(',1000,2200,10)+'\n';
report+=allAround('facingFlip call sites','facingFlip(',1000,1800,10)+'\n';
report+=allAround('drawShape call sites','drawShape(',900,1800,10)+'\n';
report+=allAround('attackProxy call sites','attackProxy(',900,1600,10)+'\n';
report+=allAround('useJutsu preview paths','useJutsu',1100,2100,8)+'\n';

await fs.mkdir('dev-tools',{recursive:true});
await fs.writeFile('dev-tools/pass41-targeted-contract.txt',report);
console.log(`Pass 4.1 targeted contract wrote ${report.length} chars`);
