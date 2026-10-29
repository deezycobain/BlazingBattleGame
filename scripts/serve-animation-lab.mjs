// Read-only, loopback-only preview. Only explicit studio files and reference artwork are served.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function createStudioServer(root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')) {
  const library=JSON.parse(await fs.readFile(path.join(root,'animation-lab/reference-library.json'),'utf8'));
  const files=new Set(['animation-lab/index.html','animation-lab/README.md','animation-lab/motion-profile.schema.json','animation-lab/studio.css','animation-lab/studio.mjs','animation-lab/core.mjs','animation-lab/reference-library.json','animation-lab/profiles/itachi-gold-v1.json','config/fighter-visual-standard.json','ITACHI_GOLD_MOTION_AUDIT.md']);
  for(const unit of Object.values(library.units))for(const seq of Object.values(unit.sequences))for(const file of seq.paths)files.add(file);
  for(const id of ['road_rookie','blond_rookie','masked_scout','rogue_kunoichi','purple_scarf_kunoichi','mist_rogue'])files.add(`assets/sprites/enemies/${id}/${id}_idle.png`);
  return http.createServer(async(req,res)=>{
    try{
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
      let requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'');
      if(!requested||requested==='animation-lab'||requested==='animation-lab/')requested='animation-lab/index.html';
      if(!files.has(requested)){res.writeHead(404);res.end('Not a studio resource');return;}
      const full=path.resolve(root,requested);if(!full.startsWith(root+path.sep))throw new Error('Path denied');
      const data=await fs.readFile(full),extension=path.extname(requested),type={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.md':'text/plain'}[extension]||'application/octet-stream';
      res.writeHead(200,{'content-type':type,'x-content-type-options':'nosniff','cache-control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
    }catch{res.writeHead(404);res.end('Studio resource unavailable');}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.STUDIO_PORT||5181),server=await createStudioServer();
  server.listen(port,'127.0.0.1',()=>console.log(`Blazing Motion Studio: http://127.0.0.1:${port}/animation-lab/ (local preview)`));
  server.on('error',error=>{console.error(error.message);process.exitCode=1;});
}
