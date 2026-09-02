import fs from 'node:fs/promises';
import path from 'node:path';
const ROOT=process.cwd(),file=path.join(ROOT,'dist','index.html');
let html=await fs.readFile(file,'utf8');

// Tyler source sheets are intentionally lazy. Their pixel cleanup is battle-only work and
// must never compete with parsing/painting the home screen on startup. Keep preprocessing
// bounded as a second guard for the first time Tyler actually needs animation frames.
const tylerNative="const cell=document.createElement('canvas');cell.width=Math.round(sw);cell.height=Math.round(sh);const c=cell.getContext('2d',{willReadFrequently:true});c.drawImage(sheet,sx,sy,sw,sh,0,0,cell.width,cell.height);";
const tylerBounded="const cell=document.createElement('canvas');const prepScale=Math.min(1,256/sw,256/sh);cell.width=Math.max(1,Math.round(sw*prepScale));cell.height=Math.max(1,Math.round(sh*prepScale));const c=cell.getContext('2d',{willReadFrequently:true});c.drawImage(sheet,sx,sy,sw,sh,0,0,cell.width,cell.height);";
const nativeCount=html.split(tylerNative).length-1,boundedCount=html.split(tylerBounded).length-1;
if(nativeCount===1)html=html.replace(tylerNative,tylerBounded);
else if(!(nativeCount===0&&boundedCount===1))throw new Error(`Tyler startup preprocessing: expected one native canvas anchor, found source=${nativeCount}, target=${boundedCount}`);

// Source sheets contain editor frame-number badges in the upper-left corner of each cell.
// They are not character art, so erase that fixed corner before background/component cleanup.
const tylerPixels="const pixels=c.getImageData(0,0,cell.width,cell.height);edgeBackground(pixels);c.putImageData(pixels,0,0);";
const tylerPixelsClean="const pixels=c.getImageData(0,0,cell.width,cell.height);const badgeW=Math.max(12,Math.round(cell.width*.12)),badgeH=Math.max(12,Math.round(cell.height*.12));for(let by=0;by<badgeH;by++)for(let bx=0;bx<badgeW;bx++)pixels.data[(by*cell.width+bx)*4+3]=0;edgeBackground(pixels);c.putImageData(pixels,0,0);";
const pixelsCount=html.split(tylerPixels).length-1,pixelsCleanCount=html.split(tylerPixelsClean).length-1;
if(pixelsCount===1)html=html.replace(tylerPixels,tylerPixelsClean);
else if(!(pixelsCount===0&&pixelsCleanCount===1))throw new Error(`Tyler frame badge cleanup: expected one pixel anchor, found source=${pixelsCount}, target=${pixelsCleanCount}`);

const eagerStart="sheet.src=src;return state;";
const lazyStart="state.started=false;state.start=()=>{if(state.started)return;state.started=true;sheet.src=src};return state;";
const eagerStartCount=html.split(eagerStart).length-1,lazyStartCount=html.split(lazyStart).length-1;
if(eagerStartCount===1)html=html.replace(eagerStart,lazyStart);
else if(!(eagerStartCount===0&&lazyStartCount===1))throw new Error(`Tyler lazy startup: expected one sheet start anchor, found eager=${eagerStartCount}, lazy=${lazyStartCount}`);

const idleEager="function unitIdleFrames(name){if(name==='Tyler'&&TYLER_BODY_RUNTIME.idle.ready)return TYLER_BODY_RUNTIME.idle.frames;";
const idleLazy="function unitIdleFrames(name){if(name==='Tyler'){TYLER_BODY_RUNTIME.idle.start?.();if(TYLER_BODY_RUNTIME.idle.ready)return TYLER_BODY_RUNTIME.idle.frames;}";
const idleEagerCount=html.split(idleEager).length-1,idleLazyCount=html.split(idleLazy).length-1;
if(idleEagerCount===1)html=html.replace(idleEager,idleLazy);
else if(!(idleEagerCount===0&&idleLazyCount===1))throw new Error(`Tyler lazy idle hook: source=${idleEagerCount}, target=${idleLazyCount}`);

const attackEager="function unitAttackFrames(name,kind){if(name==='Tyler'&&TYLER_BODY_RUNTIME.basic.ready)return TYLER_BODY_RUNTIME.basic.frames;";
const attackLazy="function unitAttackFrames(name,kind){if(name==='Tyler'){TYLER_BODY_RUNTIME.basic.start?.();if(TYLER_BODY_RUNTIME.basic.ready)return TYLER_BODY_RUNTIME.basic.frames;}";
const attackEagerCount=html.split(attackEager).length-1,attackLazyCount=html.split(attackLazy).length-1;
if(attackEagerCount===1)html=html.replace(attackEager,attackLazy);
else if(!(attackEagerCount===0&&attackLazyCount===1))throw new Error(`Tyler lazy attack hook: source=${attackEagerCount}, target=${attackLazyCount}`);

