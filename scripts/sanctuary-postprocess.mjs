import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const id='bb-home-sanctuary-entry-runtime';
html=html.replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*><\\/script>`,'gi'),'');
const at=html.toLowerCase().lastIndexOf('</body>');
if(at<0)throw new Error('Sanctuary postprocess: closing body missing');
html=html.slice(0,at)+`<script id="${id}" src="runtime/ui/home/home-sanctuary-entry.js"></script>`+html.slice(at);
for(const marker of ['sanctuary.html','assets/ui/sanctuary/first-bloom/ui/home-button/sanctuary_home_button.png']){
 const runtime=await fs.readFile(path.join(process.cwd(),'runtime','ui','home','home-sanctuary-entry.js'),'utf8');
 if(!runtime.includes(marker))throw new Error(`Sanctuary postprocess: missing ${marker}`);
}
await fs.writeFile(file,html);
console.log('Sanctuary Home entry PASS: approved wide parchment button routes to First Bloom.');

// Only this isolated feature build grants development resources and controls.
const branch=process.env.CF_PAGES_BRANCH||process.env.WORKERS_CI_BRANCH||process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
const sanctuaryFile=path.join(process.cwd(),'dist','sanctuary.html');
let sanctuary=await fs.readFile(sanctuaryFile,'utf8');
sanctuary=sanctuary.replace('</head>',`<meta name="sanctuary-dev-build" content="${branch==='feature/sanctuary-first-bloom'}"></head>`);
await fs.writeFile(sanctuaryFile,sanctuary);
