import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const file=path.join(ROOT,'dist','index.html');
let html=await fs.readFile(file,'utf8');

// Preview builds previously closed <head> immediately after BB_DEV_CONFIG.
// That pushed the charset/styles/runtime scripts into malformed document flow,
// producing mojibake and visible JavaScript text on iOS. Repair that generated
// markup before adding any UI polish.
const headOpen=html.search(/<head\b[^>]*>/i);
let charsetAt=html.search(/<meta\b[^>]*charset/i);
let firstHeadClose=html.search(/<\/head>/i);
if(headOpen>=0&&firstHeadClose>=0&&charsetAt>=0&&firstHeadClose<charsetAt){
 html=html.slice(0,firstHeadClose)+html.slice(firstHeadClose+7);
}
if(!/<meta\b[^>]*charset/i.test(html)){
 html=html.replace(/<head\b([^>]*)>/i,'<head$1><meta charset="utf-8">');
}

const read=async rel=>fs.readFile(path.join(ROOT,rel),'utf8');
const fontCss=await read('runtime/ui/theme/animeace-font.css');
let inventoryCss=await read('runtime/ui/inventory/inventory.css');
const cardsCss=await read('runtime/ui/inventory/cards.css');
const backdropCss=await read('runtime/ui/unit-details/theme/backdrop.css');
const inventorySkin=await read('runtime/ui/inventory/inventory-skin.js');
const legacyDetailsSuppress=await read('runtime/ui/unit-details/legacy-suppress.js');
const reservedTab=await read('runtime/ui/unit-details/reserved-tab.js');

// The inventory stylesheet normally imports the shared font theme. In the built single-file
// preview we inject the bundled Anime Ace font explicitly first, so strip the import.
inventoryCss=inventoryCss.replace(/^@import[^;]+;\s*/,'');

const style=`<style id="bb-ui-polish-style">${fontCss}\n${backdropCss}\n${inventoryCss}\n${cardsCss}</style>`;
const scripts=`<script id="bb-inventory-skin">${inventorySkin}</script><script id="bb-legacy-details-suppress">${legacyDetailsSuppress}</script><script id="bb-reserved-details-tab">${reservedTab}</script>`;

if(!html.includes('id="bb-ui-polish-style"'))html=html.replace(/<\/head>/i,`${style}</head>`);
if(!html.includes('id="bb-inventory-skin"'))html=html.replace(/<\/body>/i,`${scripts}</body>`);

const headOpens=(html.match(/<head\b/gi)||[]).length;
const headCloses=(html.match(/<\/head>/gi)||[]).length;
const bodyAt=html.search(/<body\b/i);
firstHeadClose=html.search(/<\/head>/i);
charsetAt=html.search(/<meta\b[^>]*charset/i);
if(headOpens!==1||headCloses!==1||headOpen<0||firstHeadClose<0||bodyAt<0||firstHeadClose>bodyAt||charsetAt<0||charsetAt>firstHeadClose){
 throw new Error(`UI polish: malformed document head after repair (open=${headOpens}, close=${headCloses}, charset=${charsetAt}, body=${bodyAt})`);
}
if(!html.includes('id="bb-legacy-details-suppress"')||!html.includes('id="bb-inventory-skin"'))throw new Error('UI polish: replacement inventory/detail suppress runtime missing');
if(!html.includes('grid-template-columns:repeat(4,minmax(0,1fr))'))throw new Error('UI polish: four-column replacement inventory CSS missing');
if(!html.includes('data:image/svg+xml'))throw new Error('UI polish: embedded Japanese cloud backdrop missing');

await fs.writeFile(file,html);
console.log('UI polish injected: standalone four-column inventory, rarity frames, embedded cloud backdrop, Anime Ace font, legacy details suppression');
