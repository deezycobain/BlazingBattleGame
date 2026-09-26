(()=>{
const IDS=['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza'];
const STYLE_ID='bb-legacy-clean-presentation-contract-style';
const assetPath=(unit,asset)=>{if(!unit?.id||!asset)return'';if(/^https?:|^data:|^assets\//.test(asset))return asset;return `assets/characters/${unit.id}/${asset}`;};
function cleanAsset(unit){const a=unit?.assets||{};return a.summon_art_clean||a.summon_art||a.card||a.art||a.portrait||'';}
function installStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;
 style.textContent=`body #teamScreen img[data-bb-team-legacy="true"][data-bb-team-art="full"],body #teamScreen img[data-bb-team-legacy="true"][data-bb-team-art="card"]{object-fit:cover!important;object-position:center 28%!important;padding:0!important;background:#17171a!important;transform:none!important}`;
 document.head.appendChild(style);
}
function syncUnitContracts(){
 const data=window.BLAZING_UNIT_DATA;if(!data)return false;
 let ready=0;
 for(const id of IDS){
  const unit=data[id],asset=cleanAsset(unit);if(!unit?.assets||!asset)continue;
  try{unit.assets.presentation_art=asset;unit.assets.team_art_clean=asset;unit.assets.forge_art_clean=asset;}catch(_){ }
  if(unit.assets.presentation_art===asset&&unit.assets.team_art_clean===asset&&unit.assets.forge_art_clean===asset)ready++;
 }
 document.documentElement.dataset.bbLegacyPresentationReady=String(ready);
 return ready===IDS.length;
}
function repairTeamArt(){
 const data=window.BLAZING_UNIT_DATA||{};
 for(const img of document.querySelectorAll('#teamScreen img[data-bb-team-legacy="true"][data-bb-team-unit]')){
  const unit=data[img.dataset.bbTeamUnit],asset=cleanAsset(unit);if(!unit||!asset)continue;
  const src=assetPath(unit,asset);if(src&&img.getAttribute('src')!==src)img.setAttribute('src',src);
  img.dataset.bbTeamArt='full';
 }
}
function apply(){installStyle();const complete=syncUnitContracts();repairTeamArt();return complete;}
let tries=0;const boot=()=>{tries++;if(apply()||tries>=160)return;setTimeout(boot,25)};boot();
const observer=new MutationObserver(()=>repairTeamArt());
const startObserver=()=>{const root=document.getElementById('teamScreen');if(root)observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['src','data-bb-team-art','data-bb-team-unit']})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();
window.addEventListener('pageshow',apply,{passive:true});
})();
