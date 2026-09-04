import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),file=path.join(root,'dist','index.html');
let html=await fs.readFile(file,'utf8');
const safe=s=>s.replace(/<\/script/gi,'<\\/script');
const css=await fs.readFile(path.join(root,'runtime/ui/progression/progression.css'),'utf8');
const js=safe(await fs.readFile(path.join(root,'runtime/ui/progression/progression.js'),'utf8'));
const awakeningLanguage=safe(await fs.readFile(path.join(root,'runtime/ui/progression/awakening-language.js'),'utf8'));
const popoutCss=await fs.readFile(path.join(root,'runtime/ui/progression/forge-popout-overlays.css'),'utf8');
const popoutJs=safe(await fs.readFile(path.join(root,'runtime/ui/progression/forge-popout-overlays.js'),'utf8'));

const authored=[
 ['tyler','shiny_hand_popout_v2.webp',['tyler_hand_v1.part01.b64','tyler_hand_v1.part02.b64']],
 ['subzero','shiny_hand_popout_v3.webp',['subzero_hand_v1.part01.b64','subzero_hand_v1.part02.b64']],
 ['lebee','shiny_hand_popout_v1.webp',['lebee_hand_v1.part01.b64','lebee_hand_v1.part02.b64']],
 ['senku','shiny_hand_popout_v1.webp',['senku_hand_v1.part01.b64','senku_hand_v1.part02.b64']],
 ['senku','shiny_hair_popout_v1.webp',['senku_hair_v1.part01.b64','senku_hair_v1.part02.b64']]
];
for(const [fighter,name,parts] of authored){
 const encoded=(await Promise.all(parts.map(p=>fs.readFile(path.join(root,'runtime/ui/progression/shiny-cutout-data-v2',p),'utf8')))).join('').replace(/\s+/g,'');
 const bytes=Buffer.from(encoded,'base64');
 if(bytes.length<1000)throw new Error(`Authored popout decode failed: ${fighter}/${name}`);
 const out=path.join(root,'dist','assets','characters',fighter,'art',name);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,bytes);
}

html=html.replace(/<style\b[^>]*id=["']bb-progression-style["'][^>]*>[\s\S]*?<\/style>/gi,'').replace(/<style\b[^>]*id=["']bb-forge-popout-overlays["'][^>]*>[\s\S]*?<\/style>/gi,'').replace(/<script\b[^>]*id=["']bb-progression-runtime["'][^>]*>[\s\S]*?<\/script>/gi,'').replace(/<script\b[^>]*id=["']bb-progression-visual-hotfix["'][^>]*>[\s\S]*?<\/script>/gi,'').replace(/<script\b[^>]*id=["']bb-awakening-language["'][^>]*>[\s\S]*?<\/script>/gi,'').replace(/<script\b[^>]*id=["']bb-forge-popout-runtime["'][^>]*>[\s\S]*?<\/script>/gi,'');
const head=html.toLowerCase().lastIndexOf('</head>'),body=html.toLowerCase().lastIndexOf('</body>');
if(head<0||body<0)throw new Error('Progression pass: document boundaries missing');
html=html.slice(0,head)+`<style id="bb-progression-style">${css}</style><style id="bb-forge-popout-overlays">${popoutCss}</style>`+html.slice(head);
const bodyAt=html.toLowerCase().lastIndexOf('</body>');html=html.slice(0,bodyAt)+`<script id="bb-progression-runtime">${js}<\/script><script id="bb-awakening-language">${awakeningLanguage}<\/script><script id="bb-forge-popout-runtime">${popoutJs}<\/script>`+html.slice(bodyAt);
for(const marker of ['RESONANCE FORGE','blazing.progression.v1','MAX_RESONANCE=5','STAT_BUDGET=12','summonEmbers=999999','spendEmbers=function()','SHINY AWAKENED','KEEP CURRENT','ACCEPT NEW','CORE RESONANCE BANNER','SKIP TO RESULTS','bb-shiny-awakening','current_collection_card.png','senku_card.jpeg','FORGE_ART','SHINY_CUTOUT','SHINY_POPOUT_PROFILE','full_art_absolute_zero_v2.jpeg','full_art_cosmic_wish.jpeg','current_collection_art.jpg','shiny_foreground_cutout_v2.webp','shiny_foreground_cutout_v1.webp','forgeArtDepth','forgePopout','hasPopout','forgeHoloTexture','bbGoldFlow','overflow-y:auto!important','PULL${pulls.length===1','fitForgeArtwork','--forge-art-ratio','--forge-art-max','syncRevealArt','syncResultArt','dataset.popoutProfile','data-popout-profile','bb-awakening-language','AWAKENING FORGE','CORE AWAKENING','BlazingAwakeningLanguage','bb-forge-popout-overlays','bb-forge-popout-runtime','shiny_hand_popout_v2.webp','shiny_hand_popout_v3.webp','shiny_hand_popout_v1.webp','shiny_hair_popout_v1.webp'])if(!html.includes(marker))throw new Error(`Progression pass missing ${marker}`);
await fs.writeFile(file,html);
console.log('Progression pass applied: Awakening presentation plus authored transparent Shiny foreground overlays for Tyler, Sub-Zero, Lebee, and Senku.');
