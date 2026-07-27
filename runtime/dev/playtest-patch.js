(()=>{
  'use strict';
  if(window.__BB_DEV_PLAYTEST_PATCH__)return;
  window.__BB_DEV_PLAYTEST_PATCH__=true;

  const frame=document.getElementById('game');
  const boot=document.getElementById('boot');
  if(!frame||!boot)return;

  const BOMB_SCALE=2;
  const sourceOf=image=>String(image?.currentSrc||image?.src||'');
  const sourceSize=image=>[image?.naturalWidth||image?.videoWidth||image?.width||0,image?.naturalHeight||image?.videoHeight||image?.height||0];

  function looksLikeSenkuBomb(image){
    if(!image)return false;
    const src=sourceOf(image),[w,h]=sourceSize(image);
    if(src.includes('/senku/vfx/jutsu/'))return false;
    return (src.includes('/senku/')&&src.includes('bomb'))||src.includes('projectile_clean')||(w===96&&h===96);
  }

  function drawBombScaled(original,ctx,image,args){
    if(args.length===2){const [dx,dy]=args,[ow,oh]=sourceSize(image),nw=ow*BOMB_SCALE,nh=oh*BOMB_SCALE;return original.call(ctx,image,dx-(nw-ow)/2,dy-(nh-oh)/2,nw,nh);}
    if(args.length===4){const [dx,dy,dw,dh]=args,nw=dw*BOMB_SCALE,nh=dh*BOMB_SCALE;return original.call(ctx,image,dx-(nw-dw)/2,dy-(nh-dh)/2,nw,nh);}
    if(args.length===8){const [sx,sy,sw,sh,dx,dy,dw,dh]=args,nw=dw*BOMB_SCALE,nh=dh*BOMB_SCALE;return original.call(ctx,image,sx,sy,sw,sh,dx-(nw-dw)/2,dy-(nh-dh)/2,nw,nh);}
    return original.call(ctx,image,...args);
  }

  function wrapDrawImage(original){
    if(typeof original!=='function'||original.__bbBombOnlyPatch)return original;
    function patchedDrawImage(image,...args){
      if(looksLikeSenkuBomb(image))return drawBombScaled(original,this,image,args);
      return original.call(this,image,...args);
    }
    patchedDrawImage.__bbBombOnlyPatch=true;
    return patchedDrawImage;
  }

  function installBossStyle(doc){
    if(!doc.getElementById('bb-ornate-boss-style')){
      const style=doc.createElement('style');
      style.id='bb-ornate-boss-style';
      style.textContent=`.bb-ornate-boss-hp{position:relative!important;height:18px!important;min-height:18px!important;max-height:18px!important;margin-top:3px!important;overflow:visible!important;border:2px solid #a9772e!important;border-radius:5px!important;background:linear-gradient(180deg,#170708 0%,#090303 55%,#160607 100%)!important}.bb-ornate-boss-hp::before,.bb-ornate-boss-hp::after{content:'';position:absolute;z-index:8;top:50%;width:9px;height:9px;background:#2a130b;border:1px solid #c19443;transform:translateY(-50%) rotate(45deg)}.bb-ornate-boss-hp::before{left:-6px}.bb-ornate-boss-hp::after{right:-6px}.bb-ornate-boss-fill{height:10px!important;top:2px!important;background:linear-gradient(180deg,#ff3b3b 0%,#d51220 46%,#8e0712 100%)!important}.bb-ornate-boss-label{z-index:10!important;color:#f6cf55!important;font-size:13px!important}`;
      doc.head.appendChild(style);
    }
    const labels=[...doc.querySelectorAll('*')].filter(el=>el.children.length===0&&el.textContent.trim()==='BOSS');
    labels.forEach(label=>{
      label.classList.add('bb-ornate-boss-label');
      let bar=null;
      for(let el=label.parentElement;el&&el!==doc.body;el=el.parentElement){const r=el.getBoundingClientRect();if(r.width>250&&r.height>=12&&r.height<=55){bar=el;break;}}
      if(!bar)return;
      bar.classList.add('bb-ornate-boss-hp');
      const br=bar.getBoundingClientRect();let fill=null,best=0;
      [...bar.children].filter(el=>el!==label).forEach(el=>{const r=el.getBoundingClientRect(),score=r.width*r.height;if(r.width>20&&r.height>4&&r.height<=br.height+8&&score>best){best=score;fill=el;}});
      if(fill)fill.classList.add('bb-ornate-boss-fill');
    });
  }

  function installDevMonitor(doc){
    if(doc.getElementById('bb-dev-monitor-loader')||doc.getElementById('bb-dev-monitor'))return;
    const s=doc.createElement('script');s.id='bb-dev-monitor-loader';s.src='runtime/dev/dev-monitor.js?v=6ca0761';doc.head.appendChild(s);
  }

  function install(){
    try{
      const win=frame.contentWindow,doc=frame.contentDocument;if(!win||!doc)return;
      if(win.CanvasRenderingContext2D){const proto=win.CanvasRenderingContext2D.prototype;if(!proto.__bbBombOnlyPatch){proto.drawImage=wrapDrawImage(proto.drawImage);proto.__bbBombOnlyPatch=true;}}
      doc.querySelectorAll('canvas').forEach(c=>{try{const ctx=c.getContext('2d');if(ctx&&!ctx.__bbBombOnlyPatch){ctx.drawImage=wrapDrawImage(ctx.drawImage);ctx.__bbBombOnlyPatch=true;}}catch(_){}});
      installBossStyle(doc);installDevMonitor(doc);
      const pre=win.__BB_DEV_PREBOOT__;
      boot.textContent=pre?.directBattleMigration?'DEV READY • DIRECT BATTLE ROUTING • PLAYERS 200 • BOSS 50':'DEV READY • CHECKING ROUTING';
      setTimeout(()=>boot.style.opacity='0',2600);
    }catch(e){boot.textContent='DEV PATCH ACCESS ERROR';boot.style.opacity='1';}
  }

  frame.addEventListener('load',()=>{install();[30,80,150,300,600,1000,1600,2500,4000].forEach(ms=>setTimeout(install,ms));setInterval(install,1000);});
  setTimeout(()=>{if(boot.textContent==='DEV LOADING…')boot.textContent='DEV GAME LOAD FAILED';},10000);
})();