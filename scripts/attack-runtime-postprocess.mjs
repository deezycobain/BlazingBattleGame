import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

const scriptTag='<script src="/runtime/combat/attack-runtime.js"></script>';
if(!html.includes(scriptTag)){
  if(!/<\/head>/i.test(html))throw new Error('Attack runtime pass: </head> anchor missing');
  html=html.replace(/<\/head>/i,`${scriptTag}</head>`);
}

const adapter=`function runCanonicalBasicPresentation(unitName,from,enemy,meleeTo,onImpact,onDone,_legacyAttackKind){
 const runtime=window.BB_ATTACK_RUNTIME;
 if(!runtime?.basicPresentation)throw new Error('Canonical attack runtime is unavailable');
 const profile=runtime.basicPresentation(unitName,from,enemy);
 const kind=profile.animation_kind||'punch';
 if(profile.driver==='lebee_star')return animateLebeeStarBlast(unitName,from,enemy,onImpact,onDone,kind);
 if(profile.driver==='senku_bomb')return animateSenkuBomb(unitName,from,enemy,onImpact,onDone,kind);
 return animateLunge(unitName,from,meleeTo,onImpact,onDone,kind);
}

`;
const resolveAnchor='function resolvePlayer(){';
const resolveAt=html.indexOf(resolveAnchor);
if(resolveAt<0)throw new Error('Attack runtime pass: resolvePlayer anchor missing');
if(!html.includes('function runCanonicalBasicPresentation(')){
  html=html.slice(0,resolveAt)+adapter+html.slice(resolveAt);
}

const legacyBasic=`const runBasicAttack=(au.name==='Lebee')?animateLebeeStarBlast:(au.name==='Senku'?animateSenkuBomb:animateLunge);\n   const basicTarget=(au.name==='Lebee'||au.name==='Senku')?enemy:to;\n   runBasicAttack(au.name,from,basicTarget,`;
const basicCount=html.split(legacyBasic).length-1;
if(basicCount!==1)throw new Error(`Attack runtime pass: expected 1 legacy basic dispatch block, found ${basicCount}`);
html=html.replace(legacyBasic,'runCanonicalBasicPresentation(au.name,from,enemy,to,');

const legacyHelper=`animateLunge(\n       hu.name,hfrom,hto,`;
const helperCount=html.split(legacyHelper).length-1;
if(helperCount!==1)throw new Error(`Attack runtime pass: expected 1 Jutsu helper lunge block, found ${helperCount}`);
html=html.replace(legacyHelper,`runCanonicalBasicPresentation(\n       hu.name,hfrom,enemy,hto,`);

await fs.writeFile(file,html);
console.log('Canonical attack runtime applied: shared basic dispatcher + chain helper presentation + Senku close/range delivery');
