(()=>{
'use strict';

const MAX_STAGE=10;
const STAT_MAX=100;
const clampStat=value=>Math.max(1,Math.min(STAT_MAX,Math.round(Number(value)||1)));
const point=(x,y)=>Object.freeze({x,y});
const polygon=(...points)=>Object.freeze({type:'polygon',points:Object.freeze(points.map(([x,y])=>point(x,y)))});
const rect=(x,y,w,h)=>Object.freeze({type:'rect',x,y,w,h});
const ellipse=(x,y,rx,ry)=>Object.freeze({type:'ellipse',x,y,rx,ry});
const terrain=({allowed=[],blocked=[]}={})=>Object.freeze({allowed:Object.freeze(allowed),blocked:Object.freeze(blocked)});
const anchors=(...points)=>Object.freeze(points.map(([x,y])=>point(x,y)));
const presentation=(scale=1,position='center center')=>Object.freeze({scale,position});

const MAPS=Object.freeze([
  Object.freeze({
    key:'south-sac',name:'South Sac Approach',src:'assets/maps/blazing-road/stage-01-south-sac.webp',
    presentation:presentation(1.10,'center 53%'),
    enemyAnchors:anchors([200,260],[280,274],[240,340],[315,382],[176,386]),
    movement:terrain({
      allowed:[polygon([194,216],[286,216],[315,300],[355,410],[411,560],[69,560],[125,410],[165,300])],
      blocked:[
        polygon([0,94],[150,94],[166,206],[146,294],[115,410],[70,548],[0,560]),
        polygon([330,94],[480,94],[480,560],[410,548],[365,410],[334,294],[314,206]),
        rect(0,548,78,92),rect(402,548,78,92)
      ]
    })
  }),
  Object.freeze({
    key:'moon-statue-garden',name:'Moon Statue Garden',src:'assets/maps/blazing-road/stage-02-moon-statue-garden.webp',
    presentation:presentation(1.08,'center 52%'),
    enemyAnchors:anchors([205,220],[275,232],[210,315],[290,362],[242,276]),
    movement:terrain({
      allowed:[polygon([190,172],[290,172],[312,240],[336,332],[376,456],[420,560],[60,560],[104,456],[144,332],[168,240])],
      blocked:[
        polygon([0,105],[150,105],[168,205],[146,326],[105,455],[60,548],[0,560]),
        polygon([330,104],[480,104],[480,560],[420,548],[375,455],[334,326],[312,205]),
        ellipse(239,145,65,52),
        rect(0,536,72,104),
        rect(408,540,72,100)
      ]
    })
  }),
  Object.freeze({
    key:'lantern-garden',name:'Lantern Garden',src:'assets/maps/blazing-road/stage-03-lantern-garden.webp',
    movement:terrain({blocked:[
      polygon([0,86],[54,86],[66,150],[70,230],[64,325],[70,430],[58,535],[0,560]),
      polygon([430,86],[480,86],[480,562],[426,535],[419,438],[422,335],[416,238],[422,150]),
      polygon([135,86],[345,86],[337,137],[320,157],[160,157],[143,136]),
      ellipse(45,404,24,61),
      ellipse(440,421,22,65)
    ]})
  }),
  Object.freeze({
    key:'shinobi-overlook',name:'Shinobi Overlook',src:'assets/maps/blazing-road/stage-04-shinobi-overlook.webp',
    movement:terrain({blocked:[
      polygon([0,90],[52,90],[58,170],[56,270],[52,380],[58,520],[0,548]),
      polygon([428,90],[480,90],[480,548],[424,520],[422,410],[426,300],[422,190])
    ]})
  }),
  Object.freeze({
    key:'training-grounds',name:'Training Grounds',src:'assets/maps/blazing-road/stage-05-training-grounds.webp',
    movement:terrain({blocked:[
      polygon([0,95],[50,95],[58,180],[54,285],[60,400],[55,530],[0,560]),
      polygon([432,95],[480,95],[480,560],[426,530],[422,410],[430,292],[426,180])
    ]})
  })
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

function mapFrom(value){
  if(!value)return null;
  if(typeof value==='string')return MAPS.find(map=>map.key===value)||null;
  if(value.key)return MAPS.find(map=>map.key===value.key)||value;
  return value;
}

function pointInPolygon(p,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    const crosses=((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/((b.y-a.y)||1e-9)+a.x);
    if(crosses)inside=!inside;
  }
  return inside;
}

const paddingOffsets=pad=>[[0,0],[pad,0],[-pad,0],[0,pad],[0,-pad],[pad*.7,pad*.7],[pad*.7,-pad*.7],[-pad*.7,pad*.7],[-pad*.7,-pad*.7]];

function pointAllowedBy(shape,p,padding=0){
  if(!shape||!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return false;
  const pad=Math.max(0,Number(padding)||0);
  const samples=paddingOffsets(pad);
  if(shape.type==='rect')return samples.every(([dx,dy])=>p.x+dx>=shape.x&&p.x+dx<=shape.x+shape.w&&p.y+dy>=shape.y&&p.y+dy<=shape.y+shape.h);
  if(shape.type==='ellipse')return samples.every(([dx,dy])=>((p.x+dx-shape.x)/Math.max(1,shape.rx))**2+((p.y+dy-shape.y)/Math.max(1,shape.ry))**2<=1);
  if(shape.type==='polygon')return samples.every(([dx,dy])=>pointInPolygon({x:p.x+dx,y:p.y+dy},shape.points||[]));
  return false;
}

function pointBlockedBy(shape,p,padding=0){
  if(!shape||!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return false;
  const pad=Math.max(0,Number(padding)||0);
  if(shape.type==='rect')return p.x>=shape.x-pad&&p.x<=shape.x+shape.w+pad&&p.y>=shape.y-pad&&p.y<=shape.y+shape.h+pad;
  if(shape.type==='ellipse'){
    const rx=Math.max(1,shape.rx+pad),ry=Math.max(1,shape.ry+pad);
    return ((p.x-shape.x)/rx)**2+((p.y-shape.y)/ry)**2<=1;
  }
  if(shape.type==='polygon'){
    if(pointInPolygon(p,shape.points||[]))return true;
    if(pad<=0)return false;
    return paddingOffsets(pad).slice(1).some(([dx,dy])=>pointInPolygon({x:p.x+dx,y:p.y+dy},shape.points||[]));
  }
  return false;
}

function isWalkablePoint(mapOrKey,p,{padding=14}={}){
  if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return false;
  const map=mapFrom(mapOrKey);
  const allowed=map?.movement?.allowed||[];
  const blocked=map?.movement?.blocked||[];
  if(allowed.length&&!allowed.some(shape=>pointAllowedBy(shape,p,padding)))return false;
  return !blocked.some(shape=>pointBlockedBy(shape,p,padding));
}

function nearestWalkable(mapOrKey,p,{padding=14,maxRadius=180}={}){
  const map=mapFrom(mapOrKey);
  if(isWalkablePoint(map,p,{padding}))return {x:p.x,y:p.y};
  for(let radius=8;radius<=maxRadius;radius+=8){
    for(let i=0;i<24;i++){
      const angle=i*Math.PI/12;
      const candidate={x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius};
      if(isWalkablePoint(map,candidate,{padding}))return candidate;
    }
  }
  return null;
}

function constrainMovementPoint(mapOrKey,destination,from=null,{padding=14,step=6}={}){
  const map=mapFrom(mapOrKey);
  const hasTerrain=!!((map?.movement?.allowed?.length||0)+(map?.movement?.blocked?.length||0));
  if(!hasTerrain)return {x:destination.x,y:destination.y};
  const to={x:Number(destination.x),y:Number(destination.y)};
  if(!Number.isFinite(to.x)||!Number.isFinite(to.y))return from&&Number.isFinite(from.x)&&Number.isFinite(from.y)?{x:from.x,y:from.y}:to;
  const origin=from&&Number.isFinite(from.x)&&Number.isFinite(from.y)?{x:Number(from.x),y:Number(from.y)}:null;
  if(!origin)return nearestWalkable(map,to,{padding})||to;
  if(!isWalkablePoint(map,origin,{padding}))return nearestWalkable(map,to,{padding})||nearestWalkable(map,origin,{padding})||origin;
  const distance=Math.hypot(to.x-origin.x,to.y-origin.y);
  const samples=Math.max(1,Math.ceil(distance/Math.max(2,Number(step)||6)));
  let last={...origin};
  for(let i=1;i<=samples;i++){
    const t=i/samples;
    const candidate={x:origin.x+(to.x-origin.x)*t,y:origin.y+(to.y-origin.y)*t};
    if(!isWalkablePoint(map,candidate,{padding}))return last;
    last=candidate;
  }
  return last;
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
  const rawEnemies=[...formation,...extraEnemy];
  const enemies=rawEnemies.map((enemy,index)=>{
    const authored=map.enemyAnchors?.[index%map.enemyAnchors.length]||null;
    const desired=authored||{x:enemy.x,y:enemy.y};
    const spawn=nearestWalkable(map,desired,{padding:22,maxRadius:200})||desired;
    return Object.freeze({
      ...enemy,x:spawn.x,y:spawn.y,
      name:`Road Rogue ${index+1}`,
      mark:String(index+1),
      stats:statsForEnemy(enemy.id,stage,elite)
    });
  });
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

window.BlazingRoadContent=Object.freeze({
  MAX_STAGE,STAT_MAX,MAPS,BASE_ENEMY_STATS,stageNumber,stageConfig,mapForStage,isFinalStage,
  isWalkablePoint,nearestWalkable,constrainMovementPoint
});
})();
