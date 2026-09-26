import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const specs=[
 ['bb-legacy-clean-presentation-contract','runtime/ui/legacy-clean-presentation-contract.js'],
 ['bb-road-ios-canvas-safety','runtime/modes/blazing-road-ios-canvas-safety.js']
];
for(const [id] of specs){
 html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'');
 html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*/>`,'gi'),'');
}
const at=html.toLowerCase().lastIndexOf('</body>');
if(at<0)throw new Error('Presentation integrity: closing body missing');
const tags=specs.map(([id,src])=>`<script id="${id}" src="${src}"></script>`).join('');
html=html.slice(0,at)+tags+html.slice(at);
for(const [id] of specs)if((html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length!==1)throw new Error(`Presentation integrity: ${id} injection not unique`);
await fs.writeFile(file,html);
console.log('Presentation integrity PASS: Legacy clean card/full art contract and iOS Road canvas safety runtime injected.');
