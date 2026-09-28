import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

test('capabilities distinguish declarations from supported reference paths; unsupported workflows receive none', {timeout:20000}, async()=>{
 const media=await mkdtemp(join(tmpdir(),'aivm-reference-test-'));
 const workflow=join(media,'workflow.json');
 await writeFile(workflow,JSON.stringify({'1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:'missing.safetensors'},_meta:{title:'AIVM_CHARACTER_REFERENCE'}}}));
 let uploads=0,prompt='';
 const fake=http.createServer(async(req,res)=>{
  if(req.url==='/system_stats'){res.setHeader('content-type','application/json');res.end(JSON.stringify({devices:[{name:'test CPU',type:'cpu',vram_total:0}]}));return;}
  if(req.url==='/upload/image')uploads++;
  if(req.url==='/prompt'){const chunks=[];for await(const chunk of req)chunks.push(chunk);prompt=Buffer.concat(chunks).toString();}
  res.writeHead(500,{'content-type':'application/json'});res.end('{"error":"test missing model"}');
 });
 await new Promise(r=>fake.listen(0,'127.0.0.1',r));
 const portServer=http.createServer();await new Promise(r=>portServer.listen(0,'127.0.0.1',r));const port=portServer.address().port;await new Promise(r=>portServer.close(r));
 const bridge=spawn(process.execPath,['local-bridge/server.mjs'],{cwd:fileURLToPath(new URL('..',import.meta.url)),env:{...process.env,AIVM_PORT:String(port),AIVM_MEDIA_ROOT:media,AIVM_MOCK:'0',AIVM_COMFYUI_URL:`http://127.0.0.1:${fake.address().port}`,AIVM_COMFYUI_WORKFLOW_IMAGE:workflow},stdio:'ignore'});
 try{
  const base=`http://127.0.0.1:${port}`;let ready=false;
  for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.equal(ready,true);
  const caps=await(await fetch(base+'/v1/capabilities')).json();
  assert.equal(caps.freeOnlyImageWorkflow,true);assert.equal(caps.declaredCharacterReferences,true);
  assert.equal(caps.supportsCharacterReferences,false);assert.equal(caps.supportsWorldReferences,false);assert.equal(caps.referenceForwardingEnabled,false);
  const response=await fetch(base+'/v1/generate/image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:'test garden',freeOnly:true,width:144,height:144,references:{character:['C:/private/character.png'],world:['C:/private/world.png']},characterReferences:['C:/private/character.png']})});
  assert.equal(response.status,200);assert.equal((await response.json()).provider,'fallback');
  assert.ok(prompt);assert.doesNotMatch(prompt,/private|characterReferences|worldReferences/);assert.equal(uploads,0);
 }finally{const stopped=once(bridge,'exit');bridge.kill();await stopped;await new Promise(r=>fake.close(r));await rm(media,{recursive:true,force:true});}
});
