import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const fail=message=>{throw new Error(`Blazing archive font validation failed: ${message}`)};
const exists=async relative=>{try{await fs.access(path.join(root,relative));return true}catch{return false}};
for(const asset of ['matisse-pro-n-eb-en.otf','reggae-std-b-en.otf']){
  const relative=`assets/ui/fonts/blazing-archive/${asset}`;
  if(!await exists(relative))fail(`missing imported source font ${asset}`);
  const bytes=(await fs.stat(path.join(root,relative))).size;
  if(bytes<100000)fail(`${asset} is unexpectedly small (${bytes} bytes)`);
}
const css=await fs.readFile(path.join(root,'runtime/ui/theme/blazing-archive-fonts.css'),'utf8');
for(const marker of ['BlazingMatisse','BlazingReggae','font-display:swap','matisse-pro-n-eb-en.otf','reggae-std-b-en.otf'])if(!css.includes(marker))fail(`font CSS marker missing: ${marker}`);
if(css.includes('/Volumes/'))fail('font runtime CSS must not reference the local archive volume');
const postprocess=await fs.readFile(path.join(root,'scripts/battle-mobile-controls-postprocess.mjs'),'utf8');
if(!postprocess.includes('runtime/ui/theme/blazing-archive-fonts.css')||!postprocess.includes('bb-blazing-archive-fonts'))fail('font stylesheet is not loaded by the served build');
const dockCss=await fs.readFile(path.join(root,'runtime/ui/battle/battle-dock.css'),'utf8');
if(!dockCss.includes('BlazingMatisse')||!dockCss.includes('BlazingReggae'))fail('battle dock is not using the archive fonts');
console.log('Blazing archive font validation PASS: original English Matisse/Reggae fonts are externally loaded and scoped to battle UI.');
