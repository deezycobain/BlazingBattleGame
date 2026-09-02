import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const DIST=path.join(ROOT,'dist');
const indexPath=path.join(DIST,'index.html');
const gamePath=path.join(DIST,'game.html');
let gameHtml=await fs.readFile(indexPath,'utf8');

const telemetryBootstrap=`<script id="bb-runtime-telemetry">(()=>{const events=Array.isArray(window.__BB_DIAGNOSTICS__)?window.__BB_DIAGNOSTICS__:[];const now=()=>new Date().toISOString();const endpoint=()=>{try{return localStorage.getItem('bb.telemetryEndpoint')||''}catch{return ''}};const persist=()=>{try{localStorage.setItem('bb.lastDiagnostics',JSON.stringify(events.slice(-40)))}catch{}};const send=event=>{try{if(window.Sentry?.captureMessage){if(event.kind==='error'&&window.Sentry.captureException)window.Sentry.captureException(new Error(event.message||event.name||'Blazing Battle error'),{extra:event});else window.Sentry.captureMessage(event.name||event.kind,{extra:event});}const url=endpoint();if(url)fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event),keepalive:true}).catch(()=>{});}catch{}};const record=(kind,name,data={})=>{const event={kind,name,at:now(),href:location.href,ua:navigator.userAgent,...data};events.push(event);window.__BB_DIAGNOSTICS__=events;persist();send(event);try{console.info('[BB]',name,data)}catch{};return event};window.__BB_DIAGNOSTICS__=events;window.BBTelemetry=Object.freeze({checkpoint:(name,data)=>record('checkpoint',name,data),error:(name,error,data={})=>record('error',name,{message:String(error?.message||error||name),stack:String(error?.stack||''),...data}),events});record('checkpoint','RUNTIME_STARTED');addEventListener('error',e=>window.BBTelemetry.error('WINDOW_ERROR',e.error||e.message,{source:e.filename,line:e.lineno,column:e.colno}));addEventListener('unhandledrejection',e=>window.BBTelemetry.error('UNHANDLED_REJECTION',e.reason));let tries=0;const ready=setInterval(()=>{tries++;const meta=!!window.BB_BUILD_META,canvas=!!document.querySelector('canvas'),home=!!document.querySelector('.bb-home-theme,#homeScreen,[data-screen="home"]');if(meta&&(canvas||home)){clearInterval(ready);window.BBTelemetry.checkpoint('HOME_READY',{canvas,home});}else if(tries>=80){clearInterval(ready);window.BBTelemetry.error('HOME_READY_TIMEOUT','Home screen did not become ready',{meta,canvas,home});}},250);})();<\/script>`;
if(!/<head\b[^>]*>/i.test(gameHtml))throw new Error('Boot shell: game document head missing');
gameHtml=gameHtml.replace(/<head\b([^>]*)>/i,`<head$1>${telemetryBootstrap}`);
await fs.writeFile(gamePath,gameHtml);

