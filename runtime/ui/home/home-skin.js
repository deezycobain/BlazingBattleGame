(()=>{
'use strict';
const copy=el=>String(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
const visible=el=>{if(!el||el.hidden)return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';};
function score(el){
 const text=copy(el);
 let n=0;
 if(/SELECT\s+YOUR\s+PATH/i.test(text))n+=6;
 if(/\bINVENTORY\b/i.test(text))n+=2;
 if(/OWNED\s+FIGHTERS/i.test(text))n+=2;
 if(/\bLEVEL\b/i.test(text))n+=1;
 if(/\bBOSS\b/i.test(text))n+=1;
 if(/\bSUMMONS?\b/i.test(text))n+=1;
 return n;
}
function findHome(){
 const candidates=[...new Set(document.querySelectorAll('.screen,section,main,[role="main"],body>div'))].filter(el=>el.id!=='bbInventory'&&el.id!=='bbUnitDetails'&&visible(el));
 return candidates.map(el=>({el,score:score(el)})).filter(x=>x.score>=8).sort((a,b)=>b.score-a.score||a.el.querySelectorAll('*').length-b.el.querySelectorAll('*').length)[0]?.el||null;
}
function hideLegacyWallpaper(root){
 if(!root)return;
 const rr=root.getBoundingClientRect();
 for(const img of root.querySelectorAll('img')){
  const r=img.getBoundingClientRect();
  const s=getComputedStyle(img);
  const large=r.width>=rr.width*.78&&r.height>=rr.height*.55;
  const positioned=s.position==='absolute'||s.position==='fixed';
  if(large&&positioned)img.classList.add('bb-home-old-wallpaper');
 }
}
function apply(){
 const root=findHome();
 document.querySelectorAll('.bb-home-theme').forEach(el=>{if(el!==root)el.classList.remove('bb-home-theme');});
 if(!root)return false;
 root.classList.add('bb-home-theme');
 hideLegacyWallpaper(root);
 return true;
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});}
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});
document.addEventListener('click',()=>setTimeout(apply,0),true);
document.addEventListener('pointerup',()=>setTimeout(apply,0),true);
window.addEventListener('resize',schedule,{passive:true});
setTimeout(apply,0);
window.BlazingHomeSkin=Object.freeze({apply,findHome});
})();
