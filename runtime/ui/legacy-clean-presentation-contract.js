(()=>{
const IDS=['kakashi','obito','jiraiya','sasuke','pain','scorpion','rock_lee','mashle','jackie_chan','gabimaru','killua','zabuza'];
const ID_SET=new Set(IDS);
const STYLE_ID='bb-legacy-clean-presentation-contract-style';
const norm=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
const assetPath=(unit,asset)=>{if(!unit?.id||!asset)return'';if(/^https?:|^data:|^assets\//.test(asset))return asset;return `assets/characters/${unit.id}/${asset}`;};
function cleanAsset(unit){const a=unit?.assets||{};return a.summon_art_clean||a.presentation_art||a.summon_art||a.card||a.art||a.portrait||'';}
function unitForName(name){const data=window.BLAZING_UNIT_DATA||{},needle=norm(name);return Object.values(data).find(unit=>unit&&ID_SET.has(unit.id)&&(norm(unit.display_name)===needle||norm(unit.id)===needle))||null;}
function legacyIdFromImage(img){
 const tagged=String(img?.dataset?.bbTeamUnit||'').trim();if(ID_SET.has(tagged))return tagged;
 const src=String(img?.getAttribute?.('src')||'');const match=src.match(/assets\/characters\/([^/]+)\//i);return match&&ID_SET.has(match[1])?match[1]:'';
}
function installStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;
 style.textContent=`body #teamScreen img[data-bb-team-legacy="true"]{object-fit:cover!important;object-position:center 28%!important;padding:0!important;background:#17171a!important;transform:none!important;box-sizing:border-box!important}body #teamScreen *:has(> img[data-bb-team-legacy="true"])::after{content:none!important;display:none!important}body #forgePortrait[data-bb-legacy-clean="true"]{padding:0!important;transform:none!important}`;
 document.head.appendChild(style);
}
function syncUnitContracts(){
 const data=window.BLAZING_UNIT_DATA;if(!data)return false;
 let ready=0;
 for(const id of IDS){
  const unit=data[id],asset=cleanAsset(unit);if(!unit?.assets||!asset)continue;
  ready++;
  try{unit.assets.presentation_art=asset;unit.assets.team_art_clean=asset;unit.assets.forge_art_clean=asset;}catch(_){ }
 }
 document.documentElement.dataset.bbLegacyPresentationReady=String(ready);
 return ready===IDS.length;
}
function repairProgressionApi(){
 const api=window.BlazingProgression;if(!api||api.__bbLegacyCleanForgeWrapped)return;
 const original=typeof api.forgeArt==='function'?api.forgeArt.bind(api):null;if(!original)return;
 const wrapped=name=>{const unit=unitForName(name),asset=cleanAsset(unit);return unit&&asset?assetPath(unit,asset):original(name)};
 try{api.forgeArt=wrapped;api.__bbLegacyCleanForgeWrapped=true;}catch(_){try{Object.defineProperty(api,'forgeArt',{value:wrapped,configurable:true});Object.defineProperty(api,'__bbLegacyCleanForgeWrapped',{value:true,configurable:true})}catch(__){ }}
}
function repairTeamArt(){
 const data=window.BLAZING_UNIT_DATA||{},root=document.getElementById('teamScreen');if(!root)return;
 for(const img of root.querySelectorAll('img')){
  const id=legacyIdFromImage(img);if(!id)continue;
  const unit=data[id],asset=cleanAsset(unit);if(!unit||!asset)continue;
  const src=assetPath(unit,asset);if(src&&img.getAttribute('src')!==src)img.setAttribute('src',src);
  img.dataset.bbTeamUnit=id;img.dataset.bbTeamLegacy='true';img.dataset.bbTeamArt='full';
 }
}
function repairForgeArt(){
 const portrait=document.getElementById('forgePortrait'),forge=document.getElementById('forgeScreen');if(!portrait||!forge)return;
 const name=(document.getElementById('forgeName')?.textContent||forge.querySelector('.forgeRoster .active,.forgeRoster [aria-selected="true"]')?.textContent||'').trim();
 const unit=unitForName(name),asset=cleanAsset(unit);if(!unit||!asset)return;
 const src=assetPath(unit,asset);if(src&&portrait.getAttribute('src')!==src)portrait.setAttribute('src',src);
 portrait.dataset.bbLegacyClean='true';portrait.dataset.bbPresentation='clean-fill';
}
let applying=false;
function apply(){if(applying)return false;applying=true;try{installStyle();const complete=syncUnitContracts();repairProgressionApi();repairTeamArt();repairForgeArt();return complete}finally{applying=false}}
let tries=0;const boot=()=>{tries++;const done=apply();if((done&&window.BlazingProgression)||tries>=240)return;setTimeout(boot,25)};boot();
const observer=new MutationObserver(()=>{if(!applying)queueMicrotask(apply)});
const startObserver=()=>{if(document.body)observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','class','data-bb-team-art','data-bb-team-unit']});apply()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();
window.addEventListener('pageshow',apply,{passive:true});
})();
