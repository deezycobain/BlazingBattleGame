(()=>{
'use strict';
const freeze=value=>{if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(freeze);return Object.freeze(value);};
const MAP={forest:'assets/maps/blazing-road/stage-04-shinobi-overlook.webp',garden:'assets/maps/blazing-road/stage-03-lantern-garden.webp',transition:'assets/maps/blazing-road/stage-05-training-grounds.webp',desert:'assets/maps/blazing-road/stage-01-south-sac.webp',ruins:'assets/maps/blazing-road/stage-02-moon-statue-garden.webp'};
const layer=(id,role,asset,parallax,z,extra={})=>({id,role,asset,parallax,z,offsetY:0,scale:1,repeat:'no-repeat',size:'cover',opacity:1,...extra});
const layerSet=(primary,secondary,tone)=>[
 layer('sky','sky',primary,.08,0,{opacity:.78,scale:1.04}),layer('distant','distant',secondary,.24,20,{opacity:.34,scale:1.08}),
 layer('midground','midground',primary,.52,40,{opacity:.48,scale:1.04}),layer('gameplay','gameplay',primary,1,60,{opacity:.72}),
 layer('foreground','foreground',secondary,1.16,80,{opacity:.22,scale:1.08,offsetY:18}),
 layer('atmosphere','atmosphere',null,.72,90,{opacity:.2,repeat:'repeat-x',size:'320px 100%',gradient:tone})
];
const geometry=(ground=[],platforms=[],gaps=[],slopes=[],boundaries=[],triggers=[])=>({ground,platforms,gaps,slopes,boundaries,triggers});
const segments=[
 {id:'forest_entry',x:0,width:880,theme:'forest_entry',layers:layerSet(MAP.forest,MAP.garden,'radial-gradient(circle at 30% 28%,rgba(126,205,170,.28),transparent 42%)'),geometry:geometry([{id:'forest_floor',x:0,width:880,lane:1}],[],[],[],[{id:'route_start',x:0,side:'left'}],[{id:'scout_region',x:650,width:150,kind:'poi'}]),encounters:[],resources:['spark_01','spark_02','spark_03'],hazards:[],transition:{out:'canopy_crossfade',overlap:56,next:'deep_forest'},checkpoint:{id:'cp_forest_entry',localX:80,lane:1,label:'Forest Entry',persistCollections:true}},
 {id:'deep_forest',x:880,width:880,theme:'deep_forest',layers:layerSet(MAP.garden,MAP.forest,'linear-gradient(115deg,transparent 0 42%,rgba(230,202,127,.18) 48%,transparent 56%)'),geometry:geometry([{id:'garden_floor',x:0,width:880,lane:1}],[{id:'cache_ledge',x:180,width:220,lane:0,elevation:10}],[],[{id:'root_slope',x:500,width:220,lane:2,startElevation:0,endElevation:8}],[],[{id:'fork_region',x:700,width:150,kind:'route'}]),encounters:[],resources:['spark_04','spark_05','spark_06'],hazards:[],transition:{in:'canopy_crossfade',out:'drybrush_crossfade',overlap:64,next:'forest_desert_transition'},checkpoint:{id:'cp_deep_forest',localX:80,lane:1,label:'Deep Forest',persistCollections:true}},
 {id:'forest_desert_transition',x:1760,width:880,theme:'forest_desert_transition',layers:layerSet(MAP.transition,MAP.garden,'linear-gradient(90deg,rgba(96,144,104,.2),transparent 48%,rgba(218,154,74,.2))'),geometry:geometry([{id:'transition_floor_a',x:0,width:205,lane:1},{id:'transition_floor_b',x:285,width:595,lane:1}],[{id:'scroll_roots',x:90,width:190,lane:2,elevation:7}],[{id:'ravine_gap',x:205,width:80,lane:1,jumpRequired:true}],[],[],[{id:'shrine_region',x:620,width:170,kind:'reward'}]),encounters:[],resources:['spark_07','spark_08','spark_09'],hazards:[{id:'ravine_gap',kind:'gap',x:205,width:80,lane:1,checkpoint:'cp_deep_forest',message:'Jump the ravine to continue.'}],transition:{in:'drybrush_crossfade',out:'heat_crossfade',overlap:72,next:'sunscar_desert'},checkpoint:{id:'cp_transition',localX:80,lane:1,label:'Border Trail',persistCollections:true}},
 {id:'sunscar_desert',x:2640,width:880,theme:'sunscar_desert',layers:layerSet(MAP.desert,MAP.transition,'repeating-linear-gradient(168deg,transparent 0 34px,rgba(248,205,120,.12) 36px 38px,transparent 40px 76px)'),geometry:geometry([{id:'desert_floor',x:0,width:880,lane:1}],[{id:'dune_ridge',x:170,width:260,lane:0,elevation:12}],[],[{id:'dune_slope',x:470,width:230,lane:1,startElevation:0,endElevation:9}],[],[{id:'patrol_region',x:470,width:230,kind:'encounter'}]),encounters:[{id:'rogue_patrol',x:470,width:230,stopX:520}],resources:['spark_10','spark_11','spark_12'],hazards:[{id:'hot_sand',kind:'slow',x:90,width:150,lane:2,multiplier:.58}],transition:{in:'heat_crossfade',out:'ruins_crossfade',overlap:72,next:'desert_ruins'},checkpoint:{id:'cp_sunscar',localX:80,lane:1,label:'Sunscar Desert',persistCollections:true}},
 {id:'desert_ruins',x:3520,width:880,theme:'desert_ruins',layers:layerSet(MAP.ruins,MAP.desert,'radial-gradient(circle at 72% 34%,rgba(180,107,255,.18),transparent 34%)'),geometry:geometry([{id:'ruins_floor',x:0,width:880,lane:1}],[{id:'ruin_platform',x:190,width:240,lane:0,elevation:14}],[],[{id:'ruin_steps',x:480,width:180,lane:1,startElevation:0,endElevation:10}],[{id:'route_end',x:880,side:'right'}],[{id:'gate_region',x:650,width:180,kind:'gate'}]),encounters:[],resources:['spark_13','spark_14','spark_15'],hazards:[],transition:{in:'ruins_crossfade',overlap:56,next:null},checkpoint:{id:'cp_desert_ruins',localX:80,lane:1,label:'Desert Ruins',persistCollections:true}}
];
const shinobiRoute={
 id:'forest_approach',realm:'shinobi',name:'Forest Approach',eyebrow:'SHINOBI REALM · JOURNEY ROUTE',courseLength:4320,worldWidth:4400,
 streaming:{mountRadius:1,preloadAhead:2,releaseBehind:2,transitionLead:180},stops:{rogue_patrol:3160,village_gate:4140},
 player:{anchor:.22,fallbackSprite:'assets/characters/crimson/sprites/runtime/idle/frame_01.png',unitSprites:{tyler:'assets/characters/tyler/sprites/runtime/fallback/battle_sprite.png'}},segments,
 pickups:[
  {id:'spark_01',x:430,lane:1,resource:'rift_spark',amount:1},{id:'spark_02',x:510,lane:1,resource:'rift_spark',amount:1},{id:'spark_03',x:590,lane:1,resource:'rift_spark',amount:1},
  {id:'spark_04',x:1010,lane:0,resource:'rift_spark',amount:1},{id:'spark_05',x:1090,lane:0,resource:'rift_spark',amount:1},{id:'spark_06',x:1170,lane:0,resource:'rift_spark',amount:1},
  {id:'spark_07',x:1880,lane:2,resource:'rift_spark',amount:1},{id:'spark_08',x:1960,lane:2,resource:'rift_spark',amount:1},{id:'spark_09',x:2040,lane:2,resource:'rift_spark',amount:1},
  {id:'spark_10',x:2780,lane:1,resource:'rift_spark',amount:1},{id:'spark_11',x:2860,lane:1,resource:'rift_spark',amount:1},{id:'spark_12',x:2940,lane:1,resource:'rift_spark',amount:1},
  {id:'spark_13',x:3650,lane:0,resource:'rift_spark',amount:1},{id:'spark_14',x:3730,lane:0,resource:'rift_spark',amount:1},{id:'spark_15',x:3810,lane:0,resource:'rift_spark',amount:1}
 ],
 interactables:[
  {id:'scout_perch',x:720,lane:2,kind:'poi',icon:'?',title:'Abandoned Scout Perch',copy:'A torn route marker points toward a hidden lower trail.',message:'The old route marker reveals movement beyond the trees.'},
  {id:'supply_cache',x:1120,lane:0,kind:'cache',icon:'▣',title:'Hidden Supply Cache',copy:'Upper trail. One Rift Fragment is tucked inside.',reward:{resource:'rift_fragment',amount:1}},
  {id:'fork_marker',x:1660,lane:1,kind:'fork',icon:'↗',title:'Trail Split',copy:'Upper trail reaches a shrine. Lower trail hides an old field scroll.'},
  {id:'hidden_scroll',x:1890,lane:2,kind:'treasure',icon:'▤',title:'Weathered Field Scroll',copy:'A sealed scroll survived beneath the roots.',reward:{resource:'field_scroll',amount:1}},
  {id:'rift_shrine',x:2490,lane:0,kind:'shrine',icon:'◎',title:'Ancient Rift Shrine',copy:'Stabilize the seal for a Rift Fragment.',reward:{resource:'rift_fragment',amount:1}},
  {id:'rogue_patrol',x:3280,lane:1,kind:'battle',icon:'⚔',title:'Rogue Patrol',copy:'A shinobi squad controls the desert pass.',mapStage:4,returnDistance:3360,reward:{resource:'rift_fragment',amount:2}},
  {id:'village_gate',x:4230,lane:1,kind:'gate',icon:'◉',title:'Ruins Gate',copy:'Forest Approach complete. The next zone continues from here.',reward:{resource:'shinobi_seal',amount:1}}
 ]
};
window.BlazingJourneyConfig=freeze({version:4,layerSchema:['sky','distant','midground','gameplay','foreground','atmosphere'],realms:[{id:'shinobi',name:'Shinobi Realm',subtitle:'Forest Approach · Journey Route',status:'open',route:'forest_approach'},{id:'frozen',name:'Frozen Reach',subtitle:'Rift signature unstable',status:'locked'},{id:'ashen',name:'Ashen Fracture',subtitle:'Coordinates unknown',status:'locked'}],routes:{forest_approach:shinobiRoute}});
})();
