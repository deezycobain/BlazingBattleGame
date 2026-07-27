(()=>{
  'use strict';
  const frame=document.getElementById('game');
  if(!frame||window.__BB_DEV_UI_CLEANUP__)return;window.__BB_DEV_UI_CLEANUP__=true;
  function clean(){
    let doc;try{doc=frame.contentDocument;}catch(_){return;}if(!doc)return;
    const walker=doc.createTreeWalker(doc.body||doc.documentElement,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const n of nodes){
      const t=String(n.nodeValue||'');
      if(/Revival Formula/.test(t))n.nodeValue=t.replace(/Revival Formula/g,'Ally Heal');
      if(/Basic builds chakra/i.test(t)||/closer linked allies can amplify Link Attack buffs/i.test(t)){
        const el=n.parentElement;if(el)el.style.display='none';else n.nodeValue='';
      }
    }
  }
  frame.addEventListener('load',()=>{clean();[50,150,300,600,1000,1800].forEach(ms=>setTimeout(clean,ms));setInterval(clean,500);});
})();