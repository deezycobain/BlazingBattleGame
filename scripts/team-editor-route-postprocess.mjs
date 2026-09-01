import fs from 'node:fs/promises';
import path from 'node:path';
const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const before="function protectedControl(target){return !!target.closest?.('input,select,textarea,a[href],[data-team-slot],[data-action=\"select\"],[data-action=\"remove\"],[data-action=\"save\"],[data-action=\"filter\"],[data-action=\"sort\"]');}";
const after="function protectedControl(target){return !!target.closest?.('button,[role=\"button\"],input,select,textarea,a[href],[data-inventory-action],[data-team-slot],[data-action=\"select\"],[data-action=\"remove\"],[data-action=\"save\"],[data-action=\"filter\"],[data-action=\"sort\"]');}";
const a=html.split(before).length-1,b=html.split(after).length-1;if(a===1)html=html.replace(before,after);else if(!(a===0&&b===1))throw new Error(`Team editor routing: expected one protectedControl anchor, found source=${a}, target=${b}`);
if(!html.includes('data-inventory-action')||!html.includes('EDIT TEAM'))throw new Error('Team editor routing: replacement inventory Edit Team control missing');
await fs.writeFile(file,html);console.log('Team editor routing applied: buttons/controls bypass fighter-details capture navigation.');
