import fs from 'node:fs/promises';
import path from 'node:path';
const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const marker='runtime/rendering/scorpion-puppet-atlas.js';
if(!html.includes(marker)){
 const tag='<script src="'+marker+'"></script>';
 if(!html.includes('</body>'))throw new Error('Scorpion Puppet Atlas V1 postprocess: closing body tag missing');
 html=html.replace('</body>',tag+'</body>');
}
if(!html.includes(marker))throw new Error('Scorpion Puppet Atlas V1 postprocess: renderer module was not injected');
await fs.writeFile(file,html);
console.log('Scorpion Puppet Atlas V1 postprocess PASS: development-only atlas renderer injected before final fighter-scale authority.');