import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRoutePlan,imageRoute,videoRoute,assertOwnerApprovedCostMode,qualityClaims} from './provider-router.mjs';

test('FREE ONLY selects verified local image workflow first',()=>{
  const plan=buildRoutePlan({freeOnlyImageWorkflow:true,imageFallback:{enabled:true},motionFallback:{enabled:true},tools:{ffmpeg:{available:true}}});
  assert.equal(plan.costMode,'FREE ONLY');
  assert.equal(plan.image.kind,'local-comfyui');
  assert.equal(plan.video.kind,'ffmpeg-camera-motion');
});

test('FREE ONLY falls back to basic still but never invents quality claims',()=>{
  const plan=buildRoutePlan({imageFallback:{enabled:true},motionFallback:{enabled:false},tools:{ffmpeg:{available:true}}});
  assert.equal(plan.image.kind,'basic-local-still');
  assert.equal(plan.video.kind,'unavailable');
  assert.deepEqual(qualityClaims(plan),{photorealisticImage:false,photorealisticMotion:false,nativeAudio:false,lipSync:false,output4k:false});
});

test('FREE ONLY refuses unavailable routes cleanly',()=>{
  assert.equal(imageRoute({},{}).kind,'unavailable');
  assert.equal(videoRoute({},{}).kind,'unavailable');
});

test('paid-capable modes require explicit owner approval and remain unconnected',()=>{
  assert.throws(()=>assertOwnerApprovedCostMode('BEST QUALITY'),/explicit owner approval/i);
  const plan=buildRoutePlan({}, {costMode:'BEST QUALITY',ownerApproved:true});
  assert.equal(plan.image.kind,'future-provider');
  assert.equal(plan.video.kind,'future-provider');
});

test('quality claims only follow capability report',()=>{
  const plan=buildRoutePlan({quality:{photorealisticImage:true,photorealisticMotion:false,nativeAudio:true,lipSync:false,output4k:false}});
  assert.equal(plan.quality.photorealisticImage,true);
  assert.equal(plan.quality.nativeAudio,true);
  assert.equal(plan.quality.output4k,false);
});
