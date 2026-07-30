import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'dist');

const SKIP_TOP = new Set([
  '.git', '.github', 'node_modules', 'dist', 'scripts', 'dev-tools', '_rollback_v0611'
]);
const SKIP_FILES = new Set([
  'wrangler.jsonc', 'package.json', 'package-lock.json', 'DEV_SENKU_CHECKPOINT.md', 'DEV_WORKFLOW.md'
]);
const SKIP_DIR_PREFIXES = ['_rollback', 'rollback', 'checkpoint'];
const MIME_EXT = new Map([
  ['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/jpg', 'jpg'], ['image/webp', 'webp'],
  ['image/gif', 'gif'], ['image/svg+xml', 'svg'], ['audio/mpeg', 'mp3'], ['audio/ogg', 'ogg'],
  ['application/octet-stream', 'bin']
]);

function shouldSkipDirectory(name, topLevel) {
  if (topLevel && SKIP_TOP.has(name)) return true;
  const lower = name.toLowerCase();
  return SKIP_DIR_PREFIXES.some(prefix => lower.startsWith(prefix));
}

async function copyTree(src, dst, topLevel = true) {
  await fs.mkdir(dst, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    if (topLevel && (SKIP_FILES.has(entry.name) || entry.name === 'index.html')) continue;
    if (entry.isDirectory() && shouldSkipDirectory(entry.name, topLevel)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) await copyTree(from, to, false);
    else if (entry.isFile()) await fs.copyFile(from, to);
  }
}

function replaceOnce(html, oldText, newText, label) {
  if (!html.includes(oldText)) throw new Error(`Production migration anchor missing: ${label}`);
  return html.replace(oldText, newText);
}

async function assertNoOversizedAssets(dir) {
  const MAX = 25 * 1024 * 1024;
  const oversized = [];
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const stat = await fs.stat(full);
        if (stat.size > MAX) oversized.push({ path: path.relative(OUT, full).replaceAll(path.sep, '/'), size: stat.size });
      }
    }
  }
  await walk(dir);
  if (oversized.length) {
    const details = oversized.map(file => `${file.path} (${(file.size / 1048576).toFixed(1)} MiB)`).join(', ');
    throw new Error(`Cloudflare dist still contains assets over 25 MiB: ${details}`);
  }
}

await fs.rm(OUT, { recursive: true, force: true });
await copyTree(ROOT, OUT, true);

const indexPath = path.join(ROOT, 'index.html');
let html = await fs.readFile(indexPath, 'utf8');
const originalBytes = Buffer.byteLength(html);

// Promote the approved Senku checkpoint into the actual production build.
// Source-of-truth values live in the character unit file; Cloudflare no longer serves
// the old embedded Senku definition that predates chakra_start and Ally Heal.
const senku = JSON.parse(await fs.readFile(path.join(ROOT, 'assets/characters/senku/data/unit.json'), 'utf8'));
if (senku?.id !== 'senku' || senku?.combat?.chakra_start !== 8 || senku?.abilities?.jutsu?.id !== 'ally_heal') {
  throw new Error('Production Senku unit core is not the approved Ally Heal checkpoint');
}

const unitTag = /(<script id="blazing-unit-data">window\.BLAZING_UNIT_DATA=)(\{.*?\})(;<\/script>)/s;
const unitMatch = html.match(unitTag);
if (!unitMatch) throw new Error('Embedded unit data tag missing');
const embedded = JSON.parse(unitMatch[2]);
embedded.senku = senku;
html = html.replace(unitTag, (_, a, _json, c) => a + JSON.stringify(embedded) + c);

// Chakra must initialize from the unit core instead of the legacy hard-coded value.
html = replaceOnce(
  html,
  'maxChakra:d.combat.chakra_max||0,jutsuCost:jutsu.cost??99,',
  'maxChakra:d.combat.chakra_max||0,startChakra:d.combat.chakra_start??0,jutsuCost:jutsu.cost??99,',
  'runtimeDefinition chakra_start'
);
html = replaceOnce(
  html,
  "const start=opts.startingChakra??2;\n u.chakra=start==='full'?u.maxChakra:Math.max(0,Math.min(u.maxChakra,start));",
  "const start=opts.startingChakra??d.startChakra??0;\n u.chakra=start==='full'?u.maxChakra:Math.max(0,Math.min(u.maxChakra,start));",
  'roster chakra initialization'
);

// Canonical Ally Heal routing: never fall through to the legacy/basic attack path.
const supportRx = /function isAllySupportJutsu\([^)]*\)\{.*?\n\}/s;
if (!supportRx.test(html)) throw new Error('Ally support Jutsu detector missing');
html = html.replace(supportRx, `function isAllySupportJutsu(unit){
 if(!unit)return false;
 try{
  const j=canonicalUnit(unit.name)?.abilities?.jutsu;
  return !!j && (
   j.id==='ally_heal' ||
   j.delivery==='airburst_party_heal' ||
   j.effect==='heal_percent_max_hp' ||
   j.target==='all_living_allies'
  );
 }catch(_){return false;}
}`);

