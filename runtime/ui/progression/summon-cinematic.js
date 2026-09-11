(()=>{
'use strict';

const PARTICLE_COUNT=12;
const STREAK_COUNT=4;
let cinematicRun=0;

function cinematicMarkup(){
 const particles=Array.from({length:PARTICLE_COUNT},(_,index)=>{
  const angle=index*(360/PARTICLE_COUNT);
  const distance=118+(index%4)*14;
  const delay=(index%6)*-0.07;
  return `<i class="bb-cine-particle" style="--bb-angle:${angle}deg;--bb-distance:-${distance}px;--bb-burst-distance:-${Math.round(distance*1.55)}px;--bb-delay:${delay}s"></i>`;
 }).join('');
 const streaks=Array.from({length:STREAK_COUNT},(_,index)=>`<i class="bb-cine-streak bb-cine-streak-${index+1}"></i>`).join('');
 return `<div id="bbSummonCinematic" class="bb-summon-cinematic" aria-hidden="true"><span class="bb-cine-vignette"></span><span class="bb-cine-core"></span><span class="bb-cine-ring bb-cine-ring-a"></span><span class="bb-cine-ring bb-cine-ring-b"></span><span class="bb-cine-rays"></span><span class="bb-cine-impact"></span><span class="bb-cine-shiny-halo"></span><span class="bb-cine-streaks">${streaks}</span><span class="bb-cine-particles">${particles}</span></div>`;
}

function ensureCinematic(){
 const hero=document.querySelector('#summonPullScreen .pullHeroArea');
 if(!hero)return null;
 let fx=document.getElementById('bbSummonCinematic');
 if(!fx){hero.insertAdjacentHTML('afterbegin',cinematicMarkup());fx=document.getElementById('bbSummonCinematic')}
 const message=document.getElementById('pullMessage');
 if(message){message.setAttribute('aria-live','polite');message.setAttribute('aria-atomic','true')}
 return fx;
}

function revealKind(pull){
 if(pull?.shinyUnlock)return 'shiny';
 if(pull?.isNew)return 'new';
 return 'resonance';
}

function setupCinematicPull(pull,index,total){
 const fx=ensureCinematic();
 const scene=document.getElementById('pullScene')||document.querySelector('#summonPullScreen .pullScene');
 const wrap=document.getElementById('pullCardWrap');
 if(!fx||!scene||!wrap||!pull)return;
 const kind=revealKind(pull),rarity=String(pull.rarity||'rare').toLowerCase();
 const run=++cinematicRun;
 scene.dataset.bbCinematic='v1';
 scene.dataset.bbCinematicRarity=rarity;
 scene.dataset.bbRevealKind=kind;
 scene.dataset.bbRevealRun=String(run);
 wrap.dataset.bbRevealKind=kind;
 wrap.style.setProperty('--bb-pull-index',String(index||0));
 fx.dataset.bbRevealRun=String(run);
 fx.dataset.bbRevealKind=kind;
 fx.dataset.bbCinematicRarity=rarity;
 const badge=document.getElementById('pullNewBadge');
 if(badge)badge.textContent=pull.shinyUnlock?'SHINY AWAKENED':pull.isNew?'NEW FIGHTER':pull.progress||'RESONANCE';
 const message=document.getElementById('pullMessage');
 if(message)message.textContent=pull.shinyUnlock?'SHINY RESONANCE DETECTED...':pull.isNew?'NEW FIGHTER SIGNATURE DETECTED...':'RESONANCE SIGNATURE LOCKED...';
 const counter=document.getElementById('pullCounter')||document.querySelector('#summonPullScreen .largePullCounter');
 if(counter&&Number.isFinite(total)&&total>1)counter.dataset.bbSequence=`${Number(index||0)+1}/${total}`;
}

function decorateResults(pulls){
 const cards=[...document.querySelectorAll('#pullResultsGrid .pullCard')];
 cards.forEach((card,index)=>{
  const pull=pulls?.[index];
  card.style.setProperty('--bb-result-index',String(index));
  card.classList.toggle('bb-new-result-card',!!pull?.isNew);
  card.classList.toggle('bb-resonance-result-card',!!pull&&!pull.isNew&&!pull.shinyUnlock);
  card.dataset.bbRevealKind=pull?revealKind(pull):'resonance';
 });
 const scene=document.getElementById('pullScene')||document.querySelector('#summonPullScreen .pullScene');
 if(scene){scene.removeAttribute('data-bb-reveal-kind');scene.removeAttribute('data-bb-cinematic-rarity')}
}

function install(){
 ensureCinematic();
 if(typeof setupPullCard==='function'){
  const previousSetup=setupPullCard;
  setupPullCard=function(pull,index,total){previousSetup(pull,index,total);setupCinematicPull(pull,index,total)};
 }
 if(typeof renderDedicatedResults==='function'){
  const previousResults=renderDedicatedResults;
  renderDedicatedResults=function(pulls){previousResults(pulls);requestAnimationFrame(()=>decorateResults(pulls))};
 }
}

install();
window.BlazingSummonCinematic=Object.freeze({version:'1.0.0',refresh:ensureCinematic});
})();
