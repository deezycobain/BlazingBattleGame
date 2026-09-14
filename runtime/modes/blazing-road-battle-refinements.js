(()=>{
'use strict';

const MIN_LIVE_HP=.01;
const POLL_MS=10;
const STYLE_ID='bb-road-battle-refinements-style';
let stateRef=null,battleKey='',teamHp=0,teamMax=0,expected=new WeakMap(),timer=0;
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const liveState=()=>{try{return globalThis.eval('S')}catch{return null}};
const activeBattle=()=>document.getElementById('battleScreen')?.classList.contains('active');
function fighters(state){return (state?.pairs||[]).flatMap(pair=>Array.isArray(pair?.units)?pair.units:[]).filter(unit=>unit&&unit.name&&unit.name!=='—'&&finite(unit.maxHp,0)>0)}
function keyFor(state){return `${state?.bbRoadRun?.run_id||'road'}:${state?.bbRoadStage||state?.bbRoadRun?.stage||1}`}
function savedTeamHp(state,units){
 const max=units.reduce((sum,u)=>sum+finite(u.maxHp,0),0),run=state?.bbRoadRun||window.BlazingRoadRun?.loadRun?.();
 const saved=(run?.fighters||[]).reduce((sum,f)=>sum+Math.max(0,finite(f.hp,0)),0);
 if(saved>0||run?.status==='failed')return clamp(saved,0,max);
 return clamp(units.reduce((sum,u)=>sum+Math.max(0,finite(u.hp,0)),0),0,max);
}
function desiredHp(unit){
 if(teamHp<=0)return 0;
 const max=Math.max(MIN_LIVE_HP,finite(unit.maxHp,1)),ratio=teamMax?teamHp/teamMax:1;
 return clamp(Math.max(MIN_LIVE_HP,max*ratio),MIN_LIVE_HP,max);
}
function rebalance(state,units){
 for(const unit of units){const value=desiredHp(unit);unit.hp=value;unit.bbRoadDefeated=teamHp<=0;expected.set(unit,value)}
 state.bbRoadTeamHp=teamHp;state.bbRoadTeamMaxHp=teamMax;
}
function initialize(state,units,key){
 stateRef=state;battleKey=key;teamMax=units.reduce((sum,u)=>sum+Math.max(0,finite(u.maxHp,0)),0);
 teamHp=Number.isFinite(Number(state.bbRoadTeamHp))?clamp(Number(state.bbRoadTeamHp),0,teamMax):savedTeamHp(state,units);
 expected=new WeakMap();rebalance(state,units);
}
function syncSharedHp(){
 const state=liveState();
 if(!state||state.bbRunMode!=='road'||!activeBattle()){stateRef=null;battleKey='';teamHp=0;teamMax=0;expected=new WeakMap();return}
 const units=fighters(state);if(!units.length)return;
 const key=keyFor(state),max=units.reduce((sum,u)=>sum+Math.max(0,finite(u.maxHp,0)),0);
 if(state!==stateRef||key!==battleKey||Math.abs(max-teamMax)>.001){initialize(state,units,key);return}
 let delta=0,changed=false;
 for(const unit of units){const before=expected.get(unit),now=clamp(finite(unit.hp,0),0,finite(unit.maxHp,0));if(Number.isFinite(before)&&Math.abs(now-before)>.0001){delta+=now-before;changed=true}}
 if(changed)teamHp=clamp(teamHp+delta,0,teamMax);
 rebalance(state,units);
}
function snapshot(){const state=liveState(),active=!!(state&&state.bbRunMode==='road'&&activeBattle());return Object.freeze({active,hp:active?teamHp:0,maxHp:active?teamMax:0,alive:active&&teamHp>0,key:battleKey})}
function distribute(total,fighterList){
 const maxTotal=fighterList.reduce((sum,f)=>sum+Math.max(0,finite(f.max_hp??f.maxHp,0)),0);if(!(maxTotal>0)||total<=0)return fighterList.map(()=>0);
 const raw=fighterList.map(f=>Math.max(MIN_LIVE_HP,total*(Math.max(0,finite(f.max_hp??f.maxHp,0))/maxTotal))),sum=raw.reduce((a,b)=>a+b,0),scale=sum>0?total/sum:1;
 return raw.map(v=>Math.max(MIN_LIVE_HP,v*scale));
}
function patchRoadRun(){
 const R=window.BlazingRoadRun;if(!R||R.__bbSharedHp)return;
 const record=R.recordBattleResult.bind(R);
 window.BlazingRoadRun=Object.freeze({...R,__bbSharedHp:true,recordBattleResult(run,battlers){
  const next=record(run,battlers),snap=snapshot();if(!snap.active)return next;
  const values=distribute(clamp(snap.hp,0,snap.maxHp),next.fighters);
  next.fighters=next.fighters.map((fighter,index)=>({...fighter,hp:values[index],defeated:snap.hp<=0}));next.status=snap.hp<=0?'failed':next.status;next.updated_at=new Date().toISOString();return R.validateRun(next);
 }});
}
function correctedMap(map){
 if(!map)return map;
 const p=map.presentation||{},presentation=Object.freeze({...p,introScale:1,combatScale:Math.max(1.24,finite(p.combatScale??p.scale,1.16)),scale:Math.max(1.24,finite(p.combatScale??p.scale,1.16))});
 if(map.key!=='shinobi-overlook')return Object.freeze({...map,presentation});
 const allowed=Object.freeze([{type:'polygon',points:Object.freeze([{x:74,y:178},{x:406,y:178},{x:414,y:238},{x:420,y:330},{x:424,y:430},{x:432,y:558},{x:48,y:558},{x:56,y:430},{x:60,y:330},{x:66,y:238}].map(Object.freeze))}]);
 return Object.freeze({...map,presentation,movement:Object.freeze({allowed,blocked:Object.freeze([])})});
}
function patchRoadContent(){
 const C=window.BlazingRoadContent;if(!C||C.__bbBattleRefined)return;
 const maps=Object.freeze((C.MAPS||[]).map(correctedMap)),resolve=input=>typeof input==='string'?(maps.find(m=>m.key===input)||input):correctedMap(input);
 const isWalkablePoint=(map,p,opts)=>C.isWalkablePoint(resolve(map),p,opts),nearestWalkable=(map,p,opts)=>C.nearestWalkable(resolve(map),p,opts),constrainMovementPoint=(map,to,from,opts)=>C.constrainMovementPoint(resolve(map),to,from,opts);
 const stageConfig=value=>{const cfg=C.stageConfig(value),map=correctedMap(cfg.map);const enemies=Object.freeze((cfg.enemies||[]).map(enemy=>{const point=nearestWalkable(map,{x:enemy.x,y:enemy.y},{padding:C.ENEMY_TERRAIN_PADDING,maxRadius:240})||{x:enemy.x,y:enemy.y};return Object.freeze({...enemy,x:point.x,y:point.y})}));return Object.freeze({...cfg,map,enemies})};
 window.BlazingRoadContent=Object.freeze({...C,__bbBattleRefined:true,MAPS:maps,stageConfig,mapForStage:value=>stageConfig(value).map,isWalkablePoint,nearestWalkable,constrainMovementPoint});
}
function patchResourceRenderer(){
 const R=window.BlazingBattlefieldRenderer;if(!R||R.__bbRoadResourceRefined)return;const base=R.drawPlayerResources.bind(R);
 window.BlazingBattlefieldRenderer=Object.freeze({...R,__bbRoadResourceRefined:true,drawPlayerResources(ctx,args){const state=liveState();if(state?.bbRunMode==='road'){if(args?.linked&&Number.isFinite(args?.spriteTop))R.drawOverheadLinkIcon(ctx,{x:args.x,y:args.spriteTop-10,strength:args.linkStrength,now:args.now});return}return base(ctx,args)}});
}
function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
:root{--bb-parchment-blue:#3f83ad;--bb-parchment-red:#b7403d}
#bbRoadFightIntro{left:var(--bb-vv-left,0px)!important;top:var(--bb-vv-top,0px)!important;right:auto!important;bottom:auto!important;width:var(--bb-vv-width,100vw)!important;height:var(--bb-vv-height,100dvh)!important;display:none!important;place-items:center!important;overflow:visible!important;contain:none!important}
#bbRoadFightIntro.active{display:grid!important}
#bbRoadFightIntro .bb-road-fight-word{position:relative!important;display:grid!important;place-items:center!important;width:min(74vw,310px)!important;height:min(38vw,168px)!important;overflow:visible!important;color:transparent!important;-webkit-text-fill-color:transparent!important;background:none!important;text-shadow:none!important;line-height:1!important}
#bbRoadFightIntro .bb-road-fight-word.bb-brush-text .bb-brush-glyph,#bbRoadFightIntro .bb-road-fight-word.bb-brush-text img{display:none!important}
#bbRoadFightIntro .bb-road-fight-word::before{content:attr(data-brush-text);display:block;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-4deg) skewX(-5deg);font-family:'AnimeAce2',Impact,'Arial Black',sans-serif;font-size:clamp(92px,27vw,184px);font-style:italic;font-weight:1000;font-stretch:condensed;line-height:.78;letter-spacing:-.045em;white-space:nowrap;color:#f4d36a;-webkit-text-fill-color:currentColor;-webkit-text-stroke:clamp(2px,.7vw,5px) #171319;paint-order:stroke fill;text-shadow:.025em .025em 0 #241719,0 .10em .08em rgba(0,0,0,.68),0 0 .17em rgba(255,255,255,.16)}
#bbRoadFightIntro[data-word='3'] .bb-road-fight-word::before{color:#e1b642}
#bbRoadFightIntro[data-word='2'] .bb-road-fight-word::before{color:var(--bb-parchment-blue)}
#bbRoadFightIntro[data-word='1'] .bb-road-fight-word::before{color:var(--bb-parchment-red)}
#bbRoadFightIntro[data-word='FIGHT'] .bb-road-fight-word::before{color:#f5f1e7;font-size:clamp(72px,21vw,156px);letter-spacing:-.065em}
`;
 document.head.appendChild(style);
}
function syncOverlay(){
 const vv=window.visualViewport,root=document.documentElement;
 const width=vv?.width||window.innerWidth,height=vv?.height||window.innerHeight,left=vv?.offsetLeft||0,top=vv?.offsetTop||0;
 root.style.setProperty('--bb-vv-left',`${left}px`);root.style.setProperty('--bb-vv-top',`${top}px`);root.style.setProperty('--bb-vv-width',`${width}px`);root.style.setProperty('--bb-vv-height',`${height}px`);
}
function boot(){ensureStyle();syncOverlay();patchRoadRun();patchRoadContent();patchResourceRenderer();syncSharedHp();timer=window.setInterval(()=>{patchRoadRun();patchRoadContent();patchResourceRenderer();syncSharedHp();syncOverlay()},POLL_MS)}
window.BlazingRoadSharedHp=Object.freeze({sync:syncSharedHp,snapshot});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.visualViewport?.addEventListener('resize',syncOverlay,{passive:true});window.visualViewport?.addEventListener('scroll',syncOverlay,{passive:true});window.addEventListener('resize',syncOverlay,{passive:true});window.addEventListener('pagehide',()=>window.clearInterval(timer),{once:true});
})();
