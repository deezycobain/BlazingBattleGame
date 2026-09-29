import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};
await fs.mkdir('test-artifacts',{recursive:true});

async function waitHome(page){
 await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
 const loading=page.locator('#bb-loading-screen');
 if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
 await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingCombatRuntime==='object',null,{timeout:30000});
}

async function enterRoad(page){
 const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
 if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
 await panel.waitFor({state:'visible',timeout:5000});
 await page.locator('#bbHomeApproved [data-mode="road"]').click();
 await page.waitForFunction(()=>{
  try{const s=globalThis.eval('S');return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'}catch{return false}
 },null,{timeout:15000});
}

async function run(name,type){
 let browser;
 try{
  console.log(`Itachi battle smoke START (${name}) -> ${BASE}`);
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
  await context.addInitScript(()=>localStorage.setItem('blazingBattle.activeTeam.v6',JSON.stringify(['Itachi','Tyler','Lebee','Senku','Sub-Zero','Crimson'])));
  const page=await context.newPage();
  page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});await waitHome(page);
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
  await page.evaluate(()=>window.BlazingRoadRun.clearRun());
  await enterRoad(page);
  await page.waitForFunction(()=>{try{const s=globalThis.eval('S'),front=globalThis.eval('front');return !!s.pairs.find(p=>front(p)?.name==='Itachi')}catch{return false}},null,{timeout:5000});

  const contract=await page.evaluate(async()=>{
   const html=document.documentElement.innerHTML;
   const s=globalThis.eval('S'),front=globalThis.eval('front'),roster=globalThis.eval('BATTLE_ROSTER'),active=globalThis.eval('ACTIVE_PLAYABLE_UNITS');
   const idle=globalThis.eval("unitIdleFrames('Itachi')"),runFrames=globalThis.eval('ITACHI_RUN_FRAMES'),basic=globalThis.eval("unitAttackFrames('Itachi','basic_attack')"),jutsu=globalThis.eval("unitAttackFrames('Itachi','tsukuyomi')"),crowFrames=globalThis.eval('ITACHI_CROW_ATTACK_VFX_FRAMES');
   const pair=s.pairs.find(p=>front(p)?.name==='Itachi');
   const waitLoaded=async frames=>{for(let i=0;i<30;i++){if(frames.length&&frames.every(img=>img.complete&&img.naturalWidth>0))return true;await new Promise(r=>setTimeout(r,100))}return false};
   const visual=window.BLAZING_FIGHTER_VISUAL_STANDARD||null;
   return {
    registered:!!roster.Itachi,active:[...active],team:s.pairs.map(p=>front(p)?.name),pair:pair?{x:pair.x,y:pair.y}:null,
    idleCount:idle.length,runCount:runFrames.length,basicCount:basic.length,jutsuCount:jutsu.length,crowFrameCount:crowFrames.length,
    idleLoaded:await waitLoaded(idle),runLoaded:await waitLoaded(runFrames),basicLoaded:await waitLoaded(basic),jutsuLoaded:await waitLoaded(jutsu),crowFramesLoaded:await waitLoaded(crowFrames),
    scaleContract:{version:visual?.version||'',base:Number(visual?.baseRendererScale)||0,itachi:Number(visual?.legacySourceCompensation?.Itachi)||0},
    markers:{
     basic:html.includes('animateItachiCrowStrike'),jutsu:html.includes('animateItachiTsukuyomi'),status:html.includes('apply_status_targets')&&html.includes('status_turns'),
     scale:html.includes('blazing-fighter-visual-standard')&&html.includes('bbFighterVisualScale=bbVisualContract.baseRendererScale')&&html.includes('bbSourceCompensation=bbVisualContract.legacySourceCompensation[name]??1'),
     motion:html.includes("const itachiMotionFrames=name==='Itachi'")&&html.includes('ITACHI_RUN_FRAMES')&&html.includes('if(heldName&&Math.abs(pt.x-previousDragX)>=1.25)')&&html.includes('if(!isEnemy&&actor?.name&&S.drag&&S.dragUnitName===actor.name&&Number.isFinite(S.dragFacing))'),
     impact:html.includes("f.kind==='itachiTsukuyomiImpact'")&&html.includes("f.kind==='itachiStunPulse'"),crowFlock:html.includes('ITACHI_CROW_ATTACK_VFX_FRAMES')&&html.includes('vfx/basic/crows/runtime/frame_12.png')&&html.includes('drawItachiCrowFrame'),
     fullscreenDom:html.includes('ensureItachiTsukuyomiCinematic')&&html.includes('position:fixed;inset:0;width:100vw;height:100dvh'),authoredOverlay:html.includes('ITACHI_TSUKUYOMI_OVERLAY_FRAMES'),authoredMandala:html.includes('ITACHI_TSUKUYOMI_MANDALA_FRAMES'),authoredTarget:html.includes('ITACHI_TSUKUYOMI_TARGET_FRAMES'),
     canvasTsukuyomiRemoved:!html.includes("f.kind==='itachiTsukuyomiOverlay'")&&!html.includes("f.kind==='itachiTsukuyomiMandala'")&&!html.includes("f.kind==='itachiTsukuyomiNightmare'")&&!html.includes("f.kind==='itachiTsukuyomiTarget'")
    }
   };
  });
  const requiredMarkers=Object.values(contract.markers).every(Boolean);
  const scaleOk=contract.scaleContract.version==='1.0.0'&&contract.scaleContract.base>0&&contract.scaleContract.itachi>0;
  if(!contract.registered||!contract.active.includes('Itachi')||!contract.team.includes('Itachi')||contract.idleCount!==12||contract.runCount!==12||contract.basicCount!==12||contract.jutsuCount!==6||contract.crowFrameCount!==12||!contract.idleLoaded||!contract.runLoaded||!contract.basicLoaded||!contract.jutsuLoaded||!contract.crowFramesLoaded||!requiredMarkers||!scaleOk)throw new Error(`Itachi battle contract incomplete: ${JSON.stringify(contract)}`);

  const basicResult=await page.evaluate(async()=>{
   const s=globalThis.eval('S'),front=globalThis.eval('front'),begin=globalThis.eval('beginActionToken'),animate=globalThis.eval('animateItachiCrowStrike');
   const pair=s.pairs.find(p=>front(p)?.name==='Itachi'),enemy=s.enemies.find(e=>e.hp>0);if(!pair||!enemy)return {error:'missing pair/enemy'};
   s.phase='resolve';s.floaters=[];begin();const before=enemy.hp,start=performance.now();let sawCrow=false;
   const outcome=await new Promise(resolve=>{const sample=setInterval(()=>{if(s.floaters.some(f=>f.kind==='itachiCrowStrike'))sawCrow=true},25);animate('Itachi',{x:pair.x,y:pair.y},enemy,()=>window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:1}),()=>{clearInterval(sample);resolve({elapsed:performance.now()-start})},'basic_attack');setTimeout(()=>{clearInterval(sample);resolve({timeout:true,elapsed:performance.now()-start})},3200)});
   return {...outcome,before,after:enemy.hp,sawCrow};
  });
  if(basicResult.error||basicResult.timeout||!basicResult.sawCrow||basicResult.after!==basicResult.before-1||basicResult.elapsed<1050)throw new Error(`Crow Chakra Strike failed: ${JSON.stringify(basicResult)}`);

  const jutsuPromise=page.evaluate(async()=>{
   const s=globalThis.eval('S'),front=globalThis.eval('front'),begin=globalThis.eval('beginActionToken'),animate=globalThis.eval('animateItachiTsukuyomi');
   const pair=s.pairs.find(p=>front(p)?.name==='Itachi'),targets=s.enemies.filter(e=>e.hp>0).slice(0,3),enemy=targets[0];if(!pair||!enemy||targets.length<2)return {error:'missing pair/enemies'};
   for(const target of targets){target.maxHp=Math.max(Number(target.maxHp)||0,200);target.hp=200;target.gauge=-1000;target.statusEffects={}}
   s.phase='resolve';s.floaters=[];begin();const before=targets.map(t=>t.hp),start=performance.now();let sawImpact=false,sawStun=false,maxStunPulses=0,impactStatusSnapshot=null;
   const outcome=await new Promise(resolve=>{const sample=setInterval(()=>{sawImpact||=s.floaters.some(f=>f?.kind==='itachiTsukuyomiImpact');sawStun||=s.floaters.some(f=>f?.kind==='itachiStunPulse');maxStunPulses=Math.max(maxStunPulses,s.floaters.filter(f=>f?.kind==='itachiStunPulse').length);if(sawImpact&&!impactStatusSnapshot)impactStatusSnapshot=targets.map(t=>window.BlazingCombatRuntime.getStatus(t,'stun')?.turns||0)},16);animate('Itachi',{x:pair.x,y:pair.y},enemy,()=>window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:1}),()=>{clearInterval(sample);resolve({elapsed:performance.now()-start})});setTimeout(()=>{clearInterval(sample);resolve({timeout:true,elapsed:performance.now()-start})},7000)});
   const root=document.getElementById('bb-itachi-tsukuyomi-cinematic');
   return {...outcome,before,after:targets.map(t=>({hp:t.hp,stun:window.BlazingCombatRuntime.getStatus(t,'stun')?.turns||0})),sawImpact,sawStun,maxStunPulses,impactStatusSnapshot,expectedSecondary:targets.length-1,domStillActive:!!root?.classList.contains('bb-active')};
  }).then(result=>({ok:true,result}),error=>({ok:false,error:String(error?.stack||error?.message||error)}));

  await page.waitForFunction(()=>{const root=document.getElementById('bb-itachi-tsukuyomi-cinematic'),overlays=[...root?.querySelectorAll('.bb-tsu-overlay')||[]],mandalas=[...root?.querySelectorAll('.bb-tsu-mandala')||[]];if(!root?.classList.contains('bb-active')||overlays.length!==2||mandalas.length!==2)return false;const rect=root.getBoundingClientRect(),style=getComputedStyle(root);window.__bbItachiTakeoverSmokeSnapshot={active:true,position:style.position||'',width:rect.width||0,height:rect.height||0,viewportW:innerWidth,viewportH:innerHeight,overlayCount:overlays.length,mandalaCount:mandalas.length};return true},null,{timeout:5000});
  const takeover=await page.evaluate(()=>window.__bbItachiTakeoverSmokeSnapshot||null);
  if(!takeover?.active||takeover.position!=='fixed'||takeover.width<takeover.viewportW*.98||takeover.height<takeover.viewportH*.98||takeover.overlayCount!==2||takeover.mandalaCount!==2)throw new Error(`Tsukuyomi takeover failed: ${JSON.stringify(takeover)}`);

  const jutsuOutcome=await jutsuPromise;if(!jutsuOutcome.ok)throw new Error(jutsuOutcome.error);
  const j=jutsuOutcome.result,primaryDamaged=j.after?.[0]?.hp===j.before?.[0]-1,secondaryUndamaged=j.after?.slice(1).every((state,index)=>state.hp===j.before[index+1]),secondaryPulseCoverage=j.maxStunPulses===j.expectedSecondary,primaryNotStunnedAtImpact=j.impactStatusSnapshot?.[0]===0;
  const fanout=await page.evaluate(()=>{const targets=[{statusEffects:{}},{statusEffects:{}}];const results=window.BlazingCombatRuntime.execute('apply_status_targets',{targets,parameters:{effect:'stun',turns:1,source:'Itachi'}});return {count:results?.length||0,turns:targets.map(t=>window.BlazingCombatRuntime.getStatus(t,'stun')?.turns||0)}});
  if(j.error||j.timeout||j.domStillActive||!j.sawImpact||!j.sawStun||!primaryDamaged||!secondaryUndamaged||!secondaryPulseCoverage||!primaryNotStunnedAtImpact||fanout.count!==2||!fanout.turns.every(v=>v===1)||j.elapsed<3400)throw new Error(`Tsukuyomi failed: ${JSON.stringify({j,fanout})}`);
  if(errors.length)throw new Error(`pageerror: ${errors.join(' | ')}`);
  console.log(`Itachi battle smoke PASS (${name}): canonical fighter scale contract, Crow Chakra Strike, and Tsukuyomi verified.`);
  await context.close();
 }finally{if(browser)await browser.close().catch(()=>{})}
}

let failed=false;
for(const [name,type] of Object.entries(TYPES)){
 let passed=false;
 for(let attempt=1;attempt<=2;attempt++){
  try{await run(name,type);passed=true;break}catch(error){const message=String(error?.stack||error?.message||error);const transient=/Target page, context or browser has been closed|browser has been closed|context has been closed/i.test(message);if(transient&&attempt<2){console.warn(`Itachi battle smoke transient browser-close (${name}), retrying once...`);continue}console.error(`Itachi battle smoke FAIL (${name}): ${message}`);break}
 }
 if(!passed)failed=true;
}
if(failed)process.exit(1);
