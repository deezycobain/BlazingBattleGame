import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

const EXPECTED_PRESENTATION={
 'Crimson':{element:'Fire',summon:'assets/characters/crimson/art/current_collection_art.jpg',forge:'assets/characters/crimson/art/current_collection_art.jpg'},
 'Sub-Zero':{element:'Water',subtype:'Ice',summon:'assets/characters/subzero/art/full_art_absolute_zero_v2.jpeg',forge:'assets/characters/subzero/art/full_art_absolute_zero_v2.jpeg'},
 'Lebee':{element:'Light',summon:'assets/characters/lebee/art/full_art_cosmic_wish.jpeg',forge:'assets/characters/lebee/art/full_art_cosmic_wish.jpeg'},
 'Senku':{element:'Nature',summon:'assets/characters/senku/cards/senku_card.jpeg',forge:'assets/characters/senku/art/senku_full_art.jpeg'},
 'Tyler':{element:'Earth',summon:'assets/characters/tyler/cards/current_collection_card.png',forge:'assets/characters/tyler/art/current_collection_art.png'},
 'Itachi':{element:'Fire',summon:'assets/characters/itachi/art/itachi_full_art.png',forge:'assets/characters/itachi/art/itachi_full_art.png'},
 'Kakashi':{element:'Lightning',summon:'assets/characters/kakashi/cards/legacy_of_shinobi_card.webp',forge:'assets/characters/kakashi/sprites/runtime/idle/frame_01.png'},
 'Obito':{element:'Fire',summon:'assets/characters/obito/cards/legacy_of_shinobi_card.webp',forge:'assets/characters/obito/sprites/runtime/idle/frame_01.png'},
 'Jiraiya':{element:'Fire',summon:'assets/characters/jiraiya/cards/legacy_of_shinobi_card.webp',forge:'assets/characters/jiraiya/sprites/runtime/idle/frame_01.png'},
 'Sasuke':{element:'Lightning',summon:'assets/characters/sasuke/cards/legacy_of_shinobi_card.webp',forge:'assets/characters/sasuke/sprites/runtime/idle/frame_01.png'},
 'Pain':{element:'Dark',summon:'assets/characters/pain/cards/legacy_of_shinobi_card.webp',forge:'assets/characters/pain/sprites/runtime/idle/frame_01.png'},
 'Scorpion':{element:'Fire',summon:'assets/characters/scorpion/cards/legacy_of_shinobi_card.webp',forge:'assets/characters/scorpion/sprites/runtime/idle/frame_01.png'},
 'Rock Lee':{element:'Wind',summon:'assets/characters/rock_lee/cards/legacy_of_shinobi_card.png',forge:'assets/characters/rock_lee/sprites/runtime/idle/frame_01.png'},
 'Mashle':{element:'Earth',summon:'assets/characters/mashle/cards/legacy_of_shinobi_card.png',forge:'assets/characters/mashle/sprites/runtime/idle/frame_01.png'},
 'Wong Fei-Hung':{element:'Wind',summon:'assets/characters/jackie_chan/cards/wong_fei_hung_refresh.png',forge:'assets/characters/jackie_chan/sprites/runtime/idle/frame_01.png'},
 'Gabimaru':{element:'Fire',summon:'assets/characters/gabimaru/cards/legacy_of_shinobi_card.png',forge:'assets/characters/gabimaru/sprites/runtime/idle/frame_01.png'},
 'Killua':{element:'Lightning',summon:'assets/characters/killua/cards/legacy_of_shinobi_card.png',forge:'assets/characters/killua/sprites/runtime/idle/frame_01.png'},
 'Zabuza':{element:'Water',summon:'assets/characters/zabuza/cards/legacy_of_shinobi_card.png',forge:'assets/characters/zabuza/sprites/runtime/idle/frame_01.png'}
};

