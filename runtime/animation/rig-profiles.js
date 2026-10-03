(()=>{
  'use strict';
  const runtime=window.BlazingRigRuntime;if(!runtime)return;
  const humanoidPins=Object.freeze({
    head:{x:.50,y:.245,radius:.235},chest:{x:.50,y:.405,radius:.30},
    shoulderL:{x:.39,y:.39,radius:.22},shoulderR:{x:.61,y:.39,radius:.22},
    handL:{x:.32,y:.57,radius:.20},handR:{x:.68,y:.57,radius:.20},
    hips:{x:.50,y:.62,radius:.28},kneeL:{x:.445,y:.755,radius:.19},kneeR:{x:.555,y:.755,radius:.19},
    footL:{x:.445,y:.91,radius:.14},footR:{x:.555,y:.91,radius:.14}
  });
  const idleClip=Object.freeze({durationMs:1900,loop:true,easing:'smooth',keyframes:[
    {t:0,pins:{}},
    {t:.25,pins:{head:{x:-.002,y:-.004},chest:{x:-.003,y:-.009},shoulderL:{x:-.003,y:-.009},shoulderR:{x:-.003,y:-.009},handL:{x:-.002,y:-.005},handR:{x:-.002,y:-.005},hips:{x:.001,y:.002}}},
    {t:.50,pins:{head:{x:.001,y:-.007},chest:{x:.002,y:-.013},shoulderL:{x:.001,y:-.012},shoulderR:{x:.003,y:-.012},handL:{x:.001,y:-.007},handR:{x:.003,y:-.007},hips:{x:-.001,y:.003}}},
    {t:.75,pins:{head:{x:.003,y:-.003},chest:{x:.004,y:-.006},shoulderL:{x:.004,y:-.006},shoulderR:{x:.004,y:-.006},handL:{x:.003,y:-.003},handR:{x:.004,y:-.003},hips:{x:.001,y:.001}}},
    {t:1,pins:{}}
  ]});
  const profile=(source)=>({sources:{idle:source},mesh:{cols:5,rows:8,mobileCols:4,mobileRows:6},pins:humanoidPins,clips:{idle:idleClip}});
  runtime.register('Scorpion',profile('assets/characters/scorpion/sprites/runtime/v2/idle/frame_01.png?rig=v1'));
  runtime.register('Mashle',profile('assets/characters/mashle/sprites/runtime/v2/idle/frame_01.png?rig=v1'));
})();
