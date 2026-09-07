(()=>{
'use strict';

const STYLE_ID='bb-home-approved-compat-style';

function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
#menuScreen.bb-home-theme.bb-home-v4 .bb-economy-hud{
 display:flex!important;
 z-index:65!important;
 top:max(64px,calc(env(safe-area-inset-top) + 54px))!important;
 right:max(12px,env(safe-area-inset-right))!important;
 min-height:28px!important;
 padding:0 9px!important;
 border-color:rgba(255,226,190,.28)!important;
 background:rgba(17,10,14,.78)!important;
 box-shadow:0 7px 18px rgba(0,0,0,.28)!important;
}
#menuScreen.bb-home-theme.bb-home-v4 .bb-economy-hud:after{
 content:' BATTLE MARKS';
 font-size:7px;
 letter-spacing:.11em;
 color:rgba(255,238,221,.58);
}
@media(max-width:620px){
 #menuScreen.bb-home-theme.bb-home-v4 .bb-economy-hud{
  top:max(54px,calc(env(safe-area-inset-top) + 45px))!important;
  right:max(7px,env(safe-area-inset-right))!important;
  min-height:25px!important;
  padding:0 7px!important;
  font-size:9px!important;
 }
 #menuScreen.bb-home-theme.bb-home-v4 .bb-economy-hud:after{font-size:6px}
}
`;
 document.head.appendChild(style);
}

function syncRoad(run){
 const shell=document.getElementById('bbHomeApproved');
 if(!shell)return;
 const road=shell.querySelector('[data-mode="road"]');
 const castle=shell.querySelector('[data-mode="castle"]');
 if(road)road.dataset.bbHomeAction='road';
 if(castle)castle.dataset.bbHomeAction='castle';
 const desc=road?.querySelector('span:last-child');
 if(!desc)return;
 if(run?.status==='active')desc.textContent=`Stage ${Math.max(1,Number(run.stage)||1)} · Run in Progress`;
 else if(run?.status==='complete')desc.textContent='Road Complete · 10/10';
 else desc.textContent='Stage 1 · First Route';
}

function apply(){
 ensureStyle();
 try{window.BlazingMatchResults?.syncHud?.()}catch{}
 try{syncRoad(window.BlazingRoadRun?.loadRun?.())}catch{}
}

const previousRoadSync=window.roadSyncCard;
window.roadSyncCard=function(run){
 try{if(typeof previousRoadSync==='function')previousRoadSync(run)}catch(error){console.warn('Legacy Road card sync failed',error)}
 try{syncRoad(run)}catch(error){console.warn('Approved Home Road sync failed',error)}
};

new MutationObserver(records=>{
 if(records.some(record=>record.addedNodes.length))apply();
}).observe(document.body,{subtree:true,childList:true});
window.addEventListener('bb:economy',apply);
setTimeout(apply,0);
window.BlazingApprovedHomeCompat=Object.freeze({apply,syncRoad});
})();
