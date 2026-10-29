import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {frameAt,totalMs,timelineFor,pngInfo,inspectPixels,validateSequence,resolveProfile,inheritTiming,scaffold,validateLandmarks} from '../animation-lab/core.mjs';
const standard=JSON.parse(await fs.readFile('config/fighter-visual-standard.json','utf8'));
const gold=JSON.parse(await fs.readFile('animation-lab/profiles/itachi-gold-v1.json','utf8'));
const library=JSON.parse(await fs.readFile('animation-lab/reference-library.json','utf8'));
const rgba={rgba:true,colorType:6};
function pixels({width=512,height=768,left=180,top=100,right=330,bottom=700,opaque=false,empty=false}={}){const data=new Uint8ClampedArray(width*height*4);if(opaque)data.fill(255);if(!empty)for(let y=top;y<Math.min(height,bottom);y++)for(let x=left;x<Math.min(width,right);x++){const i=(y*width+x)*4;data[i]=160;data[i+1]=80;data[i+2]=50;data[i+3]=255;}return {width,height,data};}
async function frame(name,options={},header=rgba){return {name,metrics:await inspectPixels(pixels(options),header)};}
const sequence=(frames,animation='idle')=>({frames,animation,production:true,timeline:timelineFor(frames.length,100)});
test('variable durations honor exact boundaries, wrap, nonloop endpoint and zero frames',()=>{
 const t=[{frame:2,durationMs:80},{frame:0,durationMs:160},{frame:1,durationMs:510}];
 assert.equal(frameAt(t,79.999).frame,2);assert.equal(frameAt(t,80).frame,0);assert.equal(frameAt(t,240).frame,1);assert.equal(frameAt(t,750).frame,2);assert.equal(frameAt(t,900,false).frame,1);assert.equal(frameAt(t,900,false).ended,true);assert.equal(frameAt([],0).frame,-1);
});
test('gold and active reference timings retain legacy frame counts and observed holds',()=>{
 assert.equal(totalMs(gold.animations.run.timeline),1020);assert.equal(gold.animations.run.timeline.length,12);
 assert.equal(totalMs(library.units.itachi.sequences.idle.timeline),1980);
 assert.equal(totalMs(library.units.scorpion.sequences.run.timeline),864);
 assert.equal(library.units.scorpion.sequences.idle.timeline.length,10);
 assert.equal(totalMs(library.units.scorpion.sequences.basic.timeline),990);
 assert.equal(library.units.obito.sequences.basic.timeline.length,3);
 assert.equal(library.units.itachi.sequences.recoil,undefined);
});
test('all catalog artwork paths exist and avoid superseded Scorpion body packs',async()=>{
 for(const [id,unit] of Object.entries(library.units))for(const [kind,spec] of Object.entries(unit.sequences))for(const file of spec.paths){await fs.access(file);if(id==='scorpion'&&kind!=='recoil')assert.ok(!file.includes('/v2/'));}
});
test('real PNG headers distinguish true RGBA from RGB and reject a renamed non-PNG',async()=>{
 const png=await fs.readFile(library.units.itachi.sequences.run.paths[0]);assert.equal(pngInfo(png).rgba,true);assert.deepEqual([pngInfo(png).width,pngInfo(png).height],[420,420]);const rgb=new Uint8Array(png);rgb[25]=2;assert.equal(pngInfo(rgb).rgba,false);assert.throws(()=>pngInfo(new TextEncoder().encode('this is not a PNG')));
});
test('canonical source passes technical QA without claiming anatomy approval',async()=>{
 const r=validateSequence(sequence([await frame('frame_01.png'),await frame('frame_02.png',{left:181})]),standard);assert.equal(r.technicalPass,true);assert.ok(r.warnings.every(w=>w.includes('production target')));assert.equal(r.artApproval,'pending-human-review');assert.equal(r.frames[0].bodyHeight,600);assert.equal(r.frames[0].feetY,700);
});
test('dimensions, RGB encoding, opaque background, clipping and empty frames fail independently',async()=>{
 for(const [options,header,text] of [[{width:400},rgba,'requires 512'],[{}, {rgba:false,colorType:2},'true RGBA'],[{opaque:true},rgba,'no fully transparent'],[{left:0},rgba,'crop'],[{empty:true},rgba,'empty']]){
  const r=validateSequence(sequence([await frame('frame_01.png',options,header)]),standard);assert.equal(r.technicalPass,false);assert.ok(r.errors.some(e=>e.includes(text)),r.errors.join('; '));
 }
});
test('numbered gaps, duplicate indices and inconsistent canvases are hard failures',async()=>{
 const a=await frame('frame_01.png'),c=await frame('frame_03.png');assert.match(validateSequence(sequence([a,c]),standard).errors.join(' '),/Missing/);
 assert.match(validateSequence(sequence([a,a]),standard).errors.join(' '),/Duplicate numbered/);
 assert.match(validateSequence(sequence([a,await frame('frame_02.png',{width:400})]),standard).errors.join(' '),/Inconsistent canvas/);
});
test('duplicate pixels and registration/occupancy changes are visual review warnings',async()=>{
 const a=await frame('frame_01.png'),b=await frame('frame_02.png');assert.match(validateSequence(sequence([a,b]),standard).warnings.join(' '),/duplicate pixels/);
 const c=await frame('frame_03.png',{left:220,top:130,right:480,bottom:670});const r=validateSequence(sequence([a,c]),standard);assert.match(r.warnings.join(' '),/Horizontal/);assert.match(r.warnings.join(' '),/Vertical/);assert.match(r.warnings.join(' '),/height/);assert.match(r.warnings.join(' '),/occupancy/);
});
test('running feet can lift without a neutral-ground failure; idle requires review',async()=>{
 const f=await frame('frame_01.png',{top:70,bottom:670});const run=validateSequence(sequence([f],'run'),standard),idle=validateSequence(sequence([f],'idle'),standard);assert.equal(run.technicalPass,true);assert.ok(!run.warnings.some(w=>w.includes('neutral feet')));assert.ok(idle.warnings.some(w=>w.includes('neutral feet')));
});
test('large loop discontinuity produces a review warning, not automatic rejection',async()=>{
 const frames=await Promise.all([frame('frame_01.png'),frame('frame_02.png',{left:181}),frame('frame_03.png',{left:0,right:500,top:80,bottom:705})]);const r=validateSequence(sequence(frames,'run'),standard);assert.ok(r.warnings.some(w=>w.includes('Loop boundary')));const reordered={...sequence(frames,'run'),timeline:[{frame:0,durationMs:100},{frame:2,durationMs:100},{frame:1,durationMs:100}]};assert.ok(!validateSequence(reordered,standard).warnings.some(w=>w.includes('Loop boundary')),'loop QA follows edited playback order');
});
test('profile inheritance supports animation overrides and refuses unknown/cyclic parents',()=>{
 const child={schemaVersion:'1.0.0',id:'rookie',extends:gold.id,animations:{idle:{timeline:timelineFor(6,150)}}};const resolved=resolveProfile(child,id=>id===gold.id?gold:null);assert.equal(resolved.animations.run.timeline.length,12);assert.equal(resolved.animations.idle.timeline.length,6);assert.equal(resolved.animations.idle.loop,true);assert.equal(gold.animations.idle.timeline.length,12);
 assert.throws(()=>resolveProfile({...child,extends:'missing'},()=>null),/Missing/);assert.throws(()=>resolveProfile({...child,extends:'rookie'},()=>child),/cycle/);assert.throws(()=>resolveProfile({...child,schemaVersion:'2'},()=>gold),/version/);
});
test('inheriting Gold timing onto six or eight illustrations preserves total, not fabricated poses',()=>{
 for(const count of [6,8]){const t=inheritTiming(gold.animations.run,count);assert.equal(t.length,count);assert.ok(Math.abs(totalMs(t)-1020)<1e-8);assert.equal(new Set(t.map(s=>s.frame)).size,count);}assert.throws(()=>inheritTiming(gold.animations.run,0));
});
test('manual anatomy scaffold separates near/far limbs and rejects malformed saved coordinates',()=>{
 const points=scaffold(512,768);assert.equal(Object.keys(points).length,20);assert.notDeepEqual(points.near_knee,points.far_knee);assert.equal(points.head.status,'unverified-scaffold');validateLandmarks(points,512,768);assert.throws(()=>validateLandmarks({head:{x:Infinity,y:1}},512,768));assert.throws(()=>validateLandmarks({elbow:{x:1,y:1}},512,768));
});
test('studio stays isolated and build continues copying the existing Animation Lab',async()=>{
 const html=await fs.readFile('animation-lab/index.html','utf8'),app=await fs.readFile('animation-lab/studio.mjs','utf8'),build=await fs.readFile('scripts/build-cloudflare.mjs','utf8');
 assert.ok(html.includes('src="studio.mjs"'));assert.ok(!build.includes("'animation-lab'"));assert.doesNotMatch(app,/localStorage|sessionStorage|XMLHttpRequest|method:\s*['"](?:POST|PUT|PATCH|DELETE)/);assert.doesNotMatch(app,/BlazingCombatRuntime|BlazingRoadRun|canonicalUnit\(/);
});
