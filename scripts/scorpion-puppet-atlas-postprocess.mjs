import fs from 'node:fs/promises';
import path from 'node:path';
const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');
const modules=['puppet-atlas-contract-v1.js','scorpion-puppet-atlas.js','scorpion-puppet-atlas-v2.js','scorpion-puppet-atlas-v2-motion.js'];
// Idempotently replace only these integration tags, preserving final fighter authority.
html=html.replace(/<script src="runtime\/rendering\/(?:scorpion-puppet-atlas(?:-v2(?:-motion)?)?|puppet-atlas-contract-v1)\.js[^"\n]*"><\/script>/g,'');
if(!html.includes('</body>'))throw new Error('Puppet Atlas Contract v1: closing body tag missing');
html=html.replace('</body>',modules.map(name=>'<script src="runtime/rendering/'+name+'?v=contract-v1-v2-motion"></script>').join('\n')+'</body>');
await fs.writeFile(file,html);
console.log('Puppet Atlas Contract v1: shared contract + Scorpion V1 adapter + V2 articulation gate + test-only skeletal motion preview injected before final fighter authority.');