from pathlib import Path
import json
import re

INDEX = Path('index.html')
html = INDEX.read_text(encoding='utf-8')
original = html
status = {'steps': []}

# Embedded battle data is the runtime authority in the standalone game.
m = re.search(r'(<script id="blazing-unit-data">window\.BLAZING_UNIT_DATA=)(\{.*?\})(;</script>)', html, re.S)
if not m:
    raise RuntimeError('embedded BLAZING_UNIT_DATA not found')
data = json.loads(m.group(2))
s = data['senku']
s['schema_version'] = 3
s['combat']['chakra_max'] = 8
s['combat']['chakra_start'] = 8
s['abilities']['jutsu'] = {
    'id': 'ally_heal',
    'name': 'Ally Heal',
    'cost': 4,
    'damage_multiplier': 0,
    'delivery': 'airburst_party_heal',
    'category': 'jutsu',
    'ultimate': False,
    'status_effect': None,
    'status_chance': 0,
    'presentation': {
        'cast_frames': 4,
        'projectile_frames': 1,
        'impact_frames': 0,
        'cast_duration_ms': 680,
        'flight_duration_ms': 650,
        'impact_duration_ms': 500,
        'arc_height_px': 95,
        'screen_dim_alpha': 0.12,
    },
    'target': 'all_living_allies',
    'effect': 'heal_percent_max_hp',
    'heal_percent': 0.30,
    'include_caster': True,
    'dead_target_behavior': 'ignore',
    'revive': False,
}
s.get('assets', {}).get('vfx', {}).pop('jutsu_impact', None)
html = html[:m.start(2)] + json.dumps(data, separators=(',', ':')) + html[m.end(2):]
status['steps'].append('embedded_senku')

# Carry unit-owned starting chakra into battle definitions.
old = 'maxChakra:d.combat.chakra_max||0,jutsuCost:jutsu.cost??99,'
new = 'maxChakra:d.combat.chakra_max||0,startChakra:d.combat.chakra_start??2,jutsuCost:jutsu.cost??99,'
if old not in html:
    raise RuntimeError('runtimeDefinition chakra anchor missing')
html = html.replace(old, new, 1)

old = "const start=opts.startingChakra??2;\n u.chakra=start==='full'?u.maxChakra:Math.max(0,Math.min(u.maxChakra,start));"
new = "const start=opts.startingChakra??d.startChakra??2;\n u.chakra=start==='full'?u.maxChakra:Math.max(0,Math.min(u.maxChakra,start));"
if old not in html:
    raise RuntimeError('makeRosterUnit starting chakra anchor missing')
html = html.replace(old, new, 1)

html, n = re.subn(
    r"function teamSpawnOptions\(name\)\{.*?\n\}",
    lambda _: "function teamSpawnOptions(name){\n // DEV TEST: all playable units begin at their own maximum chakra.\n return {startingChakra:'full'};\n}",
    html,
    count=1,
    flags=re.S,
)
if n != 1:
    raise RuntimeError('teamSpawnOptions replacement failed')
status['steps'].append('chakra')

# Dev speed override at authoritative construction points only.
old = 'mark:d.combat.mark,speed:d.stats.speed,attack:d.stats.attack,defense:d.stats.defense,'
new = "mark:d.combat.mark,speed:(d.role==='playable'?200:(d.role==='boss'?50:d.stats.speed)),attack:d.stats.attack,defense:d.stats.defense,"
if old not in html:
    raise RuntimeError('runtime speed anchor missing')
html = html.replace(old, new, 1)

old = "speed:canonicalUnit('anubis').stats.speed,attack:canonicalUnit('anubis').stats.attack"
if old not in html:
    raise RuntimeError('boss speed anchor missing')
html = html.replace(old, "speed:50,attack:canonicalUnit('anubis').stats.attack", 1)
status['steps'].append('speed')

