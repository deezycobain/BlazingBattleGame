(()=>{
'use strict';

const RESULT_ART={
  'Crimson':'assets/characters/crimson/art/current_collection_art.jpg',
  'Sub-Zero':'assets/characters/subzero/art/full_art_absolute_zero_v2.jpeg',
  'Lebee':'assets/characters/lebee/art/full_art_cosmic_wish.jpeg',
  'Senku':'assets/characters/senku/cards/senku_card.jpeg',
  'Tyler':'assets/characters/tyler/cards/current_collection_card.png'
};
const TYLER_CUTOUT='assets/characters/tyler/art/shiny_foreground_cutout_v1.webp';

function forceRevealArt(pull){
  if(!pull||!RESULT_ART[pull.name])return;
  const image=document.querySelector('#summonPullScreen .summonedTradingCard');
  if(!image)return;
  image.src=RESULT_ART[pull.name];
  image.alt=`${pull.name} summon art`;
}

function forceResultArt(pulls){
  const cards=[...document.querySelectorAll('#pullResultsGrid .pullCard')];
  cards.forEach((card,index)=>{
    const pull=pulls?.[index];
    if(!pull||!RESULT_ART[pull.name])return;
    const image=card.querySelector('.resultTradingCard')||card.querySelector('img');
    if(!image)return;
    image.src=RESULT_ART[pull.name];
    image.alt=`${pull.name} summon art`;
  });
}

if(typeof setupPullCard==='function'){
  const priorSetupPullCard=setupPullCard;
  setupPullCard=function(pull,index,total){
    priorSetupPullCard(pull,index,total);
    forceRevealArt(pull);
    requestAnimationFrame(()=>forceRevealArt(pull));
  };
}

if(typeof renderDedicatedResults==='function'){
  const priorRenderDedicatedResults=renderDedicatedResults;
  renderDedicatedResults=function(pulls){
    priorRenderDedicatedResults(pulls);
    forceResultArt(pulls);
    requestAnimationFrame(()=>forceResultArt(pulls));
  };
}

function installTylerLayerStyle(){
  if(document.getElementById('bbTylerSelectivePopoutV3'))return;
  const style=document.createElement('style');
  style.id='bbTylerSelectivePopoutV3';
  style.textContent=`
#forgeCard[data-fighter="tyler"] #forgePopout{opacity:0!important}
#forgeCard[data-fighter="tyler"] .bbTylerPopLayer{
  display:block!important;position:absolute!important;z-index:5!important;inset:0!important;
  width:100%!important;height:100%!important;max-width:none!important;object-fit:contain!important;
  opacity:1!important;pointer-events:none!important;
  -webkit-mask-image:none!important;mask-image:none!important;
  filter:drop-shadow(0 11px 8px rgba(0,0,0,.46)) drop-shadow(0 0 7px rgba(179,91,255,.34))!important;
}
#forgeCard[data-fighter="tyler"] .bbTylerPopFx{
  -webkit-clip-path:polygon(0 37%,27% 37%,31% 88%,0 91%);
  clip-path:polygon(0 37%,27% 37%,31% 88%,0 91%);
}
#forgeCard[data-fighter="tyler"] .bbTylerPopHand{
  -webkit-clip-path:polygon(7% 70%,24% 65%,43% 70%,52% 80%,49% 91%,38% 100%,14% 100%,6% 89%);
  clip-path:polygon(7% 70%,24% 65%,43% 70%,52% 80%,49% 91%,38% 100%,14% 100%,6% 89%);
}
#forgeCard[data-fighter="tyler"] .bbTylerPopHair{
  -webkit-clip-path:polygon(20% 0,54% 0,54% 14%,45% 18%,24% 16%);
  clip-path:polygon(20% 0,54% 0,54% 14%,45% 18%,24% 16%);
}`;
  document.head.appendChild(style);
}

function syncTylerPopout(){
  const card=document.getElementById('forgeCard');
  const depth=card?.querySelector('.forgeArtDepth');
  const base=document.getElementById('forgePopout');
  if(!card||!depth||!base)return;
  const active=card.dataset.fighter==='tyler'&&card.classList.contains('shiny')&&card.classList.contains('hasPopout')&&!base.hidden;
  if(!active){
    depth.querySelectorAll('.bbTylerPopLayer').forEach(node=>node.remove());
    return;
  }
  const src=base.getAttribute('src')||TYLER_CUTOUT;
  const layers=[['bbTylerPopFx','Tyler purple effect foreground'],['bbTylerPopHand','Tyler hand foreground'],['bbTylerPopHair','Tyler hair foreground']];
  for(const [className,label] of layers){
    let layer=depth.querySelector(`.${className}`);
    if(!layer){
      layer=document.createElement('img');
      layer.className=`forgePopout bbTylerPopLayer ${className}`;
      layer.alt='';
      layer.setAttribute('aria-hidden','true');
      layer.dataset.layer=label;
      depth.appendChild(layer);
    }
    if(layer.getAttribute('src')!==src)layer.src=src;
  }
}

installTylerLayerStyle();
const forgeCard=document.getElementById('forgeCard');
if(forgeCard){
  new MutationObserver(syncTylerPopout).observe(forgeCard,{subtree:true,attributes:true,attributeFilter:['class','data-fighter','src','hidden']});
  syncTylerPopout();
}

window.BlazingProgressionVisualHotfix=Object.freeze({forceRevealArt,forceResultArt,syncTylerPopout});
})();
