(()=>{
'use strict';

const MAX_STAGE=10;
const STAT_MAX=100;
const PLAYER_FOOT_PADDING=4;
const ENEMY_TERRAIN_PADDING=18;
const PLAYABLE_FLOOR=Object.freeze({x:18,y:96,w:444,h:468});
const BOUNDARY_SEARCH_STEPS=9;
const BOUNDARY_NUDGE=1.5;
const clampStat=value=>Math.max(1,Math.min(STAT_MAX,Math.round(Number(value)||1)));
const point=(x,y)=>Object.freeze({x,y});
const polygon=(...points)=>Object.freeze({type:'polygon',points:Object.freeze(points.map(([x,y])=>point(x,y)))});
const rect=(x,y,w,h)=>Object.freeze({type:'rect',x,y,w,h});
const ellipse=(x,y,rx,ry)=>Object.freeze({type:'ellipse',x,y,rx,ry});
const terrain=({allowed=[],blocked=[]}={})=>Object.freeze({allowed:Object.freeze(allowed),blocked:Object.freeze(blocked)});
const anchors=(...points)=>Object.freeze(points.map(([x,y])=>point(x,y)));
const presentation=(combatScale=1.12,position='center 53%')=>Object.freeze({
  introScale:1,
  combatScale,
  scale:combatScale,
  position,
  introHoldMs:520,
  transitionMs:620
});
const broadFloor=()=>[rect(PLAYABLE_FLOOR.x,PLAYABLE_FLOOR.y,PLAYABLE_FLOOR.w,PLAYABLE_FLOOR.h)];

const MAPS=Object.freeze([
  Object.freeze({
    key:'south-sac',name:'South Sac Approach',src:'assets/maps/blazing-road/stage-01-south-sac.webp',
    presentation:presentation(1.14,'center 54%'),
    enemyAnchors:anchors([200,260],[280,274],[240,340],[315,382],[176,386]),
    movement:terrain({
      // Trace the visible plaza instead of subtracting two tall invisible side walls.
      // The floor deliberately opens toward the foreground to match the artwork's perspective.
      allowed:[polygon(
        [76,100],[404,100],[410,155],[414,220],[416,300],[420,380],[432,470],[452,560],
        [28,560],[48,470],[60,380],[64,300],[66,220],[70,155]
      )]
    })
  }),
  Object.freeze({
    key:'moon-statue-garden',name:'Moon Statue Garden',src:'assets/maps/blazing-road/stage-02-moon-statue-garden.webp',
    presentation:presentation(1.13,'center 53%'),
    enemyAnchors:anchors([205,220],[275,232],[210,315],[290,362],[242,276]),
    movement:terrain({
      // The corridor widens toward the camera. Only the actual moon statue remains a blocker.
      allowed:[polygon(
        [80,102],[400,102],[406,160],[412,230],[416,310],[424,400],[438,490],[450,560],
        [30,560],[42,490],[56,400],[64,310],[68,230],[74,160]
      )],
      blocked:[ellipse(239,145,50,36)]
    })
  }),
  Object.freeze({
    key:'lantern-garden',name:'Lantern Garden',src:'assets/maps/blazing-road/stage-03-lantern-garden.webp',
    presentation:presentation(1.12,'center 53%'),
    movement:terrain({allowed:broadFloor(),blocked:[
      polygon([0,86],[54,86],[66,150],[70,230],[64,325],[70,430],[58,535],[0,560]),
      polygon([430,86],[480,86],[480,562],[426,535],[419,438],[422,335],[416,238],[422,150]),
      polygon([135,86],[345,86],[337,137],[320,157],[160,157],[143,136]),
      ellipse(45,404,24,61),
      ellipse(440,421,22,65)
    ]})
  }),
  Object.freeze({
    key:'shinobi-overlook',name:'Shinobi Overlook',src:'assets/maps/blazing-road/stage-04-shinobi-overlook.webp',
    presentation:presentation(1.11,'center 52%'),
    movement:terrain({allowed:broadFloor(),blocked:[
      polygon([0,90],[52,90],[58,170],[56,270],[52,380],[58,520],[0,548]),
      polygon([428,90],[480,90],[480,548],[424,520],[422,410],[426,300],[422,190])
    ]})
  }),
  Object.freeze({
    key:'training-grounds',name:'Training Grounds',src:'assets/maps/blazing-road/stage-05-training-grounds.webp',
    presentation:presentation(1.10,'center 52%'),
    movement:terrain({allowed:broadFloor(),blocked:[
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

function isWalkablePoint(mapOrKey,p,{padding=PLAYER_FOOT_PADDING}={}){
  if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return false;
  const map=mapFrom(mapOrKey);
  const allowed=map?.movement?.allowed||[];
  const blocked=map?.movement?.blocked||[];
  if(allowed.length&&!allowed.some(shape=>pointAllowedBy(shape,p,padding)))return false;
  return !blocked.some(shape=>pointBlockedBy(shape,p,padding));
}

function nearestWalkable(mapOrKey,p,{padding=PLAYER_FOOT_PADDING,maxRadius=180}={}){
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

function shapeEdges(shape){
  if(!shape)return [];
  if(shape.type==='polygon'){
    const points=shape.points||[];
    return points.map((a,i)=>({a,b:points[(i+1)%points.length]})).filter(edge=>edge.a&&edge.b);
  }
  if(shape.type==='rect'){
    const points=[
      {x:shape.x,y:shape.y},{x:shape.x+shape.w,y:shape.y},
      {x:shape.x+shape.w,y:shape.y+shape.h},{x:shape.x,y:shape.y+shape.h}
    ];
    return points.map((a,i)=>({a,b:points[(i+1)%points.length]}));
  }
  if(shape.type==='ellipse'){
    const edges=[],segments=32;
    for(let i=0;i<segments;i++){
      const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;
      edges.push({
        a:{x:shape.x+Math.cos(a)*shape.rx,y:shape.y+Math.sin(a)*shape.ry},
        b:{x:shape.x+Math.cos(b)*shape.rx,y:shape.y+Math.sin(b)*shape.ry}
      });
    }
    return edges;
  }
  return [];
}

function closestPointOnSegment(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y;
  const denom=dx*dx+dy*dy;
  const t=denom?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/denom)):0;
  return {x:a.x+dx*t,y:a.y+dy*t};
}

function nearestEdge(mapOrKey,p){
  const map=mapFrom(mapOrKey);
  const shapes=[...(map?.movement?.allowed||[]),...(map?.movement?.blocked||[])];
  let best=null,bestDistance=Infinity;
  for(const shape of shapes){
    for(const edge of shapeEdges(shape)){
      const nearest=closestPointOnSegment(p,edge.a,edge.b);
      const distance=Math.hypot(p.x-nearest.x,p.y-nearest.y);
      if(distance<bestDistance){
        bestDistance=distance;
        best={...edge,nearest};
      }
    }
  }
  return best;
}

function segmentBoundary(map,from,to,padding,step){
  const distance=Math.hypot(to.x-from.x,to.y-from.y);
  const samples=Math.max(1,Math.ceil(distance/Math.max(2,Number(step)||6)));
  let lastT=0;
  for(let i=1;i<=samples;i++){
    const t=i/samples;
    const candidate={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t};
    if(isWalkablePoint(map,candidate,{padding})){
      lastT=t;
      continue;
    }
    let lo=lastT,hi=t;
    for(let n=0;n<BOUNDARY_SEARCH_STEPS;n++){
      const mid=(lo+hi)/2;
      const probe={x:from.x+(to.x-from.x)*mid,y:from.y+(to.y-from.y)*mid};
      if(isWalkablePoint(map,probe,{padding}))lo=mid;
      else hi=mid;
    }
    return {
      point:{x:from.x+(to.x-from.x)*lo,y:from.y+(to.y-from.y)*lo},
      t:lo
    };
  }
  return null;
}

function slideFromBoundary(map,boundary,to,{padding,step}){
  const edge=nearestEdge(map,boundary);
  if(!edge)return null;
  const dx=edge.b.x-edge.a.x,dy=edge.b.y-edge.a.y,length=Math.hypot(dx,dy);
  if(length<1e-6)return null;
  const tangent={x:dx/length,y:dy/length};
  const remaining={x:to.x-boundary.x,y:to.y-boundary.y};
  const projected=remaining.x*tangent.x+remaining.y*tangent.y;
  if(Math.abs(projected)<1e-4)return null;
  const normal={x:-tangent.y,y:tangent.x};
  const bases=[
    {x:boundary.x+normal.x*BOUNDARY_NUDGE,y:boundary.y+normal.y*BOUNDARY_NUDGE},
    {x:boundary.x-normal.x*BOUNDARY_NUDGE,y:boundary.y-normal.y*BOUNDARY_NUDGE},
    boundary
  ].filter(candidate=>isWalkablePoint(map,candidate,{padding}));
  if(!bases.length)return null;
  bases.sort((a,b)=>Math.hypot(a.x-boundary.x,a.y-boundary.y)-Math.hypot(b.x-boundary.x,b.y-boundary.y));
  const base=bases[0];
  const slideTarget={x:base.x+tangent.x*projected,y:base.y+tangent.y*projected};
  const hit=segmentBoundary(map,base,slideTarget,padding,step);
  return hit?.point||slideTarget;
}

function constrainMovementPoint(mapOrKey,destination,from=null,{padding=PLAYER_FOOT_PADDING,step=6}={}){
  const map=mapFrom(mapOrKey);
  const hasTerrain=!!((map?.movement?.allowed?.length||0)+(map?.movement?.blocked?.length||0));
  if(!hasTerrain)return {x:destination.x,y:destination.y};
  const to={x:Number(destination.x),y:Number(destination.y)};
  if(!Number.isFinite(to.x)||!Number.isFinite(to.y))return from&&Number.isFinite(from.x)&&Number.isFinite(from.y)?{x:from.x,y:from.y}:to;
  const rawOrigin=from&&Number.isFinite(from.x)&&Number.isFinite(from.y)?{x:Number(from.x),y:Number(from.y)}:null;
  if(!rawOrigin)return nearestWalkable(map,to,{padding})||to;
  const origin=isWalkablePoint(map,rawOrigin,{padding})
    ? rawOrigin
    : nearestWalkable(map,rawOrigin,{padding})||nearestWalkable(map,to,{padding})||rawOrigin;
  if(!isWalkablePoint(map,origin,{padding}))return origin;
  const hit=segmentBoundary(map,origin,to,padding,step);
  if(!hit)return to;
  const slid=slideFromBoundary(map,hit.point,to,{padding,step});
  if(slid&&isWalkablePoint(map,slid,{padding})){
    // If the first slide reaches a corner, spend the remaining drag vector once more.
    // This lets a continuous pointer gesture round the corner instead of requiring a
    // stationary extra frame, while the second boundary check still forbids tunnelling.
    if(Math.hypot(slid.x-hit.point.x,slid.y-hit.point.y)>.25){
      const turnHit=segmentBoundary(map,slid,to,padding,step);
      if(!turnHit)return to;
      const turned=slideFromBoundary(map,turnHit.point,to,{padding,step});
      if(turned&&isWalkablePoint(map,turned,{padding})&&Math.hypot(turned.x-slid.x,turned.y-slid.y)>.25)return turned;
    }
    return slid;
  }
  return nearestWalkable(map,hit.point,{padding,maxRadius:Math.max(24,padding*4)})||hit.point;
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
    const spawn=nearestWalkable(map,desired,{padding:ENEMY_TERRAIN_PADDING,maxRadius:200})||desired;
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
  MAX_STAGE,STAT_MAX,PLAYER_FOOT_PADDING,ENEMY_TERRAIN_PADDING,PLAYABLE_FLOOR,MAPS,BASE_ENEMY_STATS,
  stageNumber,stageConfig,mapForStage,isFinalStage,isWalkablePoint,nearestWalkable,constrainMovementPoint
});
})();