# Replace old Chemical Reaction timing/impact with the approved upward potion airburst.
new_anim = """function animateSenkuChemicalReaction(unitName,from,target,onImpact,onDone){
 const token=ACTIVE_ACTION_TOKEN;
 const meta=canonicalUnit('senku').abilities.jutsu.presentation||{};
 const castDuration=meta.cast_duration_ms||680;
 const flightDuration=meta.flight_duration_ms||650;
 const flashDuration=meta.impact_duration_ms||500;
 const arcHeight=meta.arc_height_px||95;
 const state=ensureAnimState();
 if(!state.attackPose)state.attackPose={};
 state.attackPose[unitName]={kind:'special',start:performance.now(),duration:castDuration+flightDuration+flashDuration};
 if(meta.screen_dim_alpha)S.jutsuDim={start:performance.now(),alpha:meta.screen_dim_alpha,end:null};
 setTimeout(()=>{
   if(!actionTokenAlive(token))return;
   const dir=from.x>(W/2)?-1:1;
   const burst={x:from.x+(72*dir),y:Math.max(95,from.y-145)};
   const projectile={kind:'senkuAllyHealProjectile',from:{x:from.x,y:from.y-30},to:burst,start:performance.now(),duration:flightDuration,life:1,arcHeight};
   S.floaters.push(projectile);
   setTimeout(()=>{
     if(!actionTokenAlive(token))return;
     S.floaters=S.floaters.filter(x=>x!==projectile);
     try{onImpact&&onImpact()}catch(err){console.error('Senku Ally Heal impact failed:',err);return recoverAction('Senku Ally Heal impact')}
     const flash={kind:'senkuAllyHealFlash',x:burst.x,y:burst.y,start:performance.now(),duration:flashDuration,life:1};
     S.floaters.push(flash);
     setTimeout(()=>{
       S.floaters=S.floaters.filter(x=>x!==flash);
       if(S.jutsuDim)S.jutsuDim.end=performance.now();
       const st=ensureAnimState();if(st.attackPose)delete st.attackPose[unitName];
       if(actionTokenAlive(token)){try{onDone&&onDone()}catch(err){recoverAction('Senku Ally Heal completion')}}
     },flashDuration);
   },flightDuration);
 },castDuration*.70);
}

function animateSenkuBomb"""
html, n = re.subn(
    r'function animateSenkuChemicalReaction\(unitName,from,target,onImpact,onDone\)\{.*?\n\}\n\nfunction animateSenkuBomb',
    lambda _: new_anim,
    html,
    count=1,
    flags=re.S,
)
if n != 1:
    raise RuntimeError('Ally Heal animation function replacement failed')

new_renderer = """else if(f.kind==='senkuAllyHealProjectile'){
     const t=clamp((performance.now()-f.start)/f.duration,0,1);
     const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
     const arc=f.arcHeight||95;
     const x=f.from.x+(f.to.x-f.from.x)*e;
     const baseY=f.from.y+(f.to.y-f.from.y)*e;
     const y=baseY-4*arc*t*(1-t);
     const dx=f.to.x-f.from.x;
     const dy=(f.to.y-f.from.y)-4*arc*(1-2*t);
     const img=SENKU_CHEM_PROJECTILE_FRAMES[Math.min(SENKU_CHEM_PROJECTILE_FRAMES.length-1,Math.floor(t*SENKU_CHEM_PROJECTILE_FRAMES.length))];
     if(img?.complete&&img.naturalWidth>0){
       const h=30,ratio=img.naturalWidth/img.naturalHeight,w=h*ratio;
       ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx)+t*Math.PI*2);
       ctx.globalAlpha=t<.82?1:Math.max(0,1-(t-.82)/.18);
       ctx.shadowColor='#62ff63';ctx.shadowBlur=10;
       ctx.drawImage(img,-w/2,-h/2,w,h);
     }
   }else if(f.kind==='senkuAllyHealFlash'){
     const t=clamp((performance.now()-f.start)/f.duration,0,1),pulse=Math.sin(Math.PI*t),r=14+92*pulse;
     ctx.translate(f.x,f.y);ctx.globalCompositeOperation='screen';ctx.globalAlpha=Math.max(0,1-t);
     const g=ctx.createRadialGradient(0,0,0,0,0,r);
     g.addColorStop(0,'rgba(240,255,242,.98)');g.addColorStop(.22,'rgba(124,255,151,.90)');g.addColorStop(.55,'rgba(55,223,101,.52)');g.addColorStop(1,'rgba(44,179,88,0)');
     ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';
   }else if(f.kind==='senkuBombProjectile'){"""
html, n = re.subn(
    r"else if\(f\.kind==='senkuChemProjectile'\)\{.*?else if\(f\.kind==='senkuBombProjectile'\)\{",
    lambda _: new_renderer,
    html,
    count=1,
    flags=re.S,
)
if n != 1:
    raise RuntimeError('Ally Heal renderer replacement failed')
status['steps'].append('animation')

# Gameplay is 30% max HP to living allies only.
old = "const healed=Math.max(0,ally.maxHp-ally.hp);\n     ally.hp=ally.maxHp;"
if old not in html:
    raise RuntimeError('legacy full-heal anchor missing')
html = html.replace(
    old,
    "const before=ally.hp;\n     const healAmount=Math.max(1,Math.round(ally.maxHp*(canonicalUnit('senku').abilities.jutsu.heal_percent??0.30)));\n     ally.hp=Math.min(ally.maxHp,ally.hp+healAmount);\n     const healed=ally.hp-before;",
    1,
)
html = html.replace(
    "S.log=`${u.name} activated ${u.jutsuName||'Revival Formula'} — restoring all active allies to full HP.`;",
    "S.log=`${u.name} activated ${u.jutsuName||'Ally Heal'} — healing all living allies for 30% max HP.`;",
    1,
)
html = html.replace(
    "Basic builds chakra; closer linked allies can amplify Link Attack buffs. Choose an action, preview its range, then drag and release.",
    "",
    1,
)
status['steps'].append('heal_logic')

if html == original:
    raise RuntimeError('migration produced no changes')
INDEX.write_text(html, encoding='utf-8')
status['ok'] = True
Path('dev-tools/direct-migration-run.json').write_text(json.dumps(status, indent=2), encoding='utf-8')
print(json.dumps(status))
