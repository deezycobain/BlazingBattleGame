(()=>{
'use strict';

const CONTENT_MARK='__bbOpeningTuned';
const SPRITE_MARK='__bbRoadOpeningTuned';
const ENEMY_DISPLAY_SCALE=1.30;
const EARLY_STAGE_TUNING=Object.freeze({
  1:Object.freeze({hp:.70,attack:.48,defense:.65,speed:.58}),
  2:Object.freeze({hp:.80,attack:.60,defense:.75,speed:.68}),
  3:Object.freeze({hp:.90,attack:.78,defense:.88,speed:.82})
});

const stat=value=>Math.max(1,Math.min(100,Math.round(Number(value)||1)));

function tuneRoadContent(){
  const base=window.BlazingRoadContent;
  if(!base||base[CONTENT_MARK])return;
  const baseStageConfig=base.stageConfig.bind(base);
  const stageConfig=value=>{
    const cfg=baseStageConfig(value);
    const tune=EARLY_STAGE_TUNING[cfg?.stage];
    if(!tune)return cfg;
    const enemies=(cfg.enemies||[]).map(enemy=>Object.freeze({
      ...enemy,
      stats:Object.freeze({
        hp:stat(enemy.stats?.hp*tune.hp),
        attack:stat(enemy.stats?.attack*tune.attack),
        defense:stat(enemy.stats?.defense*tune.defense),
        speed:stat(enemy.stats?.speed*tune.speed)
      })
    }));
    return Object.freeze({...cfg,enemies:Object.freeze(enemies)});
  };
  window.BlazingRoadContent=Object.freeze({
    ...base,
    [CONTENT_MARK]:true,
    EARLY_STAGE_TUNING,
    stageConfig,
    mapForStage:value=>stageConfig(value).map
  });
}

function tuneEnemySprites(){
  const base=window.BlazingBasicEnemySprites;
  if(!base||base[SPRITE_MARK])return;
  const baseDraw=base.draw.bind(base);
  const draw=(ctx,name,options={})=>{
    const sizeScale=(Number(options?.sizeScale)||1)*ENEMY_DISPLAY_SCALE;
    return baseDraw(ctx,name,{...options,sizeScale});
  };
  window.BlazingBasicEnemySprites=Object.freeze({
    ...base,
    [SPRITE_MARK]:true,
    ROAD_DISPLAY_SCALE:ENEMY_DISPLAY_SCALE,
    draw
  });
}

function apply(){
  tuneRoadContent();
  tuneEnemySprites();
}

apply();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
window.addEventListener('pageshow',apply,{passive:true});
window.BlazingRoadOpeningTuning=Object.freeze({
  ENEMY_DISPLAY_SCALE,
  EARLY_STAGE_TUNING,
  apply
});
})();
