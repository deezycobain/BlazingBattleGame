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
  const recoilClip=Object.freeze({durationMs:260,loop:false,easing:'smooth',keyframes:[
    {t:0,pins:{}},
    {t:.14,pins:{head:{x:-.008,y:.009},chest:{x:-.012,y:.007},shoulderL:{x:-.014,y:.007},shoulderR:{x:-.014,y:.007},handL:{x:-.010,y:.004},handR:{x:-.010,y:.004},hips:{x:-.004,y:.002}}},
    {t:.34,pins:{head:{x:.004,y:-.003},chest:{x:.005,y:-.003},shoulderL:{x:.006,y:-.003},shoulderR:{x:.006,y:-.003},handL:{x:.004,y:-.002},handR:{x:.004,y:-.002},hips:{x:.002,y:0}}},
    {t:.62,pins:{head:{x:-.002,y:.001},chest:{x:-.002,y:.001},shoulderL:{x:-.003,y:.001},shoulderR:{x:-.003,y:.001},handL:{x:-.002,y:.001},handR:{x:-.002,y:.001},hips:{x:-.001,y:0}}},
    {t:1,pins:{}}
  ]});
  const profile=(sourceIdle,sourceRecoil)=>({
    sources:{idle:sourceIdle,recoil:sourceRecoil},
    mesh:{cols:5,rows:8,mobileCols:4,mobileRows:6},
    pins:humanoidPins,
    clips:{idle:idleClip,recoil:recoilClip}
  });
  runtime.register('Scorpion',profile(
    'assets/characters/scorpion/sprites/runtime/v2/idle/frame_01.png?rig=v1',
    'assets/characters/scorpion/sprites/runtime/v2/recoil/frame_01.png?rig=v1'
  ));
  runtime.register('Mashle',profile(
    'assets/characters/mashle/sprites/runtime/v2/idle/frame_01.png?rig=v1',
    'assets/characters/mashle/sprites/runtime/v2/recoil/frame_01.png?rig=v1'
  ));
})();