// Keep the exact approved planted body-cast behavior from the checkpoint without
// replacing Pass 4.1's semantic attack-frame resolver. This compatibility injection
// is deliberately idempotent so an already-canonical shell passes unchanged.
const attackFrameOpen = 'function unitAttackFrames(name,kind){\n';
const attackFrameOpenAt = html.indexOf(attackFrameOpen);
if (attackFrameOpenAt < 0) throw new Error('Ally Heal body-frame function missing');
if (html.indexOf(attackFrameOpen, attackFrameOpenAt + attackFrameOpen.length) >= 0) {
  throw new Error('Ally Heal body-frame function is not unique');
}
const attackFrameFnEnd = html.indexOf('\n}', attackFrameOpenAt + attackFrameOpen.length);
if (attackFrameFnEnd < 0) throw new Error('Ally Heal body-frame function end missing');
const attackFrameBody = html.slice(attackFrameOpenAt, attackFrameFnEnd);
const allyHealFrameLine = "  if(name==='Senku'&&kind==='allyHealCast')return SENKU_CHEM_CAST_FRAMES||[];\n";
if (!attackFrameBody.includes("kind==='allyHealCast'")) {
  const insertAt = attackFrameOpenAt + attackFrameOpen.length;
  html = html.slice(0, insertAt) + allyHealFrameLine + html.slice(insertAt);
}

const approvedHealAnimation = `function animateSenkuChemicalReaction(unitName,from,target,onImpact,onDone){
 const token=ACTIVE_ACTION_TOKEN;
 const meta=canonicalUnit('senku').abilities.jutsu.presentation||{};
 const castDuration=meta.cast_duration_ms||680;
 const flightDuration=meta.flight_duration_ms||650;
 const flashDuration=meta.impact_duration_ms||500;
 const arcHeight=meta.arc_height_px||95;
 const state=ensureAnimState();
 if(!state.attackPose)state.attackPose={};
 state.attackPose[unitName]={kind:'allyHealCast',start:performance.now(),duration:castDuration};
 if(meta.screen_dim_alpha)S.jutsuDim={start:performance.now(),alpha:meta.screen_dim_alpha,end:null};
 if(!window.__SENKU_ALLY_HEAL_BOTTLE){
  const img=new Image();
  img.src='assets/characters/senku/vfx/jutsu/chemical_reaction/projectile/frame_01.png';
  window.__SENKU_ALLY_HEAL_BOTTLE=img;
 }
 setTimeout(()=>{
   if(!actionTokenAlive(token))return;
   const dir=from.x>(W/2)?-1:1;
   const burst={x:from.x+(72*dir),y:Math.max(95,from.y-145)};
   const projectile={kind:'senkuAllyHealProjectile',from:{x:from.x,y:from.y-30},to:burst,start:performance.now(),duration:flightDuration,life:1,arcHeight};
   S.floaters.push(projectile);
   setTimeout(()=>{
     if(!actionTokenAlive(token))return;
     S.floaters=S.floaters.filter(x=>x!==projectile);
     const flash={kind:'senkuAllyHealFlash',x:burst.x,y:burst.y,start:performance.now(),duration:flashDuration,life:1};
     S.floaters.push(flash);
     try{onImpact&&onImpact()}catch(err){console.error('Senku Ally Heal impact failed:',err);return recoverAction('Senku Ally Heal impact')}
     setTimeout(()=>{
       S.floaters=S.floaters.filter(x=>x!==flash);
       if(S.jutsuDim)S.jutsuDim.end=performance.now();
       const st=ensureAnimState();if(st.attackPose)delete st.attackPose[unitName];
       if(actionTokenAlive(token)){try{onDone&&onDone()}catch(err){recoverAction('Senku Ally Heal completion')}}
     },flashDuration);
   },flightDuration);
 },Math.max(120,castDuration*.55));
}

function animateSenkuBomb`;
const animRx = /function animateSenkuChemicalReaction\(unitName,from,target,onImpact,onDone\)\{.*?\n\}\n\nfunction animateSenkuBomb/s;
if (!animRx.test(html)) throw new Error('Legacy Senku heal animation missing');
html = html.replace(animRx, approvedHealAnimation);

