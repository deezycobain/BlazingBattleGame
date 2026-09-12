(()=>{
'use strict';

const BASE='assets/fonts/blazing-brush/glyphs';
const STYLE_ID='bb-brush-text-style';
const cached=new Map();
let observer=null;
let bootstrapObserver=null;

function groupFor(char){
  if(/[A-Z]/.test(char))return 'uppercase';
  if(/[a-z]/.test(char))return 'lowercase';
  if(/[0-9]/.test(char))return 'numbers';
  return null;
}
function srcFor(char){
  const group=groupFor(char);
  return group?`${BASE}/${group}/${char}.png`:null;
}
function preload(text='123FIGHT'){
  for(const char of [...String(text)]){
    const src=srcFor(char);
    if(!src||cached.has(src))continue;
    const image=new Image();
    image.decoding='async';
    image.src=src;
    cached.set(src,image);
  }
}
function ensureStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
.bb-brush-text{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}
.bb-brush-text .bb-brush-glyph{display:block;height:1em;width:auto;max-width:1.15em;object-fit:contain;object-position:center;user-select:none;pointer-events:none;filter:drop-shadow(.018em .035em .018em rgba(255,244,210,.35)) drop-shadow(.035em .085em .045em rgba(0,0,0,.68));transform-origin:50% 62%;animation:bbBrushInkIn .32s cubic-bezier(.14,.82,.2,1) both;animation-delay:var(--bb-glyph-delay,0ms)}
.bb-brush-text .bb-brush-glyph+ .bb-brush-glyph{margin-left:-.105em}
.bb-brush-text .bb-brush-space{display:block;width:.34em;height:1em}
.bb-brush-text .bb-brush-fallback{font-family:'AnimeAce2',Impact,'Arial Black',sans-serif;font-weight:900}
#bbRoadFightIntro[data-word='FIGHT'] .bb-brush-glyph{height:.94em;max-width:1.02em;animation-name:bbBrushFightInk;animation-duration:.38s}
#bbRoadFightIntro[data-word='FIGHT'] .bb-brush-glyph+ .bb-brush-glyph{margin-left:-.13em}
@keyframes bbBrushInkIn{0%{opacity:0;clip-path:inset(0 100% 0 0);transform:translateX(-.08em) rotate(-5deg) scale(.92);filter:blur(1.1px) drop-shadow(.035em .085em .045em rgba(0,0,0,.5))}45%{opacity:1;clip-path:inset(0 12% 0 0);transform:translateX(0) rotate(1deg) scale(1.035);filter:blur(0) drop-shadow(.018em .035em .018em rgba(255,244,210,.35)) drop-shadow(.035em .085em .045em rgba(0,0,0,.68))}100%{opacity:1;clip-path:inset(0);transform:rotate(0) scale(1)}}
@keyframes bbBrushFightInk{0%{opacity:0;clip-path:inset(0 100% 0 0);transform:translateX(-.12em) rotate(-7deg) scale(.88)}55%{opacity:1;clip-path:inset(0 8% 0 0);transform:translateX(0) rotate(1.5deg) scale(1.055)}100%{opacity:1;clip-path:inset(0);transform:rotate(0) scale(1)}}
@media(prefers-reduced-motion:reduce){.bb-brush-text .bb-brush-glyph{animation:none!important;opacity:1!important;clip-path:none!important;transform:none!important}}
`;
  document.head.appendChild(style);
}
function render(target,text,options={}){
  if(!(target instanceof HTMLElement))return false;
  const value=String(text??'');
  target.replaceChildren();
  target.dataset.brushText=value;
  target.dataset.brushError='0';
  target.setAttribute('aria-label',value);
  target.classList.add('bb-brush-text');
  const stagger=Number.isFinite(options.staggerMs)?Math.max(0,Number(options.staggerMs)):0;
  let glyphIndex=0;
  for(const char of [...value]){
    if(char===' '){
      const gap=document.createElement('span');
      gap.className='bb-brush-space';
      gap.setAttribute('aria-hidden','true');
      target.appendChild(gap);
      continue;
    }
    const src=srcFor(char);
    if(!src){
      const fallback=document.createElement('span');
      fallback.className='bb-brush-fallback';
      fallback.textContent=char;
      fallback.setAttribute('aria-hidden','true');
      target.appendChild(fallback);
      continue;
    }
    const img=document.createElement('img');
    img.className='bb-brush-glyph';
    img.alt='';
    img.draggable=false;
    img.decoding='async';
    img.src=src;
    img.style.setProperty('--bb-glyph-i',String(glyphIndex));
    img.style.setProperty('--bb-glyph-delay',`${glyphIndex*stagger}ms`);
    img.dataset.char=char;
    img.setAttribute('aria-hidden','true');
    img.addEventListener('error',()=>{target.dataset.brushError='1'},{once:true});
    target.appendChild(img);
    glyphIndex++;
  }
  return glyphIndex>0;
}
function glyphCount(target){return target?.querySelectorAll?.('.bb-brush-glyph')?.length||0}
function syncFightIntro(){
  ensureStyles();
  const overlay=document.getElementById('bbRoadFightIntro');
  const target=overlay?.querySelector('.bb-road-fight-word');
  const word=String(overlay?.dataset?.word||'');
  if(!overlay||!target||!word)return false;
  const needed=[...word].filter(char=>srcFor(char)).length;
  if(target.dataset.brushText===word&&glyphCount(target)===needed)return true;
  const ok=render(target,word,{staggerMs:word==='FIGHT'?48:0});
  if(ok)overlay.dataset.brushReady='1';
  return ok;
}
function bindOverlay(){
  const overlay=document.getElementById('bbRoadFightIntro');
  if(!overlay)return false;
  observer?.disconnect();
  observer=new MutationObserver(()=>syncFightIntro());
  observer.observe(overlay,{subtree:true,childList:true,attributes:true,attributeFilter:['data-word','class']});
  syncFightIntro();
  return true;
}
function attachFightIntro(){
  ensureStyles();
  if(bindOverlay())return;
  bootstrapObserver?.disconnect();
  bootstrapObserver=new MutationObserver(()=>{
    if(!bindOverlay())return;
    bootstrapObserver?.disconnect();
    bootstrapObserver=null;
  });
  bootstrapObserver.observe(document.body||document.documentElement,{subtree:true,childList:true});
}

preload();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attachFightIntro,{once:true});
else attachFightIntro();
window.BlazingBrushText=Object.freeze({render,preload,srcFor,glyphCount,syncFightIntro,base:BASE});
})();
