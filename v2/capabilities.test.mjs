import test from 'node:test';
import assert from 'node:assert/strict';
import {capabilityRows} from './capabilities.mjs';

test('capability labels reflect FREE ONLY routes without claiming missing advanced quality',()=>{
  const rows=capabilityRows({
    imageFallback:{enabled:true},
    motionFallback:{enabled:true},
    tools:{ffmpeg:{available:true},ffprobe:{available:true}},
    freeOnlyImageWorkflow:false,
    quality:{}
  });
  assert.match(rows.find(r=>r[0]==='Selected image route')[1],/draft still/i);
  assert.match(rows.find(r=>r[0]==='Selected motion route')[1],/FFmpeg/i);
  assert.match(rows.find(r=>r[0]==='Final MP4')[1],/1080/);
  assert.match(rows.find(r=>r[0]==='Photorealistic image')[1],/target only/i);
  assert.match(rows.find(r=>r[0]==='Photorealistic AI motion')[1],/target only/i);
  assert.match(rows.find(r=>r[0]==='4K output')[1],/Not enabled/);
});

test('verified local routes and quality flags are shown only when reported',()=>{
  const rows=capabilityRows({
    freeOnlyImageWorkflow:true,
    motionFallback:{enabled:true},
    tools:{ffmpeg:{available:true},ffprobe:{available:true}},
    freeOnlyVoiceWorkflow:true,
    quality:{photorealisticImage:true,nativeAudio:true}
  });
  assert.match(rows.find(r=>r[0]==='Selected image route')[1],/ComfyUI/);
  assert.match(rows.find(r=>r[0]==='Voice \/ music')[1],/Verified local/);
  assert.match(rows.find(r=>r[0]==='Photorealistic image')[1],/Verified/);
  assert.match(rows.find(r=>r[0]==='Native generated audio')[1],/Verified/);
  assert.match(rows.find(r=>r[0]==='Lip-sync')[1],/Not connected/);
});

test('missing tools leave render routes unavailable',()=>{
  const rows=capabilityRows({tools:{ffmpeg:{available:false},ffprobe:{available:false}}});
  assert.match(rows.find(r=>r[0]==='Selected image route')[1],/Unavailable/);
  assert.match(rows.find(r=>r[0]==='Selected motion route')[1],/Unavailable/);
  assert.match(rows.find(r=>r[0]==='Final MP4')[1],/required/);
});
