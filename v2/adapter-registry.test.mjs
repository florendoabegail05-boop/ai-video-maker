import test from 'node:test';
import assert from 'node:assert/strict';
import {adapterRegistryFromCapabilities,availableAdapters,adapterAvailabilitySummary} from './adapter-registry.mjs';

test('registry exposes only capability-backed routes',()=>{
  const report={routes:{image:{provider:'fallback'},video:{provider:'unavailable'}},freeOnlyVoiceWorkflow:false};
  const items=adapterRegistryFromCapabilities(report);
  assert.ok(items.some(item=>item.kind==='image'&&item.verified));
  assert.ok(!items.some(item=>item.kind==='video'));
  assert.ok(!items.some(item=>item.kind==='voice'));
});

test('verified local audio routes become available under FREE ONLY',()=>{
  const report={routes:{},freeOnlyVoiceWorkflow:true,freeOnlyMusicWorkflow:true,freeOnlySfxWorkflow:false,freeOnlyLipSyncWorkflow:false};
  assert.equal(availableAdapters(report,'voice').length,1);
  assert.equal(availableAdapters(report,'music').length,1);
  assert.equal(availableAdapters(report,'sfx').length,0);
});

test('summary never invents unsupported upscale or lip sync',()=>{
  const summary=adapterAvailabilitySummary({routes:{image:{provider:'fallback'}}});
  assert.equal(summary.image.length,1);
  assert.deepEqual(summary.upscale,[]);
  assert.deepEqual(summary.lipsync,[]);
});

test('unknown adapter kind is rejected',()=>{
  assert.throws(()=>availableAdapters({},'teleport'),/Unsupported adapter kind/);
});
