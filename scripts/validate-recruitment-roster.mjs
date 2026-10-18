import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// Preproduction catalog only: deliberately cannot unlock, draw or summon a unit.
const catalog=JSON.parse(await fs.readFile('runtime/registry/recruitment-roster-v1.json','utf8'));
assert.equal(catalog.schema_version,1);
assert.equal(catalog.status,'preproduction_not_summonable');
const units=catalog.units||[];
const unique=new Set();
const statuses=new Set(['asset_qa','blocked_wrong_animation','card_only','archive_only','concept']);
const elements=new Set(['Fire','Water','Earth','Wind','Lightning','Nature']);
const roles=new Set(['frontline','striker','skirmisher','ranged','controller','healer','defender','support']);
const existing=JSON.parse(await fs.readFile('runtime/registry/unit-index.json','utf8'));
const indexed=new Set((existing.units||[]).map(x=>x.id));
for(const unit of units){
  assert.match(unit.id,/^[a-z][a-z0-9_]*$/);
  assert(!unique.has(unit.id),'Duplicate recruit: '+unit.id);unique.add(unit.id);
  assert(!indexed.has(unit.id),'Recruit must be promoted by a separate integration pass: '+unit.id);
  assert(['Common','Uncommon'].includes(unit.rarity),'Unapproved rarity '+unit.id);
  assert(elements.has(unit.element),'Invalid element '+unit.id);
  assert(roles.has(unit.role),'Invalid role '+unit.id);
  assert(statuses.has(unit.production_status),'Invalid production status '+unit.id);
  if(unit.production_status==='concept')assert(!unit.source_art&&!unit.source_attack,'Concept has physical art '+unit.id);
  else {
    assert(typeof unit.source_art==='string','Missing asset reference '+unit.id);
    await fs.access(path.join(process.cwd(),unit.source_art));
    if(unit.source_attack)await fs.access(path.join(process.cwd(),unit.source_attack));
  }
}
assert.equal(units.filter(x=>x.rarity==='Common').length,12);
assert.equal(units.filter(x=>x.rarity==='Uncommon').length,4);
const odds=catalog.ordinary_banner_policy.odds_percent;
assert.deepEqual(Object.keys(odds),['Common','Uncommon','Rare','Legendary']);
assert.equal(Object.values(odds).reduce((a,b)=>a+b,0),100);
assert.equal(catalog.ordinary_banner_policy.exclusive_units_excluded,true);
assert.deepEqual(catalog.new_player_ownership.starting_units,['tyler','subzero','senku']);
console.log('Recruitment catalog PASS: 12 Commons + 4 Uncommons staged; no unapproved fighter has been made summonable or playable.');
