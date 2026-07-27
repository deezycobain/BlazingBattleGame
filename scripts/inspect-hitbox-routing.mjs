import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const file=path.join(ROOT,'dist','index.html');
const html=await fs.readFile(file,'utf8');
const needles=['attackShape','basic_shape','jutsu_shape','targets','nearest','atan2','Math.atan2','targetAngle','attackPreview','hitbox','rangeShape','pointIn','inShape','shape'];
let out='';
for(const needle of needles){
  out+=`\n===== ${needle} =====\n`;
  let from=0,count=0;
  while(count<30){
    const i=html.indexOf(needle,from);
    if(i<0)break;
    out+=`\n--- match ${count+1} @ ${i} ---\n${html.slice(Math.max(0,i-900),Math.min(html.length,i+needle.length+1800))}\n`;
    from=i+needle.length;count++;
  }
}
await fs.mkdir(path.join(ROOT,'dist','_debug'),{recursive:true});
await fs.writeFile(path.join(ROOT,'dist','_debug','hitbox-routing.txt'),out);
console.log('Temporary hitbox-routing inspection artifact written');
