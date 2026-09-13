import fs from 'node:fs/promises';
import {chromium,webkit} from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const KEY='bb:sanctuary:first-bloom:v3';
const EXPECTED_STAGE=[0,1,2,3,5,6,6];
const EXPECTED_HARMONY=[0,0,20,60,80,100,100];

async function run(name,type){
 let browser,page,errors=[];
 try{
  console.log(`Sanctuary V3 smoke START (${name}) -> ${BASE}`);
  browser=await type.launch({headless:true,timeout:20000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:true});
  page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/favicon/i.test(m.text()))errors.push(m.text())});
  const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'null'),KEY);
  const harmony=s=>Object.values(s.gardenApplied||{}).filter(Boolean).length*20;
  const waitArt=()=>page.waitForFunction(()=>[...document.querySelectorAll('#sceneViewport img')].filter(x=>!x.hidden&&x.getAttribute('src')).every(x=>x.complete&&x.naturalWidth>0),null,{timeout:30000});
  const openDev=async()=>{if(!(await page.locator('#devPanel').evaluate(el=>el.classList.contains('open')))){await page.locator('#devOpen').click();await page.waitForFunction(()=>document.getElementById('devPanel')?.classList.contains('open'));await page.waitForTimeout(260);}};
  const closeDev=async()=>{if(await page.locator('#devPanel').evaluate(el=>el.classList.contains('open'))){await page.locator('#devClose').click();await page.waitForFunction(()=>!document.getElementById('devPanel')?.classList.contains('open'));await page.waitForTimeout(300);}};
  const exclusiveSnapshot=()=>page.evaluate(()=>{
   const visible=[...document.querySelectorAll('#sceneViewport img')].filter(x=>!x.hidden&&x.getAttribute('src')).map(x=>({id:x.id,src:x.getAttribute('src')||''}));
   const pick=fragment=>visible.filter(x=>x.src.includes(fragment));
   return {
    rootBase:pick('/rootbase_'),
    trunk:pick('/trunk_'),
    canopy:pick('/canopy_'),
    blossom:pick('/blossom_'),
    pattern:pick('/pattern_'),
    motif:pick('/motif_'),
    stones:pick('/stones_'),
    signature:pick('/name_'),
    fx:pick('/fx_'),
    fxState:document.getElementById('fxLayer')?.dataset.fxState||'none',
    stoneLayout:document.getElementById('stoneLayer')?.dataset.layout||'none',
    oldFxSlots:['fxDrift','fxRing','fxBurst','fxGround'].filter(id=>document.getElementById(id)),
   };
  });
  const assertExclusive=async(label,expected={})=>{
   const shot=await exclusiveSnapshot();
   if(shot.oldFxSlots.length)throw new Error(`${label}: deprecated FX slots still mounted: ${shot.oldFxSlots.join(',')}`);
   for(const category of ['rootBase','trunk','canopy','blossom','pattern','motif','stones','signature','fx']){
    if(shot[category].length>1)throw new Error(`${label}: ${category} overlap ${JSON.stringify(shot[category])}`);
   }
   if(shot.rootBase.length!==1||shot.trunk.length!==1)throw new Error(`${label}: canonical tree core missing ${JSON.stringify(shot)}`);
   for(const [category,fragment] of Object.entries(expected)){
    if(category==='fxState'){
     if(shot.fxState!==fragment)throw new Error(`${label}: expected FX ${fragment}, got ${shot.fxState}`);
    }else if(category==='stoneLayout'){
     if(shot.stoneLayout!==fragment)throw new Error(`${label}: expected stone layout ${fragment}, got ${shot.stoneLayout}`);
    }else if(!shot[category]?.some(x=>x.src.includes(fragment))){
     throw new Error(`${label}: expected ${category} ${fragment}, got ${JSON.stringify(shot[category])}`);
    }
   }
   return shot;
  };

  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
  await page.locator('#bbHomeApproved [data-nav="sanctuary"]').waitFor({state:'visible',timeout:30000});
  await page.locator('#bbHomeApproved [data-nav="sanctuary"]').click();
  await page.waitForURL(/\/sanctuary(?:\.html)?(?:[?#]|$)/,{waitUntil:'domcontentloaded'});
  await page.locator('#sceneViewport').waitFor({state:'visible',timeout:30000});
  await waitArt();
  await page.waitForFunction(()=>document.getElementById('rootLayer')?.getAttribute('src')?.includes('/runtime/tree/'));

  const geometry=await page.evaluate(()=>{
   const scene=document.getElementById('sceneViewport').getBoundingClientRect();
   const drawer=document.getElementById('actionDrawer').getBoundingClientRect();
   const tree=document.getElementById('treeCanvas').getBoundingClientRect();
   const garden=document.getElementById('gardenCanvas').getBoundingClientRect();
   return {vw:innerWidth,scroll:document.documentElement.scrollWidth,scene:{l:scene.left,r:scene.right,t:scene.top,b:scene.bottom},drawer:{t:drawer.top,b:drawer.bottom},tree:{w:tree.width,h:tree.height},garden:{w:garden.width,h:garden.height},potLayer:!!document.getElementById('potLayer')};
  });
  if(geometry.scroll>geometry.vw+1||geometry.scene.l<0||geometry.scene.r>geometry.vw+1||geometry.drawer.t<geometry.scene.b-2||geometry.potLayer)throw new Error(`V3 mobile compositor geometry invalid: ${JSON.stringify(geometry)}`);
  if(Math.abs(geometry.tree.w-geometry.tree.h)>2||Math.abs(geometry.garden.w/geometry.garden.h-1.5)>.03)throw new Error(`canonical aspect ratio failure: ${JSON.stringify(geometry)}`);

  await openDev();
  const devStatus=await page.locator('#devStatus').textContent();
  if(!devStatus.includes('First Bloom Rebuild')||!devStatus.includes('canonical tree 1536x1536')||!devStatus.includes('one asset per category'))throw new Error('DEV status does not describe exclusive V3 rebuild');
  for(let n=1;n<=6;n++){
   await page.locator(`[data-dev="preset-${n}"]`).click();
   await closeDev();
   await waitArt();
   const s=await state();
   if(s.schema!==3||s.treeStage!==EXPECTED_STAGE[n]||harmony(s)!==EXPECTED_HARMONY[n])throw new Error(`preset ${n} state mismatch: ${JSON.stringify(s)}`);
   if(n===1&&(s.rakePattern!=='still_water'||s.motif!=='blazing_spiral'||s.stoneLayout!=='centered'))throw new Error(`preset 1 inherited stale visuals: ${JSON.stringify(s)}`);
   if(n===4&&(s.canopyType!=='jade'||s.blossomVariant!=='blue'||s.rakePattern!=='spiral_wind'||s.motif!=='shinobi_seal_mandala'||s.stoneLayout!=='mountain'||s.nameLayout!=='arc'))throw new Error(`preset 4 is not deterministic: ${JSON.stringify(s)}`);
   if(n===5&&(s.rakePattern!=='flowing_river'||s.motif!=='lotus_bloom_bonus'||s.stoneLayout!=='riverbank'||s.nameLayout!=='seal'))throw new Error(`preset 5 is not deterministic: ${JSON.stringify(s)}`);
   const art=await page.evaluate(()=>Object.fromEntries(['sandBase','rootLayer','trunkLayer','canopyLayer','blossomLayer','fxLayer'].map(id=>{const e=document.getElementById(id);return [id,{hidden:e.hidden,loaded:e.hidden?true:e.complete&&e.naturalWidth>0,src:e.getAttribute('src')||''}]})));
   if(!art.sandBase.loaded||!art.rootLayer.loaded||!art.trunkLayer.loaded)throw new Error(`preset ${n} missing canonical core art`);
   if(s.treeStage>=2&&(art.canopyLayer.hidden||!art.canopyLayer.loaded))throw new Error(`preset ${n} canopy missing`);
   if(s.treeStage>=5&&(art.blossomLayer.hidden||!art.blossomLayer.loaded))throw new Error(`preset ${n} blossom missing`);
   for(const id of Object.keys(art))if(art[id].src&&art[id].src.includes('runtime/')===false)throw new Error(`preset ${n} escaped canonical runtime: ${id} ${art[id].src}`);
   await assertExclusive(`preset ${n}`);
   if([1,4,5].includes(n)){
    await fs.mkdir('test-artifacts',{recursive:true});
    await page.screenshot({path:`test-artifacts/sanctuary-v3-${name}-preset-${n}.png`,fullPage:true});
   }
   await openDev();
  }

  await closeDev();
  await page.locator('[data-tab="cultivate"]').click();
  if(await page.locator('[data-action="new-cycle"]').count())await page.locator('[data-action="new-cycle"]').click();
  await openDev();
  await page.locator('[data-dev="preset-1"]').click();
  await closeDev();
  let before=await state();
  await page.locator('[data-care="water"]').click();
  let after=await state();
  if(after.resources.spiritWater!==before.resources.spiritWater-1||after.stageCare.water!==1)throw new Error('stage Water requirement did not persist');
  await page.locator('[data-care="nourish"]').click();
  await page.locator('[data-action="advance-stage"]').click();
  after=await state();
  if(after.treeStage!==2||after.stageCare.water!==0||after.stageCare.nourish!==0)throw new Error('stage advancement did not reset care requirements');

  await page.locator('[data-tab="design"]').click();
  await page.locator('[data-design-section="pattern"]').click();
  await page.locator('[data-design-choice="ripple_ring"]').click();
  await page.waitForFunction(()=>{const e=document.getElementById('rakeLayer');return !!e&&!e.hidden&&e.complete&&e.naturalWidth>0&&(e.getAttribute('src')||'').includes('pattern_ripple_ring.png');},null,{timeout:30000});
  before=await state();
  if(before.gardenApplied.pattern)throw new Error('selecting a pattern applied it without confirmation');
  await page.locator('[data-apply="pattern"]').click();
  after=await state();
  if(!after.gardenApplied.pattern||after.resources.gardenStone!==before.resources.gardenStone-10)throw new Error('explicit pattern Apply failed');

  await page.locator('[data-design-section="motif"]').click();
  await page.locator('[data-design-choice="petal_drift"]').click();
  await page.locator('[data-apply="motif"]').click();
  await page.locator('[data-design-section="stones"]').click();
  await page.locator('[data-design-choice="riverbank"]').click();
  await page.locator('[data-apply="stones"]').click();
  await waitArt();
  await assertExclusive('design exclusive state',{
   pattern:'pattern_ripple_ring.png',
   motif:'motif_petal_drift.png',
   stones:'stones_riverbank.png',
   stoneLayout:'riverbank',
  });
  await fs.mkdir('test-artifacts',{recursive:true});
  await page.screenshot({path:`test-artifacts/sanctuary-v3-${name}-design-exclusive.png`,fullPage:true});

  await openDev();
  await page.locator('[data-dev="preset-5"]').click();
  await closeDev();
  await page.locator('[data-tab="cultivate"]').click();
  before=await state();
  await page.locator('[data-action="complete"]').click();
  await page.waitForTimeout(160);
  await assertExclusive('ceremony petal drift',{fxState:'petal_drift'});
  await page.waitForTimeout(420);
  await assertExclusive('ceremony wind ring',{fxState:'wind_ring'});
  await page.waitForTimeout(500);
  await assertExclusive('ceremony bloom burst',{fxState:'bloom_burst'});
  await page.waitForTimeout(520);
  await assertExclusive('ceremony settle',{fxState:'settle'});
  await page.waitForTimeout(900);
  await waitArt();
  after=await state();
  if(!after.completed||!after.completionClaimed||after.resources.harmonySeals!==before.resources.harmonySeals+1||after.grove.length!==before.grove.length+1)throw new Error('First Bloom completion/reward failed');
  if(await page.locator('[data-action="complete"]').count())throw new Error('completion action remained available after claim');
  await assertExclusive('completion settled',{
   pattern:'pattern_flowing_river.png',
   motif:'motif_lotus_bloom_bonus.png',
   stones:'stones_riverbank.png',
   fx:'fx_pink_idle_drift.png',
   fxState:'idle',
   stoneLayout:'riverbank',
  });
  await page.screenshot({path:`test-artifacts/sanctuary-v3-${name}-completion-exclusive.png`,fullPage:true});

  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.schema===3,KEY);
  after=await state();
  if(!after.completed||!after.completionClaimed||after.grove.length<1)throw new Error('V3 completion did not persist after reload');
  await waitArt();
  await assertExclusive('completion reload',{fx:'fx_pink_idle_drift.png',fxState:'idle'});
  await page.locator('[data-tab="grove"]').click();
  await page.locator('[data-grove="0"]').click();
  if(await page.locator('#showcaseBadge').isHidden())throw new Error('Grove card did not load read-only diorama showcase');
  await waitArt();
  await assertExclusive('grove showcase',{fxState:'idle'});
  await page.locator('[data-tab="summon"]').click();
  before=await state();
  await page.locator('[data-action="summon"]').click();
  after=await state();
  if(after.resources.harmonySeals!==before.resources.harmonySeals-1||!after.lastSummon)throw new Error('isolated Sanctuary summon failed');

  await fs.mkdir('test-artifacts',{recursive:true});
  await page.screenshot({path:`test-artifacts/sanctuary-v3-${name}-final.png`,fullPage:true});
  await page.locator('#homeButton').click();
  await page.locator('#bbHomeApproved [data-nav="sanctuary"]').waitFor({state:'visible'});
  if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
  await context.close();
  console.log(`Sanctuary V3 smoke PASS (${name}): one-per-category rendering, deterministic presets, offset stones, Design exclusivity, sequenced ceremony FX, Grove, persistence, Seal summon`);
  return true;
 }catch(e){
  try{
   await fs.mkdir('test-artifacts',{recursive:true});
   await page?.screenshot({path:`test-artifacts/sanctuary-v3-${name}-FAIL.png`,fullPage:true});
   const dump=await page?.evaluate(key=>({url:location.href,state:JSON.parse(localStorage.getItem(key)||'null'),rootSrc:document.getElementById('rootLayer')?.getAttribute('src')||null,fxSrc:document.getElementById('fxLayer')?.getAttribute('src')||null,fxState:document.getElementById('fxLayer')?.dataset.fxState||null,stoneLayout:document.getElementById('stoneLayer')?.dataset.layout||null,devOpen:document.getElementById('devPanel')?.classList.contains('open')||false}),KEY).catch(()=>null);
   await fs.writeFile(`test-artifacts/sanctuary-v3-${name}-FAIL.json`,JSON.stringify({error:String(e?.stack||e),browserErrors:errors,dump},null,2));
  }catch{}
  console.error(`Sanctuary V3 smoke FAIL (${name}):`,e);
  if(errors.length)console.error(`Sanctuary V3 browser errors (${name}): ${errors.join(' | ')}`);
  return false;
 }finally{
  await browser?.close().catch(()=>{});
 }
}

let ok=true;
for(const [name,type] of Object.entries({chromium,webkit}))ok=(await run(name,type))&&ok;
if(!ok)process.exit(1);
