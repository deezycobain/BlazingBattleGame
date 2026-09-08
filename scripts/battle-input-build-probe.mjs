import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
const html=await fs.readFile(file,'utf8');
const marker="cvs.addEventListener('pointerdown'";
const at=html.indexOf(marker);
if(at<0)throw new Error('Battle input probe: native pointerdown listener missing');
const snippet=html.slice(at,at+2400).replace(/\s+/g,' ');
console.log(`BATTLE_INPUT_POINTERDOWN ${snippet}`);
