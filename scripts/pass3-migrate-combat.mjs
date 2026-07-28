import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const indexPath=path.join(ROOT,'index.html');
const buildPath=path.join(ROOT,'scripts/build-cloudflare.mjs');
let html=await fs.readFile(indexPath,'utf8');
let build=await fs.readFile(buildPath,'utf8');
const report={status:'started',replacements:{}};

function replaceExact(source,oldText,newText,label,expected=1){
  const count=source.split(oldText).length-1;
  if(count!==expected)throw new Error(`${label}: expected ${expected} occurrence(s), found ${count}`);
  report.replacements[label]=count;
  return source.split(oldText).join(newText);
}

try{
  if(!html.includes('runtime/combat/combat-runtime.js')){
    const anchor='<script src="runtime/animation/frame-runtime.js"></script>';
    if(!html.includes(anchor))throw new Error('combat runtime script anchor missing');
    html=html.replace(anchor,`<script src="runtime/combat/combat-runtime.js"></script>\n${anchor}`);
    report.replacements.combat_script=1;
  }

  html=replaceExact(
    html,
    'jutsuDamage:jutsu?Math.round(d.stats.attack*(jutsu.damage_multiplier||1)):0,',
    'jutsuDamage:jutsu?window.BlazingCombatRuntime.computeScaledDamage(d.stats.attack,jutsu.damage_multiplier||1):0,',
    'canonical jutsu damage calculation'
  );

  html=replaceExact(
    html,
    'damage:Math.round(u.attack*(1+buff.bonus))',
    'damage:window.BlazingCombatRuntime.computeBuffedNormalDamage(u.attack,buff.bonus)',
    'linked normal damage calculation'
  );

  html=replaceExact(
    html,
    'u.chakra-=u.jutsuCost;',
    'window.BlazingCombatRuntime.spendChakra(u,u.jutsuCost);',
    'jutsu chakra spend',
    2
  );

  html=replaceExact(
    html,
    'u.chakra=Math.min(u.maxChakra,u.chakra+chakraGain);',
    'window.BlazingCombatRuntime.gainChakra(u,chakraGain);',
    'basic chakra gain'
  );

  html=replaceExact(
    html,
    'enemy.gauge=Math.max(0,(enemy.gauge||0)-35);',
    "window.BlazingCombatRuntime.execute('reduce_target_gauge',{target:enemy,parameters:{amount:35,minimum_gauge:0}});",
    'Freeze Blast gauge reduction'
  );

  html=replaceExact(
    html,
    'enemy.hp=Math.max(0,enemy.hp-u.jutsuDamage);',
    "window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:u.jutsuDamage});",
    'jutsu target damage',
    2
  );
  html=replaceExact(
    html,
    'enemy.hp=Math.max(0,enemy.hp-hDamage);',
    "window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:hDamage});",
    'jutsu helper damage'
  );
  html=replaceExact(
    html,
    'enemy.hp=Math.max(0,enemy.hp-dmg);',
    "window.BlazingCombatRuntime.execute('damage_target',{target:enemy,damage:dmg});",
    'basic attack damage'
  );
  html=replaceExact(
    html,
    'victim.hp=Math.max(0,victim.hp-attacker.attack);',
    "window.BlazingCombatRuntime.execute('damage_target',{target:victim,damage:attacker.attack});",
    'enemy attack damage'
  );

  html=replaceExact(
    html,
    'const healed=Math.max(0,ally.maxHp-ally.hp);\n     ally.hp=ally.maxHp;',
    'const healed=window.BlazingCombatRuntime.healPercentMaxHp(ally,1,{minimumHeal:1,ignoreDefeated:true}).amount;',
    'legacy source support-heal mutation'
  );

  build=replaceExact(
    build,
    "  'const healed=Math.max(0,ally.maxHp-ally.hp);\\n     ally.hp=ally.maxHp;',\n  \"const before=ally.hp;\\n     const healAmount=Math.max(1,Math.round(ally.maxHp*(canonicalUnit('senku').abilities.jutsu.heal_percent??0.30)));\\n     ally.hp=Math.min(ally.maxHp,ally.hp+healAmount);\\n     const healed=ally.hp-before;\",",
    "  'const healed=window.BlazingCombatRuntime.healPercentMaxHp(ally,1,{minimumHeal:1,ignoreDefeated:true}).amount;',\n  \"const healed=window.BlazingCombatRuntime.execute('heal_party_percent',{targets:[ally],parameters:{percent_of_max_hp:canonicalUnit('senku').abilities.jutsu.heal_percent??0.30}})[0]?.amount||0;\",",
    'production Ally Heal combat runtime delegation'
  );

  const forbidden=[
    'enemy.hp=Math.max(0,enemy.hp-u.jutsuDamage);',
    'enemy.hp=Math.max(0,enemy.hp-hDamage);',
    'enemy.hp=Math.max(0,enemy.hp-dmg);',
    'victim.hp=Math.max(0,victim.hp-attacker.attack);',
    'enemy.gauge=Math.max(0,(enemy.gauge||0)-35);',
    'u.chakra-=u.jutsuCost;',
    'u.chakra=Math.min(u.maxChakra,u.chakra+chakraGain);',
    'ally.hp=ally.maxHp;'
  ];
  for(const token of forbidden)if(html.includes(token))throw new Error(`legacy combat mutation remains: ${token}`);
  if(!html.includes("BlazingCombatRuntime.execute('damage_target'"))throw new Error('damage runtime delegation missing');
  if(!build.includes("BlazingCombatRuntime.execute('heal_party_percent'"))throw new Error('production heal runtime delegation missing');

  await fs.writeFile(indexPath,html);
  await fs.writeFile(buildPath,build);
  report.status='success';
}catch(error){
  report.status='failed';
  report.error=error instanceof Error?error.message:String(error);
}

await fs.mkdir(path.join(ROOT,'dev-tools'),{recursive:true});
await fs.writeFile(path.join(ROOT,'dev-tools/pass3-migration-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.status!=='success')process.exitCode=1;
