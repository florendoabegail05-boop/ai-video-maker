import test from 'node:test';
import assert from 'node:assert/strict';
import {invalidateGeneratedAssets,generatedFreshnessSummary} from './generation-freshness.mjs';

const base={assets:[
  {id:'g1',sceneId:'s1',kind:'image',provider:'fallback',locked:false,status:'candidate'},
  {id:'g2',sceneId:'s2',kind:'video',provider:'motion-fallback',locked:true,status:'kept'},
  {id:'i1',sceneId:'s1',kind:'image',provider:'local-import',locked:false,status:'kept'},
  {id:'a1',sceneId:null,kind:'audio',provider:'local-import',locked:false,status:'kept'}
]};

test('invalidates only unlocked generated media in selected scenes',()=>{
  const next=invalidateGeneratedAssets(base,{sceneIds:['s1'],reason:'scene prompt changed'});
  assert.equal(next.assets.find(a=>a.id==='g1').status,'needs regeneration');
  assert.equal(next.assets.find(a=>a.id==='g1').staleReason,'scene prompt changed');
  assert.equal(next.assets.find(a=>a.id==='g2').status,'kept');
  assert.equal(next.assets.find(a=>a.id==='i1').status,'kept');
  assert.equal(next.assets.find(a=>a.id==='a1').status,'kept');
});

test('global invalidation preserves locked generated media and imported media',()=>{
  const next=invalidateGeneratedAssets(base,{reason:'visual guidance changed'});
  assert.equal(next.assets.find(a=>a.id==='g1').status,'needs regeneration');
  assert.equal(next.assets.find(a=>a.id==='g2').status,'kept');
  assert.equal(next.assets.find(a=>a.id==='i1').status,'kept');
});

test('summary reports generated and stale records only',()=>{
  const next=invalidateGeneratedAssets(base,{reason:'changed'});
  assert.deepEqual(generatedFreshnessSummary(next),{generated:2,stale:1,lockedStale:0});
});
