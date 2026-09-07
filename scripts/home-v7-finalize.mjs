import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const marker='bb-home-v7-build-final';
if(!html.includes(marker)){
  const css=`<style id="${marker}">
@media(max-width:620px){
html body #bbHomeApproved.bb-home-live-v7 .bb-home-v4-dock{width:min(100%,calc(100vw - 48px))!important;max-width:calc(100vw - 48px)!important}
}
</style>`;
  if(!html.includes('</head>'))throw new Error('Home v7 finalize: missing </head>');
  html=html.replace('</head>',`${css}</head>`);
}
if(!html.includes('calc(100vw - 48px)'))throw new Error('Home v7 finalize: viewport-safe dock rule missing');
await fs.writeFile(file,html);
console.log('Home v7 finalize PASS: mobile dock is clamped inside the phone viewport.');
