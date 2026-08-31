import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const file=path.join(ROOT,'dist','index.html');
let html=await fs.readFile(file,'utf8');

const read=async rel=>fs.readFile(path.join(ROOT,rel),'utf8');
const fontCss=await read('runtime/ui/theme/animeace-font.css');
let inventoryCss=await read('runtime/ui/inventory/inventory.css');
const cardsCss=await read('runtime/ui/inventory/cards.css');
const inventorySkin=await read('runtime/ui/inventory/inventory-skin.js');
const reservedTab=await read('runtime/ui/unit-details/reserved-tab.js');

// The inventory stylesheet normally imports the shared font theme. In the built single-file
// preview we inject that font theme explicitly first, so strip the import to keep CSS valid.
inventoryCss=inventoryCss.replace(/^@import[^;]+;\s*/,'');

const style=`<style id="bb-ui-polish-style">${fontCss}\n${inventoryCss}\n${cardsCss}</style>`;
const scripts=`<script id="bb-inventory-skin">${inventorySkin}</script><script id="bb-reserved-details-tab">${reservedTab}</script>`;

if(!html.includes('id="bb-ui-polish-style"'))html=html.replace(/<\/head>/i,`${style}</head>`);
if(!html.includes('id="bb-inventory-skin"'))html=html.replace(/<\/body>/i,`${scripts}</body>`);

await fs.writeFile(file,html);
console.log('UI polish injected: Anime Ace font, four-column inventory skin, rarity frames, reserved details tab');
