import test from 'node:test';import assert from 'node:assert/strict';import {uniqueExportName} from './local-provider.mjs';
test('each final export gets a distinct safe name',()=>{const first=uniqueExportName('my project/../');const next=uniqueExportName('my project/../');assert.notEqual(first,next);assert.match(first,/^aivm-v2-[a-z0-9-]+\.mp4$/);});
import {generateImage,animateImage} from './local-provider.mjs';

test('pinned routes reject last-moment capability drift before a generation POST',async()=>{
 const previous=globalThis.fetch;let posts=0;
 globalThis.fetch=async(url,options={})=>{if(options.method==='POST')posts++;return Response.json(String(url).endsWith('/health')?{service:'aivm-local-bridge',loopbackOnly:true,mock:false}:{freeOnlyImageWorkflow:true,motionFallback:{enabled:false},tools:{ffmpeg:{available:true}}});};
 try{
  await assert.rejects(()=>generateImage('ordinary scene','light','basic-local-still'),/Guarded image route changed/);
  await assert.rejects(()=>animateImage('C:/local/source.ppm',1,'light','ffmpeg-camera-motion'),/Guarded motion route changed/);
  assert.equal(posts,0);
 }finally{globalThis.fetch=previous;}
});
