import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=path.join(process.cwd(),'dist');
const PORT=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/',`http://${req.headers.host||'127.0.0.1'}`);
    const rel=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname).replace(/^\/+/, '');
    const full=path.normalize(path.join(ROOT,rel));
    if(!full.startsWith(path.normalize(ROOT+path.sep)))throw new Error('bad path');
    const data=await fs.readFile(full);
    res.writeHead(200,{'content-type':types[path.extname(full).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});res.end(data);
  }catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');}
});
server.listen(PORT,'127.0.0.1',()=>console.log(`Blazing Battle dist server listening on http://127.0.0.1:${PORT}`));
