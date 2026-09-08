(()=>{
'use strict';
const STYLE_ID='bb-home-feedback-fixes-style';
const MARK='r1';
const CSS=`
#bbHomeApproved.bb-home-v9 .bb-home-v5-leader{display:none!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-dock{
 position:relative!important;
 width:min(560px,calc(100vw - 28px))!important;
 height:clamp(118px,16.5vh,142px)!important;
 grid-template-columns:repeat(2,minmax(0,1fr))!important;
 grid-template-rows:repeat(2,minmax(0,1fr))!important;
 gap:6px 12px!important;
 padding:0 4px!important;
 bottom:26px!important;
 transform:none!important;
}
#bbHomeApproved.bb-home-v9 .bb-home-v4-nav{min-width:0!important;min-height:0!important;width:auto!important;height:100%!important;max-height:none!important;aspect-ratio:auto!important;place-self:stretch!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-nav[data-nav="battle"]{grid-column:1!important;grid-row:1!important;transform:rotate(-.7deg)!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-nav[data-nav="summon"]{grid-column:2!important;grid-row:1!important;transform:rotate(.35deg)!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-nav[data-nav="units"]{grid-column:1!important;grid-row:2!important;transform:rotate(-.2deg)!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-nav[data-nav="forge"]{grid-column:2!important;grid-row:2!important;transform:rotate(.3deg)!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-nav[data-nav] img{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;transform:none!important}
#bbHomeApproved.bb-home-v9 .bb-home-v4-social{gap:10px!important}
@media(max-width:430px){
 #bbHomeApproved.bb-home-v9 .bb-home-v4-dock{
  width:calc(100vw - 22px)!important;
  height:118px!important;
  gap:4px 8px!important;
  padding:0 2px!important;
  bottom:32px!important;
 }
 #bbHomeApproved.bb-home-v9 .bb-home-v4-social{gap:9px!important}
}
@media(max-height:700px) and (max-width:620px){
 #bbHomeApproved.bb-home-v9 .bb-home-v4-dock{height:106px!important;bottom:24px!important}
}
`;
const SKIP_TEXT=new Set(['SCRIPT','STYLE','PRE','CODE','TEXTAREA']);
function cleanTextNode(node){
 if(!node||node.nodeType!==Node.TEXT_NODE||!node.nodeValue)return false;
 const parent=node.parentElement;
 if(parent&&SKIP_TEXT.has(parent.tagName))return false;
 const value=node.nodeValue;
 if(!value.includes('\\n')&&!/(^|\s)\/n(?=\s|$)/i.test(value))return false;
 const next=value.replace(/\\n\s*/g,' ').replace(/(^|\s)\/n(?=\s|$)/gi,'$1');
 if(next===value)return false;
 node.nodeValue=next;
 return true;
}
function scrubEscapedNewlines(root=document.body){
 if(!root)return 0;
 let cleaned=0;
 if(root.nodeType===Node.TEXT_NODE)return cleanTextNode(root)?1:0;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let node;
 while((node=walker.nextNode()))if(cleanTextNode(node))cleaned++;
 return cleaned;
}
function ensureStyle(){
 let style=document.getElementById(STYLE_ID);
 if(!style){style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS}
 else if(style.textContent!==CSS)style.textContent=CSS;
 // v9 installs its own !important dock rules. Keep this small feedback layer last in
 // the cascade so wrapper geometry, rather than transformed artwork, owns spacing.
 document.head.appendChild(style);
 return style;
}
function apply(){
 ensureStyle();
 scrubEscapedNewlines();
 const shell=document.getElementById('bbHomeApproved');
 if(!shell)return false;
 shell.classList.add('bb-home-feedback-r1');
 shell.dataset.bbHomeFeedback=MARK;
 return true;
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
window.addEventListener('pageshow',schedule);
window.addEventListener('resize',schedule,{passive:true});
const observer=new MutationObserver(records=>{
 let homeChanged=false;
 for(const record of records){
  if(record.type==='characterData')cleanTextNode(record.target);
  for(const node of record.addedNodes||[])scrubEscapedNewlines(node);
  if(record.target?.id==='menuScreen'||record.target?.id==='bbHomeApproved'||[...record.addedNodes,...record.removedNodes].some(node=>node?.id==='bbHomeApproved'||node?.id==='menuScreen'))homeChanged=true;
 }
 if(homeChanged)schedule();
});
function boot(){
 apply();
 if(document.body)observer.observe(document.body,{childList:true,subtree:true,characterData:true});
}
window.BlazingHomeFeedbackFixes=Object.freeze({apply,MARK,scrubEscapedNewlines});
if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(apply,180);
setTimeout(apply,420);
})();
