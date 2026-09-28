import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyArtifactForSharing,assertPortableArtifact} from './share-safety.mjs';

test('portable publishing package without private fields is reviewable for sharing',()=>{
  const artifact={kind:'aivm-v2-publishing-package',projectId:'p1',title:'Video',scenes:[{sceneId:'s1',selectedClipId:'a1'}]};
  const report=classifyArtifactForSharing(artifact);
  assert.equal(report.classification,'PORTABLE — REVIEW BEFORE SHARING');
  assert.equal(report.shareRecommended,true);
  assert.equal(report.findings.length,0);
  assert.equal(assertPortableArtifact(artifact).shareRecommended,true);
});

test('local paths and bridge urls force review even on known portable kind',()=>{
  const artifact={kind:'aivm-v2-release-envelope',nested:{sourcePath:'C:\\private\\clip.mp4',bridgeUrl:'http://127.0.0.1:8787/file'}};
  const report=classifyArtifactForSharing(artifact);
  assert.equal(report.shareRecommended,false);
  assert.ok(report.findings.some(item=>item.code==='SENSITIVE_FIELD'));
  assert.ok(report.findings.some(item=>item.code==='LOCAL_PATH'));
  assert.ok(report.findings.some(item=>item.code==='LOCAL_BRIDGE_URL'));
  assert.throws(()=>assertPortableArtifact(artifact),/not cleared/i);
});

test('complete zip is always private recovery only',()=>{
  const report=classifyArtifactForSharing(null,{artifactType:'complete-zip'});
  assert.equal(report.classification,'PRIVATE RECOVERY ONLY');
  assert.equal(report.shareRecommended,false);
  assert.ok(report.findings.some(item=>item.code==='COMPLETE_BACKUP_PRIVATE'));
});

test('unknown json is not auto-cleared for sharing',()=>{
  const report=classifyArtifactForSharing({kind:'custom-export',title:'x'});
  assert.equal(report.classification,'REVIEW REQUIRED');
  assert.equal(report.shareRecommended,false);
});

test('prompt or history fields force review',()=>{
  const artifact={kind:'aivm-v2-owner-handoff',prompt:'private idea',history:[{revision:1}]};
  const report=classifyArtifactForSharing(artifact);
  assert.equal(report.shareRecommended,false);
  assert.ok(report.findings.filter(item=>item.code==='SENSITIVE_FIELD').length>=2);
});
