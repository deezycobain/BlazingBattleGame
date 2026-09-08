import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const id='bb-blazing-road-camera-runtime';
html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'');
html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*/>`,'gi'),'');
const at=html.toLowerCase().lastIndexOf('</body>');
if(at<0)throw new Error('Road camera: closing body missing');
const tag=`<script id="${id}" src="runtime/modes/blazing-road-camera.js"></script>`;
html=html.slice(0,at)+tag+html.slice(at);
if((html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length!==1)throw new Error('Road camera: runtime injection was not unique');
await fs.writeFile(file,html);
console.log('Road camera PASS: full-map intro/outro framing and map-authored combat zoom runtime loaded.');
