import fs from 'node:fs/promises';
const html=await fs.readFile('index.html','utf8');
const seen=new Set();
function around(label,index,radius=900){
 if(index<0)return;
 const key=label+':'+index;if(seen.has(key))return;seen.add(key);
 console.log(`\n===== ${label} @ ${index} =====\n`+html.slice(Math.max(0,index-radius),Math.min(html.length,index+radius))+'\n');
}
for(const needle of ['startPlayableAtMaxChakra','function fresh()','function freshBoss()','S.phase=\'enemy\'','phase===\'enemy\'','enemyTurn','gauge+=','gauge =','speed:']){
 let from=0,count=0;while(count<8){const i=html.indexOf(needle,from);if(i<0)break;around(needle,i);from=i+needle.length;count++;}
}
const fn=/function\s+([A-Za-z0-9_$]+)\s*\([^)]*\)\{/g;let m;
while((m=fn.exec(html))){const n=m[1].toLowerCase();if(/enemy|turn|gauge|fresh|battle|tick|update|phase/.test(n))around(`function ${m[1]}`,m.index,1200)}
const gauge=/[^\n]{0,180}gauge[^\n]{0,260}/gi;let g,c=0;while((g=gauge.exec(html))&&c<30){if(/speed|enemy|phase|turn|time|performance|delta|charge/i.test(g[0])){console.log(`\n--- GAUGE MATCH ${c+1} ---\n${g[0]}\n`);c++;}}