if(html.includes('id="bb-loading-screen"'))throw new Error('Loading screen already present');
const css=`#bb-loading-screen{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#e8dfca;color:#392d22;font-family:system-ui,sans-serif;transition:opacity .3s ease,visibility .3s ease}#bb-loading-screen:before{content:"";position:absolute;inset:-6%;background:radial-gradient(circle at 50% 28%,#fff 0,#fff8e5 32%,#dce8e7 70%,#c2d3d7 100%);animation:bbLoadDrift 8s ease-in-out infinite alternate}#bb-loading-screen:after{content:"";position:absolute;inset:0;opacity:.14;background:repeating-linear-gradient(12deg,transparent 0 31px,rgba(91,77,58,.09) 32px 33px)}#bb-loading-screen.bb-ready{opacity:0;visibility:hidden;pointer-events:none}.bb-loading-card{position:relative;z-index:1;width:min(82vw,430px);padding:28px 24px 24px;text-align:center;border:1px solid rgba(112,82,48,.48);border-radius:22px;background:linear-gradient(180deg,rgba(255,250,233,.96),rgba(234,216,181,.94));box-shadow:0 20px 55px rgba(62,48,31,.18),inset 0 1px rgba(255,255,255,.9)}.bb-loading-logo{font-size:clamp(28px,7vw,46px);font-weight:900;font-style:italic;letter-spacing:.01em;text-shadow:0 2px rgba(255,255,255,.8)}.bb-loading-kicker{margin-top:5px;font-size:11px;letter-spacing:.25em;text-transform:uppercase;opacity:.62}.bb-loading-track{height:11px;margin:24px 2px 12px;border:1px solid rgba(75,72,62,.38);border-radius:999px;padding:2px;background:rgba(255,255,255,.55)}.bb-loading-fill{height:100%;width:7%;border-radius:999px;background:linear-gradient(90deg,#52c9e9,#5f83e8,#8b67df);transition:width .22s ease}.bb-loading-status{min-height:1.3em;font-size:13px;font-weight:700;letter-spacing:.04em;color:#594b3d}.bb-loading-note{margin-top:6px;font-size:10px;opacity:.58}.bb-loading-retry{display:none;margin:14px auto 0;padding:9px 16px;border:1px solid #6f583d;border-radius:999px;background:#fff8e7;color:#3d3024;font:700 12px system-ui,sans-serif}.bb-loading-screen.bb-stalled .bb-loading-retry{display:block}@keyframes bbLoadDrift{from{transform:scale(1.03) translateX(-1%)}to{transform:scale(1.07) translateX(1%)}}@media(prefers-reduced-motion:reduce){#bb-loading-screen:before{animation:none}.bb-loading-fill,#bb-loading-screen{transition:none}}`;
const shell=`<div id="bb-loading-screen" role="status" aria-live="polite"><div class="bb-loading-card"><div class="bb-loading-logo">Blazing Battle</div><div class="bb-loading-kicker">Shinobi Battle System</div><div class="bb-loading-track"><div class="bb-loading-fill" id="bb-loading-fill"></div></div><div class="bb-loading-status" id="bb-loading-status">Preparing the battlefield…</div><div class="bb-loading-note">Loading battle art and chakra systems</div><button class="bb-loading-retry" id="bb-loading-retry" type="button">Retry loading</button></div></div>`;
const runtime=`<script id="bb-loading-runtime">(()=>{const root=document.getElementById('bb-loading-screen'),fill=document.getElementById('bb-loading-fill'),status=document.getElementById('bb-loading-status'),retry=document.getElementById('bb-loading-retry');if(!root)return;const lines=['Preparing the battlefield…','Gathering chakra…','Summoning fighters…','Polishing kunai…','Almost ready…'];let p=7,done=false;const set=(n,msg)=>{p=Math.max(p,Math.min(100,n));if(fill)fill.style.width=p+'%';if(status&&msg)status.textContent=msg};const tick=setInterval(()=>{if(!done)set(Math.min(88,p+(p<55?7:3)),lines[Math.min(lines.length-1,Math.floor(p/22))])},260);const ready=()=>{if(done)return;done=true;clearInterval(tick);set(100,'Battle ready');setTimeout(()=>root.classList.add('bb-ready'),140);setTimeout(()=>root.remove(),700)};const canStart=()=>!!(document.getElementById('game')||document.querySelector('canvas')||document.getElementById('homeScreen')||document.querySelector('[data-screen="home"]'));if(document.readyState==='complete'){set(92,'Starting battle systems…');setTimeout(ready,120)}else window.addEventListener('load',()=>{set(92,'Starting battle systems…');let tries=0;const gate=setInterval(()=>{if(canStart()||++tries>12){clearInterval(gate);ready()}},80)},{once:true});setTimeout(()=>{if(!done){root.classList.add('bb-stalled');set(Math.max(p,90),'Taking longer than expected…')}},6500);retry?.addEventListener('click',()=>location.reload());})();<\/script>`;
const head=html.toLowerCase().lastIndexOf('</head>');if(head<0)throw new Error('Loading screen: closing head missing');html=html.slice(0,head)+`<style id="bb-loading-style">${css}</style>`+html.slice(head);
const body=html.search(/<body\b[^>]*>/i);if(body<0)throw new Error('Loading screen: body missing');const end=html.indexOf('>',body);html=html.slice(0,end+1)+shell+html.slice(end+1);
const close=html.toLowerCase().lastIndexOf('</body>');if(close<0)throw new Error('Loading screen: closing body missing');html=html.slice(0,close)+runtime+html.slice(close);
for(const marker of ['bb-loading-screen','bb-loading-runtime','Preparing the battlefield','Gathering chakra','Retry loading','const prepScale=Math.min(1,256/sw,256/sh)','const badgeW=Math.max(12,Math.round(cell.width*.12))','state.start=()=>{if(state.started)return','TYLER_BODY_RUNTIME.idle.start?.()','TYLER_BODY_RUNTIME.basic.start?.()'])if(!html.includes(marker))throw new Error(`Loading screen missing ${marker}`);
await fs.writeFile(file,html);console.log('Startup loading screen applied; Tyler sprite preprocessing is lazy, bounded to 256px, and strips source-sheet frame badges.');