const shell=`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>Blazing Battle</title>
<style>
html,body{margin:0;width:100%;height:100%;background:#efe5ce;color:#3b2d20;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
#boot{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:radial-gradient(circle at 50% 28%,rgba(255,255,255,.92),rgba(255,255,255,.18) 38%,transparent 58%),linear-gradient(180deg,#f4ead2,#dcc49d)}
.card{width:min(420px,88vw);padding:26px 22px 22px;border:1px solid rgba(105,77,43,.35);border-radius:18px;background:rgba(255,249,235,.9);box-shadow:0 18px 44px rgba(69,48,28,.16);text-align:center}
.logo{font-size:32px;font-weight:900;font-style:italic;letter-spacing:.02em}.sub{margin-top:6px;font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;opacity:.68}
.track{height:10px;margin-top:22px;border-radius:999px;background:rgba(91,65,39,.12);overflow:hidden}.bar{height:100%;width:10%;border-radius:inherit;background:#7b5a32;transition:width .22s ease}.msg{margin-top:10px;font-size:12px;font-weight:700;opacity:.72}.detail{margin-top:7px;font-size:10px;line-height:1.35;opacity:.56;word-break:break-word}.error{margin-top:12px;font-size:12px;line-height:1.4;color:#7a2d23}.retry{display:none;margin:14px auto 0;padding:10px 14px;border:1px solid #745535;border-radius:10px;background:#efd4a0;color:#3d2c1c;font-weight:800}
</style>
</head>
<body>
<div id="boot"><div class="card"><div class="logo">Blazing Battle</div><div class="sub">Shinobi Battle System</div><div class="track"><div id="bar" class="bar"></div></div><div id="msg" class="msg">Opening the battlefield…</div><div id="detail" class="detail"></div><div id="err" class="error"></div><button id="retry" class="retry">Retry</button></div></div>
<script>
(()=>{
 const bar=document.getElementById('bar'),msg=document.getElementById('msg'),detail=document.getElementById('detail'),err=document.getElementById('err'),retry=document.getElementById('retry');
 const events=[];let timer=null,controller=null;
 const record=(name,data={})=>{const event={kind:'checkpoint',name,at:new Date().toISOString(),href:location.href,ua:navigator.userAgent,...data};events.push(event);window.__BB_DIAGNOSTICS__=events;try{localStorage.setItem('bb.lastDiagnostics',JSON.stringify(events.slice(-40)))}catch{};try{console.info('[BB]',name,data)}catch{};return event};
 const fail=(name,e,data={})=>{const event={kind:'error',name,at:new Date().toISOString(),message:String(e?.message||e||name),stack:String(e?.stack||''),href:location.href,ua:navigator.userAgent,...data};events.push(event);window.__BB_DIAGNOSTICS__=events;try{localStorage.setItem('bb.lastDiagnostics',JSON.stringify(events.slice(-40)))}catch{};try{console.error('[BB]',name,event)}catch{};return event};
 const set=(pct,text,extra='')=>{bar.style.width=pct+'%';if(text)msg.textContent=text;detail.textContent=extra};
 record('BOOT_SHELL');
 async function boot(){
  if(controller)controller.abort();controller=new AbortController();
  retry.style.display='none';err.textContent='';set(18,'Loading game shell…','Starting game.html request');record('GAME_FETCH_STARTED');
  timer=setTimeout(()=>{set(26,'Still loading game files…','The boot shell is alive; the game document is taking longer than expected.');retry.style.display='inline-block'},7000);
  const hardTimeout=setTimeout(()=>controller.abort(new Error('Game document timed out after 25 seconds')),25000);
  try{
   const started=performance.now();
   const res=await fetch('game.html?boot=1',{cache:'no-store',signal:controller.signal});
   record('GAME_FETCH_HEADERS',{status:res.status,contentLength:res.headers.get('content-length')||''});
   if(!res.ok)throw new Error('Game shell request failed ('+res.status+')');
   set(58,'Downloading battlefield…','Response received; reading the game document');
   const text=await res.text();
   if(text.length<10000)throw new Error('Game shell response was incomplete');
   record('GAME_FETCH_COMPLETE',{bytes:text.length,ms:Math.round(performance.now()-started)});
   set(96,'Entering battle…',Math.round(text.length/1024)+' KiB game document ready');
   clearTimeout(timer);clearTimeout(hardTimeout);
   document.open();document.write(text);document.close();
  }catch(e){
   clearTimeout(timer);clearTimeout(hardTimeout);fail('GAME_FETCH_FAILED',e);set(12,'Could not start the game','Checkpoint: GAME_FETCH_FAILED');err.textContent=String(e&&e.message||e);retry.style.display='inline-block';
  }
 }
 retry.addEventListener('click',boot);
 addEventListener('error',e=>fail('BOOT_WINDOW_ERROR',e.error||e.message));
 addEventListener('unhandledrejection',e=>fail('BOOT_UNHANDLED_REJECTION',e.reason));
 requestAnimationFrame(()=>requestAnimationFrame(boot));
})();
</script>
</body>
</html>`;
await fs.writeFile(indexPath,shell);
const shellBytes=Buffer.byteLength(shell),gameBytes=Buffer.byteLength(gameHtml);
if(shellBytes>32768)throw new Error(`Boot shell unexpectedly large: ${shellBytes} bytes`);
if(gameBytes<100000)throw new Error(`Game document unexpectedly small: ${gameBytes} bytes`);
console.log(`Boot shell PASS: index ${(shellBytes/1024).toFixed(1)} KiB; game document ${(gameBytes/1024).toFixed(1)} KiB moved to game.html with runtime telemetry.`);
