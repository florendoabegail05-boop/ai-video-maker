import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProviderGenerationRequest} from './provider-generation-request.mjs';

function envelope({jobType='image',route='basic-local-still'}={}){
  return {
    schema:1,kind:'aivm-v2-one-click-dispatch-envelope',projectId:'p1',projectRevision:3,jobId:`${jobType}:s1`,jobType,sceneId:'s1',costMode:'FREE ONLY',
    paidProviderAllowed:false,externalUploadAllowed:false,destructiveReplacementAllowed:false,automaticPublishingAllowed:false,publishAuthorized:false,dispatchable:true,
    payload:{
      jobId:`${jobType}:s1`,type:jobType,sceneId:'s1',route,
      prompt:'Mina opens the blue gate.',directorBrief:'Keep Mina and the garden continuous.',sourceAssetId:jobType==='motion'?'img-1':null,
      characterReferenceIds:['char-ref'],worldReferenceIds:['world-ref'],
      promptContract:{kind:'aivm-v2-generation-prompt-contract',schema:1,projectId:'p1',sceneId:'s1',sourcePrompt:'Mina opens the blue gate.',characterReferenceAssetIds:['char-ref'],worldReferenceAssetIds:['world-ref'],referenceImageAssetIds:['char-ref','world-ref'],referenceMode:'metadata-only'}
    }
  };
}

function fallbackReport(){
  return {imageFallback:{enabled:true},motionFallback:{enabled:true},tools:{ffmpeg:{available:true,libx264:true},ffprobe:{available:true}},supportsCharacterReferences:false,supportsWorldReferences:false,referenceForwardingEnabled:false};
}

test('builds a ready draft image request without file paths, bytes, paid routes or publishing authority',()=>{
  const request=buildProviderGenerationRequest(envelope(),fallbackReport(),{output:{width:1080,height:1920,aspectRatio:'9:16'}});
  assert.equal(request.ready,true);
  assert.equal(request.routeReadiness.provider,'image:fallback');
  assert.equal(request.references.mode,'metadata-only');
  assert.equal(request.references.forwardingEnabled,false);
  assert.deepEqual(request.references.allAssetIds,['char-ref','world-ref']);
  assert.equal(request.references.includeFilesystemPaths,false);
  assert.equal(request.references.includeBytes,false);
  assert.equal(request.requirements.paidProviderAllowed,false);
  assert.equal(request.requirements.externalUploadAllowed,false);
  assert.equal(request.requirements.automaticModelDownloadAllowed,false);
  assert.equal(request.requirements.automaticPublishingAllowed,false);
  assert.deepEqual(request.output,{width:1080,height:1920,fps:null,durationSeconds:null,format:null,aspectRatio:'9:16'});
  assert.doesNotMatch(JSON.stringify(request),/[A-Z]:\\\\|sourcePath|filePath/);
});

test('verified local ComfyUI reference support changes only the reference policy, never embeds bytes or paths',()=>{
  const report={freeOnlyImageWorkflow:true,motionFallback:{enabled:true},tools:{ffmpeg:{available:true,libx264:true},ffprobe:{available:true}},supportsCharacterReferences:true,supportsWorldReferences:true,referenceForwardingEnabled:true,referenceReason:'Verified exact local node mapping.'};
  const request=buildProviderGenerationRequest(envelope({route:'local-comfyui'}),report);
  assert.equal(request.ready,true);
  assert.equal(request.routeReadiness.provider,'image:local-comfyui');
  assert.equal(request.references.mode,'verified-local-id-resolution');
  assert.equal(request.references.forwardingEnabled,true);
  assert.equal(request.references.includeFilesystemPaths,false);
  assert.equal(request.references.includeBytes,false);
});

test('motion fallback request binds source asset while reference forwarding stays metadata-only',()=>{
  const request=buildProviderGenerationRequest(envelope({jobType:'motion',route:'ffmpeg-camera-motion'}),fallbackReport(),{output:{durationSeconds:5,fps:30}});
  assert.equal(request.ready,true);
  assert.equal(request.routeReadiness.provider,'video:motion-fallback');
  assert.equal(request.sourceAssetId,'img-1');
  assert.equal(request.references.forwardingEnabled,false);
  assert.equal(request.output.durationSeconds,5);
  assert.equal(request.output.fps,30);
});

test('mock, unavailable or mismatched routes fail closed instead of inventing capability readiness',()=>{
  const mocked=buildProviderGenerationRequest(envelope(),{...fallbackReport(),mock:true});
  assert.equal(mocked.ready,false);
  assert.ok(mocked.blockers.includes('mock-capability-report'));

  const mismatched=buildProviderGenerationRequest(envelope({route:'local-comfyui'}),fallbackReport());
  assert.equal(mismatched.ready,false);
  assert.ok(mismatched.blockers.includes('dispatch-route-readiness-mismatch'));

  const unknown=buildProviderGenerationRequest(envelope({route:'future-provider'}),fallbackReport());
  assert.equal(unknown.ready,false);
  assert.ok(unknown.blockers.includes('unsupported-dispatch-route'));
});

test('invalid, paid-capable, external-upload or mismatched prompt contracts are rejected before request creation',()=>{
  assert.throws(()=>buildProviderGenerationRequest(null,fallbackReport()),/guarded one-click dispatch/i);
  assert.throws(()=>buildProviderGenerationRequest({...envelope(),costMode:'BEST QUALITY'},fallbackReport()),/FREE ONLY/i);
  assert.throws(()=>buildProviderGenerationRequest({...envelope(),externalUploadAllowed:true},fallbackReport()),/External upload/i);
  const bad=envelope();bad.payload.promptContract={...bad.payload.promptContract,sceneId:'other'};
  assert.throws(()=>buildProviderGenerationRequest(bad,fallbackReport()),/does not match/i);
});

test('output values are sanitized and unverified quality targets are not promoted to claims',()=>{
  const request=buildProviderGenerationRequest(envelope(),{...fallbackReport(),quality:{photorealisticImage:true}},{output:{width:-1,height:'1920',fps:0,durationSeconds:'5',format:' png ',aspectRatio:' 9:16 '}});
  assert.equal(request.output.width,null);
  assert.equal(request.output.height,1920);
  assert.equal(request.output.fps,null);
  assert.equal(request.output.durationSeconds,5);
  assert.equal(request.output.format,'png');
  assert.equal(request.capabilityClaims.modelGenerated,false);
  assert.equal(request.capabilityClaims.photorealistic,false);
});
