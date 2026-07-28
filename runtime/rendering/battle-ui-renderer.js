(()=>{
  'use strict';

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function renderTacticalTicker(element,items){
    if(!element)return;
    if(!items?.length){
      element.classList.remove('show','linkActive');
      element.innerHTML='';
      return;
    }
    element.innerHTML=items.map(item=>`<span class="tickerItem ${item.tone||'info'}">${item.text}</span>`).join('');
    element.classList.add('show');
    element.classList.toggle('linkActive',items.some(item=>item.tone==='link'));
  }

  function renderBossHealth(hud,fill,boss){
    if(!hud||!fill)return;
    if(boss){
      hud.classList.add('active');
      const ratio=clamp(boss.hp/boss.maxHp,0,1);
      fill.style.width=`${ratio*100}%`;
      hud.setAttribute('aria-label',`Anubis health ${boss.hp} of ${boss.maxHp}`);
    }else{
      hud.classList.remove('active');
      fill.style.width='100%';
    }
  }

  function renderActionControls(elements,view){
    const {phaseEl,logEl,normalBtn,jutsuBtn,swapBtn,statusEl}=elements||{};
    if(phaseEl)phaseEl.textContent=view.phaseText;
    if(logEl)logEl.textContent=view.logText;
    if(normalBtn){normalBtn.classList.toggle('selected',view.action==='normal');normalBtn.disabled=!view.canAct;}
    if(jutsuBtn){
      jutsuBtn.classList.toggle('selected',view.action==='jutsu');
      jutsuBtn.textContent=view.jutsuLabel;
      jutsuBtn.disabled=!view.canJutsu;
    }
    if(swapBtn)swapBtn.disabled=!view.canSwap;
    if(statusEl)statusEl.innerHTML=view.statusHtml;
  }

  window.BlazingBattleUiRenderer=Object.freeze({
    renderTacticalTicker,
    renderBossHealth,
    renderActionControls
  });
})();
