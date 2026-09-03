import fs from 'node:fs/promises';
import path from 'node:path';
const html=await fs.readFile(path.join(process.cwd(),'dist','index.html'),'utf8'),fail=msg=>{throw new Error(`Final Tyler/browser validation failed: ${msg}`)};
for(const marker of [
 "['crimson','subzero','lebee','senku','tyler','anubis']",
 "const ACTIVE_PLAYABLE_UNITS=Object.freeze(['Crimson','Sub-Zero','Lebee','Senku','Tyler']);",
 "const DEFAULT_ACTIVE_TEAM=Object.freeze(['Tyler','Lebee','Sub-Zero']);",
 "const TEAM_STORAGE_KEY='blazingBattle.activeTeam.v4';",
 'assets/characters/tyler/sprites/source/20AAB6CC-D064-4F8A-A155-BC2A55A831C5.png',
 'assets/characters/tyler/sprites/source/basic_attack_sheet.png',
 "[0,1,2,3,4,3,2,1]",
 "[0,0,1,2,3,4,5,6,7,7]",
 'CANVAS_H*.92',
 '420,0',
 '560',
 "name==='Tyler'?230:185",
 "au.name==='Tyler'&&Math.hypot(to.x-from.x,to.y-from.y)<40",
 "unitName==='Tyler'?360:175",
 "unitName==='Tyler'?340:145",
 "unitName==='Tyler'?100:65",
 'duration:dur+lungeHold+backDur',
 '},lungeHold)',
 'pruneTinyComponents',
 'bgDistance(i)<8200',
 'candidates=[u?.assets?.art,u?.assets?.portrait,u?.assets?.card]',
 'id="bb-team-scroll-theme"',
 'id="bb-team-theme-runtime"',
 'linear-gradient(180deg,rgba(255,248,226,.95)',
 "function protectedControl(target){return !!target.closest?.('button,[role=\"button\"],input,select,textarea,a[href],[data-inventory-action]",
 'id="bb-desktop-battle-input"',
 "cvs.addEventListener('pointerdown'",
 "ev.pointerType==='mouse'?Math.max(UNIT_TOUCH_RADIUS,96):UNIT_TOUCH_RADIUS",
 'event.stopImmediatePropagation();',
 "dispatchPointer('pointermove',event,activeCanvas)"
])if(!html.includes(marker))fail(`built shell missing ${marker}`);
for(const obsolete of ['new TouchEvent(',"dispatchTouch('touchstart'","asset=u?.assets?.card||u?.assets?.art||u?.assets?.portrait"])if(html.includes(obsolete))fail(`obsolete runtime survived: ${obsolete}`);
console.log('Final Tyler/browser PASS: team page uses full-art-first portraits plus parchment/cloud theme; Tyler ping-pong idle pacing and sheet-artifact cleanup survived final build; desktop PointerEvents remain intact.');
