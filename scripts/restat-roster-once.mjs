import fs from 'node:fs/promises';

const balance={
  senku:{hp:82,attack:31,defense:36,speed:70},
  crimson:{hp:72,attack:42,defense:26,speed:76},
  subzero:{hp:78,attack:34,defense:42,speed:62},
  lebee:{hp:68,attack:38,defense:24,speed:66},
  tyler:{hp:88,attack:36,defense:48,speed:64},
  anubis:{hp:100,attack:40,defense:70,speed:46}
};

for(const [id,stats] of Object.entries(balance)){
  const path=`assets/characters/${id}/data/unit.json`;
  const unit=JSON.parse(await fs.readFile(path,'utf8'));
  unit.stats={...unit.stats,level:1,...stats};
  unit.balance={...(unit.balance||{}),status:'provisional',pass:'v0.7.2-normalized-100',notes:'Normalized 1-100 combat-stat pass. HP, Attack, Defense, and Speed are capped at 100; combat ranges, chakra, costs, and ability multipliers remain separate parameters.'};
  await fs.writeFile(path,JSON.stringify(unit,null,2)+'\n');
  console.log(`${id}: HP ${stats.hp} ATK ${stats.attack} DEF ${stats.defense} SPD ${stats.speed}`);
}
