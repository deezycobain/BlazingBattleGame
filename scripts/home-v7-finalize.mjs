import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const oldMarker='bb-home-v7-build-final';
const marker='bb-home-v8-build-final';
html=html.replace(new RegExp(`<style\\b[^>]*id=["']${oldMarker}["'][^>]*>[\\s\\S]*?<\\/style>`,'gi'),'');
html=html.replace(new RegExp(`<style\\b[^>]*id=["']${marker}["'][^>]*>[\\s\\S]*?<\\/style>`,'gi'),'');
const css=`<style id="${marker}">
html body #bbHomeApproved.bb-home-live-v7.bb-home-v8 .bb-home-v4-dock{
 grid-template-columns:repeat(2,minmax(0,1fr))!important;
 grid-template-rows:repeat(2,minmax(0,1fr))!important;
}
html body #bbHomeApproved.bb-home-live-v7.bb-home-v8 .bb-home-v4-nav[data-nav]{
 min-width:0!important;
 min-height:0!important;
 width:auto!important;
 height:100%!important;
 max-height:none!important;
 aspect-ratio:auto!important;
 align-self:stretch!important;
 justify-self:stretch!important;
 place-self:stretch!important;
}
html body #bbHomeApproved.bb-home-live-v7.bb-home-v8 .bb-home-v4-nav[data-nav="battle"]{
 grid-column:1!important;
 grid-row:1!important;
 transform:rotate(-.7deg)!important;
}
html body #bbHomeApproved.bb-home-live-v7.bb-home-v8 .bb-home-v4-nav[data-nav="summon"]{
 grid-column:2!important;
 grid-row:1!important;
 transform:rotate(.35deg)!important;
}
html body #bbHomeApproved.bb-home-live-v7.bb-home-v8 .bb-home-v4-nav[data-nav="units"]{
 grid-column:1!important;
 grid-row:2!important;
 transform:rotate(-.2deg)!important;
}
html body #bbHomeApproved.bb-home-live-v7.bb-home-v8 .bb-home-v4-nav[data-nav="forge"]{
 grid-column:2!important;
 grid-row:2!important;
 transform:rotate(.3deg)!important;
}
html body #bbHomeApproved.bb-home-live-v7.bb-home-v8 .bb-home-v4-nav[data-nav] img{
 width:100%!important;
 height:100%!important;
 max-width:100%!important;
 max-height:100%!important;
 object-fit:contain!important;
}
</style>`;
if(!html.includes('</head>'))throw new Error('Home v8 finalize: missing </head>');
html=html.replace('</head>',`${css}</head>`);
for(const required of [marker,'grid-template-columns:repeat(2','grid-template-rows:repeat(2','bb-home-v4-nav[data-nav]','aspect-ratio:auto!important'])if(!html.includes(required))throw new Error(`Home v8 finalize: missing ${required}`);
await fs.writeFile(file,html);
console.log('Home v8 finalize PASS: equal 2x2 Home action cells normalized without legacy Battle-span or viewport-width overrides.');
