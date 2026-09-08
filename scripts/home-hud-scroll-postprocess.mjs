import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
const runtimeFile=path.join(process.cwd(),'dist','runtime','ui','home','home-hud-scroll-runtime.js');
let html=await fs.readFile(file,'utf8');
const runtime=await fs.readFile(runtimeFile,'utf8');
const id='bb-home-scroll-hud-runtime';

html=html
 .replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`,'gi'),'')
 .replace(new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*/>`,'gi'),'');

for(const marker of [
 'assets/ui/home/hud/player-profile-scroll.png',
 'assets/ui/home/hud/gold-currency-scroll.png',
 'assets/ui/home/hud/embers-currency-scroll.png',
 "BLAZING COINS",
 'bbHudAssets'
])if(!runtime.includes(marker))throw new Error(`Home scroll HUD: runtime missing ${marker}`);
if(/assets\/ui\/home\/reference\//i.test(runtime))throw new Error('Home scroll HUD: runtime references design-only reference assets');
if(/assets\/ui\/home\/reference\//i.test(html))throw new Error('Home scroll HUD: generated HTML references design-only reference assets');

const at=html.toLowerCase().lastIndexOf('</body>');
if(at<0)throw new Error('Home scroll HUD: closing body missing');
const tag=`<script id="${id}" src="runtime/ui/home/home-hud-scroll-runtime.js"></script>`;
html=html.slice(0,at)+tag+html.slice(at);
if((html.match(new RegExp(`id=["']${id}["']`,'g'))||[]).length!==1)throw new Error('Home scroll HUD: runtime injection was not unique');
await fs.writeFile(file,html);
console.log('Home scroll HUD PASS: approved profile, Blazing Coins, and Embers parchment assets own the final Home HUD layer.');
