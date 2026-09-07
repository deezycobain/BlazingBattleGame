(()=>{
'use strict';

const SCALE=1.15;
if(window.__bbBattleSpriteScaleInstalled)return;

const Ctx=window.CanvasRenderingContext2D;
if(!Ctx?.prototype?.drawImage)return;

const proto=Ctx.prototype;
const original=proto.drawImage;

function isBattleCanvas(ctx){
  const canvas=ctx?.canvas;
  if(!canvas)return false;
  const battle=document.getElementById('battleScreen');
  return !!(battle&&battle.contains(canvas));
}

function isCharacterSprite(image){
  const src=String(image?.currentSrc||image?.src||'').toLowerCase();
  return src.includes('/assets/characters/')&&src.includes('/sprites/runtime/');
}

function scaleRect(dx,dy,dw,dh){
  const nextW=dw*SCALE;
  const nextH=dh*SCALE;
  return [dx-(nextW-dw)/2,dy-(nextH-dh),nextW,nextH];
}

proto.drawImage=function(image,...args){
  if(isBattleCanvas(this)&&isCharacterSprite(image)){
    if(args.length===4){
      const [dx,dy,dw,dh]=args;
      if([dx,dy,dw,dh].every(Number.isFinite))args=scaleRect(dx,dy,dw,dh);
    }else if(args.length===8){
      const [sx,sy,sw,sh,dx,dy,dw,dh]=args;
      if([dx,dy,dw,dh].every(Number.isFinite)){
        const [ndx,ndy,ndw,ndh]=scaleRect(dx,dy,dw,dh);
        args=[sx,sy,sw,sh,ndx,ndy,ndw,ndh];
      }
    }
  }
  return original.call(this,image,...args);
};

window.__bbBattleSpriteScaleInstalled=true;
window.BLAZING_BATTLE_SPRITE_SCALE=SCALE;
})();
