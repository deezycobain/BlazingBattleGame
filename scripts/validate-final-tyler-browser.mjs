import fs from 'node:fs/promises';
import path from 'node:path';

const html=await fs.readFile(path.join(process.cwd(),'dist','index.html'),'utf8');
const fail=msg=>{throw new Error(`Final Tyler/browser validation failed: ${msg}`)};

for(const marker of [
  "['crimson','subzero','lebee','senku','tyler','anubis']",
  "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku','Tyler']);",
  "const DEFAULT_ACTIVE_TEAM=Object.freeze(['Tyler','Lebee','Sub-Zero']);",
  "const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v4';",
  'art/current_collection_art.png',
  'cards/current_collection_card.png',
  'assets/characters/tyler/sprites/source/idle_sheet.png',
  'assets/characters/tyler/sprites/source/basic_attack_sheet.png',
  'const TYLER_BODY_RUNTIME=(()=>{',
  "function unitIdleFrames(name){if(name==='Tyler'&&TYLER_BODY_RUNTIME.idle.ready)return TYLER_BODY_RUNTIME.idle.frames;",
  "function unitAttackFrames(name,kind){if(name==='Tyler'&&TYLER_BODY_RUNTIME.basic.ready)return TYLER_BODY_RUNTIME.basic.frames;",
  'function fighterTeamImage(name){if(owned[name]?.card)return owned[name].card;try{const u=canonicalUnit(name)',
  "cvs.addEventListener('pointerdown'",
  "cvs.addEventListener('pointermove'",
  "cvs.addEventListener('pointerup'",
  "ev.pointerType==='mouse'?Math.max(UNIT_TOUCH_RADIUS,96):UNIT_TOUCH_RADIUS",
  'id="bb-desktop-battle-input"',
  'dispatchPointer',
  '__bbMouseBridge'
])if(!html.includes(marker))fail(`built shell missing ${marker}`);

for(const obsolete of [
  'new TouchEvent(',
  "dispatchTouch('touchstart'"
])if(html.includes(obsolete))fail(`obsolete synthetic desktop-input code survived: ${obsolete}`);

if((html.match(/'Tyler'/g)||[]).length<3)fail('Tyler identity is not represented across roster/team/runtime in built shell');
console.log('Final Tyler/browser PASS: built shell retains Tyler roster/team/art/sheet hooks plus native mouse PointerEvent pickup/retargeting with touch behavior preserved.');
