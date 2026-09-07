(()=>{
'use strict';

const STYLE_ID='bb-home-live-v6-style';
const SHELL_ID='bbHomeApproved';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
#${SHELL_ID}.bb-home-live-v6 .bb-home-v5-leader{
 transform-origin:56% 100%;
 animation:bbHomeV6LeaderIdle 5.8s cubic-bezier(.45,.05,.55,.95) infinite;
}
#${SHELL_ID}.bb-home-live-v6 .bb-home-v5-leader:before{
 animation:bbHomeV6Aura 4.8s ease-in-out infinite;
}
#${SHELL_ID}.bb-home-live-v6 .bb-home-v4-feature-copy{padding-bottom:clamp(27px,4.8vw,39px)}
#${SHELL_ID} .bb-home-v6-road-progress{
 position:absolute;z-index:5;left:clamp(24px,7vw,62px);right:clamp(24px,7vw,62px);bottom:clamp(9px,1.5vh,13px);
 display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;pointer-events:none;
}
#${SHELL_ID} .bb-home-v6-road-progress[hidden]{display:none!important}
#${SHELL_ID} .bb-home-v6-road-track{
 position:relative;height:4px;overflow:hidden;border-radius:999px;background:rgba(255,244,225,.13);box-shadow:inset 0 1px 2px rgba(0,0,0,.45),0 0 0 1px rgba(255,226,198,.05);
}
#${SHELL_ID} .bb-home-v6-road-track i{
 display:block;width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,#b72332,#ff7e52 64%,#ffd28b);box-shadow:0 0 10px rgba(255,89,59,.58);transition:width .32s cubic-bezier(.2,.7,.2,1);
}
#${SHELL_ID} .bb-home-v6-road-progress b{
 white-space:nowrap;font:950 clamp(5px,.76vw,7px)/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.13em;color:rgba(255,239,218,.78);text-shadow:0 2px 4px rgba(0,0,0,.62);
}
#${SHELL_ID}[data-bb-road-state="active"] .bb-home-v4-feature{
 filter:drop-shadow(0 14px 25px rgba(0,0,0,.4)) drop-shadow(0 0 12px rgba(190,31,45,.18));
}
#${SHELL_ID}[data-bb-road-state="active"] .bb-home-v4-tag{animation:bbHomeV6TagPulse 2.6s ease-in-out infinite}
#${SHELL_ID}[data-bb-road-state="complete"] .bb-home-v6-road-track i{background:linear-gradient(90deg,#d38b32,#ffe096,#fff4cf)}
#${SHELL_ID}[data-bb-road-state="failed"] .bb-home-v6-road-track i{filter:saturate(.45);opacity:.65}
@keyframes bbHomeV6LeaderIdle{
 0%,100%{transform:translate3d(0,0,0) rotate(-.18deg)}
 28%{transform:translate3d(-1px,-3px,0) rotate(.08deg)}
 58%{transform:translate3d(1px,-6px,0) rotate(.2deg)}
 78%{transform:translate3d(0,-2px,0) rotate(-.04deg)}
}
@keyframes bbHomeV6Aura{0%,100%{opacity:.68;transform:translateX(-50%) scale(.96)}50%{opacity:1;transform:translateX(-50%) scale(1.06)}}
@keyframes bbHomeV6TagPulse{0%,100%{filter:drop-shadow(0 6px 9px rgba(0,0,0,.35)) brightness(1)}50%{filter:drop-shadow(0 7px 12px rgba(143,20,32,.5)) brightness(1.08)}}
@media(max-width:620px){
 #${SHELL_ID}.bb-home-live-v6 .bb-home-v4-feature-copy{padding-bottom:25px}
 #${SHELL_ID} .bb-home-v6-road-progress{left:22px;right:22px;bottom:8px;gap:6px}
 #${SHELL_ID} .bb-home-v6-road-track{height:3px}
 #${SHELL_ID} .bb-home-v6-road-progress b{font-size:5px}
}
@media(prefers-reduced-motion:reduce){
 #${SHELL_ID}.bb-home-live-v6 .bb-home-v5-leader,#${SHELL_ID}.bb-home-live-v6 .bb-home-v5-leader:before,#${SHELL_ID} .bb-home-v4-tag{animation:none!important}
 #${SHELL_ID} .bb-home-v6-road-track i{transition:none!important}
}
`;
 document.head.appendChild(style);
}

function ensureProgress(shell){
 const feature=shell?.querySelector('.bb-home-v4-feature');
 if(!feature)return null;
 let progress=feature.querySelector('.bb-home-v6-road-progress');
 if(progress)return progress;
 progress=document.createElement('div');
 progress.className='bb-home-v6-road-progress';
 progress.hidden=true;
 progress.setAttribute('aria-hidden','true');
 progress.innerHTML='<span class="bb-home-v6-road-track"><i></i></span><b>STAGE 1 / 10</b>';
 feature.appendChild(progress);
 return progress;
}

function readRun(){
 try{return window.BlazingRoadRun?.loadRun?.()||null}catch{return null}
}

function viewForRun(run){
 if(!run)return {state:'fresh',stage:1,progress:0,showProgress:false,kicker:'FEATURED',title:'ENTER THE BATTLE',desc:'Blazing Road · Phantom Castle',label:'STAGE 1 / 10'};
 const stage=clamp(run.stage,1,10);
 const cleared=clamp(stage-1,0,10);
 if(run.status==='complete')return {state:'complete',stage:10,progress:100,showProgress:true,kicker:'ROAD CLEARED',title:'BLAZING ROAD COMPLETE',desc:'10 stages cleared · Phantom Castle awaits',label:'10 / 10 COMPLETE'};
 if(run.status==='failed')return {state:'failed',stage,progress:cleared*10,showProgress:true,kicker:'RUN ENDED',title:'BLAZING ROAD FALLEN',desc:`Stage ${stage} reached · Restart when ready`,label:`STAGE ${stage} / 10`};
 return {state:'active',stage,progress:cleared*10,showProgress:true,kicker:'RUN IN PROGRESS',title:'CONTINUE BLAZING ROAD',desc:`Stage ${stage} of 10 · Squad HP carries forward`,label:`STAGE ${stage} / 10`};
}

function setText(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value)}

function syncRoad(shell,run=readRun()){
 if(!shell)return null;
 const feature=shell.querySelector('.bb-home-v4-feature');
 const copy=feature?.querySelector('.bb-home-v4-feature-copy');
 const progress=ensureProgress(shell);
 if(!feature||!copy||!progress)return null;
 const view=viewForRun(run);
 setText(copy.querySelector('small'),view.kicker);
 setText(copy.querySelector('strong'),view.title);
 setText(copy.querySelector('span'),view.desc);
 setText(progress.querySelector('b'),view.label);
 const fill=progress.querySelector('i');
 if(fill)fill.style.width=`${view.progress}%`;
 progress.hidden=!view.showProgress;
 shell.dataset.bbRoadState=view.state;
 shell.dataset.bbRoadStage=String(view.stage);
 feature.setAttribute('aria-label',view.state==='active'?`Open Battle modes, Blazing Road stage ${view.stage}`:'Open Battle modes');
 return view;
}

function apply(){
 ensureStyle();
 const shell=document.getElementById(SHELL_ID);
 if(!shell)return false;
 shell.classList.add('bb-home-live-v6');
 shell.dataset.bbHomeLivePolish='v6';
 syncRoad(shell);
 return true;
}

const previousRoadSync=window.roadSyncCard;
window.roadSyncCard=function(run){
 try{if(typeof previousRoadSync==='function')previousRoadSync(run)}catch(error){console.warn('Home v6 previous Road sync failed',error)}
 try{syncRoad(document.getElementById(SHELL_ID),run)}catch(error){console.warn('Home v6 Road feature sync failed',error)}
};

let queued=false;
function schedule(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;apply()});
}

window.addEventListener('storage',schedule);
window.addEventListener('pageshow',schedule);
window.addEventListener('resize',schedule,{passive:true});
document.addEventListener('click',event=>{
 const menu=document.getElementById('menuScreen');
 if(menu?.contains(event.target))setTimeout(schedule,0);
},true);
new MutationObserver(records=>{
 const relevant=records.some(record=>{
  if(record.type==='attributes')return record.target?.id==='menuScreen'||record.target?.id===SHELL_ID;
  if(record.type!=='childList')return false;
  if(record.target?.id==='menuScreen'||record.target?.id===SHELL_ID)return true;
  return [...record.addedNodes,...record.removedNodes].some(node=>node?.nodeType===1&&(node.id===SHELL_ID||node.querySelector?.(`#${SHELL_ID}`)));
 });
 if(relevant)schedule();
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});

Promise.resolve(window.BLAZING_UNIT_DATA_READY).catch(()=>null).finally(schedule);
setTimeout(apply,0);
setTimeout(apply,220);
window.BlazingHomeLivePolish=Object.freeze({apply,syncRoad,viewForRun});
})();
