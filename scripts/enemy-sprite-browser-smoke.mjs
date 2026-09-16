import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const OUT='test-artifacts/enemy-sprite-audit.png';
const FRAME_WIDTH=543;
const FRAME_HEIGHT=724;
const FRAME_COUNT=4;
const UNITS=[
  ['road_rookie','Road Rookie'],
  ['rogue_kunoichi','Rogue Kunoichi'],
  ['masked_scout','Masked Scout'],
  ['blond_rookie','Blond Rookie'],
  ['purple_scarf_kunoichi','Purple Scarf Kunoichi'],
  ['mist_rogue','Mist Rogue']
];

await fs.mkdir('test-artifacts',{recursive:true});
let browser;
try{
  browser=await chromium.launch({headless:true,timeout:15000});
  const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
  page.setDefaultTimeout(20000);
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});

  const metrics=await page.evaluate(async({units,frameWidth,frameHeight,frameCount})=>{
    const toHex=buffer=>[...new Uint8Array(buffer)].map(value=>value.toString(16).padStart(2,'0')).join('');
    const loadImage=src=>new Promise((resolve,reject)=>{
      const img=new Image();
      img.decoding='sync';
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error(`Could not load ${src}`));
      img.src=src;
    });
    const digest=async src=>{
      const response=await fetch(src,{cache:'no-store'});
      if(!response.ok)throw new Error(`Could not fetch ${src}: HTTP ${response.status}`);
      return toHex(await crypto.subtle.digest('SHA-256',await response.arrayBuffer()));
    };
    const measure=(ctx)=>{
      const pixels=ctx.getImageData(0,0,frameWidth,frameHeight).data;
      let left=frameWidth,right=-1,top=frameHeight,bottom=-1,occupied=0;
      let hash=2166136261>>>0;
      for(let y=0;y<frameHeight;y+=2){
        const row=y*frameWidth*4;
        for(let x=0;x<frameWidth;x+=2){
          const i=row+x*4,a=pixels[i+3];
          if(a>18){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);occupied++;}
          if((x&6)===0&&(y&6)===0){
            hash=Math.imul(hash^pixels[i],16777619)>>>0;
            hash=Math.imul(hash^pixels[i+1],16777619)>>>0;
            hash=Math.imul(hash^pixels[i+2],16777619)>>>0;
            hash=Math.imul(hash^a,16777619)>>>0;
          }
        }
      }
      const valid=right>=left&&bottom>=top;
      return {
        left:valid?left:null,right:valid?right:null,top:valid?top:null,bottom:valid?bottom:null,
        width:valid?right-left+1:0,height:valid?bottom-top+1:0,
        centerX:valid?Number(((left+right)/2).toFixed(1)):null,
        coverage:Number((occupied/((Math.ceil(frameWidth/2))*(Math.ceil(frameHeight/2)))).toFixed(4)),
        sampleHash:hash.toString(16).padStart(8,'0')
      };
    };

    document.documentElement.innerHTML=`<head><style>
      *{box-sizing:border-box}body{margin:0;padding:24px;background:#171b20;color:#edf0f2;font:14px/1.35 system-ui,sans-serif}
      h1{margin:0 0 6px;font-size:25px}p{margin:0 0 20px;color:#adb7c0}.unit{margin:0 0 22px;padding:16px;border:1px solid #404850;border-radius:12px;background:#22282e}
      h2{margin:0 0 12px;font-size:19px}.anim{display:grid;grid-template-columns:88px repeat(4,1fr);gap:10px;align-items:start;margin-top:10px}.kind{padding-top:8px;font-weight:750;text-transform:uppercase;letter-spacing:.08em;color:#d4b46b}
      .frame{min-width:0;padding:7px;border:1px solid #4e5963;border-radius:8px;background:#d9d7d0;color:#171b20}.frame strong{display:block;margin-bottom:6px;font-size:12px}.frame small{display:block;margin-top:5px;font:10px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      canvas{display:block;width:100%;height:auto;aspect-ratio:543/724;border-radius:5px;background-color:#f1f0eb;background-image:linear-gradient(45deg,#d6d2ca 25%,transparent 25%),linear-gradient(-45deg,#d6d2ca 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d6d2ca 75%),linear-gradient(-45deg,transparent 75%,#d6d2ca 75%);background-size:18px 18px;background-position:0 0,0 9px,9px -9px,-9px 0}
      .known{color:#ffcd73;font-weight:700}
    </style></head><body><h1>Blazing Battle · Road Enemy Sprite Audit</h1><p>Raw source sheets, four frames each. <span class="known">Known contamination:</span> Rogue Kunoichi attack sheet is quarantined at runtime.</p><main id="root"></main></body>`;
    const root=document.getElementById('root');
    const output=[];

    for(const [id,displayName] of units){
      const section=document.createElement('section');section.className='unit';section.innerHTML=`<h2>${displayName} <small>(${id})</small></h2>`;root.append(section);
      for(const kind of ['idle','attack']){
        const src=`/assets/sprites/enemies/${id}/${id}_${kind}.png`;
        const [img,fileSha256]=await Promise.all([loadImage(src),digest(src)]);
        if(img.naturalWidth!==frameWidth*frameCount||img.naturalHeight!==frameHeight){
          throw new Error(`${id} ${kind} has ${img.naturalWidth}x${img.naturalHeight}; expected ${frameWidth*frameCount}x${frameHeight}`);
        }
        const row=document.createElement('div');row.className='anim';
        const kindLabel=document.createElement('div');kindLabel.className='kind';kindLabel.textContent=kind;row.append(kindLabel);section.append(row);
        const frames=[];
        for(let frame=0;frame<frameCount;frame++){
          const card=document.createElement('div');card.className='frame';
          const label=document.createElement('strong');label.textContent=`Frame ${frame}`;card.append(label);
          const canvas=document.createElement('canvas');canvas.width=frameWidth;canvas.height=frameHeight;
          const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,frameWidth,frameHeight);ctx.drawImage(img,frame*frameWidth,0,frameWidth,frameHeight,0,0,frameWidth,frameHeight);card.append(canvas);
          const frameMetric=measure(ctx);frames.push({frame,...frameMetric});
          const detail=document.createElement('small');detail.textContent=`bbox ${frameMetric.width}×${frameMetric.height} · cx ${frameMetric.centerX} · α ${frameMetric.coverage} · ${frameMetric.sampleHash}`;card.append(detail);row.append(card);
        }
        output.push({id,displayName,kind,src,fileSha256,frames});
      }
    }
    return output;
  },{units:UNITS,frameWidth:FRAME_WIDTH,frameHeight:FRAME_HEIGHT,frameCount:FRAME_COUNT});

  const duplicates=[];
  for(let a=0;a<metrics.length;a++)for(let b=a+1;b<metrics.length;b++){
    if(metrics[a].fileSha256===metrics[b].fileSha256)duplicates.push([`${metrics[a].id}:${metrics[a].kind}`,`${metrics[b].id}:${metrics[b].kind}`,metrics[a].fileSha256]);
  }
  const expectedPair=new Set(['rogue_kunoichi:attack','purple_scarf_kunoichi:idle']);
  const unexpected=duplicates.filter(([left,right])=>!(expectedPair.has(left)&&expectedPair.has(right)));
  if(unexpected.length)throw new Error(`Unexpected duplicate enemy sheets: ${JSON.stringify(unexpected)}`);

  const emptyFrames=metrics.flatMap(sheet=>sheet.frames.filter(frame=>!frame.width||!frame.height).map(frame=>`${sheet.id}:${sheet.kind}:${frame.frame}`));
  if(emptyFrames.length)throw new Error(`Enemy sprite sheet contains empty frame(s): ${emptyFrames.join(', ')}`);

  await page.screenshot({path:OUT,fullPage:true,animations:'disabled'});
  console.log(`Enemy sprite audit metrics: ${JSON.stringify(metrics)}`);
  console.log(`Enemy sprite duplicate audit: ${JSON.stringify(duplicates)}`);
  console.log(`Enemy sprite visual audit PASS: ${metrics.length*FRAME_COUNT} raw frames rendered to ${OUT}; only known Rogue-attack/Purple-idle duplicate detected.`);
} finally {
  if(browser)await browser.close();
}
