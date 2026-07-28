import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const indexPath=path.join(ROOT,'index.html');
const original=await fs.readFile(indexPath,'utf8');
let html=original;
const report={status:'started'};

const scriptTags=`<script src="runtime/animation/frame-runtime.js"></script>\n<script src="runtime/rendering/vfx-renderer.js"></script>\n`;

const requireTrue=(condition,message)=>{if(!condition)throw new Error(message)};

async function framePaths(dir){
  const full=path.join(ROOT,dir);
  const names=(await fs.readdir(full)).filter(name=>/\.(png|jpe?g|webp)$/i.test(name)).sort();
  requireTrue(names.length>0,`No runtime frames found in ${dir}`);
  return names.map(name=>path.posix.join(dir,name));
}

function replaceSingleImage(symbol,assetPath){
  const escaped=symbol.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const rx=new RegExp(`(${escaped}\\.src\\s*=\\s*)(["'])(data:image\\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)\\2`);
  const m=html.match(rx);
  requireTrue(m,`${symbol} embedded image declaration not found`);
  html=html.replace(rx,(_all,prefix)=>`${prefix}'${assetPath}'`);
}

function replaceFrameList(symbol,paths){
  const escaped=symbol.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const rx=new RegExp(`const\\s+${escaped}\\s*=\\s*makeImageFrames\\(\\[[\\s\\S]*?\\]\\)\\s*;`);
  requireTrue(rx.test(html),`${symbol} embedded frame list not found`);
  html=html.replace(rx,`const ${symbol}=makeImageFrames(${JSON.stringify(paths)});`);
}

function declarationSlice(symbol){
  const start=html.indexOf(`const ${symbol}=makeImageFrames(`);
  requireTrue(start>=0,`${symbol} migrated declaration missing`);
  const end=html.indexOf(');',start);
  requireTrue(end>start,`${symbol} migrated declaration boundary missing`);
  return html.slice(start,end+2);
}

function replaceSubzeroFreezeFrames(paths){
  const attackStart=html.indexOf('const ATTACK_SPRITES={');
  requireTrue(attackStart>=0,'ATTACK_SPRITES declaration not found');
  const subzeroAt=html.indexOf("'Sub-Zero':{",attackStart);
  requireTrue(subzeroAt>=attackStart,"Sub-Zero ATTACK_SPRITES entry not found");
  const freezeAt=html.indexOf('freeze:makeImageFrames(',subzeroAt);
  requireTrue(freezeAt>subzeroAt && freezeAt-subzeroAt<5000000,'Sub-Zero freeze frame list not found in ATTACK_SPRITES');
  const arrayStart=html.indexOf('[',freezeAt);
  const arrayEnd=html.indexOf('])',arrayStart);
  requireTrue(arrayStart>freezeAt&&arrayEnd>arrayStart,'Sub-Zero freeze frame array boundary not found');
  html=html.slice(0,arrayStart)+JSON.stringify(paths)+html.slice(arrayEnd+1);
}

function findMatchingBrace(source,openIndex){
  let depth=0,quote=null,escape=false,lineComment=false,blockComment=false;
  for(let i=openIndex;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(lineComment){if(ch==='\n')lineComment=false;continue}
    if(blockComment){if(ch==='*'&&next==='/'){blockComment=false;i++}continue}
    if(quote){
      if(escape){escape=false;continue}
      if(ch==='\\'){escape=true;continue}
      if(ch===quote){quote=null;continue}
      continue;
    }
    if(ch==='/'&&next==='/'){lineComment=true;i++;continue}
    if(ch==='/'&&next==='*'){blockComment=true;i++;continue}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue}
    if(ch==='{')depth++;
    else if(ch==='}'){
      depth--;
      if(depth===0)return i;
    }
  }
  return -1;
}

function replaceFloaterBranch(kind,body){
  const marker=`else if(f.kind==='${kind}'){`;
  const start=html.indexOf(marker);
  requireTrue(start>=0,`Floater renderer branch ${kind} not found`);
  const open=start+marker.length-1;
  const close=findMatchingBrace(html,open);
  requireTrue(close>open,`Floater renderer branch ${kind} boundary not found`);
  html=html.slice(0,open+1)+body+html.slice(close);
}

