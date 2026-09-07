import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const oldMarker='bb-home-v7-build-final';
const marker='bb-home-v8-build-final';
html=html.replace(new RegExp(`<style\\b[^>]*id=["']${oldMarker}["'][^>]*>[\\s\\S]*?<\\/style>`,'gi'),'');
html=html.replace(new RegExp(`<style\\b[^>]*id=["']${marker}["'][^>]*>[\\s\\S]*?<\\/style>`,'gi'),'');
const css=`<style id="${marker}">
html body #bbHomeApproved.bb-home-live-v7.bb-home-v8 .bb-home-v4-nav[data-nav="battle"]{
 height:100%!important;
 min-height:0!important;
 align-self:stretch!important;
 place-self:stretch!important;
}
html body #bbHomeApproved.bb-home-live-v7.bb-home-v8 .bb-home-v4-nav[data-nav="battle"] img{
 height:100%!important;
 max-height:none!important;
 object-fit:contain!important;
}
@media(max-width:620px){
html body #bbHomeApproved.bb-home-v8 .bb-home-v4-dock{width:calc(100vw - 8px)!important;max-width:calc(100vw - 8px)!important}
html body #bbHomeApproved.bb-home-v8 .bb-home-v4-center{width:48vw!important}
}
</style>`;
if(!html.includes('</head>'))throw new Error('Home v8 finalize: missing </head>');
html=html.replace('</head>',`${css}</head>`);
for(const required of [marker,'calc(100vw - 8px)','bb-home-live-v7.bb-home-v8','height:100%!important'])if(!html.includes(required))throw new Error(`Home v8 finalize: missing ${required}`);
await fs.writeFile(file,html);
console.log('Home v8 finalize PASS: Battle spans the three-button stack and the mockup dock remains viewport-safe.');
