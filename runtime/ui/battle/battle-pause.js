(()=>{
'use strict';
const ROOT_ID='bbBattlePause';
const BUTTON_ID='bbBattlePauseButton';
let paused=false,pausedAt=0;

function state(){try{return typeof S!=='undefined'?S:null}catch{return null}}
function battle(){return document.getElementById('battleScreen')}
function active(){return !!battle()?.classList.contains('active')}
function resultsOpen(){return document.getElementById('bbMatchResults')?.classList.contains('active')}
function modeLabel(){const mode=state()?.bbRunMode;return mode==='road'?'BLAZING ROAD':mode==='castle'?'PHANTOM CASTLE':'BATTLE'}
function runtimeFn(name){try{const value=globalThis.eval(name);return typeof value==='function'?value:null}catch{return null}}
function resetButton(){return [...(battle()?.querySelectorAll('button')||[])].find(button=>/^\s*reset\s*$/i.test(button.textContent||''))||null}
function syncHome(){setTimeout(()=>{try{window.BlazingHomeV9Lifecycle?.schedule?.(0)}catch(_){}},0)}

function positionButton(button){
 const root=battle();if(!root||!button)return;
 if(button.parentElement!==root)root.appendChild(button);
 const reset=resetButton();
 if(reset){
  const rootRect=root.getBoundingClientRect(),resetRect=reset.getBoundingClientRect();
  const top=Math.max(8,Math.round(resetRect.bottom-rootRect.top+8));
  button.style.top=`${top}px`;
 }else if(!button.style.top)button.style.top='146px';
 button.style.right=innerWidth<=620?'8px':'10px';
}

function ensure(){
 let button=document.getElementById(BUTTON_ID);
 if(!button){
  button=document.createElement('button');button.id=BUTTON_ID;button.type='button';button.className='bb-battle-pause-button';button.setAttribute('aria-label','Pause battle');button.innerHTML='<span></span><span></span><b>PAUSE</b>';
  button.addEventListener('click',()=>setPaused(true));
 }
 positionButton(button);
 let root=document.getElementById(ROOT_ID);
 if(!root){
  root=document.createElement('div');root.id=ROOT_ID;root.className='bb-battle-pause';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','bbPauseTitle');
  root.innerHTML='<section class="bb-pause-card"><div class="bb-pause-kicker" id="bbPauseKicker">BATTLE</div><h2 id="bbPauseTitle">PAUSED</h2><p>Battle flow is frozen. Resume when ready or return to the main menu.</p><div class="bb-pause-actions"><button type="button" data-pause-action="resume" class="primary">RESUME</button><button type="button" data-pause-action="exit">EXIT TO MAIN MENU</button></div><small>Exiting does not award rewards or advance the encounter.</small></section>';
  document.body.appendChild(root);
  root.addEventListener('click',event=>{
   const action=event.target.closest('[data-pause-action]')?.dataset.pauseAction;
   if(action==='resume')setPaused(false);
   if(action==='exit')exitBattle();
  });
 }
 return {button,root};
}

function setPaused(next){
 const ui=ensure();next=!!next;
 if(next===paused)return paused;
 if(next){
  if(!active()||resultsOpen())return false;
  paused=true;pausedAt=performance.now();
  const s=state();if(s)s.bbPaused=true;
  ui.root.classList.add('active');document.body.classList.add('bb-battle-paused');
  document.getElementById('bbPauseKicker').textContent=modeLabel();
  ui.root.querySelector('[data-pause-action="resume"]')?.focus({preventScroll:true});
 }else{
  const elapsed=pausedAt?performance.now()-pausedAt:0;
  paused=false;pausedAt=0;
  const s=state();if(s){s.bbPaused=false;if(Number.isFinite(s._chargeSince))s._chargeSince+=elapsed}
  ui.root.classList.remove('active');document.body.classList.remove('bb-battle-paused');
 }
 sync();return paused;
}

function clone(value){try{return value?JSON.parse(JSON.stringify(value)):null}catch{return null}}
function roadResetSnapshot(){
 const s=state();if(!s||s.bbRunMode!=='road')return null;
 const run=clone(s.bbRoadRun||window.BlazingRoadRun?.loadRun?.());
 const stage=Math.max(1,Number(s.bbRoadStage||run?.stage)||1);
 return {stage,run};
}
function restoreRoadReset(snapshot){
 if(!snapshot||!active())return false;
 const s=state();if(!s)return false;
 try{if(snapshot.run&&window.BlazingRoadRun?.saveRun)window.BlazingRoadRun.saveRun(snapshot.run)}catch(_){}
 s.bbRunMode='road';
 s.bbRoadStage=snapshot.stage;
 if(snapshot.run)s.bbRoadRun=snapshot.run;
 try{
  const begin=runtimeFn('beginRoadBattle');
  if(begin)begin();
  else{
   const applyStage=runtimeFn('roadApplyStageContent');if(applyStage)applyStage(snapshot.stage);
   if(snapshot.run&&window.BlazingRoadRun?.applyRunToBattle){
    const fighters=runtimeFn('roadBattleFighters')?.(s)||[];
    window.BlazingRoadRun.applyRunToBattle(snapshot.run,fighters);
   }
  }
 }catch(error){console.warn('Road reset restore stage failed',error)}
 try{
  const setMap=runtimeFn('setBattleMap');
  if(setMap)s.bbRoadMapSource=setMap('road',s.bbRoadStage||snapshot.stage);
 }catch(error){console.warn('Road reset restore map failed',error)}
 s._chargeSince=performance.now();
 try{runtimeFn('updateUI')?.();runtimeFn('draw')?.()}catch(_){}
 window.dispatchEvent(new CustomEvent('bb:road-reset-restored',{detail:{stage:s.bbRoadStage||snapshot.stage}}));
 window.BlazingTerrainDebug?.redraw?.();
 return true;
}

function exitBattle(){
 setPaused(false);
 try{window.BlazingMatchResults?.returnHome?.();syncHome();return}catch{}
 battle()?.classList.remove('active');
 document.querySelectorAll('.screen.active').forEach(screen=>{if(screen.id!=='menuScreen')screen.classList.remove('active')});
 const menu=document.getElementById('menuScreen');if(menu){menu.style.display='grid';menu.classList.add('active')}
 syncHome();
}

function sync(){
 const {button,root}=ensure(),show=active()&&!resultsOpen();
 positionButton(button);
 button.classList.toggle('visible',show&&!paused);
 button.disabled=!show||paused;
 if((!active()||resultsOpen())&&paused)setPaused(false);
 if(!paused)root.classList.remove('active');
}

document.addEventListener('click',event=>{
 const button=event.target.closest('button');
 if(!button||!battle()?.contains(button)||!/^\s*reset\s*$/i.test(button.textContent||''))return;
 const snapshot=roadResetSnapshot();if(!snapshot)return;
 setTimeout(()=>restoreRoadReset(snapshot),0);
},true);

document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||!active()||resultsOpen())return;
 event.preventDefault();setPaused(!paused);
});
window.addEventListener('blur',()=>{if(active()&&!resultsOpen()&&!paused)setPaused(true)});
window.addEventListener('resize',()=>{const button=document.getElementById(BUTTON_ID);if(button)positionButton(button)},{passive:true});
window.BlazingBattlePause=Object.freeze({isPaused:()=>paused,pause:()=>setPaused(true),resume:()=>setPaused(false),exitBattle,sync,restoreRoadReset});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensure();sync()},{once:true});else{ensure();sync()}
setInterval(sync,220);
})();
