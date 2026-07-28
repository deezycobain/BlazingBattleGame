import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

const scriptTag='<script src="/runtime/combat/attack-runtime.js"></script>';
if(!html.includes(scriptTag)){
  if(!/<\/head>/i.test(html))throw new Error('Attack runtime pass: </head> anchor missing');
  html=html.replace(/<\/head>/i,`${scriptTag}</head>`);
}

// Adapter boundary between the remaining legacy battle shell and the canonical runtime.
// Unit data chooses the presentation driver. Legacy punch/kick alternation is only a
// fallback for units that have not yet declared a canonical animation kind.
const adapter=`function clearCanonicalAttackFacing(unitName){
 const state=S.anim;
 if(!state?.facingOverride)return;
 delete state.facingOverride[unitName];
}
function setCanonicalAttackFacing(unitName,from,enemy){
 if(!from||!enemy)return;
 const state=ensureAnimState();
 if(!state.facingOverride)state.facingOverride={};
 state.facingOverride[unitName]=enemy.x>=from.x?1:-1;
}
function runCanonicalBasicPresentation(unitName,from,enemy,meleeTo,onImpact,onDone,legacyAttackKind){
 const runtime=window.BB_ATTACK_RUNTIME;
 if(!runtime?.basicPresentation)throw new Error('Canonical attack runtime is unavailable');
 const profile=runtime.basicPresentation(unitName,from,enemy);
 const kind=profile.animation_kind||legacyAttackKind||'punch';
 if(profile.driver==='lebee_star')return animateLebeeStarBlast(unitName,from,enemy,onImpact,onDone,kind);
 if(profile.driver==='senku_bomb')return animateSenkuBomb(unitName,from,enemy,onImpact,onDone,kind);
 setCanonicalAttackFacing(unitName,from,enemy);
 const wrappedDone=()=>{
  clearCanonicalAttackFacing(unitName);
  try{onDone&&onDone()}catch(err){console.error('Canonical basic completion failed:',err);recoverAction('canonical basic completion')}
 };
 return animateLunge(unitName,from,meleeTo,onImpact,wrappedDone,kind);
}

`;
const resolveAnchor='function resolvePlayer(){';
const resolveAt=html.indexOf(resolveAnchor);
if(resolveAt<0)throw new Error('Attack runtime pass: resolvePlayer anchor missing');
if(!html.includes('function runCanonicalBasicPresentation(')){
  html=html.slice(0,resolveAt)+adapter+html.slice(resolveAt);
}

// Replace the old per-name basic dispatcher used by the active unit AND every linked
// basic attacker. This is the path that previously caused secondary Sub-Zero to skip
// his canonical punch presentation.
const legacyBasic=`const runBasicAttack=(au.name==='Lebee')?animateLebeeStarBlast:(au.name==='Senku'?animateSenkuBomb:animateLunge);\n   const basicTarget=(au.name==='Lebee'||au.name==='Senku')?enemy:to;\n   runBasicAttack(au.name,from,basicTarget,`;
const basicCount=html.split(legacyBasic).length-1;
if(basicCount!==1)throw new Error(`Attack runtime pass: expected 1 legacy basic dispatch block, found ${basicCount}`);
html=html.replace(legacyBasic,'runCanonicalBasicPresentation(au.name,from,enemy,to,');

// Jutsu-linked helpers also perform their normal basic presentation rather than a
// generic lunge. This keeps assist behavior consistent with ordinary chain basics.
const legacyHelper=`animateLunge(\n       hu.name,hfrom,hto,`;
const helperCount=html.split(legacyHelper).length-1;
if(helperCount!==1)throw new Error(`Attack runtime pass: expected 1 Jutsu helper lunge block, found ${helperCount}`);
html=html.replace(legacyHelper,`runCanonicalBasicPresentation(\n       hu.name,hfrom,enemy,hto,`);

// Lunge-facing is visual-only. Static authored hitboxes keep their battlefield
// orientation; only the sprite flips toward the enemy while the attack is playing.
const scaleLine='ctx.scale((flipX||1)*scale*activePulse,scale*activePulse);';
const scaleCount=html.split(scaleLine).length-1;
if(scaleCount!==1)throw new Error(`Attack runtime pass: expected 1 unit render scale line, found ${scaleCount}`);
html=html.replace(scaleLine,`const canonicalFace=(name&&S.anim?.facingOverride)?S.anim.facingOverride[name]:null;
 const renderFlip=canonicalFace===-1?-1:(canonicalFace===1?1:(flipX||1));
 ctx.scale(renderFlip*scale*activePulse,scale*activePulse);`);

// Migration guardrails: once generated, the deployable runtime must no longer contain
// either legacy attack-dispatch shortcut. If these reappear, fail the build instead of
// silently shipping two competing combat routes.
if(html.includes("const runBasicAttack=(au.name==='Lebee')?animateLebeeStarBlast")){
  throw new Error('Attack runtime pass: legacy named basic dispatcher survived migration');
}
if(html.includes('animateLunge(\n       hu.name,hfrom,hto,')){
  throw new Error('Attack runtime pass: legacy helper lunge survived migration');
}
const adapterCount=html.split('function runCanonicalBasicPresentation(').length-1;
if(adapterCount!==1)throw new Error(`Attack runtime pass: expected exactly 1 canonical adapter, found ${adapterCount}`);
if(!html.includes('S.anim?.facingOverride'))throw new Error('Attack runtime pass: visual facing override was not installed');

await fs.writeFile(file,html);
console.log('Canonical attack runtime applied: shared basic/chain dispatcher + target-facing lunges + clean Senku close melee / ranged bomb delivery');
