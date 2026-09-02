import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const DIST=path.join(ROOT,'dist');
const indexPath=path.join(DIST,'index.html');
const gamePath=path.join(DIST,'game.html');
const gameHtml=await fs.readFile(indexPath,'utf8');
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
.track{height:10px;margin-top:22px;border-radius:999px;background:rgba(91,65,39,.12);overflow:hidden}.bar{height:100%;width:10%;border-radius:inherit;background:#7b5a32;transition:width .22s ease}.msg{margin-top:10px;font-size:12px;font-weight:700;opacity:.72}.error{margin-top:12px;font-size:12px;line-height:1.4;color:#7a2d23}.retry{display:none;margin:14px auto 0;padding:10px 14px;border:1px solid #745535;border-radius:10px;background:#efd4a0;color:#3d2c1c;font-weight:800}
</style>
</head>
<body>
<div id="boot"><div class="card"><div class="logo">Blazing Battle</div><div class="sub">Shinobi Battle System</div><div class="track"><div id="bar" class="bar"></div></div><div id="msg" class="msg">Opening the battlefield…</div><div id="err" class="error"></div><button id="retry" class="retry">Retry</button></div></div>
<script>
(()=>{
 const bar=document.getElementById('bar'),msg=document.getElementById('msg'),err=document.getElementById('err'),retry=document.getElementById('retry');
 let timer=null;
 const set=(pct,text)=>{bar.style.width=pct+'%';if(text)msg.textContent=text};
 async function boot(){
  retry.style.display='none';err.textContent='';set(18,'Loading game shell…');
  timer=setTimeout(()=>{msg.textContent='Still loading game files…';retry.style.display='inline-block'},7000);
  try{
   const res=await fetch('game.html?boot=1',{cache:'no-store'});
   if(!res.ok)throw new Error('Game shell request failed ('+res.status+')');
   set(72,'Preparing fighters…');
   const text=await res.text();
   if(text.length<10000)throw new Error('Game shell response was incomplete');
   set(96,'Entering battle…');
   clearTimeout(timer);
   document.open();document.write(text);document.close();
  }catch(e){
   clearTimeout(timer);set(12,'Could not start the game');err.textContent=String(e&&e.message||e);retry.style.display='inline-block';
  }
 }
 retry.addEventListener('click',boot);
 requestAnimationFrame(()=>requestAnimationFrame(boot));
})();
</script>
</body>
</html>`;
await fs.writeFile(indexPath,shell);
const shellBytes=Buffer.byteLength(shell),gameBytes=Buffer.byteLength(gameHtml);
if(shellBytes>32768)throw new Error(`Boot shell unexpectedly large: ${shellBytes} bytes`);
if(gameBytes<100000)throw new Error(`Game document unexpectedly small: ${gameBytes} bytes`);
console.log(`Boot shell PASS: index ${(shellBytes/1024).toFixed(1)} KiB; game document ${(gameBytes/1024).toFixed(1)} KiB moved to game.html.`);
