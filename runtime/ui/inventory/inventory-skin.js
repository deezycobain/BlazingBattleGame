(()=>{
'use strict';
const norm=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
const text=el=>String(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
const inventoryUnits=()=>Object.values(window.BLAZING_UNIT_DATA||{}).filter(unit=>unit?.collection?.inventory_visible!==false&&unit?.display_name);
const isVisible=el=>{if(!el||el.hidden)return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';};
const unitNames=()=>inventoryUnits().map(unit=>({unit,key:norm(unit.display_name),id:norm(unit.id)}));

function findInventoryScreen(){
 const selectors='#inventoryScreen,.inventoryScreen,#collectionScreen,.collectionScreen,[data-screen="inventory"],[data-screen="collection"],.screen,main,section';
 const candidates=[...new Set(document.querySelectorAll(selectors))].filter(el=>el.id!=='bbUnitDetails'&&isVisible(el));
 const exact=candidates.filter(el=>/\bINVENTORY\b/i.test(text(el))&&/OWNED\s+FIGHTERS/i.test(text(el)));
 if(exact.length)return exact.sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length)[0];
 return candidates.find(el=>/\bINVENTORY\b/i.test(text(el))&&/EDIT\s+TEAM/i.test(text(el)))||null;
}
function exactTextElement(root,rx){
 const nodes=[...root.querySelectorAll('h1,h2,h3,h4,h5,p,span,strong,b,button,div')].filter(el=>rx.test(text(el)));
 if(!nodes.length)return null;
 return nodes.sort((a,b)=>text(a).length-text(b).length||a.querySelectorAll('*').length-b.querySelectorAll('*').length)[0];
}
function commonAncestor(nodes,stop){
 if(!nodes.length)return null;
 let cur=nodes[0];
 while(cur&&cur!==stop){if(nodes.every(node=>cur.contains(node)))return cur;cur=cur.parentElement;}
 return stop&&nodes.every(node=>stop.contains(node))?stop:null;
}
function matchingUnits(value){
 const hay=norm(value);if(!hay)return [];
 return unitNames().filter(({key,id})=>(key&&hay.includes(key))||(id&&hay.includes(id)));
}
function unitFromNode(el){
 if(!el)return null;
 const direct=el.dataset?.unitId||el.dataset?.characterId||el.dataset?.fighterId||el.dataset?.unit||el.dataset?.character||el.dataset?.fighter;
 if(direct){const key=norm(direct),hit=inventoryUnits().find(unit=>norm(unit.id)===key||norm(unit.display_name)===key);if(hit)return hit;}
 const hits=matchingUnits(text(el));return hits.length===1?hits[0].unit:null;
}
function hasVisual(el){return !!el?.querySelector?.('img,picture,canvas');}
function cardFromLabel(label,screen,unit){
 let node=label;
 for(let depth=0;node&&node!==screen&&depth<8;depth++,node=node.parentElement){
  if(!hasVisual(node))continue;
  const hits=matchingUnits(text(node));
  if(hits.length===1&&hits[0].unit.id===unit.id)return node;
 }
 return null;
}
function discoverCards(screen){
 const found=[];
 for(const unit of inventoryUnits()){
  const key=norm(unit.display_name);
  const labels=[...screen.querySelectorAll('[data-unit-name],[data-character-name],[data-fighter-name],h1,h2,h3,h4,h5,p,span,strong,b,div')]
   .filter(el=>norm(text(el))===key);
  let card=null;
  for(const label of labels){card=cardFromLabel(label,screen,unit);if(card)break;}
  if(!card){
   const direct=[...screen.querySelectorAll('[data-unit-id],[data-character-id],[data-fighter-id],[data-unit],[data-character],[data-fighter]')]
    .find(el=>unitFromNode(el)?.id===unit.id);
   card=direct&&(hasVisual(direct)?direct:cardFromLabel(direct,screen,unit));
  }
  if(!card){
   card=[...screen.querySelectorAll('button,article,li,div')].find(el=>hasVisual(el)&&unitFromNode(el)?.id===unit.id&&matchingUnits(text(el)).length===1)||null;
  }
  if(card)found.push({unit,card});
 }
 return found;
}
function findGrid(screen,entries){
 if(entries.length<2)return entries[0]?.card?.parentElement||null;
 const cards=entries.map(entry=>entry.card);
 const candidates=[];
 for(const card of cards){
  let node=card.parentElement;
  for(let depth=0;node&&node!==screen&&depth<7;depth++,node=node.parentElement){
   const count=cards.filter(item=>node.contains(item)).length;
   if(count>=2)candidates.push(node);
  }
 }
 if(!candidates.length)return commonAncestor(cards,screen);
 return [...new Set(candidates)].sort((a,b)=>{
  const ac=cards.filter(item=>a.contains(item)).length,bc=cards.filter(item=>b.contains(item)).length;
  if(ac!==bc)return bc-ac;
  return a.querySelectorAll('*').length-b.querySelectorAll('*').length;
 })[0];
}
function directChildUnder(node,ancestor){
 let cur=node;if(!ancestor)return node;
 while(cur?.parentElement&&cur.parentElement!==ancestor&&cur.parentElement!==document.body)cur=cur.parentElement;
 return cur?.parentElement===ancestor?cur:node;
}
function decorateCard(card,unit){
 card.classList.add('bb-fighter-card');card.dataset.unitId=unit.id;card.dataset.element=String(unit.element||'neutral').toLowerCase();card.dataset.rarity=String(unit.rarity||'');
 const nameKey=norm(unit.display_name);
 const name=[...card.querySelectorAll('[data-unit-name],[data-character-name],[data-fighter-name],h1,h2,h3,h4,h5,p,span,strong,b,div')].find(el=>norm(text(el))===nameKey);
 if(name)name.classList.add('bb-card-name');
 const meta=[...card.querySelectorAll('span,p,small,strong,div')].filter(el=>{const t=text(el);return norm(t)===norm(unit.rarity)||/^LV\s*\d+/i.test(t)||/^LEVEL\s*\d+/i.test(t);});
 meta.forEach(el=>el.classList.add('bb-card-meta'));
}
function decorateToolbar(screen){
 const title=exactTextElement(screen,/^INVENTORY$/i);if(title)title.classList.add('bb-inventory-title');
 const subtitle=exactTextElement(screen,/^OWNED\s+FIGHTERS$/i);if(subtitle)subtitle.classList.add('bb-inventory-subtitle');
 if(title&&subtitle){const head=commonAncestor([title,subtitle],screen);if(head&&head!==screen)head.classList.add('bb-inventory-header');}
 const count=exactTextElement(screen,/^FIGHTERS\s+\d+\s*\/\s*\d+$/i);if(count)count.classList.add('bb-inventory-count');
 const edit=exactTextElement(screen,/^EDIT\s+TEAM$/i),filter=exactTextElement(screen,/^ALL(?:\s*[⌄▾▼])?$/i);
 [edit,filter].filter(Boolean).forEach(el=>el.classList.add('bb-inventory-control'));
 const parts=[count,edit,filter].filter(Boolean);if(parts.length>=2){const toolbar=commonAncestor(parts,screen);if(toolbar&&toolbar!==screen)toolbar.classList.add('bb-inventory-toolbar');}
}
function decorateGrid(screen){
 const entries=discoverCards(screen);if(!entries.length)return;
 const grid=findGrid(screen,entries);if(!grid||grid===screen)return;
 grid.classList.add('bb-inventory-grid');
 for(const entry of entries){const wrapper=directChildUnder(entry.card,grid);decorateCard(wrapper,entry.unit);if(wrapper!==entry.card)entry.card.classList.remove('bb-fighter-card');}
 for(const child of [...grid.children]){
  if(child.classList.contains('bb-fighter-card'))continue;
  const t=text(child);const visual=hasVisual(child);
  if((/^\+?$/.test(t)||!t)&&!visual)child.classList.add('bb-slot-empty');
 }
}
function decorate(){
 const screen=findInventoryScreen();if(!screen)return false;
 document.querySelectorAll('.bb-inventory-theme').forEach(el=>{if(el!==screen)el.classList.remove('bb-inventory-theme');});
 screen.classList.add('bb-inventory-theme');decorateToolbar(screen);decorateGrid(screen);return true;
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate();});}
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});
document.addEventListener('click',()=>setTimeout(schedule,0),true);
document.addEventListener('pointerup',()=>setTimeout(schedule,0),true);
window.addEventListener('resize',schedule,{passive:true});
setTimeout(schedule,0);
window.BlazingInventorySkin=Object.freeze({decorate,findInventoryScreen,discoverCards});
})();
