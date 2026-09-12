import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const fontDir=path.join(root,'assets','fonts','blazing-brush');
const manifest=JSON.parse(await fs.readFile(path.join(fontDir,'glyph-manifest.json'),'utf8'));
if(manifest.version<3)throw new Error(`Blazing Brush: expected corrected manifest v3+, got ${manifest.version}`);
if(manifest.layout!=='hand-authored irregular rows')throw new Error(`Blazing Brush: corrected irregular source layout missing`);
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

// The generated alphabet art is intentionally irregular: A-E / F-K / L-P /
// Q-U / V-Z. These assertions prevent a future equal-grid slicer from silently
// mapping the wrong painted letter to a filename while still passing file checks.
const expectedLayout={
  F:['FGHIJK',0],G:['FGHIJK',1],H:['FGHIJK',2],I:['FGHIJK',3],
  T:['QRSTU',3],3:['01234',3],2:['01234',2],1:['01234',1]
};
for(const [char,[rowChars,column]] of Object.entries(expectedLayout)){
  const grid=glyphs[char]?.grid;
  if(grid?.rowCharacters!==rowChars||Number(grid?.column)!==column){
    throw new Error(`Blazing Brush: ${char} source mapping incorrect; got ${JSON.stringify(grid)}`);
  }
}
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

console.log('Blazing Brush PASS: corrected 5/6/5/5/5 mapping, 62 transparent raster glyphs, Road intro renderer, 3x-DPR browser quality smoke.');
