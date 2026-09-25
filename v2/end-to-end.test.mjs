import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
const freePort=()=>new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
async function waitFor(url){for(let i=0;i<40;i++){try{const r=await fetch(url+'/health');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Bridge did not start.');}
async function post(url,path,body){const r=await fetch(url+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
test('FREE ONLY preview -> motion clip -> assembled MP4 and QC', {timeout:30000}, async()=>{const port=await freePort();const media=await mkdtemp(join(tmpdir(),'aivm-v2-test-'));const bridge=spawn(process.execPath,['local-bridge/server.mjs'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,AIVM_PORT:String(port),AIVM_MEDIA_ROOT:media,AIVM_OUTPUT_ROOT:join(media,'exports'),AIVM_MOCK:'0',AIVM_IMAGE_RUNNER:'http://127.0.0.1:1/should-not-be-called'},stdio:'ignore'});const base=`http://127.0.0.1:${port}`;try{await waitFor(base);const image=await post(base,'/v1/generate/image',{prompt:'garden',width:144,height:256,freeOnly:true});assert.equal(image.provider,'fallback');const video=await post(base,'/v1/generate/video',{prompt:'gentle motion',imageInput:image.asset.path,width:144,height:256,duration:1,fps:12,freeOnly:true});assert.equal(video.provider,'motion-fallback');const out=await post(base,'/v1/assemble',{clips:[video.asset.path],width:144,height:256,fps:12,expectedDuration:1});assert.equal(out.qc.passed,true);assert.ok((await (await fetch(base+out.downloadUrl)).arrayBuffer()).byteLength>1024);}finally{bridge.kill();await rm(media,{recursive:true,force:true});}});
