import {chromium,webkit} from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const EXPECT=(process.env.BB_EXPECT_COMMIT||'').trim();
const LEGACY_IDS=['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza'];
for(const [name,type] of Object.entries({chromium,webkit})){
 let browser;
 try{
  browser=await type.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name==='webkit',hasTouch:true});
  const page=await context.newPage();
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.BB_BUILD_META==='object',null,{timeout:30000});
  const meta=await page.evaluate(()=>window.BB_BUILD_META||null);
  if(EXPECT&&(!meta?.commit||!String(meta.commit).startsWith(EXPECT.slice(0,12))))throw new Error('commit mismatch');
  const contract=await page.evaluate(()=>{
   const get=globalThis.eval;
   const team=get('getActiveTeam()');
   const pairs=get('buildPlayerPairs(575)');
   return {team,pairCount:pairs.length,pairs:pairs.map(p=>({active:p.active,names:p.units.map(u=>u?.name||'—')})),key:get('TEAM_STORAGE_KEY'),playable:get('[...ACTIVE_PLAYABLE_UNITS]'),valid:get('validActiveTeam(getActiveTeam())')};
  });
  if(!contract.valid||contract.team.length!==6||new Set(contract.team).size!==6)throw new Error('six-unit team contract invalid: '+JSON.stringify(contract));
  if(contract.pairCount!==3||contract.pairs.some(p=>p.names.length!==2||p.names.some(n=>!n||n==='—')))throw new Error('three paired battle slots invalid: '+JSON.stringify(contract));
  if(contract.key!=='blazingBattle.activeTeam.v5')throw new Error('team storage version wrong: '+contract.key);
  if(!contract.playable.includes('Itachi')||!contract.playable.includes('Tyler'))throw new Error('paired roster missing current units: '+JSON.stringify(contract.playable));

  const ui=await page.evaluate(()=>{
   const get=globalThis.eval;
   const edit=[...document.querySelectorAll('button,[role="button"]')].find(el=>/EDIT TEAM/i.test(el.textContent||'')&&getComputedStyle(el).display!=='none');
   if(edit)edit.click();else{try{const fn=get('typeof showTeamScreen==="function"?showTeamScreen:null');if(fn)fn()}catch(_){}}
   const slots=[...document.querySelectorAll('#teamScreen .teamSlot[data-team-slot]')];
   const team=get('getActiveTeam()');
   return {visible:!!document.getElementById('teamScreen')&&getComputedStyle(document.getElementById('teamScreen')).display!=='none',slots:slots.length,pairs:document.querySelectorAll('#teamScreen .bb-team-pair').length,labels:slots.map(s=>s.dataset.slotLabel),names:slots.map(s=>s.querySelector('.teamSlotName')?.textContent?.trim()||''),team,save:document.getElementById('saveTeamBtn')?.textContent?.trim()};
  });
  const norm=value=>String(value||'').trim().toLowerCase();
  if(!ui.visible||ui.slots!==6||ui.pairs!==3||ui.save!=='SAVE 3 PAIRS'||JSON.stringify(ui.names.map(norm))!==JSON.stringify(ui.team.map(norm)))throw new Error('team editor pair UI invalid: '+JSON.stringify(ui));

  await page.waitForFunction(ids=>{
   const legacy=new Set(ids),rows=[...document.querySelectorAll('#teamScreen img')].map(img=>{const src=img.getAttribute('src')||'',m=src.match(/assets\/characters\/([^/]+)\//i);return{img,id:img.dataset.bbTeamUnit||(m?.[1]||''),src}}).filter(row=>legacy.has(row.id));
   return rows.length>=6&&rows.every(row=>/\/cards\/legacy_summon_art\.png$/i.test(row.src)&&getComputedStyle(row.img).objectFit==='cover');
  },LEGACY_IDS,{timeout:10000});
  const artContract=await page.evaluate(ids=>{const legacy=new Set(ids),root=document.getElementById('teamScreen'),rows=[...root.querySelectorAll('img')].map(img=>{const src=img.getAttribute('src')||'',m=src.match(/assets\/characters\/([^/]+)\//i);return{unit:img.dataset.bbTeamUnit||(m?.[1]||''),src,kind:img.dataset.bbTeamArt||'',legacy:img.dataset.bbTeamLegacy||'',fit:getComputedStyle(img).objectFit,transform:getComputedStyle(img).transform}}).filter(row=>legacy.has(row.unit)),wong=rows.find(row=>row.unit==='jackie_chan')||null;return{rows,wong,namedArt:rows.filter(row=>/legacy_of_shinobi_card|wong_fei_hung_refresh|\/sprites\//i.test(row.src)),text:(root.textContent||'').replace(/\s+/g,' ')}} ,LEGACY_IDS);
  if(artContract.rows.length<6||!artContract.wong||artContract.wong.fit!=='cover'||!/\/jackie_chan\/cards\/legacy_summon_art\.png/i.test(artContract.wong.src)||artContract.namedArt.length||!/Wong Fei-Hung/i.test(artContract.text)||/Jackie Chan/i.test(artContract.text))throw new Error('team editor clean Legacy card presentation invalid: '+JSON.stringify(artContract));

  const presentation=await page.evaluate(()=>{
   const root=document.getElementById('teamScreen');
   const slot=root?.querySelector('.teamSlot[data-team-slot]');
   const img=slot?.querySelector('img');
   const save=document.getElementById('saveTeamBtn');
   const actions=save?.closest('.teamActions');
   if(root)root.scrollTop=root.scrollHeight;
   const sr=slot?.getBoundingClientRect(),ir=img?.getBoundingClientRect(),ar=actions?.getBoundingClientRect();
   const rootStyle=root?getComputedStyle(root):null,actionStyle=actions?getComputedStyle(actions):null;
   return {overflowY:rootStyle?.overflowY||'',scrollHeight:root?.scrollHeight||0,clientHeight:root?.clientHeight||0,slotHeight:sr?.height||0,imageHeight:ir?.height||0,savePosition:actionStyle?.position||'',saveTop:ar?.top??9999,saveBottom:ar?.bottom??9999,viewport:innerHeight};
  });
  if(!/auto|scroll/i.test(presentation.overflowY)||presentation.slotHeight<70||presentation.imageHeight<presentation.slotHeight*.88||presentation.savePosition!=='fixed'||presentation.saveTop<0||presentation.saveBottom>presentation.viewport+2)throw new Error('team editor mobile presentation invalid: '+JSON.stringify(presentation));

  const swap=await page.evaluate(()=>{
   const get=globalThis.eval;
   get("S=fresh();S.bbRunMode='castle'");
   const before=get('front(S.pairs[0]).name');
   const partner=get('back(S.pairs[0]).name');
   get("S.ready={kind:'pair',ref:S.pairs[0],g:100};S.phase='player';S.drag=false;S.anim=null;document.getElementById('battleScreen').classList.add('active');updateUI()");
   window.BlazingBattleDock?.sync?.();
   const reserve=document.querySelector('#bbBattleDock .bb-dock-unit.active .bb-reserve-portrait');
   const reserveVisible=!!reserve&&getComputedStyle(reserve).display!=='none'&&!reserve.hidden;
   reserve?.click();
   const after=get('front(S.pairs[0]).name');
   return {before,partner,after,active:get('S.pairs[0].active'),reserveVisible};
  });
  if(!swap.reserveVisible||!swap.partner||swap.partner==='—'||swap.after!==swap.partner||swap.after===swap.before||swap.active!==1)throw new Error('partner portrait swap failed outside Road: '+JSON.stringify(swap));
  console.log('Team pair smoke PASS ('+name+'): 6 selected units -> clean card/full art including Legacy fighters, compact 3-pair editor, mobile scrolling, fixed Save, and live portrait swap.');
 }finally{if(browser)await browser.close().catch(()=>{})}
}