try{
  const starPath='assets/characters/lebee/vfx/basic/star_blast/projectile/frame_01.png';
  const meteorPaths=await framePaths('assets/characters/lebee/vfx/jutsu/meteor/meteor');
  const impactPaths=await framePaths('assets/characters/lebee/vfx/jutsu/meteor/impact');
  const finalePaths=await framePaths('assets/characters/lebee/vfx/jutsu/meteor/finale');
  const aftermathPaths=await framePaths('assets/characters/lebee/vfx/jutsu/meteor/aftermath');
  const freezeCastPaths=await framePaths('assets/characters/subzero/sprites/runtime/jutsu/freeze_blast/cast');

  requireTrue(meteorPaths.length===3,'Lebee meteor extraction must contain 3 meteor frames');
  requireTrue(impactPaths.length===3,'Lebee meteor extraction must contain 3 impact frames');
  requireTrue(finalePaths.length===1,'Lebee meteor finale must contain 1 frame');
  requireTrue(aftermathPaths.length===1,'Lebee meteor aftermath must contain 1 frame');
  requireTrue(freezeCastPaths.length===4,'Sub-Zero Freeze Blast cast must contain 4 frames');

  if(!html.includes('runtime/animation/frame-runtime.js')){
    const headEnd=html.indexOf('</head>');
    requireTrue(headEnd>=0,'</head> anchor not found');
    html=html.slice(0,headEnd)+scriptTags+html.slice(headEnd);
  }

  const frameHelper=/function makeImageFrames\(list\)\{\s*return \(list\|\|\[\]\)\.map\(src=>\{\s*const img=new Image\(\);\s*img\.src=src;\s*return img;\s*\}\);\s*\}/;
  requireTrue(frameHelper.test(html),'makeImageFrames helper anchor not found');
  html=html.replace(frameHelper,"function makeImageFrames(list){return window.BlazingFrameRuntime.loadFrames(list);}");

  replaceSingleImage('LEBEE_STAR_PROJECTILE',starPath);
  replaceFrameList('LEBEE_METEOR_FRAMES',meteorPaths);
  replaceFrameList('LEBEE_METEOR_IMPACT_FRAMES',impactPaths);
  replaceSingleImage('LEBEE_METEOR_IMPACT_COMBO',finalePaths[0]);
  replaceSingleImage('LEBEE_METEOR_AFTERMATH',aftermathPaths[0]);
  replaceSubzeroFreezeFrames(freezeCastPaths);

  replaceFloaterBranch('lebeeStarProjectile',"window.BlazingVfxRenderer.drawLebeeStarProjectile(ctx,f,LEBEE_STAR_PROJECTILE);");
  for(const kind of ['lebeeMeteor','lebeeMeteorImpact','lebeeMeteorFinale','lebeeMeteorAftermath']){
    replaceFloaterBranch(kind,"window.BlazingVfxRenderer.drawLebeeMeteor(ctx,f,{meteorFrames:LEBEE_METEOR_FRAMES,impactFrames:LEBEE_METEOR_IMPACT_FRAMES,finale:LEBEE_METEOR_IMPACT_COMBO,aftermath:LEBEE_METEOR_AFTERMATH});");
  }
  replaceFloaterBranch('iceProjectile',"window.BlazingVfxRenderer.drawSubzeroFreezeProjectile(ctx,f,FREEZE_PROJECTILE_FRAMES);");

  requireTrue(!/LEBEE_STAR_PROJECTILE\.src\s*=\s*["']data:image/.test(html),'Lebee Star Blast remains embedded');
  requireTrue(!declarationSlice('LEBEE_METEOR_FRAMES').includes('data:image'),'Lebee meteor frames remain embedded');
  requireTrue(!declarationSlice('LEBEE_METEOR_IMPACT_FRAMES').includes('data:image'),'Lebee meteor impact frames remain embedded');
  requireTrue(html.includes('window.BlazingFrameRuntime.loadFrames'),'frame runtime delegation missing');
  requireTrue(html.includes('window.BlazingVfxRenderer.drawLebeeMeteor'),'Lebee VFX runtime delegation missing');
  requireTrue(html.includes('window.BlazingVfxRenderer.drawSubzeroFreezeProjectile'),'Sub-Zero VFX runtime delegation missing');

  await fs.writeFile(indexPath,html);
  report.status='success';
  report.before_bytes=Buffer.byteLength(original);
  report.after_bytes=Buffer.byteLength(html);
  report.removed_bytes=report.before_bytes-report.after_bytes;
  report.extracted={star:1,meteor:meteorPaths.length,meteorImpact:impactPaths.length,finale:1,aftermath:1,subzeroFreezeCast:freezeCastPaths.length};
  report.delegated_floaters=['lebeeStarProjectile','lebeeMeteor','lebeeMeteorImpact','lebeeMeteorFinale','lebeeMeteorAftermath','iceProjectile'];
}catch(error){
  report.status='failed';
  report.error=error instanceof Error?error.message:String(error);
}
await fs.mkdir(path.join(ROOT,'dev-tools'),{recursive:true});
await fs.writeFile(path.join(ROOT,'dev-tools/pass2-migration-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.status!=='success')process.exitCode=1;
