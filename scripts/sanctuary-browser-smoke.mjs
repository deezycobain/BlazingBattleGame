import fs from 'node:fs/promises';
import {chromium,webkit} from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const KEY='bb:sanctuary:first-bloom:v3';
const EXPECTED_STAGE=[0,1,2,3,5,6,6];
const EXPECTED_HARMONY=[0,0,20,60,80,100,100];

async function run(name,type){
 let browser;
 try{
  console.log(`Sanctuary V3 smoke START (${name}) -> ${BASE}`);
  browser=await type.launch({headless:true,timeout:20000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/favicon/i.test(m.text()))errors.push(m.text())});
  const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'null'),KEY);
  const harmony=s=>Object.values(s.gardenApplied||{}).filter(Boolean).length*20;
  const waitArt=()=>page.waitForFunction(()=>[...document.querySelectorAll('#sceneViewport img')].filter(x=>!x.hidden&&x.getAttribute('src')).every(x=>x.complete&&x.naturalWidth>0),null,{timeout:30000});
  const openDev=async()=>{if(!(await page.locator('#devPanel').evaluate(el=>el.classList.contains('open')))){await page.locator('#devOpen').click();await page.waitForFunction(()=>document.getElementById('devPanel')?.classList.contains('open'));}};
  const closeDev=async()=>{if(await page.locator('#devPanel').evaluate(el=>el.classList.contains('open'))){await page.locator('#devClose').click();await page.waitForFunction(()=>!document.getElementById('devPanel')?.classList.contains('open'));}};

  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
  await page.locator('#bbHomeApproved [data-nav="sanctuary"]').waitFor({state:'visible',timeout:30000});
  await page.locator('#bbHomeApproved [data-nav="sanctuary"]').click();
  await page.waitForURL(/\/sanctuary(?:\.html)?(?:[?#]|$)/,{waitUntil:'domcontentloaded'});
  await page.locator('#sceneViewport').waitFor({state:'visible',timeout:30000});
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.schema===3,KEY,{timeout:20000});
  await waitArt();

  const geometry=await page.evaluate(()=>{const scene=document.getElementById('sceneViewport').getBoundingClientRect(),drawer=document.getElementById('actionDrawer').getBoundingClientRect(),tree=document.getElementById('treeCanvas').getBoundingClientRect(),garden=document.getElementById('gardenCanvas').getBoundingClientRect();return {vw:innerWidth,scroll:document.documentElement.scrollWidth,scene:{l:scene.left,r:scene.right,t:scene.top,b:scene.bottom},drawer:{t:drawer.top,b:drawer.bottom},tree:{w:tree.width,h:tree.height},garden:{w:garden.width,h:garden.height},potLayer:!!document.getElementById('potLayer')};});
  if(geometry.scroll>geometry.vw+1||geometry.scene.l<0||geometry.scene.r>geometry.vw+1||geometry.drawer.t<geometry.scene.b-2||geometry.potLayer)throw new Error(`V3 mobile compositor geometry invalid: ${JSON.stringify(geometry)}`);
  if(Math.abs(geometry.tree.w-geometry.tree.h)>2||Math.abs(geometry.garden.w/geometry.garden.h-1.5)>.03)throw new Error(`canonical aspect ratio failure: ${JSON.stringify(geometry)}`);

  await openDev();
  const devStatus=await page.locator('#devStatus').textContent();
  if(!devStatus.includes('First Bloom Rebuild')||!devStatus.includes('canonical tree 1536x1536'))throw new Error('DEV status does not describe V3 rebuild');
  for(let n=1;n<=6;n++){
   await page.locator(`[data-dev="preset-${n}"]`).click();
   await closeDev();
   await waitArt();
   const s=await state();
   if(s.schema!==3||s.treeStage!==EXPECTED_STAGE[n]||harmony(s)!==EXPECTED_HARMONY[n])throw new Error(`preset ${n} state mismatch: ${JSON.stringify(s)}`);
   const art=await page.evaluate(()=>Object.fromEntries(['sandBase','rootLayer','trunkLayer','canopyLayer','blossomLayer','rootFrontLayer'].map(id=>{const e=document.getElementById(id);return [id,{hidden:e.hidden,loaded:e.complete&&e.naturalWidth>0,src:e.getAttribute('src')||''}]})));
   if(!art.sandBase.loaded||!art.rootLayer.loaded||!art.trunkLayer.loaded||!art.rootFrontLayer.loaded)throw new Error(`preset ${n} missing canonical core art`);
   if(s.treeStage>=2&&(art.canopyLayer.hidden||!art.canopyLayer.loaded))throw new Error(`preset ${n} canopy missing`);
   if(s.treeStage>=5&&(art.blossomLayer.hidden||!art.blossomLayer.loaded))throw new Error(`preset ${n} blossom missing`);
   for(const id of Object.keys(art))if(art[id].src&&art[id].src.includes('runtime/')===false)throw new Error(`preset ${n} escaped canonical runtime: ${id} ${art[id].src}`);
   if([1,4,5].includes(n)){await fs.mkdir('test-artifacts',{recursive:true});await page.screenshot({path:`test-artifacts/sanctuary-v3-${name}-preset-${n}.png`,fullPage:true});}
   await openDev();
  }

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
  before=await state();
  if(before.gardenApplied.pattern)throw new Error('selecting a pattern applied it without confirmation');
  const previewVisible=await page.locator('#rakeLayer').evaluate(e=>!e.hidden&&e.complete&&e.naturalWidth>0);
  if(!previewVisible)throw new Error('selected rake pattern did not live-preview in persistent scene');
  await page.locator('[data-apply="pattern"]').click();
  after=await state();
  if(!after.gardenApplied.pattern||after.resources.gardenStone!==before.resources.gardenStone-10)throw new Error('explicit pattern Apply failed');

  await openDev();await page.locator('[data-dev="preset-5"]').click();await closeDev();
  await page.locator('[data-tab="cultivate"]').click();
  before=await state();
  await page.locator('[data-action="complete"]').click();
  await page.waitForTimeout(2500);
  after=await state();
  if(!after.completed||!after.completionClaimed||after.resources.harmonySeals!==before.resources.harmonySeals+1||after.grove.length!==before.grove.length+1)throw new Error('First Bloom completion/reward failed');
  if(await page.locator('[data-action="complete"]').count())throw new Error('completion action remained available after claim');

  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.schema===3,KEY);after=await state();
  if(!after.completed||!after.completionClaimed||after.grove.length<1)throw new Error('V3 completion did not persist after reload');
  await page.locator('[data-tab="grove"]').click();
  await page.locator('[data-grove="0"]').click();
  if(await page.locator('#showcaseBadge').isHidden())throw new Error('Grove card did not load read-only diorama showcase');
  await page.locator('[data-tab="summon"]').click();
  before=await state();await page.locator('[data-action="summon"]').click();after=await state();
  if(after.resources.harmonySeals!==before.resources.harmonySeals-1||!after.lastSummon)throw new Error('isolated Sanctuary summon failed');

  await fs.mkdir('test-artifacts',{recursive:true});await page.screenshot({path:`test-artifacts/sanctuary-v3-${name}-final.png`,fullPage:true});
  await page.locator('#homeButton').click();await page.locator('#bbHomeApproved [data-nav="sanctuary"]').waitFor({state:'visible'});
  if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
  await context.close();console.log(`Sanctuary V3 smoke PASS (${name}): canonical art, stage care, live Design preview/apply, ceremony, Grove, persistence, Seal summon`);return true;
 }catch(e){console.error(`Sanctuary V3 smoke FAIL (${name}):`,e);return false}finally{await browser?.close().catch(()=>{})}
}

let ok=true;
for(const [name,type] of Object.entries({chromium,webkit}))ok=(await run(name,type))&&ok;
if(!ok)process.exit(1);
