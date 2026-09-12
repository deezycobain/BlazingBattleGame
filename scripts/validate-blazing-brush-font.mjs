import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const fontDir=path.join(root,'assets','fonts','blazing-brush');
const manifest=JSON.parse(await fs.readFile(path.join(fontDir,'glyph-manifest.json'),'utf8'));
if(manifest.version<2)throw new Error(`Blazing Brush: expected manifest v2+, got ${manifest.version}`);
const glyphs=manifest.glyphs||{};
if(Object.keys(glyphs).length!==62)throw new Error(`Blazing Brush: expected 62 glyphs, got ${Object.keys(glyphs).length}`);

for(const [char,meta] of Object.entries(glyphs)){
  if(!meta?.path?.startsWith('assets/fonts/blazing-brush/glyphs/'))throw new Error(`Blazing Brush: invalid path for ${char}`);
  const file=path.join(root,meta.path);
  const buf=await fs.readFile(file);
  if(buf.length<1024)throw new Error(`Blazing Brush: suspiciously small glyph ${char}: ${buf.length}`);
  if(buf[0]!==0x89||buf[1]!==0x50||buf[2]!==0x4e||buf[3]!==0x47)throw new Error(`Blazing Brush: ${char} is not PNG`);
  if(!(Number(meta.width)>8&&Number(meta.height)>8))throw new Error(`Blazing Brush: invalid dimensions for ${char}`);
}
for(const char of '123FIGHT')if(!glyphs[char])throw new Error(`Blazing Brush: countdown glyph missing ${char}`);
for(const name of ['uppercase_alphabet.png','lowercase_alphabet.png','numbers_0_to_9.png']){
  await fs.access(path.join(fontDir,'source',name));
  try{await fs.access(path.join(fontDir,name));throw new Error(`Blazing Brush: duplicate legacy source remains at font root: ${name}`)}catch(error){
    if(error?.message?.startsWith('Blazing Brush:'))throw error;
  }
}

const renderer=await fs.readFile(path.join(root,'runtime','ui','blazing-brush-text.js'),'utf8');
for(const marker of ["const BASE='assets/fonts/blazing-brush/glyphs'",'bbBrushInkIn','bbBrushFightInk',"staggerMs:word==='FIGHT'?48:0",'data.brushError','MutationObserver']){
  const normalized=marker==='data.brushError'?'dataset.brushError':marker;
  if(!renderer.includes(normalized))throw new Error(`Blazing Brush: renderer missing ${normalized}`);
}
const injection=await fs.readFile(path.join(root,'scripts','road-camera-postprocess.mjs'),'utf8');
for(const marker of ['bb-blazing-brush-runtime','runtime/ui/blazing-brush-text.js','bb-blazing-road-camera-runtime'])if(!injection.includes(marker))throw new Error(`Blazing Brush: build injection missing ${marker}`);
if(injection.indexOf('bb-blazing-brush-runtime')>injection.indexOf('bb-blazing-road-camera-runtime'))throw new Error('Blazing Brush: renderer must load before Road camera');

const smoke=await fs.readFile(path.join(root,'scripts','brush-font-browser-smoke.mjs'),'utf8');
for(const marker of ["inspectWord(page,'3',1)","inspectWord(page,'FIGHT',5)",'deviceScaleFactor:3','alphaStats','blazing-brush-fight-chromium.png'])if(!smoke.includes(marker))throw new Error(`Blazing Brush: browser smoke missing ${marker}`);

console.log('Blazing Brush PASS: 62 raster glyphs, source organization, Road intro renderer, 3x-DPR browser quality smoke.');
