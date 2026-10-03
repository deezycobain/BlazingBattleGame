(()=>{
  'use strict';

  const LAB_ID='bb-rig-lab';
  const SOURCE_W=512,SOURCE_H=768,FEET_Y=700;
  let open=false,character='Scorpion',gain=1,recoilStart=0,raf=0;

  const visible=element=>{
    if(!element)return false;
    const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
    return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0;
  };
  const button=(label,action,{pressed=false}={})=>{
    const el=document.createElement('button');
    el.type='button';el.textContent=label;el.className='bb-rig-lab-control';
    el.setAttribute('aria-pressed',String(pressed));el.addEventListener('click',action);
    return el;
  };
  const makeCanvas=label=>{
    const wrap=document.createElement('section');wrap.className='bb-rig-lab-card';
    const title=document.createElement('div');title.className='bb-rig-lab-card-title';title.textContent=label;
    const canvas=document.createElement('canvas');canvas.width=SOURCE_W;canvas.height=SOURCE_H;canvas.className='bb-rig-lab-canvas';
    wrap.append(title,canvas);return {wrap,canvas,ctx:canvas.getContext('2d',{alpha:true})};
  };
  const imageFor=src=>new Promise((resolve,reject)=>{
    const image=new Image();image.decoding='async';
    image.addEventListener('load',()=>resolve(image),{once:true});
    image.addEventListener('error',()=>reject(new Error('Rig Lab source failed: '+src)),{once:true});
    image.src=src;
  });
  const drawGuide=(ctx,label)=>{
    const y=FEET_Y/SOURCE_H*SOURCE_H;
    ctx.save();ctx.setLineDash([10,8]);ctx.lineWidth=3;ctx.strokeStyle='rgba(122,244,255,.94)';ctx.beginPath();ctx.moveTo(18,y);ctx.lineTo(SOURCE_W-18,y);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(6,14,23,.86)';ctx.fillRect(20,y-30,170,26);ctx.fillStyle='#aaf8ff';ctx.font='700 15px system-ui';ctx.fillText(label,29,y-12);ctx.restore();
  };
  const scaledPose=(pose,multiplier)=>Object.fromEntries(Object.entries(pose||{}).map(([name,pin])=>[name,{x:(Number(pin?.x)||0)*multiplier,y:(Number(pin?.y)||0)*multiplier}]));
  const drawRaw=(ctx,image)=>{ctx.clearRect(0,0,SOURCE_W,SOURCE_H);ctx.drawImage(image,0,0,SOURCE_W,SOURCE_H);drawGuide(ctx,'FEET BASELINE · y=700');};
  const drawRig=(ctx,rig,profile,image,clip,elapsedMs)=>{
    ctx.clearRect(0,0,SOURCE_W,SOURCE_H);
    const pose=scaledPose(rig.samplePins(profile,clip,elapsedMs),gain);
    rig.drawMesh(ctx,image,{x:0,y:0,w:SOURCE_W,h:SOURCE_H,profile,pose});
    drawGuide(ctx,'FEET BASELINE · y=700');
  };
  function mount(){
    if(document.getElementById(LAB_ID))return;
    const style=document.createElement('style');style.id='bb-rig-lab-style';style.textContent=`
      #bb-rig-lab-launch{position:fixed;z-index:9000;right:14px;top:max(12px,env(safe-area-inset-top));border:1px solid #8cecff;border-radius:999px;background:#071729;color:#dffcff;padding:10px 14px;font:800 12px/1 system-ui;letter-spacing:.11em;box-shadow:0 7px 24px #0009;cursor:pointer}
      #${LAB_ID}{position:fixed;z-index:9100;inset:0;display:none;overflow:auto;background:radial-gradient(circle at 50% 0,#173854 0,#07111f 48%,#02070e 100%);color:#eefbff;font-family:system-ui,sans-serif}
      #${LAB_ID}.bb-rig-lab-open{display:block}.bb-rig-lab-shell{width:min(1180px,100%);min-height:100%;margin:auto;padding:28px 24px 42px;box-sizing:border-box}.bb-rig-lab-top{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;margin-bottom:22px}.bb-rig-lab-kicker{margin:0 0 6px;color:#77eaff;font-size:11px;font-weight:800;letter-spacing:.18em}.bb-rig-lab-title{margin:0;font-size:clamp(28px,5vw,52px);line-height:.95;letter-spacing:-.045em}.bb-rig-lab-copy{max-width:660px;margin:13px 0 0;color:#b6cddd;line-height:1.5}.bb-rig-lab-close,.bb-rig-lab-control{border:1px solid #4c7895;border-radius:9px;background:#102740;color:#e5f8ff;padding:10px 13px;font:800 12px/1 system-ui;letter-spacing:.06em;cursor:pointer}.bb-rig-lab-close{background:#d7f7ff;color:#062033;border-color:#d7f7ff}.bb-rig-lab-controls{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 19px}.bb-rig-lab-control[aria-pressed=true]{background:#64d9ef;color:#062033;border-color:#9cf3ff}.bb-rig-lab-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.bb-rig-lab-card{min-width:0;background:linear-gradient(160deg,#112b43,#081523);border:1px solid #315872;border-radius:16px;overflow:hidden;box-shadow:0 16px 50px #0006}.bb-rig-lab-card-title{padding:11px 14px;color:#d6effb;font-size:12px;font-weight:800;letter-spacing:.12em}.bb-rig-lab-canvas{display:block;width:100%;height:auto;background:repeating-conic-gradient(#152f46 0 25%,#0d2133 0 50%) 50%/30px 30px}.bb-rig-lab-note{margin:17px 0 0;color:#93b7ca;font-size:13px;line-height:1.5}.bb-rig-lab-stat{color:#a6f3ff;font-weight:800}@media(max-width:680px){.bb-rig-lab-shell{padding:19px 14px 30px}.bb-rig-lab-top{gap:10px}.bb-rig-lab-grid{grid-template-columns:1fr}.bb-rig-lab-close{padding:9px}.bb-rig-lab-title{font-size:37px}}
    `;document.head.append(style);
    const launch=button('RIG LAB',()=>setOpen(true));launch.id='bb-rig-lab-launch';launch.setAttribute('aria-label','Open Rig Lab comparison');document.body.append(launch);
    const root=document.createElement('main');root.id=LAB_ID;root.setAttribute('aria-hidden','true');
    const shell=document.createElement('div');shell.className='bb-rig-lab-shell';
    const top=document.createElement('div');top.className='bb-rig-lab-top';
    const heading=document.createElement('div');heading.innerHTML='<p class="bb-rig-lab-kicker">ANIMATION REVIEW TOOL · PREVIEW ONLY</p><h1 class="bb-rig-lab-title">Rig Lab</h1><p class="bb-rig-lab-copy">Compare the exact authored source frame with the Canvas control-point mesh. The cyan line is the canonical feet baseline; it must not move.</p>';
    top.append(heading,button('CLOSE',()=>setOpen(false)));shell.append(top);
    const controls=document.createElement('div');controls.className='bb-rig-lab-controls';
    const rawCard=makeCanvas('AUTHORED FRAME · NO DEFORMATION'),rigCard=makeCanvas('RIG DEFORMATION · PRODUCTION 1×');
    const grid=document.createElement('div');grid.className='bb-rig-lab-grid';grid.append(rawCard.wrap,rigCard.wrap);
    const note=document.createElement('p');note.className='bb-rig-lab-note';note.innerHTML='Rig V1 is intentionally subtle at production gain. Use <span class="bb-rig-lab-stat">INSPECT 3×</span> only to examine the deformation shape; it does not change gameplay or combat rendering.';
    shell.append(controls,grid,note);root.append(shell);document.body.append(root);
    const select=next=>{character=next;recoilStart=0;refreshControls()};
    const toggleGain=()=>{gain=gain===1?3:1;refreshControls()};
    const trigger=()=>{recoilStart=performance.now();refreshControls()};
    const refreshControls=()=>{
      controls.replaceChildren(
        button('SCORPION',()=>select('Scorpion'),{pressed:character==='Scorpion'}),
        button('MASHLE',()=>select('Mashle'),{pressed:character==='Mashle'}),
        button(gain===1?'INSPECT 3×':'PRODUCTION 1×',toggleGain,{pressed:gain!==1}),
        button('TRIGGER RECOIL',trigger)
      );
      rigCard.wrap.querySelector('.bb-rig-lab-card-title').textContent=`RIG DEFORMATION · ${gain===1?'PRODUCTION 1×':'INSPECT 3×'}`;
    };
    let cache={};
    const frame=async now=>{
      if(open){
        const rig=window.BlazingRigRuntime,profile=rig?.profile?.(character);
        if(profile){
          const recoil=recoilStart&&now-recoilStart<520,clip=recoil?'recoil':'idle',source=profile.sources?.[clip];
          if(source){
            if(!cache[source])cache[source]=imageFor(source).catch(()=>null);
            const image=await cache[source];
            if(image){drawRaw(rawCard.ctx,image);drawRig(rigCard.ctx,rig,profile,image,clip,recoil?now-recoilStart:now);rawCard.wrap.querySelector('.bb-rig-lab-card-title').textContent=`AUTHORED ${recoil?'RECOIL':'IDLE'} FRAME · NO DEFORMATION`;}
          }
        }
      }
      raf=requestAnimationFrame(frame);
    };
    const setOpen=next=>{open=next;root.classList.toggle('bb-rig-lab-open',next);root.setAttribute('aria-hidden',String(!next));launch.hidden=next;if(next)refreshControls()};
    window.addEventListener('keydown',event=>{if(event.key==='Escape'&&open)setOpen(false)});
    const home=document.getElementById('bbHomeApproved');setInterval(()=>{if(!open)launch.hidden=!visible(home)},350);
    refreshControls();raf=requestAnimationFrame(frame);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
