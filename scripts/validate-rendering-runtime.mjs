import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT=process.cwd();
const assert=(condition,message)=>{if(!condition)throw new Error(`Rendering runtime validation failed: ${message}`)};

function loadBrowserModule(rel,globalName){
  const codePromise=fs.readFile(path.join(ROOT,rel),'utf8');
  return codePromise.then(code=>{
    const window={};
    const sandbox={window,performance:{now:()=>1000},console,Math,Object};
    vm.runInNewContext(code,sandbox,{filename:rel});
    assert(window[globalName],`${rel} did not expose ${globalName}`);
    return window[globalName];
  });
}

function fakeCtx(){
  const calls=[];
  const ctx={calls};
  for(const name of ['save','restore','beginPath','fill','stroke','closePath'])ctx[name]=(...args)=>calls.push([name,...args]);
  for(const name of ['clearRect','fillRect','strokeRect','drawImage','translate','rotate','scale','arc','ellipse','rect','roundRect','moveTo','lineTo','fillText'])ctx[name]=(...args)=>calls.push([name,...args]);
  return ctx;
}

function fakeClassList(){
  const set=new Set();
  return {set,add:(...x)=>x.forEach(v=>set.add(v)),remove:(...x)=>x.forEach(v=>set.delete(v)),toggle:(v,on)=>on?set.add(v):set.delete(v),contains:v=>set.has(v)};
}

const Battlefield=await loadBrowserModule('runtime/rendering/battlefield-renderer.js','BlazingBattlefieldRenderer');
const BattleUi=await loadBrowserModule('runtime/rendering/battle-ui-renderer.js','BlazingBattleUiRenderer');

{
  const ctx=fakeCtx();
  const image={complete:true,naturalWidth:600,naturalHeight:900};
  assert(Battlefield.drawField(ctx,{image,W:480,H:700,mapZoom:1.06})===true,'drawField should report decoded image draw');
  assert(ctx.calls.some(c=>c[0]==='drawImage'),'drawField did not draw the map image');
}
{
  const ctx=fakeCtx();
  assert(Battlefield.drawField(ctx,{image:{complete:false,naturalWidth:0},W:480,H:700,mapZoom:1})===false,'drawField fallback should report false');
  assert(ctx.calls.some(c=>c[0]==='clearRect'),'drawField fallback did not clear transparent canvas');
}
{
  const ctx=fakeCtx();
  Battlefield.drawShape(ctx,{origin:{x:100,y:120},shape:{type:'circle',r:43},rotation:0,color:'#fff',glow:false,bounds:{left:0,right:480,top:0,bottom:700},now:1000});
  assert(ctx.calls.some(c=>c[0]==='arc'&&c[3]===43),'circle attack field radius changed');
}
{
  const ctx=fakeCtx();
  Battlefield.drawShape(ctx,{origin:{x:100,y:120},shape:{type:'pear',rear:48,reach:140,width:102,curve:.72,stem:.52,bulge:.72},rotation:Math.PI/4,color:'#fff',glow:false,bounds:{left:0,right:480,top:0,bottom:700},now:1000});
  const lines=ctx.calls.filter(c=>c[0]==='lineTo');
  assert(lines.length>=70,'pear attack field must render a sampled curved outline');
  assert(ctx.calls.some(c=>c[0]==='closePath'),'pear attack field must close its outline');
  assert(ctx.calls.some(c=>c[0]==='rotate'&&Math.abs(c[1]-Math.PI/4)<1e-9),'pear attack field must preserve directional rotation');
}
{
  const ctx=fakeCtx();
  Battlefield.drawPlayerResources(ctx,{x:100,y:200,hp:55,maxHp:110,chakra:2,maxChakra:8,linked:false});
  const fills=ctx.calls.filter(c=>c[0]==='fillRect');
  assert(fills.some(c=>Math.abs(c[3]-26)<1e-9&&c[4]===4),'50% player HP bar width changed');
  assert(fills.length>=10,'player HUD did not render HP plus 8 chakra pips');
}
{
  const ctx=fakeCtx();
  Battlefield.drawMoveReturnCue(ctx,{origin:{x:50,y:60},distance:0,hintRadius:50,cancelRadius:15});
  assert(ctx.calls.some(c=>c[0]==='arc'),'cancel-ready move cue no longer renders return glyph');
}
{
  const ctx=fakeCtx();
  Battlefield.drawVictoryOverlay(ctx,{victoryFX:{start:0,textFade:700,dimFade:2400,maxDim:.55},victoryImage:{complete:false,naturalWidth:0},W:480,H:700,now:700});
  assert(ctx.calls.some(c=>c[0]==='fillText'&&c[1]==='VICTORY'),'victory fallback text missing');
}
{
  const ticker={classList:fakeClassList(),innerHTML:''};
  BattleUi.renderTacticalTicker(ticker,[{text:'LINK ACTIVE',tone:'link'}]);
  assert(ticker.classList.contains('show')&&ticker.classList.contains('linkActive'),'tactical ticker classes changed');
  assert(ticker.innerHTML.includes('LINK ACTIVE'),'tactical ticker text missing');
}
{
  const hud={classList:fakeClassList(),attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
  const fill={style:{}};
  BattleUi.renderBossHealth(hud,fill,{hp:250,maxHp:500});
  assert(fill.style.width==='50%','boss HP width changed');
  assert(hud.classList.contains('active'),'boss HUD active state missing');
}
{
  const mk=()=>({classList:fakeClassList(),disabled:false,textContent:'',innerHTML:''});
  const phaseEl=mk(),logEl=mk(),normalBtn=mk(),jutsuBtn=mk(),swapBtn=mk(),statusEl=mk();
  BattleUi.renderActionControls({phaseEl,logEl,normalBtn,jutsuBtn,swapBtn,statusEl},{phaseText:'Senku turn',logText:'Ready',action:'jutsu',canAct:true,canSwap:false,canJutsu:true,jutsuLabel:'Ally Heal · 4 ◆',statusHtml:'<div>ok</div>'});
  assert(jutsuBtn.classList.contains('selected'),'Jutsu selected state missing');
  assert(jutsuBtn.disabled===false&&normalBtn.disabled===false,'action enable state changed');
  assert(swapBtn.disabled===true,'swap disabled state changed');
  assert(jutsuBtn.textContent==='Ally Heal · 4 ◆','Jutsu label changed');
  assert(statusEl.innerHTML==='<div>ok</div>','status HTML application changed');
}

console.log('Rendering runtime smoke PASS: field, circle/pear range shapes, player HUD, move cue, victory overlay, tactical ticker, boss HUD, and action controls verified.');
