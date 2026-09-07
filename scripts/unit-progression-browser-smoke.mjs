import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
  await page.locator('#forgeBtn').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingEconomy==='object'&&typeof window.BlazingUnitProgression==='object'&&typeof window.BlazingProgression==='object'&&typeof window.BlazingProgressionEconomyUI==='object',{timeout:30000});
  await page.waitForTimeout(180);
}

async function run(name,type){
 let browser;
 try{
  console.log(`Unit progression browser smoke START (${name}) -> ${BASE}`);
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);

  await page.evaluate(()=>{window.BlazingUnitProgression.reset();window.BlazingEconomy.reset();window.BlazingEconomy.grantMarks(5000,'BROWSER_SMOKE')});
  await page.evaluate(()=>window.BlazingProgression.openForge('Lebee'));
  await page.locator('#resonanceScreen.active #bbLevelProgression').waitFor({state:'visible'});
  let panel=await page.locator('#bbLevelProgression').innerText();
  if(!/LV\.\s*1\s*\/\s*10/i.test(panel)||!/DUPLICATES\s*0/i.test(panel))throw new Error(`fresh progression panel incorrect: ${panel}`);

  await page.evaluate(()=>window.BlazingUnitProgression.grantXp('Lebee',999999));
  await page.waitForFunction(()=>window.BlazingUnitProgression.unit('Lebee').level===10);
  panel=await page.locator('#bbLevelProgression').innerText();
  if(!/LV\.\s*10\s*\/\s*10/i.test(panel)||!/AWAKEN TO CONTINUE/i.test(panel))throw new Error(`Lv10 gate not visible: ${panel}`);
  const awakenButton=page.locator('#bbLevelProgression button[data-action="awaken"]');
  if(!(await awakenButton.isDisabled()))throw new Error('Awaken button should be disabled without a duplicate');

  const pull=await page.evaluate(()=>{
    const before=window.BlazingUnitProgression.unit('Lebee');
    const result=window.BlazingProgression.applyPull({name:'Lebee'});
    const after=window.BlazingUnitProgression.unit('Lebee');
    return {before,after,result};
  });
  if(pull.before.awakening!==0||pull.after.awakening!==0||pull.after.copies!==1||!/^COPY \+1/.test(pull.result?.progress||''))throw new Error(`duplicate did not bank cleanly: ${JSON.stringify(pull)}`);
  await page.waitForFunction(()=>!document.querySelector('#bbLevelProgression button[data-action="awaken"]')?.disabled);
  await awakenButton.click();
  const awakened=await page.evaluate(()=>window.BlazingUnitProgression.unit('Lebee'));
  if(awakened.level!==10||awakened.awakening!==1||awakened.copies!==0||awakened.shiny)throw new Error(`Awakening I state incorrect: ${JSON.stringify(awakened)}`);
  panel=await page.locator('#bbLevelProgression').innerText();
  if(!/LV\.\s*10\s*\/\s*20/i.test(panel)||!/AWAKENING\s*1\s*\/\s*5/i.test(panel))throw new Error(`Lv20 band did not unlock: ${panel}`);

  await page.evaluate(()=>window.BlazingUnitProgression.grantXp('Lebee',50));
  const purchaseBefore=await page.evaluate(()=>({marks:window.BlazingEconomy.balance(),cost:window.BlazingUnitProgression.markCostToFinish('Lebee'),unit:window.BlazingUnitProgression.unit('Lebee')}));
  const finishButton=page.locator('#bbLevelProgression button[data-action="level"]');
  await finishButton.click();
  const purchaseAfter=await page.evaluate(()=>({marks:window.BlazingEconomy.balance(),unit:window.BlazingUnitProgression.unit('Lebee')}));
  if(purchaseAfter.unit.level!==11||purchaseAfter.unit.xp!==0)throw new Error(`Battle Mark level purchase failed: ${JSON.stringify({purchaseBefore,purchaseAfter})}`);
  if(purchaseAfter.marks!==purchaseBefore.marks-purchaseBefore.cost)throw new Error(`Battle Mark level cost mismatch: ${JSON.stringify({purchaseBefore,purchaseAfter})}`);

  await page.locator('#forgeBack').click();
  await page.locator('#summonsBtn').waitFor({state:'visible'});await page.locator('#summonsBtn').click();
  await page.locator('#summonScreen.active #bbEmberExchange').waitFor({state:'visible'});
  let exchange=await page.locator('#bbEmberExchange').innerText();
  if(!/300\s*◈/.test(exchange)||!/WEEKLY\s*0\/10/i.test(exchange))throw new Error(`Ember exchange initial UI incorrect: ${exchange}`);
  const emberBefore=await page.evaluate(()=>window.BlazingEconomy.load());
  await page.locator('#bbBuyEmber').click();
  const emberAfter=await page.evaluate(()=>window.BlazingEconomy.load());
  if(emberAfter.embers!==emberBefore.embers+1||emberAfter.embersBoughtThisWeek!==1||emberAfter.battleMarks!==emberBefore.battleMarks-300)throw new Error(`Ember purchase state incorrect: ${JSON.stringify({emberBefore,emberAfter})}`);
  exchange=await page.locator('#bbEmberExchange').innerText();
  if(!/EMBER BANK\s*1/i.test(exchange)||!/WEEKLY\s*1\/10/i.test(exchange))throw new Error(`Ember exchange did not refresh: ${exchange}`);

  const expectedState=await page.evaluate(()=>({unit:window.BlazingUnitProgression.unit('Lebee'),economy:window.BlazingEconomy.load()}));
  await page.reload({waitUntil:'domcontentloaded'});await waitHome(page);
  const persisted=await page.evaluate(()=>({unit:window.BlazingUnitProgression.unit('Lebee'),economy:window.BlazingEconomy.load()}));
  if(JSON.stringify(persisted.unit)!==JSON.stringify(expectedState.unit))throw new Error(`unit progression did not persist: ${JSON.stringify({expectedState,persisted})}`);
  if(persisted.economy.embers!==1||persisted.economy.embersBoughtThisWeek!==1||persisted.economy.battleMarks!==expectedState.economy.battleMarks)throw new Error(`economy/Ember state did not persist: ${JSON.stringify({expectedState,persisted})}`);
  await page.evaluate(()=>{window.BlazingUnitProgression.reset();window.BlazingEconomy.reset()});
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Unit progression browser smoke PASS (${name}): Lv10 gate, duplicate banking, Awakening I, Battle Mark level purchase, Ember exchange, and reload persistence verified.`);
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
 try{await run(name,type)}catch(error){failed=true;console.error(`Unit progression browser smoke FAIL (${name}): ${error.stack||error.message}`)}
}
if(failed)process.exit(1);
