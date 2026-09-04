(()=>{
'use strict';
const SKIP=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','CODE','PRE']);
const ATTRS=['aria-label','title','placeholder'];
function rewrite(value){
  let text=String(value??'');
  text=text
    .replace(/CORE RESONANCE BANNER/g,'CORE AWAKENING BANNER')
    .replace(/Core Resonance Banner/g,'Core Awakening Banner')
    .replace(/core resonance banner/g,'core awakening banner')
    .replace(/RESONANCE FORGE/g,'AWAKENING FORGE')
    .replace(/Resonance Forge/g,'Awakening Forge')
    .replace(/resonance forge/g,'awakening forge')
    .replace(/CORE RESONANCE/g,'CORE AWAKENING')
    .replace(/Core Resonance/g,'Core Awakening')
    .replace(/core resonance/g,'core awakening')
    .replace(/RESONANCE PULLS/g,'AWAKENING PULLS')
    .replace(/Resonance Pulls/g,'Awakening Pulls')
    .replace(/resonance pulls/g,'awakening pulls')
    .replace(/RESONANCE PATH/g,'AWAKENING PATH')
    .replace(/Resonance Path/g,'Awakening Path')
    .replace(/resonance path/g,'awakening path')
    .replace(/RESONANCE/g,'AWAKENING')
    .replace(/Resonance/g,'Awakening')
    .replace(/resonance/g,'awakening')
    .replace(/\bR([0-5])\b/g,'A$1');
  return text;
}
function rewriteText(node){
  if(!node||node.nodeType!==Node.TEXT_NODE)return;
  if(SKIP.has(node.parentElement?.tagName))return;
  const next=rewrite(node.nodeValue);
  if(next!==node.nodeValue)node.nodeValue=next;
}
function rewriteElement(el){
  if(!el||el.nodeType!==Node.ELEMENT_NODE||SKIP.has(el.tagName))return;
  for(const attr of ATTRS){if(!el.hasAttribute(attr))continue;const current=el.getAttribute(attr),next=rewrite(current);if(next!==current)el.setAttribute(attr,next);}
}
function apply(root=document.body){
  if(!root)return;
  if(root.nodeType===Node.TEXT_NODE){rewriteText(root);return;}
  if(root.nodeType===Node.ELEMENT_NODE)rewriteElement(root);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const node=walker.currentNode;
    if(node.nodeType===Node.TEXT_NODE)rewriteText(node);else rewriteElement(node);
  }
}
function install(){
  apply(document.body);
  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='characterData'){rewriteText(record.target);continue;}
      if(record.type==='attributes'){rewriteElement(record.target);continue;}
      record.addedNodes.forEach(apply);
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  window.BlazingAwakeningLanguage=Object.freeze({apply,rewrite,legacySaveKey:'blazing.progression.v1'});
}
if(document.body)install();else addEventListener('DOMContentLoaded',install,{once:true});
})();
