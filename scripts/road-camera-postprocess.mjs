import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const ids=['bb-blazing-brush-runtime','bb-blazing-road-camera-runtime'];
for(const id of ids){
  html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'');
  html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*/>`,'gi'),'');
}
const at=html.toLowerCase().lastIndexOf('</body>');
if(at<0)throw new Error('Road camera: closing body missing');
const tags=[
  '<script id="bb-blazing-brush-runtime" src="runtime/ui/blazing-brush-text.js"></script>',
  '<script id="bb-blazing-road-camera-runtime" src="runtime/modes/blazing-road-camera.js"></script>'
].join('');
html=html.slice(0,at)+tags+html.slice(at);
for(const id of ids){
  if((html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length!==1)throw new Error(`Road camera: runtime injection not unique for ${id}`);
}
if(html.indexOf('bb-blazing-brush-runtime')>html.indexOf('bb-blazing-road-camera-runtime'))throw new Error('Road camera: brush renderer must load before camera runtime');
await fs.writeFile(file,html);
console.log('Road camera PASS: Blazing Brush renderer + full-map intro/outro framing + combat zoom runtime loaded.');
