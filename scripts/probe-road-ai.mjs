import fs from 'node:fs/promises';
const html=await fs.readFile('dist/index.html','utf8');
function around(label,needle,radius=2200){
 const i=html.indexOf(needle);
 console.log(`\n===== ${label} @ ${i} =====`);
 if(i<0)return;
 console.log(html.slice(Math.max(0,i-radius),Math.min(html.length,i+needle.length+radius)));
 console.log(`===== END ${label} =====\n`);
}
around('PLAYER RESTORE LOG','Turn meter fallback restored player control.');
around('GLOBAL WATCHDOG','global state watchdog');
around('CHARGE SINCE','_chargeSince');
let from=0,n=0;
while(n<8){const i=html.indexOf("phase==='charge'",from);if(i<0)break;console.log(`\n===== CHARGE BLOCK ${++n} @ ${i} =====\n${html.slice(Math.max(0,i-1200),Math.min(html.length,i+3000))}`);from=i+16;}
