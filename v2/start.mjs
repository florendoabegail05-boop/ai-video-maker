#!/usr/bin/env node
// One-command, loopback-only V2 studio launcher. No installs or remote services.
import http from 'node:http';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mediaRoot=process.env.AIVM_MEDIA_ROOT||path.join(os.homedir(),'AIVM-V2-Media');
const webPort=Number(process.env.AIVM_V2_WEB_PORT||8000),bridgePort=8787;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}let url;try{url=new URL(req.url,'http://127.0.0.1');}catch{res.writeHead(400);return res.end();}let name;try{name=decodeURIComponent(url.pathname);}catch{res.writeHead(400);return res.end();}if(name==='/'||name==='/v2')name='/v2/index.html';if(name.endsWith('/'))name+='index.html';const segments=name.split('/');if(segments.some(s=>s==='..'||s.startsWith('.'))){res.writeHead(403);return res.end();}const file=path.resolve(root,'.'+name);const relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative)||!types[path.extname(file)]||name.startsWith('/local-bridge/')||name.endsWith('.test.mjs')||name==='/v2/start.mjs'){res.writeHead(403);return res.end();}fs.realpath(file,(error,real)=>{if(error||!real.startsWith(root+path.sep)){res.writeHead(404);return res.end();}fs.stat(real,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':types[path.extname(real)],'content-length':stat.size,'cache-control':'no-store','x-content-type-options':'nosniff'});if(req.method==='HEAD')return res.end();fs.createReadStream(real).pipe(res);});});});
server.listen(webPort,'127.0.0.1',()=>console.log(`V2 studio: http://127.0.0.1:${webPort}/v2/`));
const bridge=spawn(process.execPath,[path.join(root,'local-bridge','server.mjs')],{cwd:root,stdio:'inherit',env:{...process.env,AIVM_PORT:String(bridgePort),AIVM_MEDIA_ROOT:mediaRoot,AIVM_OUTPUT_ROOT:process.env.AIVM_OUTPUT_ROOT||path.join(mediaRoot,'exports')}});
let stopping=false;
server.on('error',error=>{console.error('V2 page could not start:',error.message);stopping=true;bridge.kill();process.exitCode=1;});
bridge.on('error',error=>{console.error('Local bridge failed:',error.message);stopping=true;if(server.listening)server.close();process.exitCode=1;});
bridge.on('exit',(code,signal)=>{if(stopping)return;console.error('Local bridge stopped:',code??signal);if(server.listening)server.close();process.exitCode=code||1;});
function stop(){if(stopping)return;stopping=true;if(server.listening)server.close();bridge.kill();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
