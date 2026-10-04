import test from 'node:test';
import assert from 'node:assert/strict';
import {localWorkflowReadiness,canRegisterVerifiedLocalWorkflow} from './local-workflow-readiness.mjs';

const manifest={
  id:'local-image-main',
  kind:'image',
  engine:'comfyui',
  freeOnly:true,
  local:true,
  endpoint:'http://127.0.0.1:8188',
  references:{character:true,world:true},
  qualityTargets:{photorealisticImage:true,output4k:true}
};

const verifiedEvidence={
  workflowReadable:true,
  runnerReachable:true,
  modelFilesPresent:true,
  outputProbeVerified:true
};

test('ComfyUI requires an explicit local endpoint while local-process may omit one',()=>{
  assert.equal(localWorkflowReadiness({...manifest,endpoint:''},verifiedEvidence).routeVerified,false);
  assert.equal(localWorkflowReadiness({...manifest,engine:'local-process',endpoint:''},verifiedEvidence).routeVerified,true);
});

test('IPv6 loopback is local, and each required runtime fact remains mandatory',()=>{
  const local={...manifest,endpoint:'http://[::1]:8188'};
  assert.equal(localWorkflowReadiness(local,verifiedEvidence).routeVerified,true);
  for(const key of Object.keys(verifiedEvidence))assert.equal(localWorkflowReadiness(local,{...verifiedEvidence,[key]:false}).routeVerified,false);
});

test('configuration alone never verifies a local model route',()=>{
  const result=localWorkflowReadiness(manifest,{});
  assert.equal(result.routeVerified,false);
  assert.ok(result.blockers.includes('workflow-not-readable'));
  assert.ok(result.blockers.includes('runner-not-reachable'));
  assert.ok(result.blockers.includes('model-files-not-verified'));
  assert.ok(result.blockers.includes('output-probe-not-verified'));
  assert.equal(canRegisterVerifiedLocalWorkflow(manifest,{}),false);
});

test('complete real runtime evidence can verify a FREE ONLY loopback route',()=>{
  const result=localWorkflowReadiness(manifest,verifiedEvidence);
  assert.equal(result.routeVerified,true);
  assert.deepEqual(result.blockers,[]);
  assert.equal(canRegisterVerifiedLocalWorkflow(manifest,verifiedEvidence),true);
  assert.equal(result.safeguards.paidProvidersEnabled,false);
  assert.equal(result.safeguards.automaticModelDownload,false);
  assert.equal(result.safeguards.automaticPublishing,false);
});

test('mock runtime evidence is never accepted as route verification',()=>{
  const result=localWorkflowReadiness(manifest,{...verifiedEvidence,mock:true});
  assert.equal(result.routeVerified,false);
  assert.ok(result.blockers.includes('mock-evidence-disallowed'));
});

test('non-loopback and remote provider declarations are rejected',()=>{
  const result=localWorkflowReadiness({...manifest,endpoint:'https://example.com/api',remote:true},verifiedEvidence);
  assert.equal(result.routeVerified,false);
  assert.ok(result.blockers.includes('remote-provider-disallowed'));
  assert.ok(result.blockers.includes('non-loopback-endpoint-disallowed'));
});

test('reference declarations do not enable forwarding without an exact verified node map',()=>{
  const unverified=localWorkflowReadiness(manifest,verifiedEvidence);
  assert.equal(unverified.declaredReferences.character,true);
  assert.equal(unverified.declaredReferences.world,true);
  assert.equal(unverified.referenceForwarding.enabled,false);
  assert.equal(unverified.referenceForwarding.character,false);
  assert.equal(unverified.referenceForwarding.world,false);

  const verified=localWorkflowReadiness(manifest,{...verifiedEvidence,referenceNodeMapVerified:true});
  assert.equal(verified.referenceForwarding.enabled,true);
  assert.equal(verified.referenceForwarding.character,true);
  assert.equal(verified.referenceForwarding.world,true);
});

test('quality targets remain separate from verified output claims',()=>{
  const result=localWorkflowReadiness(manifest,verifiedEvidence);
  assert.equal(result.qualityTargets.photorealisticImage,true);
  assert.equal(result.qualityTargets.output4k,true);
  assert.equal(result.verifiedOutputClaims.photorealisticImage,false);
  assert.equal(result.verifiedOutputClaims.output4k,false);
});

test('FREE ONLY and local declarations are mandatory',()=>{
  const result=localWorkflowReadiness({...manifest,freeOnly:false,local:false},verifiedEvidence);
  assert.equal(result.routeVerified,false);
  assert.ok(result.blockers.includes('free-only-not-declared'));
  assert.ok(result.blockers.includes('local-only-not-declared'));
});