async function waitHome(page){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingEconomy==='object'&&typeof window.BlazingUnitProgression==='object'&&typeof window.BlazingProgression==='object'&&typeof window.BlazingProgressionEconomyUI==='object'&&typeof window.BlazingApprovedHomeCompat==='object',{timeout:30000});
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

  await page.evaluate(()=>{window.BlazingUnitProgression.reset();window.BlazingEconomy.reset()});
  await page.evaluate(()=>window.BlazingProgression.openForge('Lebee'));
  await page.locator('#resonanceScreen.active #bbLevelProgression').waitFor({state:'visible'});
  const forgeRegistry=await page.evaluate(()=>({fighters:window.BlazingProgression.fighters(),progression:window.BlazingUnitProgression.fighters(),buttons:[...document.querySelectorAll('#forgeRoster [data-fighter]')].map(node=>node.dataset.fighter)}));
  if(forgeRegistry.fighters.length<18||forgeRegistry.progression.length<18||!forgeRegistry.fighters.includes('Kakashi')||!forgeRegistry.buttons.includes('Kakashi'))throw new Error(`Forge registry did not expose every current playable unit: ${JSON.stringify(forgeRegistry)}`);

  const presentationIntegrity=await page.evaluate(async expected=>{
    const registry=Object.values(window.BLAZING_UNIT_DATA||{});
    const norm=v=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
    const loadImage=src=>new Promise(resolve=>{const img=new Image();let done=false;const finish=ok=>{if(done)return;done=true;resolve({ok,width:img.naturalWidth||0,height:img.naturalHeight||0})};img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src=src;setTimeout(()=>finish(img.complete&&img.naturalWidth>0),5000)});
    const waitForge=async(name,expectedSrc)=>{
      window.BlazingProgression.openForge(name);const start=performance.now();
      while(performance.now()-start<5000){
        const card=document.getElementById('forgeCard'),portrait=document.getElementById('forgePortrait'),label=document.getElementById('forgeName')?.textContent?.trim()||'',src=portrait?.getAttribute('src')||'';
        if(label===name.toUpperCase()&&!card?.hasAttribute('aria-busy')&&src.endsWith(expectedSrc)&&portrait?.complete&&portrait.naturalWidth>0)return {ok:true,label,src,width:portrait.naturalWidth,height:portrait.naturalHeight};
        await new Promise(resolve=>requestAnimationFrame(resolve));
      }
      const portrait=document.getElementById('forgePortrait');return {ok:false,label:document.getElementById('forgeName')?.textContent?.trim()||'',src:portrait?.getAttribute('src')||'',width:portrait?.naturalWidth||0,height:portrait?.naturalHeight||0};
    };
    const rows=[];
    for(const [name,exp] of Object.entries(expected)){
      const canonical=registry.find(item=>norm(item?.display_name)===norm(name));
      const summon=window.BlazingProgression.summonArt(name),forge=window.BlazingProgression.forgeArt(name);
      const [summonLoad,forgeLoad]=await Promise.all([loadImage(summon),loadImage(forge)]);
      rows.push({name,element:canonical?.element||'',subtype:canonical?.element_subtype||'',summon,forge,summonLoad,forgeLoad,forgeRoute:await waitForge(name,exp.forge)});
    }
    return rows;
  },EXPECTED_PRESENTATION);
  const badPresentation=presentationIntegrity.filter(row=>{const exp=EXPECTED_PRESENTATION[row.name];return row.element!==exp.element||String(row.subtype||'')!==String(exp.subtype||'')||!row.summon.endsWith(exp.summon)||!row.forge.endsWith(exp.forge)||!row.summonLoad.ok||!row.forgeLoad.ok||!row.forgeRoute.ok;});
  if(badPresentation.length)throw new Error(`Playable summon/element/Forge presentation integrity failed: ${JSON.stringify(badPresentation)}`);
  await page.evaluate(()=>window.BlazingProgression.openForge('Lebee'));
  await page.evaluate(()=>window.BlazingProgression.openForge('Kakashi'));
  await page.waitForFunction(()=>document.getElementById('forgeName')?.textContent?.trim()==='KAKASHI');
  const legacyForge=await page.evaluate(()=>({name:document.getElementById('forgeName')?.textContent?.trim()||'',src:document.getElementById('forgePortrait')?.getAttribute('src')||''}));
  if(legacyForge.name!=='KAKASHI'||!/\/kakashi\/sprites\/runtime\/idle\/frame_01\.png/i.test(legacyForge.src))throw new Error(`Legacy Forge art/route incorrect: ${JSON.stringify(legacyForge)}`);
  await page.evaluate(()=>window.BlazingProgression.openForge('Lebee'));
  let panel=await page.locator('#bbLevelProgression').innerText();
  if(!/LV\.\s*1\s*\/\s*10/i.test(panel)||!/DUPLICATES\s*0/i.test(panel))throw new Error(`fresh progression panel incorrect: ${panel}`);

  // An unaffordable purchase must show an explicit warning and must not mutate progression/economy.
  const insufficientBefore=await page.evaluate(()=>({coins:window.BlazingEconomy.balance(),cost:window.BlazingUnitProgression.markCostToFinish('Lebee'),unit:window.BlazingUnitProgression.unit('Lebee')}));
  await page.locator('#bbLevelProgression button[data-action="level"]').click();
  const coinAlert=page.locator('#bbLevelProgression .bb-progression-alert--coins');
  await coinAlert.waitFor({state:'visible',timeout:2000});
  const coinAlertText=await coinAlert.innerText();
  if(!/NOT ENOUGH BLAZING COINS/i.test(coinAlertText)||!coinAlertText.includes(String(insufficientBefore.cost)))throw new Error(`insufficient-coin alert incorrect: ${coinAlertText}`);
  const insufficientAfter=await page.evaluate(()=>({coins:window.BlazingEconomy.balance(),unit:window.BlazingUnitProgression.unit('Lebee')}));
  if(insufficientAfter.coins!==insufficientBefore.coins||insufficientAfter.unit.level!==insufficientBefore.unit.level||insufficientAfter.unit.xp!==insufficientBefore.unit.xp)throw new Error(`failed level purchase mutated state: ${JSON.stringify({insufficientBefore,insufficientAfter})}`);
  await page.evaluate(()=>window.BlazingEconomy.grantMarks(5000,'BROWSER_SMOKE'));

  await page.evaluate(()=>window.BlazingUnitProgression.grantXp('Lebee',999999));
  await page.waitForFunction(()=>window.BlazingUnitProgression.unit('Lebee').level===10);
  panel=await page.locator('#bbLevelProgression').innerText();
  if(!/LV\.\s*10\s*\/\s*10/i.test(panel)||!/AWAKEN TO CONTINUE/i.test(panel))throw new Error(`Lv10 gate not visible: ${panel}`);
  const awakenButton=page.locator('#bbLevelProgression button[data-action="awaken"]');
  if(!(await awakenButton.isDisabled()))throw new Error('Awaken button should be disabled without a duplicate');

  const pull=await page.evaluate(()=>{const before=window.BlazingUnitProgression.unit('Lebee'),result=window.BlazingProgression.applyPull({name:'Lebee'}),after=window.BlazingUnitProgression.unit('Lebee');return {before,after,result}});
  if(pull.before.awakening!==0||pull.after.awakening!==0||pull.after.copies!==1||!/^COPY \+1/.test(pull.result?.progress||''))throw new Error(`duplicate did not bank cleanly: ${JSON.stringify(pull)}`);
  await page.waitForFunction(()=>!document.querySelector('#bbLevelProgression button[data-action="awaken"]')?.disabled);
  await awakenButton.click();
  await page.locator('#bbProgressionFx.active.awaken').waitFor({state:'visible',timeout:2000});
  const awakenFx=await page.locator('#bbProgressionFx').innerText();
  if(!/AWAKENING COMPLETE/i.test(awakenFx)||!/AWAKENING I/i.test(awakenFx))throw new Error(`Awakening animation copy wrong: ${awakenFx}`);
  const awakened=await page.evaluate(()=>window.BlazingUnitProgression.unit('Lebee'));
  if(awakened.level!==10||awakened.awakening!==1||awakened.copies!==0||awakened.shiny)throw new Error(`Awakening I state incorrect: ${JSON.stringify(awakened)}`);

  await page.evaluate(()=>window.BlazingUnitProgression.grantXp('Lebee',50));
  const purchaseBefore=await page.evaluate(()=>({coins:window.BlazingEconomy.balance(),cost:window.BlazingUnitProgression.markCostToFinish('Lebee'),unit:window.BlazingUnitProgression.unit('Lebee')}));
  const finishButton=page.locator('#bbLevelProgression button[data-action="level"]');await finishButton.click();
  await page.locator('#bbProgressionFx.active.level').waitFor({state:'visible',timeout:2000});
  let purchaseAfter=await page.evaluate(()=>({coins:window.BlazingEconomy.balance(),unit:window.BlazingUnitProgression.unit('Lebee')}));
  if(purchaseAfter.unit.level!==11||purchaseAfter.unit.xp!==0||purchaseAfter.coins!==purchaseBefore.coins-purchaseBefore.cost)throw new Error(`single-level purchase failed: ${JSON.stringify({purchaseBefore,purchaseAfter})}`);

  // MAX TO AWAKENING must be exact, all-or-nothing, and stop at the current gate.
  const maxBefore=await page.evaluate(()=>({coins:window.BlazingEconomy.balance(),cost:window.BlazingUnitProgression.markCostToGate('Lebee'),unit:window.BlazingUnitProgression.unit('Lebee'),cap:window.BlazingUnitProgression.capForAwakening(window.BlazingUnitProgression.unit('Lebee').awakening)}));
  const maxButton=page.locator('#bbLevelProgression button[data-action="max-level"]');
  await maxButton.waitFor({state:'visible',timeout:3000});
  const maxCopy=await maxButton.innerText();if(!new RegExp(`LV\\.${maxBefore.cap}`).test(maxCopy)||!maxCopy.includes(String(maxBefore.cost)))throw new Error(`MAX button copy/cost mismatch: ${JSON.stringify({maxCopy,maxBefore})}`);
  await maxButton.click();
  await page.waitForFunction(cap=>window.BlazingUnitProgression.unit('Lebee').level===cap,maxBefore.cap);
  const maxAfter=await page.evaluate(()=>({coins:window.BlazingEconomy.balance(),unit:window.BlazingUnitProgression.unit('Lebee'),atGate:window.BlazingUnitProgression.isAtGate(window.BlazingUnitProgression.unit('Lebee'))}));
  if(maxAfter.unit.level!==maxBefore.cap||maxAfter.unit.xp!==0||!maxAfter.atGate)throw new Error(`MAX did not land exactly on gate: ${JSON.stringify({maxBefore,maxAfter})}`);
  if(maxAfter.coins!==maxBefore.coins-maxBefore.cost)throw new Error(`MAX coin deduction incorrect: ${JSON.stringify({maxBefore,maxAfter})}`);
  if(maxAfter.unit.awakening!==maxBefore.unit.awakening||maxAfter.unit.copies!==maxBefore.unit.copies)throw new Error(`MAX crossed/consumed Awakening state: ${JSON.stringify({maxBefore,maxAfter})}`);
  if(await page.locator('#bbLevelProgression button[data-action="max-level"]').count())throw new Error('MAX button should disappear at the Awakening gate');
  panel=await page.locator('#bbLevelProgression').innerText();if(!/LV\.\s*20\s*\/\s*20/i.test(panel)||!/AWAKEN TO CONTINUE/i.test(panel))throw new Error(`MAX gate UI incorrect: ${panel}`);

  // A fresh fighter should gain several early levels from the first Road clear.
  const battleXp=await page.evaluate(()=>{const P=window.BlazingUnitProgression,before=P.unit('Tyler'),award=P.awardBattleXp({mode:'road',stage:1,names:['Tyler']}),after=P.unit('Tyler');return {before,award,after}});
  if(battleXp.award?.amount!==650||battleXp.award?.units?.length!==1||battleXp.after.lifetimeXp-battleXp.before.lifetimeXp!==650||battleXp.after.level!==5||battleXp.after.xp!==105)throw new Error(`early Road battle XP pacing regression: ${JSON.stringify(battleXp)}`);

  await page.locator('#forgeBack').click();await waitHome(page);await page.locator('#bbHomeApproved [data-nav="summon"]').click();
  await page.locator('#summonScreen.active #bbEmberExchange').waitFor({state:'visible'});
  let exchange=await page.locator('#bbEmberExchange').innerText();if(!/300\s*◈/.test(exchange)||!/WEEKLY\s*0\/10/i.test(exchange))throw new Error(`Ember exchange initial UI incorrect: ${exchange}`);
  const emberBefore=await page.evaluate(()=>window.BlazingEconomy.load());await page.locator('#bbBuyEmber').click();const emberAfter=await page.evaluate(()=>window.BlazingEconomy.load());
  if(emberAfter.embers!==emberBefore.embers+1||emberAfter.embersBoughtThisWeek!==1||emberAfter.battleMarks!==emberBefore.battleMarks-300)throw new Error(`Ember purchase state incorrect: ${JSON.stringify({emberBefore,emberAfter})}`);

  const expectedState=await page.evaluate(()=>({unit:window.BlazingUnitProgression.unit('Lebee'),economy:window.BlazingEconomy.load()}));await page.reload({waitUntil:'domcontentloaded'});await waitHome(page);
  const persisted=await page.evaluate(()=>({unit:window.BlazingUnitProgression.unit('Lebee'),economy:window.BlazingEconomy.load()}));
  if(JSON.stringify(persisted.unit)!==JSON.stringify(expectedState.unit)||persisted.economy.embers!==1||persisted.economy.embersBoughtThisWeek!==1||persisted.economy.battleMarks!==expectedState.economy.battleMarks)throw new Error(`progression/economy did not persist: ${JSON.stringify({expectedState,persisted})}`);

  await page.evaluate(()=>{const P=window.BlazingUnitProgression;P.reset();for(let awakening=0;awakening<4;awakening++){P.grantXp('Lebee',999999);P.addDuplicate('Lebee',1);const result=P.awaken('Lebee');if(!result?.ok)throw new Error(`setup awakening ${awakening+1} failed`)}P.grantXp('Lebee',999999);P.addDuplicate('Lebee',2);window.BlazingProgression.openForge('Lebee');window.BlazingProgressionEconomyUI.renderLevelPanel()});
  await page.locator('#resonanceScreen.active #bbLevelProgression').waitFor({state:'visible'});const shinyButton=page.locator('#bbLevelProgression button[data-action="awaken"]');await page.waitForFunction(()=>!document.querySelector('#bbLevelProgression button[data-action="awaken"]')?.disabled);await shinyButton.click();
  await page.locator('#bbProgressionFx.active.shiny').waitFor({state:'visible',timeout:2000});const shinyFx=await page.locator('#bbProgressionFx').innerText(),shiny=await page.evaluate(()=>window.BlazingUnitProgression.unit('Lebee'));
  if(!shiny.shiny||shiny.awakening!==5||shiny.level!==50||!/SHINY AWAKENED/i.test(shinyFx)||!/FINAL AWAKENING/i.test(shinyFx))throw new Error(`final Shiny state incorrect: ${JSON.stringify({shiny,shinyFx})}`);

  await page.evaluate(()=>{window.BlazingUnitProgression.reset();window.BlazingEconomy.reset()});
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Unit progression browser smoke PASS (${name}): insufficient-coin feedback, single leveling, exact MAX TO AWAKENING, accelerated early Road XP, Awakening/Shiny, Ember exchange, and persistence verified.`);
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;for(const [name,type] of Object.entries(TYPES)){try{await run(name,type)}catch(error){failed=true;console.error(`Unit progression browser smoke FAIL (${name}): ${error.stack||error.message}`)}}if(failed)process.exit(1);
