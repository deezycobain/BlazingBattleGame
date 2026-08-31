import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const file=path.join(ROOT,'dist','index.html');
let html=await fs.readFile(file,'utf8');
const read=rel=>fs.readFile(path.join(ROOT,rel),'utf8');

function removeTagById(tag,id){
  const rx=new RegExp(`<${tag}\\b[^>]*\\bid=["']${id}["'][^>]*>[\\s\\S]*?<\\/${tag}>`,'gi');
  html=html.replace(rx,'');
}
function insertBeforeLast(tag,text,label){
  const at=html.toLowerCase().lastIndexOf(tag.toLowerCase());
  if(at<0)throw new Error(`UI finalize: missing ${label}`);
  html=html.slice(0,at)+text+html.slice(at);
}
function normalizeDocumentHead(){
  const headMatch=html.match(/<head\b[^>]*>/i);
  const bodyAt=html.search(/<body\b/i);
  if(!headMatch||bodyAt<0)throw new Error('UI finalize: document head/body missing');
  const headOpenAt=headMatch.index??-1;
  const headContentAt=headOpenAt+headMatch[0].length;
  if(headOpenAt<0||headContentAt>=bodyAt)throw new Error('UI finalize: invalid document head boundary');
  const before=html.slice(0,headContentAt);
  const headBody=html.slice(headContentAt,bodyAt).replace(/<\/head\s*>/gi,'');
  const after=html.slice(bodyAt);
  html=before+headBody+'</head>'+after;
}
const safeScript=source=>source.replace(/<\/script/gi,'<\\/script');

// Finalizer owns these surfaces. Older decorators are removed rather than layered underneath.
for(const id of ['bb-unit-details-style','bb-ui-polish-style','bb-home-wallpaper-style'])removeTagById('style',id);
for(const id of ['bb-unit-details-model','bb-unit-details-screen','bb-inventory-skin','bb-inventory-screen','bb-legacy-details-suppress','bb-reserved-details-tab','bb-home-wallpaper-runtime'])removeTagById('script',id);
normalizeDocumentHead();
if(!/<meta\b[^>]*charset/i.test(html))html=html.replace(/<head\b([^>]*)>/i,'<head$1><meta charset="utf-8">');

const fontCss=await read('runtime/ui/theme/animeace-font.css');
const themeCss=await read('runtime/ui/unit-details/theme.css');
const detailFonts=await read('runtime/ui/unit-details/theme/fonts.css');
const backdropCss=await read('runtime/ui/unit-details/theme/backdrop.css');
const buttonsCss=await read('runtime/ui/unit-details/components/buttons.css');
const framesCss=await read('runtime/ui/unit-details/components/frames.css');
const scrollsCss=await read('runtime/ui/unit-details/components/scrolls.css');
const artViewerCss=await read('runtime/ui/unit-details/components/art-viewer.css');
let detailShellCss=await read('runtime/ui/unit-details.css');
let inventoryCss=await read('runtime/ui/inventory/inventory.css');
const cardsCss=await read('runtime/ui/inventory/cards.css');

detailShellCss=detailShellCss.replace(/^@import[^;]+;\s*/gm,'');
inventoryCss=inventoryCss.replace(/^@import[^;]+;\s*/gm,'');

// Shared parchment cloud image is embedded directly. No imported/generated cloud layer survives.
const cloudParts=['runtime/ui/shared/cloud-bg-00.txt','runtime/ui/shared/cloud-bg-01.txt','runtime/ui/shared/cloud-bg-02.txt'];
const cloudBase64=(await Promise.all(cloudParts.map(read))).join('').replace(/\s+/g,'');
if(cloudBase64.length<20000||!cloudBase64.startsWith('UklGR'))throw new Error('UI finalize: cloud wallpaper payload is invalid');
const cloudCss=`:root{--bb-cloud-backdrop:url("data:image/webp;base64,${cloudBase64}");}`;

