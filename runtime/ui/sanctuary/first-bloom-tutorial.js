(()=>{
'use strict';

const DEV=document.querySelector('meta[name="sanctuary-dev-build"]')?.content==='true'||['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const KEY=DEV?'bb:sanctuary:first-bloom:v4':'bb:sanctuary:first-bloom:release:v4';
const COACH_KEY=DEV?'bb:sanctuary:first-bloom:tutorial:v1':'bb:sanctuary:first-bloom:release:tutorial:v1';
const $=id=>document.getElementById(id);

let syncQueued=false;
let tutorialCeremony=false;

function readState(){
 try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}
}
function writeState(state){localStorage.setItem(KEY,JSON.stringify(state));}
function readCoach(){
 try{return JSON.parse(localStorage.getItem(COACH_KEY)||'{}')||{};}catch{return {};}
}
function writeCoach(value){localStorage.setItem(COACH_KEY,JSON.stringify(value||{}));}
function isTutorial(state){return Boolean(state&&Number(state.cultivationNumber)===1);}
function baseHarmony(state){return Object.values(state?.gardenApplied||{}).filter(Boolean).length*25;}
function tutorialHarmony(state){
 if(!isTutorial(state))return baseHarmony(state);
 return state.completed||state.gardenApplied?.pattern?100:0;
}
function tutorialReady(state){
 return Boolean(isTutorial(state)&&Number(state.treeStage)===6&&state.gardenApplied?.pattern);
}
function allAdvancedGardenApplied(state){
 const g=state?.gardenApplied||{};
 return Boolean(g.pattern&&g.motif&&g.stones&&g.refine);
}
function selectedTutorialGrove(state){
 const selected=document.querySelector('.grove-card.selected[data-grove]');
 if(!selected)return null;
 const index=Number(selected.dataset.grove);
 return Number.isInteger(index)?state?.grove?.[index]||null:null;
}
function setHarmonyDisplay(value){
 const pct=`${value}%`;
 if($('gardenPercent'))$('gardenPercent').textContent=pct;
 if($('gardenMeter'))$('gardenMeter').style.width=pct;
 if(value===100&&$('gardenStageLabel'))$('gardenStageLabel').textContent='First Bloom';
}
function addTutorialNote(){
 const panel=$('actionPanel');
 if(!panel||panel.querySelector('.tutorial-note'))return;
 const designActive=document.querySelector('.dock-tab[data-tab="design"].active');
 if(!designActive)return;
 const note=document.createElement('div');
 note.className='tutorial-note';
 note.innerHTML='<strong>TUTORIAL GARDEN</strong>Choose and apply one sand pattern. That is enough to finish your first bloom. Motifs, stones, and refinement become meaningful from Cultivation 2 onward.';
 panel.prepend(note);
}
function syncPanelHarmony(state){
 const designActive=document.querySelector('.dock-tab[data-tab="design"].active');
 if(!designActive)return;
 const badge=$('actionPanel')?.querySelector('.panel-head .stage-ready');
 if(badge&&/^\d+%$/.test((badge.textContent||'').trim()))badge.textContent=`${tutorialHarmony(state)}%`;
}
function simplifyMaturePanel(state){
 if(!tutorialReady(state)||state.completed)return;
 const button=document.querySelector('[data-action="complete"]');
 if(button){
  button.disabled=false;
  button.removeAttribute('disabled');
 }
 const panel=$('actionPanel');
 if(!panel)return;
 const harmonyChip=[...panel.querySelectorAll('.req-chip')].find(x=>/HARMONY/i.test(x.textContent||''));
 if(harmonyChip){
  harmonyChip.textContent='HARMONY 100%';
  harmonyChip.classList.add('done');
 }
 const head=panel.querySelector('.panel-head');
 const copy=head?.querySelector('p');
 if(copy)copy.textContent='Your first tree and tutorial garden are ready. Complete First Bloom to preserve it in the Grove.';
 if(head&&!head.querySelector('.stage-ready')){
  const ready=document.createElement('span');
  ready.className='stage-ready';
  ready.textContent='READY';
  head.append(ready);
 }
}
function hideUnchosenTutorialGroveLayers(state){
 const record=selectedTutorialGrove(state);
 if(!record?.tutorial)return;
 for(const id of ['motifLayer','stoneLayer']){
  const el=$(id);
  if(el)el.hidden=true;
 }
}
function coachStep(state){
 if(!isTutorial(state)||state.completed)return null;
 if(Number(state.treeStage)===1&&!state.stageCare?.water&&!state.stageCare?.nourish&&!state.stageCare?.shape){
  return {
   id:'intro',
   title:'Your First Cultivation',
   text:'Start in Cultivate. Water and nourish the bonsai, then advance it when the stage is ready. The first cycle is guided and intentionally simple.'
  };
 }
 if(Number(state.treeStage)===6&&!state.gardenApplied?.pattern){
  return {
   id:'garden',
   title:'Add One Garden Pattern',
   text:'The tree is mature. Open Design, choose any sand pattern you like, then tap Apply. For this tutorial, that single choice completes Garden Harmony.'
  };
 }
 if(tutorialReady(state)){
  return {
   id:'ready',
   title:'First Bloom Is Ready',
   text:'Return to Cultivate and tap Complete First Bloom. Your first bonsai will be saved to the Grove and earn one Harmony Seal.'
  };
 }
 return null;
}
function renderCoach(state){
 const root=$('tutorialCoach');
 if(!root)return;
 const step=coachStep(state);
 if(!step){
  root.hidden=true;
  return;
 }
 const seen=readCoach();
 if(seen[step.id]){
  root.hidden=true;
  return;
 }
 $('tutorialTitle').textContent=step.title;
 $('tutorialText').textContent=step.text;
 root.dataset.step=step.id;
 root.hidden=false;
}
function syncTutorialUi(){
 syncQueued=false;
 const state=readState();
 const app=$('sanctuaryApp');
 if(!state||!app)return;
 const tutorial=isTutorial(state);
 app.classList.toggle('tutorial-mode',tutorial);
 if(!tutorial){
  $('tutorialCoach')?.setAttribute('hidden','');
  return;
 }
 setHarmonyDisplay(tutorialHarmony(state));
 addTutorialNote();
 syncPanelHarmony(state);
 simplifyMaturePanel(state);
 hideUnchosenTutorialGroveLayers(state);
 renderCoach(state);
}
function queueSync(){
 if(syncQueued)return;
 syncQueued=true;
 requestAnimationFrame(syncTutorialUi);
}
function tutorialGroveRecord(state){
 return {
  id:`first-bloom-${state.cultivationNumber}`,
  cultivationNumber:state.cultivationNumber,
  completedAt:new Date().toISOString(),
  canopyType:state.canopyType,
  blossomVariant:state.blossomVariant,
  rakePattern:state.rakePattern,
  motif:state.motif,
  stoneLayout:state.stoneLayout,
  tutorial:true,
 };
}
function runTutorialCeremony(){
 tutorialCeremony=true;
 const app=$('sanctuaryApp');
 const el=$('ceremony');
 if(!el){location.reload();return;}
 el.hidden=false;
 el.querySelector('small').textContent='TUTORIAL COMPLETE';
 el.querySelector('strong').textContent='FIRST BLOOM';
 el.querySelector('span').textContent='YOUR FIRST GARDEN AWAKENS';
 app?.classList.add('ceremony-active');
 setTimeout(()=>{if(el.querySelector('span'))el.querySelector('span').textContent='HARMONY SEAL +1';},900);
 setTimeout(()=>location.reload(),2050);
}
function completeTutorial(){
 if(tutorialCeremony)return;
 const state=readState();
 if(!tutorialReady(state)||state.completed||state.completionClaimed)return;
 state.completed=true;
 state.completionClaimed=true;
 state.resources=state.resources||{};
 state.resources.harmonySeals=Math.max(0,Number(state.resources.harmonySeals)||0)+1;
 state.grove=Array.isArray(state.grove)?state.grove:[];
 const id=`first-bloom-${state.cultivationNumber}`;
 if(!state.grove.some(x=>x?.id===id))state.grove.push(tutorialGroveRecord(state));
 writeState(state);
 setHarmonyDisplay(100);
 runTutorialCeremony();
}
function dismissCoach(){
 const root=$('tutorialCoach');
 const step=root?.dataset.step;
 if(step){
  const seen=readCoach();
  seen[step]=true;
  writeCoach(seen);
 }
 if(root)root.hidden=true;
}

document.addEventListener('click',e=>{
 const button=e.target.closest('button');
 if(!button)return;
 if(button.id==='tutorialDismiss'){
  e.preventDefault();
  dismissCoach();
  return;
 }
 if(button.dataset.action==='complete'){
  const state=readState();
  if(tutorialReady(state)&&!allAdvancedGardenApplied(state)){
   e.preventDefault();
   e.stopImmediatePropagation();
   completeTutorial();
   return;
  }
 }
 setTimeout(queueSync,0);
},true);

const panel=$('actionPanel');
if(panel)new MutationObserver(queueSync).observe(panel,{subtree:true,childList:true,attributes:true,attributeFilter:['class','disabled']});
const scene=$('sceneViewport');
if(scene)new MutationObserver(queueSync).observe(scene,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','src','data-layout']});

window.__bbSanctuaryTutorial={
 isTutorial,
 tutorialHarmony,
 tutorialReady,
 sync:syncTutorialUi,
};

queueSync();
})();
