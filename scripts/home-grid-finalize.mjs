import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const STYLE_ID='bb-home-grid-final';

html=html.replace(new RegExp(`<style\\b[^>]*id=["']${STYLE_ID}["'][^>]*>[\\s\\S]*?<\\/style>`,'gi'),'');

const css=`
#menuScreen.bb-home-theme .menuActions.bb-home-actions{
  display:grid!important;
  grid-template-columns:repeat(6,minmax(0,1fr))!important;
  grid-auto-flow:row!important;
  box-sizing:border-box!important;
}
#menuScreen.bb-home-theme .menuActions.bb-home-actions>#level1Btn.bb-home-action--road,
#menuScreen.bb-home-theme .menuActions.bb-home-actions>#boss1Btn.bb-home-action--castle{
  grid-area:auto!important;
  inline-size:100%!important;
  block-size:auto!important;
  width:100%!important;
  height:auto!important;
  min-width:0!important;
  max-width:none!important;
  max-inline-size:none!important;
  min-height:146px!important;
  max-height:none!important;
  aspect-ratio:auto!important;
  align-self:stretch!important;
  justify-self:stretch!important;
  place-self:stretch!important;
  box-sizing:border-box!important;
}
#menuScreen.bb-home-theme .menuActions.bb-home-actions>#level1Btn.bb-home-action--road{grid-column:1/4!important;grid-row:1!important}
#menuScreen.bb-home-theme .menuActions.bb-home-actions>#boss1Btn.bb-home-action--castle{grid-column:4/7!important;grid-row:1!important}
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
@media(min-width:621px){
  #menuScreen.bb-home-theme .menuInner>.menuActions.bb-home-actions{
    width:min(92vw,940px)!important;
    inline-size:min(92vw,940px)!important;
    min-width:min(92vw,940px)!important;
    max-width:940px!important;
    max-inline-size:940px!important;
    flex:none!important;
  }
}
@media(max-width:620px){
  #menuScreen.bb-home-theme .menuActions.bb-home-actions>#level1Btn.bb-home-action--road,
  #menuScreen.bb-home-theme .menuActions.bb-home-actions>#boss1Btn.bb-home-action--castle{
    inline-size:100%!important;
    width:100%!important;
    min-height:96px!important;
  }
  #menuScreen.bb-home-theme .menuActions.bb-home-actions>#level1Btn.bb-home-action--road{grid-column:1/7!important;grid-row:1!important}
  #menuScreen.bb-home-theme .menuActions.bb-home-actions>#boss1Btn.bb-home-action--castle{grid-column:1/7!important;grid-row:2!important}
  .bb-home-theme .bb-home-actions>#summonsBtn.bb-home-action--summon{grid-column:1/3!important;grid-row:3!important}
  .bb-home-theme .bb-home-actions>#inventoryBtn.bb-home-action--inventory{grid-column:3/5!important;grid-row:3!important}
  .bb-home-theme .bb-home-actions>#forgeBtn.bb-home-action--forge{grid-column:5/7!important;grid-row:3!important}
}
`;

const at=html.toLowerCase().lastIndexOf('</head>');
if(at<0)throw new Error('Home grid finalize: closing head missing');
html=html.slice(0,at)+`<style id="${STYLE_ID}">${css}</style>`+html.slice(at);

for(const marker of [
  STYLE_ID,
  'grid-template-columns:repeat(6,minmax(0,1fr))!important',
  'width:min(92vw,940px)!important',
  '#level1Btn.bb-home-action--road{grid-column:1/4!important;grid-row:1!important}',
  '#boss1Btn.bb-home-action--castle{grid-column:4/7!important;grid-row:1!important}',
  '#boss1Btn.bb-home-action--castle{grid-column:1/7!important;grid-row:2!important}',
  'aspect-ratio:auto!important',
  'grid-column:1/3!important;grid-row:3!important',
  'grid-column:5/7!important;grid-row:2!important'
]){
  if(!html.includes(marker))throw new Error(`Home grid finalize: missing ${marker}`);
}

await fs.writeFile(file,html);
console.log('Home grid finalize PASS: desktop shell width, featured-card sizing, and six-column navigation geometry enforced.');
