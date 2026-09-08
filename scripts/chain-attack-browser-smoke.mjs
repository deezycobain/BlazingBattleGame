import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>{
  try{return typeof globalThis.eval('resolvePlayer')==='function'}catch{return false}
 },null,{timeout:30000});
 await page.waitForTimeout(120);
}

async function run(name,type){
 let browser;
 try{
  console.log(`Chain attack smoke START (${name}) -> ${BASE}`);
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  const page=await context.newPage();
  page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
  await waitHome(page);

  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12)))){
   throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
  }

  const state=await page.evaluate(()=>{
   let source='';
   try{source=globalThis.eval('resolvePlayer.toString()')}catch(error){return {error:String(error?.message||error)}}
   const compact=source.replace(/\s+/g,' ');
   const committedSquad=/let linkedMembers=\[\];[\s\S]*?comboMembers\(enemy,p\)\.forEach\(member=>\{[\s\S]*?if\(member!==p&&!linkedMembers\.includes\(member\)\)linkedMembers\.push\(member\);[\s\S]*?let committedAttackers=\[p,\.\.\.linkedMembers\];[\s\S]*?let anyCombo=committedAttackers\.length>1;[\s\S]*?let queue=targets\.map\(enemy=>\(\{enemy,attackers:\[\.\.\.committedAttackers\]\}\)\);/.test(source);
   const legacyPerTarget=/let queue=\[\],anyCombo=false;\s*targets\.forEach\(enemy=>\{\s*let members=comboMembers\(enemy,p\),attackers=\[p,\.\.\.members\.filter\(x=>x!==p\)\]/.test(source);
   const targetMatch=/function\s+runTarget\s*\(\s*\)\s*\{/.exec(source);
   if(!targetMatch)return {error:'runTarget() missing from resolvePlayer source'};
   const tail=source.slice(targetMatch.index);
   const attackerMatch=/function\s+runAttacker\s*\(\s*\)\s*\{/.exec(tail);
   if(!attackerMatch)return {error:'runAttacker() missing after runTarget()'};
   const targetHead=tail.slice(0,attackerMatch.index).replace(/\s+/g,' ');
   const attackerTail=tail.slice(attackerMatch.index,Math.min(tail.length,attackerMatch.index+9000));
   return {
    committedSquad,
    legacyPerTarget,
    queueConsumesCommittedSquad:/let item=queue\[targetIndex\+\+\],enemy=item\.enemy,attackers=item\.attackers,attackIndex=0;/.test(targetHead),
    consumesEveryAttacker:/attackIndex\+\+/.test(attackerTail),
    boundedBySquad:/attackIndex\s*>=\s*attackers\.length/.test(attackerTail),
    koAbort:/enemy\.hp\s*<=\s*0\s*\|\|\s*attackIndex\s*>=\s*attackers\.length/.test(attackerTail),
    hasMultipleTargetSupport:/targetIndex\s*>=\s*queue\.length/.test(targetHead),
    sourceLength:compact.length
   };
  });

  if(state.error)throw new Error(state.error);
  if(!state.committedSquad||state.legacyPerTarget||!state.queueConsumesCommittedSquad||!state.consumesEveryAttacker||!state.boundedBySquad||state.koAbort||!state.hasMultipleTargetSupport){
   throw new Error(`linked multi-target sequence invariant failed: ${JSON.stringify(state)}`);
  }
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Chain attack smoke PASS (${name}): one committed linked squad is reused for every resolved Basic target and every member completes its sequence.`);
  await context.close();
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
 try{await run(name,type)}catch(error){failed=true;console.error(`Chain attack smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
