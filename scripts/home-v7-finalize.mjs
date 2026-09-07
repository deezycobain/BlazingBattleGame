import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const oldMarker='bb-home-v7-build-final';
const marker='bb-home-v8-build-final';
html=html.replace(new RegExp(`<style\\b[^>]*id=["']${oldMarker}["'][^>]*>[\\s\\S]*?<\\/style>`,'gi'),'');
html=html.replace(new RegExp(`<style\\b[^>]*id=["']${marker}["'][^>]*>[\\s\\S]*?<\\/style>`,'gi'),'');
const css=`<style id="${marker}">
@media(max-width:620px){
html body #bbHomeApproved.bb-home-v8 .bb-home-v4-dock{width:calc(100vw - 8px)!important;max-width:calc(100vw - 8px)!important}
html body #bbHomeApproved.bb-home-v8 .bb-home-v4-center{width:48vw!important}
}
</style>`;
if(!html.includes('</head>'))throw new Error('Home v8 finalize: missing </head>');
html=html.replace('</head>',`${css}</head>`);
for(const required of [marker,'calc(100vw - 8px)','bb-home-v8'])if(!html.includes(required))throw new Error(`Home v8 finalize: missing ${required}`);
await fs.writeFile(file,html);
console.log('Home v8 finalize PASS: mockup dock and feature card remain viewport-safe on phones.');
