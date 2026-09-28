import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
import {createProject,planScenes} from './core.mjs';
import {makeFinalOutputManifest} from './final-output.mjs';

test('real 1080x1920 MP4 with captions/audio agrees with independent FFprobe and portable verification', {timeout:90000},async()=>{
 const listener=createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
 const media=await mkdtemp(join(tmpdir(),'aivm-final-1080-'));
 const bridge=spawn(process.execPath,['local-bridge/server.mjs'],{cwd:fileURLToPath(new URL('..',import.meta.url)),env:{...process.env,AIVM_PORT:String(port),AIVM_MEDIA_ROOT:media,AIVM_OUTPUT_ROOT:join(media,'exports'),AIVM_MOCK:'0',AIVM_COMFYUI_URL:'',AIVM_IMAGE_RUNNER:'',AIVM_ENABLE_IMAGE_FALLBACK:'1',AIVM_ENABLE_MOTION_FALLBACK:'1'},stdio:'ignore'});
 try{
  const base=`http://127.0.0.1:${port}`;let ready=false;
  for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.equal(ready,true);
  async function post(route,body){const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
  const image=await post('/v1/generate/image',{prompt:'local test garden',width:144,height:256,freeOnly:true});
  const clip=await post('/v1/generate/video',{imageInput:image.asset.path,duration:1,width:144,height:256,fps:12,freeOnly:true});
  const tone=join(media,'tone.wav');const made=spawnSync(process.env.AIVM_FFMPEG||'ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=440:duration=1',tone]);assert.equal(made.status,0,made.stderr?.toString());
  const output=await post('/v1/assemble',{clips:[clip.asset.path],clipDurations:[1],preset:'9:16',fps:30,expectedDuration:1,musicPath:tone,captions:[{start:0,end:1,text:'Local test'}]});
  const probe=spawnSync(process.env.AIVM_FFPROBE||'ffprobe',['-v','error','-show_format','-show_streams','-of','json',output.outputPath],{encoding:'utf8'});assert.equal(probe.status,0,probe.stderr);
  const facts=JSON.parse(probe.stdout),video=facts.streams.find(s=>s.codec_type==='video');
  assert.equal(video.width,1080);assert.equal(video.height,1920);assert.equal(video.avg_frame_rate,'30/1');assert.ok(facts.streams.some(s=>s.codec_type==='audio'));
  const inspected=await post('/v1/inspect',{path:output.outputPath});
  assert.equal(inspected.bytes,Number(facts.format.size));assert.equal(inspected.duration,Number(facts.format.duration));
  assert.equal((await readFile(output.outputPath)).length,inspected.bytes);
  const manifest=makeFinalOutputManifest(planScenes(createProject('Test'),1),inspected);
  assert.equal(manifest.verified,true);assert.equal(manifest.actual.fps,30);assert.equal(manifest.actual.hasAudio,true);
  assert.doesNotMatch(JSON.stringify(manifest),/outputPath|sourcePath|127\.0\.0\.1/);
 }finally{const stopped=once(bridge,'exit');bridge.kill();await stopped;await rm(media,{recursive:true,force:true});}
});
