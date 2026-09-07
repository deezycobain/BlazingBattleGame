(()=>{
'use strict';

const MAX_STAGE=10;
const STAT_MAX=100;
const clampStat=value=>Math.max(1,Math.min(STAT_MAX,Math.round(Number(value)||1)));
const MAPS=Object.freeze([
  Object.freeze({key:'south-sac',name:'South Sac Approach',src:'assets/maps/blazing-road/stage-01-south-sac.webp'}),
  Object.freeze({key:'moon-statue-garden',name:'Moon Statue Garden',src:'assets/maps/blazing-road/stage-02-moon-statue-garden.webp'}),
  Object.freeze({key:'lantern-garden',name:'Lantern Garden',src:'assets/maps/blazing-road/stage-03-lantern-garden.webp'}),
  Object.freeze({key:'shinobi-overlook',name:'Shinobi Overlook',src:'assets/maps/blazing-road/stage-04-shinobi-overlook.webp'}),
  Object.freeze({key:'training-grounds',name:'Training Grounds',src:'assets/maps/blazing-road/stage-05-training-grounds.webp'})
]);

const BASE_ENEMY_STATS=Object.freeze({
  onre:Object.freeze({hp:55,attack:29,defense:22,speed:58}),
  gotoku:Object.freeze({hp:70,attack:34,defense:38,speed:44}),
  yurei:Object.freeze({hp:50,attack:37,defense:18,speed:68})
});

const FORMATIONS=Object.freeze([
  Object.freeze([
    Object.freeze({id:'onre',x:126,y:188}),
    Object.freeze({id:'gotoku',x:352,y:225}),
    Object.freeze({id:'yurei',x:236,y:342})
  ]),
  Object.freeze([
    Object.freeze({id:'gotoku',x:112,y:178}),
    Object.freeze({id:'yurei',x:356,y:190}),
    Object.freeze({id:'onre',x:170,y:326}),
    Object.freeze({id:'onre',x:342,y:390})
  ]),
  Object.freeze([
    Object.freeze({id:'yurei',x:105,y:205}),
    Object.freeze({id:'onre',x:370,y:210}),
    Object.freeze({id:'gotoku',x:180,y:345}),
    Object.freeze({id:'yurei',x:326,y:365})
  ]),
  Object.freeze([
    Object.freeze({id:'onre',x:92,y:175}),
    Object.freeze({id:'gotoku',x:240,y:155}),
    Object.freeze({id:'yurei',x:385,y:180}),
    Object.freeze({id:'gotoku',x:238,y:362})
  ]),
  Object.freeze([
    Object.freeze({id:'gotoku',x:100,y:185}),
    Object.freeze({id:'yurei',x:380,y:185}),
    Object.freeze({id:'onre',x:155,y:345}),
    Object.freeze({id:'onre',x:325,y:345}),
    Object.freeze({id:'gotoku',x:240,y:255})
  ])
]);

const STAGE_NAMES=Object.freeze([
  'South Sac Approach','Moonlit Ruins','Lantern Crossing','Shinobi Overlook','Training Ground Trial',
  'South Sac Aftershock','Moonlit Pursuit','Lantern Siege','Village Heights','Final Training Ground'
]);

function stageNumber(value){
  const n=Math.trunc(Number(value)||1);
  return Math.max(1,Math.min(MAX_STAGE,n));
}

function statsForEnemy(id,stage,elite){
  const base=BASE_ENEMY_STATS[id]||BASE_ENEMY_STATS.onre;
  const n=stage-1;
  return Object.freeze({
    hp:clampStat(base.hp+n*3+(elite?4:0)),
    attack:clampStat(base.attack+n*2+(elite?2:0)),
    defense:clampStat(base.defense+Math.floor(n*1.5)+(elite?2:0)),
    speed:clampStat(base.speed+Math.floor(n*.8)+(elite?1:0))
  });
}

function stageConfig(value){
  const stage=stageNumber(value);
  const elite=stage===5||stage===10;
  const map=MAPS[(stage-1)%MAPS.length];
  const formation=FORMATIONS[(stage-1)%FORMATIONS.length];
  const secondRoute=stage>5;
  const extraEnemy=secondRoute&&formation.length<5
    ? [{id:['onre','gotoku','yurei'][stage%3],x:stage%2?300:178,y:stage%2?292:286}]
    : [];
  const enemies=[...formation,...extraEnemy].map((enemy,index)=>Object.freeze({
    ...enemy,
    name:`Road Rogue ${index+1}`,
    mark:String(index+1),
    stats:statsForEnemy(enemy.id,stage,elite)
  }));
  return Object.freeze({
    stage,
    maxStage:MAX_STAGE,
    statMax:STAT_MAX,
    name:STAGE_NAMES[stage-1],
    elite,
    route:stage<=5?1:2,
    map:Object.freeze({...map,slot:(stage-1)%MAPS.length+1}),
    ai:Object.freeze({
      evadeBase:0.08+Math.min(0.10,(stage-1)*0.012),
      evadeLowHp:0.48+(stage>=6?0.08:0),
      lowHpThreshold:0.38,
      dangerDistance:92,
      evadeDistance:92+stage*3
    }),
    enemies:Object.freeze(enemies)
  });
}

function mapForStage(stage){return stageConfig(stage).map;}
function isFinalStage(stage){return stageNumber(stage)>=MAX_STAGE;}

window.BlazingRoadContent=Object.freeze({MAX_STAGE,STAT_MAX,MAPS,BASE_ENEMY_STATS,stageNumber,stageConfig,mapForStage,isFinalStage});
})();