// The approved replacement home artwork is the only home wallpaper source.
const homeParts=['runtime/ui/home/wallpaper-00.txt','runtime/ui/home/wallpaper-01.txt'];
const homeBase64=(await Promise.all(homeParts.map(read))).join('').replace(/\s+/g,'');
if(homeBase64.length<15000||!homeBase64.startsWith('/9j/'))throw new Error('UI finalize: replacement home wallpaper payload is invalid');
const homeCss=`
.bb-home-theme{position:relative!important;isolation:isolate!important;background:#10131a!important;background-image:none!important;}
.bb-home-theme:before{content:""!important;position:absolute!important;inset:0!important;z-index:0!important;pointer-events:none!important;background-image:url("data:image/jpeg;base64,${homeBase64}")!important;background-repeat:no-repeat!important;background-position:center center!important;background-size:cover!important;opacity:1!important;mix-blend-mode:normal!important;}
.bb-home-theme>*{position:relative;z-index:1;}
.bb-home-theme .bb-home-old-wallpaper{display:none!important;visibility:hidden!important;opacity:0!important;}
.bb-legacy-inventory-suppressed,.bb-legacy-details-suppressed{display:none!important;visibility:hidden!important;pointer-events:none!important;}
`;

const css=[cloudCss,fontCss,themeCss,detailFonts,backdropCss,buttonsCss,framesCss,scrollsCss,artViewerCss,detailShellCss,inventoryCss,cardsCss,homeCss].join('\n');
insertBeforeLast('</head>',`<style id="bb-ui-polish-style">${css}</style>`,'closing head');

const detailsVm=safeScript(await read('runtime/ui/unit-details.js'));
const detailsScreen=safeScript(await read('runtime/ui/unit-details-screen.js'));
const inventoryScreen=safeScript(await read('runtime/ui/inventory/inventory-screen.js'));
const legacySuppress=safeScript(await read('runtime/ui/unit-details/legacy-suppress.js'));
const homeRuntime=safeScript(await read('runtime/ui/home/home-skin.js'));
const scripts=`<script id="bb-unit-details-model">${detailsVm}</script><script id="bb-unit-details-screen">${detailsScreen}</script><script id="bb-inventory-screen">${inventoryScreen}</script><script id="bb-legacy-details-suppress">${legacySuppress}</script><script id="bb-home-wallpaper-runtime">${homeRuntime}</script>`;
insertBeforeLast('</body>',scripts,'closing body');
normalizeDocumentHead();

const headOpen=html.search(/<head\b/i),headClose=html.search(/<\/head>/i),bodyOpen=html.search(/<body\b/i),bodyClose=html.toLowerCase().lastIndexOf('</body>');
if(headOpen<0||headClose<0||bodyOpen<0||bodyClose<0||!(headOpen<headClose&&headClose<bodyOpen&&bodyOpen<bodyClose))throw new Error('UI finalize: invalid final document boundaries');
for(const id of ['bb-ui-polish-style','bb-unit-details-model','bb-unit-details-screen','bb-inventory-screen','bb-legacy-details-suppress','bb-home-wallpaper-runtime']){
  const count=(html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length;
  if(count!==1)throw new Error(`UI finalize: expected one ${id}, found ${count}`);
}
if(/id=["']bb-inventory-skin["']/.test(html))throw new Error('UI finalize: legacy inventory decorator survived finalization');
if(!html.includes('grid-template-columns:repeat(4,minmax(0,1fr))'))throw new Error('UI finalize: four-column inventory contract missing');
if(!html.includes('assets/characters/${unit.id}/${asset}'))throw new Error('UI finalize: canonical clean-art path resolver missing');
if(!html.includes("img.src=assetAvailable(vm.art.full)?vm.art.full:''"))throw new Error('UI finalize: details clean-art-only contract missing');
if(!html.includes('--bb-cloud-backdrop:url("data:image/webp;base64,UklGR'))throw new Error('UI finalize: shared cloud backdrop missing');
if(!html.includes('bb-home-theme')||!html.includes('data:image/jpeg;base64,/9j/'))throw new Error('UI finalize: replacement home wallpaper missing');

await fs.writeFile(file,html);
console.log('UI finalizer PASS: authoritative Inventory/Details/Home replacements embedded; shared cloud wallpaper embedded; scripts safely contained.');
