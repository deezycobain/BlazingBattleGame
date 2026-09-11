import { chromium, webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const TYPES={chromium,webkit};

async function waitHome(page){
  await page.locator('#bbHomeApproved[data-bb-home-version="approved-v4"]').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(async()=>loading.waitFor({state:'detached',timeout:5000}));
  await page.waitForFunction(()=>typeof window.BlazingRoadRun==='object'&&typeof window.BlazingRoadCamera==='object'&&typeof window.BlazingRoadContent==='object',{timeout:30000});
}

async function enterFreshRoad(page){
  await page.evaluate(()=>{
    window.BlazingRoadRun?.clearRun?.();
    try{
      for(let i=sessionStorage.length-1;i>=0;i--){
        const key=sessionStorage.key(i);
        if(key?.startsWith('bbRoadIntroSeen:'))sessionStorage.removeItem(key);
      }
    }catch{}
  });
  const panel=page.locator('#bbHomeApproved .bb-home-v4-battle');
  if(!await panel.isVisible())await page.locator('#bbHomeApproved [data-nav="battle"]').click();
  await panel.waitFor({state:'visible',timeout:5000});
  await page.locator('#bbHomeApproved [data-mode="road"]').click();
  await page.waitForFunction(()=>{
    try{
      const s=globalThis.eval('S');
      return document.getElementById('battleScreen')?.classList.contains('active')&&s?.bbRunMode==='road'&&s?.bbRoadStage===1&&window.BlazingRoadCamera?.snapshot?.()?.active;
    }catch{return false}
  },null,{timeout:15000});
}

async function readFrame(page,wallMs){
  return page.evaluate(wall=>{
    const snap=window.BlazingRoadCamera?.snapshot?.()||{};
    const overlay=document.getElementById('bbRoadFightIntro');
    const word=overlay?.querySelector('.bb-road-fight-word');
    const style=word?getComputedStyle(word):null;
    const canvas=document.getElementById(snap.canvasId||'game');
    const rect=canvas?.getBoundingClientRect?.();
    return {
      wallMs:wall,
      active:!!snap.active,
      mode:snap.mode||null,
      phase:snap.introPhase||null,
      locked:!!snap.locked,
      word:snap.word||null,
      targetScale:Number(snap.targetScale)||1,
      introScale:Number(snap.introScale)||1,
      combatScale:Number(snap.combatScale)||1,
      countdownStepMs:Number(snap.countdownStepMs)||0,
      fightHoldMs:Number(snap.fightHoldMs)||0,
      transitionMs:Number(snap.transitionMs)||0,
      introElapsedMs:Number(snap.introElapsedMs)||0,
      fightElapsedMs:Number(snap.fightElapsedMs)||0,
      position:snap.position||'',
      rect:rect?{left:rect.left,top:rect.top,width:rect.width,height:rect.height}:null,
      inlineScale:canvas?.style?.scale||'',
      inlineTransform:canvas?.style?.transform||'',
      wordStyle:style?{
        opacity:Number.parseFloat(style.opacity)||0,
        animationName:style.animationName,
        animationDuration:style.animationDuration,
        fontFamily:style.fontFamily,
        fontStyle:style.fontStyle,
        letterSpacing:style.letterSpacing,
        transform:style.transform
      }:null
    };
  },wallMs);
}

function firstByWord(frames,word){return frames.find(frame=>frame.word===word)}
function firstTime(frames,word){return firstByWord(frames,word)?.wallMs??NaN}
function compactWords(frames){
  const result=[];
  for(const frame of frames){
    if(!frame.word)continue;
    if(result.at(-1)!==frame.word)result.push(frame.word);
  }
  return result;
}

async function run(name,type){
  let browser;
  try{
    console.log(`Road intro smoke START (${name}) -> ${BASE}`);
    browser=await type.launch({headless:true,timeout:15000});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:name==='webkit'});
    const page=await context.newPage();
    page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
    await waitHome(page);
    const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
    if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error(`commit mismatch: expected ${EXPECT.slice(0,12)}, got ${meta?.commit||'missing'}`);
    await enterFreshRoad(page);

    const frames=[];
    const started=Date.now();
    for(let i=0;i<220;i++){
      const frame=await readFrame(page,Date.now()-started);
      frames.push(frame);
      if(frame.mode==='combat'&&!frame.locked&&frame.targetScale>1.05)break;
      await page.waitForTimeout(35);
    }

    const words=compactWords(frames);
    if(JSON.stringify(words)!==JSON.stringify(['3','2','1','FIGHT']))throw new Error(`ordered 3-2-1-FIGHT sequence regressed: ${JSON.stringify(words)}`);
    for(const word of ['3','2','1']){
      const samples=frames.filter(frame=>frame.word===word);
      if(!samples.length)throw new Error(`${word} was never sampled`);
      if(samples.some(frame=>frame.mode!=='intro'||frame.phase!=='countdown'||!frame.locked||Math.abs(frame.targetScale-1)>.001))throw new Error(`${word} must remain locked at full-map scale 1: ${JSON.stringify(samples.slice(0,4))}`);
    }

    const two=firstTime(frames,'2'),one=firstTime(frames,'1'),fightTime=firstTime(frames,'FIGHT');
    if(!(Number.isFinite(two)&&Number.isFinite(one)&&Number.isFinite(fightTime)))throw new Error('countdown timestamps missing');
    if(one-two<600||fightTime-one<600)throw new Error(`countdown steps are not dramatic enough: ${JSON.stringify({two,one,fightTime})}`);

    const fightFrames=frames.filter(frame=>frame.word==='FIGHT');
    const fightFirst=fightFrames[0];
    if(!fightFirst||fightFirst.mode!=='intro'||fightFirst.phase!=='fight'||!fightFirst.locked||!(fightFirst.targetScale>1.05))throw new Error(`FIGHT must begin the locked camera move: ${JSON.stringify(fightFirst)}`);
    if(fightFirst.countdownStepMs<700||fightFirst.transitionMs<1400||fightFirst.fightHoldMs<900)throw new Error(`authored intro timing too fast: ${JSON.stringify(fightFirst)}`);
    if(!/bbRoadFightStrike/.test(fightFirst.wordStyle?.animationName||''))throw new Error(`FIGHT brush animation missing: ${JSON.stringify(fightFirst.wordStyle)}`);
    if(!/AnimeAce2/i.test(fightFirst.wordStyle?.fontFamily||'')||fightFirst.wordStyle?.fontStyle!=='italic')throw new Error(`ninja/anime typography missing: ${JSON.stringify(fightFirst.wordStyle)}`);
    if(!(Number.parseFloat(fightFirst.wordStyle?.letterSpacing||'0')<0))throw new Error(`brush typography should be tightly tracked: ${JSON.stringify(fightFirst.wordStyle)}`);

    const visibleFight=fightFrames.find(frame=>(frame.wordStyle?.opacity||0)>.55);
    const fadedFight=fightFrames.find(frame=>frame.fightElapsedMs>1080&&(frame.wordStyle?.opacity||0)<.08&&frame.locked);
    if(!visibleFight||!fadedFight)throw new Error(`FIGHT must visibly strike, fade, and leave combat locked while camera finishes: ${JSON.stringify(fightFrames.map(f=>({fightElapsedMs:f.fightElapsedMs,opacity:f.wordStyle?.opacity,locked:f.locked,targetScale:f.targetScale})).slice(-18))}`);
    if(fadedFight.rect&&fightFirst.rect&&!(fadedFight.rect.width>fightFirst.rect.width*1.025))throw new Error(`camera did not visibly progress while FIGHT faded: ${JSON.stringify({first:fightFirst.rect,late:fadedFight.rect})}`);

    const combat=frames.find(frame=>frame.mode==='combat'&&!frame.locked);
    if(!combat)throw new Error(`combat never unlocked after intro: ${JSON.stringify(frames.slice(-8))}`);
    if(!(combat.targetScale>1.05&&Math.abs(combat.targetScale-combat.combatScale)<.001&&/center/i.test(combat.position)))throw new Error(`final combat framing invalid: ${JSON.stringify(combat)}`);
    if(Math.abs(combat.targetScale-1.18)>.001||combat.transitionMs!==1650)throw new Error(`Road camera tuning incorrect: ${JSON.stringify(combat)}`);
    if(combat.wallMs-fightTime<1450)throw new Error(`combat unlocked before the slower camera arrived: ${JSON.stringify({fightTime,combatTime:combat.wallMs,transitionMs:combat.transitionMs})}`);
    const countFrame=firstByWord(frames,'3');
    if(countFrame?.rect&&combat.rect&&!(combat.rect.width>countFrame.rect.width*1.05))throw new Error(`final framing did not complete the zoom: ${JSON.stringify({intro:countFrame.rect,combat:combat.rect})}`);

    const sizing=await page.evaluate(()=>{
      const state=globalThis.eval('S');
      const source=String(globalThis.eval('drawUnit'));
      const code=source.match(/const bbRoadCameraCompensation=[\s\S]*?ctx.translate\(0,5\);/)?.[0];
      if(!code)throw new Error('final sprite renderer has no Road camera compensation');
      const C=window.BlazingRoadContent;
      const geometry=()=>JSON.stringify({
        pairs:state.pairs.map(p=>({x:p.x,y:p.y,r:p.r,units:p.units.map(u=>({name:u.name,r:u.r,radius:u.radius,combat:u.combat}))})),
        enemies:state.enemies.map(e=>({x:e.x,y:e.y,r:e.r,radius:e.radius})),
        movement:state.bbRoadContent.map.movement,feet:C.PLAYER_FOOT_PADDING,enemyPadding:C.ENEMY_TERRAIN_PADDING
      });
      const before=geometry();
      // Execute the exact final renderer expression with a recording canvas;
      // exercise every map and several perspective depths without ticking combat.
      const render=new Function('S','ctx','directionalFlip','scale','activePulse','bbRoadDepthScale',code);
      let maxError=0;
      for(const map of C.MAPS)for(const depth of [.82,1,1.1]){
        let actual;
        render({...state,bbRoadContent:{...state.bbRoadContent,map}},{scale:(x,y)=>{actual=y},translate:()=>{}},1,1,1,depth);
        maxError=Math.max(maxError,Math.abs(actual*map.presentation.combatScale-1.15*depth));
      }
      let castle;
      render({...state,bbRunMode:'castle'},{scale:(x,y)=>{castle=y},translate:()=>{}},1,1,1,1);
      return {maxError,castle,unchanged:before===geometry(),feet:C.PLAYER_FOOT_PADDING,enemyPadding:C.ENEMY_TERRAIN_PADDING};
    });
    if(sizing.maxError>1e-9||Math.abs(sizing.castle-1.15)>1e-9||!sizing.unchanged||sizing.feet!==4||sizing.enemyPadding!==18)throw new Error(`sprite presentation/geometry separation failed: ${JSON.stringify(sizing)}`);

    const outro=await page.evaluate(()=>{
      const s=globalThis.eval('S');
      s.victoryFX=s.victoryFX||{bbRoadCameraSmoke:true};
      window.BlazingRoadCamera.sync();
      const snap=window.BlazingRoadCamera.snapshot();
      const canvas=document.getElementById(snap.canvasId||'game');
      return {...snap,inlineScale:canvas?.style?.scale||'',inlineTransform:canvas?.style?.transform||'',inlineTransition:canvas?.style?.transition||''};
    });
    if(outro.mode!=='outro'||outro.locked||Math.abs(outro.targetScale-1)>.001||outro.transitionMs<1400)throw new Error(`ending camera did not target the full-map outro: ${JSON.stringify(outro)}`);
    if(!/1650ms|1\.65s/.test(outro.inlineTransition||''))throw new Error(`outro did not retain the slower eased transition: ${JSON.stringify(outro)}`);
    if(errors.length)throw new Error(`page errors: ${errors.join(' | ')}`);

    console.log(`Road intro smoke PASS (${name}): ${words.join('→')}; step=${fightFirst.countdownStepMs}ms; fightFade≈${Math.round(fadedFight.fightElapsedMs)}ms; camera=${fightFirst.transitionMs}ms; zoom=${combat.targetScale}; outro=${outro.targetScale}`);
    await context.close();
  }finally{
    await browser?.close().catch(()=>{});
  }
}

for(const [name,type] of Object.entries(TYPES))await run(name,type);
