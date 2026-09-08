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
   const targetMatch=/function\s+runTarget\s*\(\s*\)\s*\{/.exec(source);
   if(!targetMatch)return {error:'runTarget() missing from resolvePlayer source'};
   const tail=source.slice(targetMatch.index);
   const attackerMatch=/function\s+runAttacker\s*\(\s*\)\s*\{/.exec(tail);
   if(!attackerMatch)return {error:'runAttacker() missing after runTarget()'};
   const targetHead=tail.slice(0,attackerMatch.index);
   const enemyMatch=/(?:const|let)\s+enemy\s*=\s*targets\s*\[\s*targetIndex\+\+\s*\]\s*;?/.exec(targetHead);
   if(!enemyMatch)return {error:'per-target enemy assignment missing'};
   const afterEnemy=targetHead.slice(enemyMatch.index+enemyMatch[0].length);
   const resetMatch=/^\s*attackIndex\s*=\s*0\s*;/.exec(afterEnemy);
   const attackerTail=tail.slice(attackerMatch.index,Math.min(tail.length,attackerMatch.index+9000));
   return {
    resetImmediately:!!resetMatch,
    consumesAttackers:/attackIndex\+\+/.test(attackerTail),
    boundedBySquad:/attackIndex\s*>=\s*attackers\.length/.test(attackerTail),
    koAbort:/enemy\.hp\s*<=\s*0\s*\|\|\s*attackIndex\s*>=\s*attackers\.length/.test(attackerTail)
   };
  });

  if(state.error)throw new Error(state.error);
  if(!state.resetImmediately||!state.consumesAttackers||!state.boundedBySquad||state.koAbort){
   throw new Error(`linked multi-target sequence invariant failed: ${JSON.stringify(state)}`);
  }
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Chain attack smoke PASS (${name}): each target gets a fresh linked attacker cursor and committed KO-safe sequencing.`);
  await context.close();
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
 try{await run(name,type)}catch(error){failed=true;console.error(`Chain attack smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
