import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const STYLE_ID='bb-home-grid-final';

html=html.replace(new RegExp(`<style\\b[^>]*id=["']${STYLE_ID}["'][^>]*>[\\s\\S]*?<\\/style>`,'gi'),'');

const css=`
.bb-home-theme .bb-home-actions>#summonsBtn.bb-home-action--summon,
.bb-home-theme .bb-home-actions>#inventoryBtn.bb-home-action--inventory,
.bb-home-theme .bb-home-actions>#forgeBtn.bb-home-action--forge{
  grid-area:auto!important;
  align-self:stretch!important;
  justify-self:stretch!important;
  width:auto!important;
  min-width:0!important;
  max-width:none!important;
}
.bb-home-theme .bb-home-actions>#summonsBtn.bb-home-action--summon{grid-column:1/3!important;grid-row:2!important}
.bb-home-theme .bb-home-actions>#inventoryBtn.bb-home-action--inventory{grid-column:3/5!important;grid-row:2!important}
.bb-home-theme .bb-home-actions>#forgeBtn.bb-home-action--forge{grid-column:5/7!important;grid-row:2!important}
@media(max-width:620px){
  .bb-home-theme .bb-home-actions>#summonsBtn.bb-home-action--summon{grid-column:1/3!important;grid-row:3!important}
  .bb-home-theme .bb-home-actions>#inventoryBtn.bb-home-action--inventory{grid-column:3/5!important;grid-row:3!important}
  .bb-home-theme .bb-home-actions>#forgeBtn.bb-home-action--forge{grid-column:5/7!important;grid-row:3!important}
}
`;

const at=html.toLowerCase().lastIndexOf('</head>');
if(at<0)throw new Error('Home grid finalize: closing head missing');
html=html.slice(0,at)+`<style id="${STYLE_ID}">${css}</style>`+html.slice(at);

for(const marker of [STYLE_ID,'grid-column:1/3!important;grid-row:3!important','grid-column:5/7!important;grid-row:2!important']){
  if(!html.includes(marker))throw new Error(`Home grid finalize: missing ${marker}`);
}

await fs.writeFile(file,html);
console.log('Home grid finalize PASS: secondary navigation pinned to deterministic six-column cells.');
