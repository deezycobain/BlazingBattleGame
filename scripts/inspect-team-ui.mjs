import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const file=path.join(ROOT,'dist','index.html');
const html=await fs.readFile(file,'utf8');

const needles=[
  'Save Team','SAVE TEAM','save team','Team saved','TEAM SAVED','team saved',
  'Crimson','Senku','localStorage','teamSlots','selectedTeam','savedTeam','team'
];

const out={generated_at:new Date().toISOString(),matches:{}};
for(const needle of needles){
  const entries=[];
  let from=0;
  while(entries.length<20){
    const i=html.indexOf(needle,from);
    if(i<0)break;
    entries.push(html.slice(Math.max(0,i-450),Math.min(html.length,i+needle.length+650)));
    from=i+needle.length;
  }
  if(entries.length)out.matches[needle]=entries;
}

await fs.mkdir(path.join(ROOT,'dist','_debug'),{recursive:true});
await fs.writeFile(path.join(ROOT,'dist','_debug','team-ui.json'),JSON.stringify(out,null,2));
console.log('Temporary team/UI inspection artifact written to dist/_debug/team-ui.json');
