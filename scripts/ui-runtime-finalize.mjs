import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const file=path.join(ROOT,'dist','index.html');
let html=await fs.readFile(file,'utf8');
const read=rel=>fs.readFile(path.join(ROOT,rel),'utf8');
function removeTagById(tag,id){const rx=new RegExp(`<${tag}\\b[^>]*\\bid=["']${id}["'][^>]*>[\\s\\S]*?<\\/${tag}>`,'gi');html=html.replace(rx,'');}
function insertBeforeLast(tag,text,label){const at=html.toLowerCase().lastIndexOf(tag.toLowerCase());if(at<0)throw new Error(`UI finalize: missing ${label}`);html=html.slice(0,at)+text+html.slice(at);}
function normalizeDocumentHead(){const hm=html.match(/<head\b[^>]*>/i),bodyAt=html.search(/<body\b/i);if(!hm||bodyAt<0)throw new Error('UI finalize: document head/body missing');const ho=hm.index??-1,hc=ho+hm[0].length;if(ho<0||hc>=bodyAt)throw new Error('UI finalize: invalid document head boundary');html=html.slice(0,hc)+html.slice(hc,bodyAt).replace(/<\/head\s*>/gi,'')+'</head>'+html.slice(bodyAt);}
function stripLeakedDetailsRuntime(){let removed=0;const anchorNeedle='window.BlazingUnitDetailsScreen=Object.freeze';let anchor=html.indexOf(anchorNeedle);while(anchor>=0){const priorClose=html.lastIndexOf('</script>',anchor),nextOpen=html.lastIndexOf('<script',anchor);if(priorClose>nextOpen&&anchor-priorClose<24000){const end=html.indexOf('})();',anchor);if(end>anchor){const segment=html.slice(priorClose+9,end+5);if(/bindLegacyTakeover|findInventoryReturn|takeoverLegacyDetails/.test(segment)){html=html.slice(0,priorClose+9)+html.slice(end+5);removed++;anchor=html.indexOf(anchorNeedle);continue;}}}anchor=html.indexOf(anchorNeedle,anchor+anchorNeedle.length);}return removed;}
const safeScript=source=>source.replace(/<\/script/gi,'<\\/script');
for(const id of ['bb-unit-details-style','bb-ui-polish-style','bb-home-wallpaper-style'])removeTagById('style',id);
for(const id of ['bb-unit-details-model','bb-unit-details-screen','bb-inventory-skin','bb-inventory-screen','bb-legacy-details-suppress','bb-reserved-details-tab','bb-home-wallpaper-runtime'])removeTagById('script',id);
normalizeDocumentHead();
stripLeakedDetailsRuntime();
if(!/<meta\b[^>]*charset/i.test(html))html=html.replace(/<head\b([^>]*)>/i,'<head$1><meta charset="utf-8">');
const fontCss=await read('runtime/ui/theme/animeace-font.css');
const themeCss=await read('runtime/ui/unit-details/theme.css');
const detailFonts=await read('runtime/ui/unit-details/theme/fonts.css');
let backdropCss=await read('runtime/ui/unit-details/theme/backdrop.css');
const buttonsCss=await read('runtime/ui/unit-details/components/buttons.css');
const framesCss=await read('runtime/ui/unit-details/components/frames.css');
const scrollsCss=await read('runtime/ui/unit-details/components/scrolls.css');
const artViewerCss=await read('runtime/ui/unit-details/components/art-viewer.css');
let detailShellCss=await read('runtime/ui/unit-details.css');
let inventoryCss=await read('runtime/ui/inventory/inventory.css');
const cardsCss=await read('runtime/ui/inventory/cards.css');
detailShellCss=detailShellCss.replace(/^@import[^;]+;\s*/gm,'');inventoryCss=inventoryCss.replace(/^@import[^;]+;\s*/gm,'');backdropCss=backdropCss.replace(/^@import[^;]+;\s*/gm,'');
const cloudImage=await fs.readFile(path.join(ROOT,'runtime/ui/shared/cloud-backdrop-hq.png'));
const cloudBase64=cloudImage.toString('base64');
if(cloudImage.length<500000||!cloudBase64.startsWith('iVBOR'))throw new Error('UI finalize: HQ PNG cloud backdrop is invalid');
const cloudUrl=`url("data:image/png;base64,${cloudBase64}")`;
inventoryCss=inventoryCss.replace(/var\(--bb-cloud-backdrop\)/g,cloudUrl);
backdropCss=backdropCss.replace(/var\(--bb-cloud-backdrop\)/g,cloudUrl);
const homeImage=await fs.readFile(path.join(ROOT,'runtime/ui/home/home-wallpaper-hq.png'));
const homeBase64=homeImage.toString('base64');
if(homeImage.length<500000||!homeBase64.startsWith('iVBOR'))throw new Error('UI finalize: HQ PNG home wallpaper is invalid');
const homeCss=`.bb-home-theme{position:relative!important;isolation:isolate!important;background:#10131a!important;background-image:none!important;overflow:hidden!important}.bb-home-theme:before{content:""!important;position:absolute!important;inset:0!important;z-index:0!important;pointer-events:none!important;background-image:url("data:image/png;base64,${homeBase64}")!important;background-repeat:no-repeat!important;background-position:center center!important;background-size:cover!important;opacity:1!important}.bb-home-theme>*{position:relative;z-index:1}.bb-home-theme .bb-home-old-wallpaper{display:none!important}.bb-legacy-inventory-suppressed,.bb-legacy-details-suppressed{display:none!important;visibility:hidden!important;pointer-events:none!important}`;
const css=[fontCss,themeCss,detailFonts,backdropCss,buttonsCss,framesCss,scrollsCss,artViewerCss,detailShellCss,inventoryCss,cardsCss,homeCss].join('\n');
insertBeforeLast('</head>',`<style id="bb-ui-polish-style">${css}</style>`,'closing head');
const detailsVm=safeScript(await read('runtime/ui/unit-details.js')),detailsScreen=safeScript(await read('runtime/ui/unit-details-screen.js')),inventoryScreen=safeScript(await read('runtime/ui/inventory/inventory-screen.js')),legacySuppress=safeScript(await read('runtime/ui/unit-details/legacy-suppress.js')),homeRuntime=safeScript(await read('runtime/ui/home/home-skin.js'));
const scripts=`<script id="bb-unit-details-model">${detailsVm}</script><script id="bb-unit-details-screen">${detailsScreen}</script><script id="bb-inventory-screen">${inventoryScreen}</script><script id="bb-legacy-details-suppress">${legacySuppress}</script><script id="bb-home-wallpaper-runtime">${homeRuntime}</script>`;
insertBeforeLast('</body>',scripts,'closing body');normalizeDocumentHead();
const headOpen=html.search(/<head\b/i),headClose=html.search(/<\/head>/i),bodyOpen=html.search(/<body\b/i),bodyClose=html.toLowerCase().lastIndexOf('</body>');if(headOpen<0||headClose<0||bodyOpen<0||bodyClose<0||!(headOpen<headClose&&headClose<bodyOpen&&bodyOpen<bodyClose))throw new Error('UI finalize: invalid final document boundaries');
for(const id of ['bb-ui-polish-style','bb-unit-details-model','bb-unit-details-screen','bb-inventory-screen','bb-legacy-details-suppress','bb-home-wallpaper-runtime']){const count=(html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length;if(count!==1)throw new Error(`UI finalize: expected one ${id}, found ${count}`);}
if(/id=["']bb-inventory-skin["']/.test(html))throw new Error('UI finalize: legacy inventory decorator survived finalization');
if(!html.includes('grid-template-columns:repeat(4,minmax(0,1fr))'))throw new Error('UI finalize: four-column inventory contract missing');
if(!html.includes('assets/characters/${unit.id}/${asset}'))throw new Error('UI finalize: canonical clean-art path resolver missing');
if(!html.includes("img.src=assetAvailable(vm.art.full)?vm.art.full:''"))throw new Error('UI finalize: details clean-art-only contract missing');
if((html.match(/data:image\/png;base64,iVBOR/g)||[]).length<3)throw new Error('UI finalize: HQ PNG backdrops missing');
if(!html.includes('bb-home-theme'))throw new Error('UI finalize: HQ PNG home wallpaper missing');
const bodyTextTail=html.slice(bodyOpen,bodyClose);if(/findInventoryReturn[\s\S]{0,12000}BlazingUnitDetailsScreen=Object\.freeze/.test(bodyTextTail.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')))throw new Error('UI finalize: leaked details runtime text survived');
await fs.writeFile(file,html);console.log('UI finalizer PASS: HQ PNG Inventory/Details cloud backdrop, HQ Home wallpaper, leaked source removed.');
