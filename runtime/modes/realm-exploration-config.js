(()=>{
'use strict';

const freeze=value=>{
 if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
 Object.values(value).forEach(freeze);
 return Object.freeze(value);
};

const shinobiRoute={
 id:'forest_approach',
 realm:'shinobi',
 name:'Forest Approach',
 eyebrow:'SHINOBI REALM · JOURNEY ROUTE',
 courseLength:3200,
 worldWidth:3520,
 stops:{rogue_patrol:2090,village_gate:3020},
 player:{
  anchor:0.22,
  fallbackSprite:'assets/characters/crimson/sprites/runtime/idle/frame_01.png',
  unitSprites:{
   tyler:'assets/characters/tyler/sprites/runtime/fallback/battle_sprite.png'
  }
 },
 theme:{
  sky:'assets/maps/blazing-road/stage-04-shinobi-overlook.webp',
  segments:[
   {id:'overlook',x:0,width:880,background:'assets/maps/blazing-road/stage-04-shinobi-overlook.webp'},
   {id:'lantern_garden',x:880,width:880,background:'assets/maps/blazing-road/stage-03-lantern-garden.webp'},
   {id:'training_ground',x:1760,width:880,background:'assets/maps/blazing-road/stage-05-training-grounds.webp'},
   {id:'village_road',x:2640,width:880,background:'assets/maps/blazing-road/stage-04-shinobi-overlook.webp'}
  ]
 },
 pickups:[
  {id:'spark_01',x:430,lane:1,resource:'rift_spark',amount:1},{id:'spark_02',x:510,lane:1,resource:'rift_spark',amount:1},{id:'spark_03',x:590,lane:1,resource:'rift_spark',amount:1},
  {id:'spark_04',x:850,lane:0,resource:'rift_spark',amount:1},{id:'spark_05',x:925,lane:0,resource:'rift_spark',amount:1},{id:'spark_06',x:1000,lane:0,resource:'rift_spark',amount:1},
  {id:'spark_07',x:1360,lane:2,resource:'rift_spark',amount:1},{id:'spark_08',x:1435,lane:2,resource:'rift_spark',amount:1},{id:'spark_09',x:1510,lane:2,resource:'rift_spark',amount:1},
  {id:'spark_10',x:2470,lane:1,resource:'rift_spark',amount:1},{id:'spark_11',x:2545,lane:1,resource:'rift_spark',amount:1},{id:'spark_12',x:2620,lane:1,resource:'rift_spark',amount:1}
 ],
 interactables:[
  {id:'scout_perch',x:720,lane:2,kind:'poi',icon:'?',title:'Abandoned Scout Perch',copy:'A torn route marker points toward a hidden lower trail.',message:'The old route marker reveals movement beyond the trees.'},
  {id:'supply_cache',x:1120,lane:0,kind:'cache',icon:'▣',title:'Hidden Supply Cache',copy:'Upper trail. One Rift Fragment is tucked inside.',reward:{resource:'rift_fragment',amount:1}},
  {id:'fork_marker',x:1480,lane:1,kind:'fork',icon:'↗',title:'Trail Split',copy:'Upper trail reaches a shrine. Lower trail hides an old field scroll.'},
  {id:'hidden_scroll',x:1640,lane:2,kind:'treasure',icon:'▤',title:'Weathered Field Scroll',copy:'A sealed scroll survived beneath the roots.',reward:{resource:'field_scroll',amount:1}},
  {id:'rift_shrine',x:1770,lane:0,kind:'shrine',icon:'◎',title:'Ancient Rift Shrine',copy:'Stabilize the seal for a Rift Fragment.',reward:{resource:'rift_fragment',amount:1}},
  {id:'rogue_patrol',x:2200,lane:1,kind:'battle',icon:'⚔',title:'Rogue Patrol',copy:'A shinobi squad controls the bridge ahead.',mapStage:4,returnDistance:2325,reward:{resource:'rift_fragment',amount:2}},
  {id:'village_gate',x:3130,lane:1,kind:'gate',icon:'◉',title:'Village Gate',copy:'Forest Approach complete. The next zone continues from here.',reward:{resource:'shinobi_seal',amount:1}}
 ]
};

window.BlazingJourneyConfig=freeze({
 version:3,
 realms:[
  {id:'shinobi',name:'Shinobi Realm',subtitle:'Forest Approach · Journey Route',status:'open',route:'forest_approach'},
  {id:'frozen',name:'Frozen Reach',subtitle:'Rift signature unstable',status:'locked'},
  {id:'ashen',name:'Ashen Fracture',subtitle:'Coordinates unknown',status:'locked'}
 ],
 routes:{forest_approach:shinobiRoute}
});
})();
