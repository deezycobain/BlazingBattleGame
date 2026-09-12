(()=>{
'use strict';

const BASE='assets/fonts/blazing-brush/glyphs';
const cached=new Map();

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
function render(target,text,options={}){
  if(!(target instanceof HTMLElement))return false;
  const value=String(text??'');
  target.replaceChildren();
  target.dataset.brushText=value;
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
    target.appendChild(img);
    glyphIndex++;
  }
  return glyphIndex>0;
}
function glyphCount(target){return target?.querySelectorAll?.('.bb-brush-glyph')?.length||0}

preload();
window.BlazingBrushText=Object.freeze({render,preload,srcFor,glyphCount,base:BASE});
})();