const approvedHealRenderer = `else if(f.kind==='senkuAllyHealProjectile'){
     const t=clamp((performance.now()-f.start)/f.duration,0,1);
     const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
     const arc=f.arcHeight||95;
     const x=f.from.x+(f.to.x-f.from.x)*e;
     const baseY=f.from.y+(f.to.y-f.from.y)*e;
     const y=baseY-4*arc*t*(1-t);
     const dx=f.to.x-f.from.x;
     const dy=(f.to.y-f.from.y)-4*arc*(1-2*t);
     const img=window.__SENKU_ALLY_HEAL_BOTTLE;
     if(img?.complete&&img.naturalWidth>0){
       const h=30,ratio=img.naturalWidth/img.naturalHeight,w=h*ratio;
       ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx)+t*Math.PI*2);
       ctx.globalAlpha=t<.82?1:Math.max(0,1-(t-.82)/.18);
       ctx.shadowColor='#62ff63';ctx.shadowBlur=10;ctx.drawImage(img,-w/2,-h/2,w,h);
     }else{
       ctx.translate(x,y);ctx.rotate(t*Math.PI*2);
       ctx.globalAlpha=t<.82?1:Math.max(0,1-(t-.82)/.18);
       ctx.fillStyle='#8dff99';ctx.strokeStyle='#e9ffee';ctx.lineWidth=1.5;
       ctx.fillRect(-5,-9,10,18);ctx.strokeRect(-5,-9,10,18);
     }
   }else if(f.kind==='senkuAllyHealFlash'){
     const t=clamp((performance.now()-f.start)/f.duration,0,1),pulse=Math.sin(Math.PI*t),r=14+92*pulse;
     ctx.translate(f.x,f.y);ctx.globalCompositeOperation='screen';ctx.globalAlpha=Math.max(0,1-t);
     const g=ctx.createRadialGradient(0,0,0,0,0,r);
     g.addColorStop(0,'rgba(240,255,242,.98)');g.addColorStop(.22,'rgba(124,255,151,.90)');g.addColorStop(.55,'rgba(55,223,101,.52)');g.addColorStop(1,'rgba(44,179,88,0)');
     ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';
   }else if(f.kind==='senkuBombProjectile'){`;
const rendererRx = /else if\(f\.kind==='senkuChemProjectile'\)\{.*?else if\(f\.kind==='senkuBombProjectile'\)\{/s;
if (!rendererRx.test(html)) throw new Error('Legacy Senku heal renderer missing');
html = html.replace(rendererRx, approvedHealRenderer);

// Approved gameplay effect: living allies only, 30% max HP, no revive.
html = replaceOnce(
  html,
  'const healed=window.BlazingCombatRuntime.healPercentMaxHp(ally,1,{minimumHeal:1,ignoreDefeated:true}).amount;',
  "const healed=window.BlazingCombatRuntime.execute('heal_party_percent',{targets:[ally],parameters:{percent_of_max_hp:canonicalUnit('senku').abilities.jutsu.heal_percent??0.30}})[0]?.amount||0;",
  'Ally Heal 30 percent effect'
);
html = html.replace("S.log=`${u.name} activated ${u.jutsuName||'Revival Formula'} — restoring all active allies to full HP.`;", "S.log=`${u.name} activated ${u.jutsuName||'Ally Heal'} — healing all living allies for 30% max HP.`;");
html = html.replace(":S.phase==='player'?`${active.name}'s turn — Basic builds chakra; closer linked allies can amplify Link Attack buffs. Choose an action, preview its range, then drag and release.`", ":S.phase==='player'?`${active.name}'s turn`");

console.log('Production migration: Senku 8/8 chakra core + approved Ally Heal runtime applied');

// Externalize embedded data URIs only after production gameplay migration is complete.
const embeddedDir = path.join(OUT, '_embedded');
await fs.mkdir(embeddedDir, { recursive: true });
let extracted = 0;
let extractedBytes = 0;
const seen = new Map();
const dataUriRx = /data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/g;
html = html.replace(dataUriRx, (full, mime, b64) => {
  try {
    const buf = Buffer.from(b64, 'base64');
    if (!buf.length) return full;
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 20);
    const ext = MIME_EXT.get(mime.toLowerCase()) || 'bin';
    const fileName = `${hash}.${ext}`;
    if (!seen.has(fileName)) {
      seen.set(fileName, buf);
      extracted++;
      extractedBytes += buf.length;
    }
    return `_embedded/${fileName}`;
  } catch {
    return full;
  }
});
for (const [fileName, buf] of seen) await fs.writeFile(path.join(embeddedDir, fileName), buf);

const finalBytes = Buffer.byteLength(html);
await fs.writeFile(path.join(OUT, 'index.html'), html);
await assertNoOversizedAssets(OUT);
console.log(`Cloudflare build: index ${(originalBytes / 1048576).toFixed(1)} MiB -> ${(finalBytes / 1048576).toFixed(1)} MiB`);
console.log(`Externalized ${extracted} embedded assets (${(extractedBytes / 1048576).toFixed(1)} MiB decoded)`);
console.log('Cloudflare build validation: all dist assets are under 25 MiB.');
