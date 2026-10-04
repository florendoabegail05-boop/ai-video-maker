import test from 'node:test';
import assert from 'node:assert/strict';
import {generationRouteReadiness,generationRouteRows} from './generation-route-readiness.mjs';

function fallbackReport(){
  return {
    imageFallback:{enabled:true},
    motionFallback:{enabled:true},
    tools:{ffmpeg:{available:true,libx264:true},ffprobe:{available:true}},
    supportsCharacterReferences:false,
    supportsWorldReferences:false,
    referenceForwardingEnabled:false,
    referenceReason:'No verified local image workflow is configured.'
  };
}

test('mock reports cannot advertise reference forwarding even with effective support flags',()=>{
  const result=generationRouteReadiness({...fallbackReport(),mock:true,supportsCharacterReferences:true,supportsWorldReferences:true,referenceForwardingEnabled:true});
  assert.equal(result.referenceForwarding.enabled,false);
  assert.equal(result.referenceForwarding.character,false);
  assert.equal(result.referenceForwarding.world,false);
});

test('a named verified motion fallback cannot bypass required tool evidence',()=>{
  for(const tools of [{ffmpeg:{available:true},ffprobe:{available:false}},{ffmpeg:{available:false},ffprobe:{available:true}},{ffmpeg:{available:true,libx264:false},ffprobe:{available:true}}]){
    const result=generationRouteReadiness({...fallbackReport(),tools,routes:{video:{provider:'motion-fallback',verified:true}}});
    assert.equal(result.stages.video.state,'UNAVAILABLE');
  }
});

test('verified draft fallbacks are reported as draft routes, never model generation',()=>{
  const result=generationRouteReadiness(fallbackReport());
  assert.equal(result.costMode,'FREE ONLY');
  assert.equal(result.stages.image.state,'DRAFT_ROUTE_READY');
  assert.equal(result.stages.image.mode,'local-draft');
  assert.equal(result.stages.video.state,'DRAFT_ROUTE_READY');
  assert.equal(result.stages.video.mode,'ffmpeg-draft-motion');
  assert.equal(result.canCreateLocalDraft,true);
  assert.equal(result.modelBackedGenerationReady,false);
  assert.equal(result.stages.voice.state,'IMPORT_ONLY');
  assert.equal(result.stages.music.state,'IMPORT_ONLY');
  assert.equal(result.stages.lipSync.state,'UNAVAILABLE');
  assert.ok(result.blockers.includes('model-image-generation-unverified'));
  assert.ok(result.blockers.includes('model-motion-generation-unverified'));
  assert.ok(result.blockers.includes('reference-forwarding-unverified'));
  assert.equal(result.safeguards.paidProvidersEnabled,false);
  assert.equal(result.safeguards.automaticModelDownload,false);
});

test('missing or incomplete image/video routes block local draft readiness',()=>{
  const noRoutes=generationRouteReadiness({tools:{ffmpeg:{available:false},ffprobe:{available:false}}});
  assert.equal(noRoutes.stages.image.state,'UNAVAILABLE');
  assert.equal(noRoutes.stages.video.state,'UNAVAILABLE');
  assert.equal(noRoutes.canCreateLocalDraft,false);
  assert.ok(noRoutes.blockers.includes('image-route-unavailable'));
  assert.ok(noRoutes.blockers.includes('video-route-unavailable'));

  const incomplete=generationRouteReadiness({imageFallback:{enabled:true},motionFallback:{enabled:true},tools:{ffmpeg:{available:true,libx264:true},ffprobe:{available:false}}});
  assert.equal(incomplete.stages.image.state,'DRAFT_ROUTE_READY');
  assert.equal(incomplete.stages.video.state,'UNAVAILABLE');
  assert.equal(incomplete.canCreateLocalDraft,false);
});

test('mock bridge reports never become verified generation readiness',()=>{
  const result=generationRouteReadiness({...fallbackReport(),mock:true,quality:{photorealisticImage:true,output4k:true}});
  assert.equal(result.stages.image.state,'UNAVAILABLE');
  assert.equal(result.stages.video.state,'UNAVAILABLE');
  assert.equal(result.canCreateLocalDraft,false);
  assert.equal(result.qualityTargets.photorealisticImage,false);
  assert.equal(result.qualityTargets.output4k,false);
});

test('verified local image model route is separated from draft motion and unverified reference forwarding',()=>{
  const result=generationRouteReadiness({
    freeOnlyImageWorkflow:true,
    motionFallback:{enabled:true},
    tools:{ffmpeg:{available:true,libx264:true},ffprobe:{available:true}},
    supportsCharacterReferences:true,
    supportsWorldReferences:true,
    referenceForwardingEnabled:false,
    referenceReason:'Reference node mapping has not been locally verified.'
  });
  assert.equal(result.stages.image.state,'MODEL_ROUTE_READY');
  assert.equal(result.stages.image.mode,'model-generated');
  assert.equal(result.stages.video.state,'DRAFT_ROUTE_READY');
  assert.equal(result.stages.video.mode,'ffmpeg-draft-motion');
  assert.equal(result.modelBackedGenerationReady,false);
  assert.equal(result.referenceForwarding.character,true);
  assert.equal(result.referenceForwarding.world,true);
  assert.equal(result.referenceForwarding.enabled,false);
  assert.ok(result.blockers.includes('model-motion-generation-unverified'));
  assert.ok(result.blockers.includes('reference-forwarding-unverified'));
});

test('fallback routes cannot inherit photorealistic model quality targets',()=>{
  const result=generationRouteReadiness({...fallbackReport(),quality:{photorealisticImage:true,photorealisticMotion:true,output4k:true}});
  assert.equal(result.stages.image.mode,'local-draft');
  assert.equal(result.stages.video.mode,'ffmpeg-draft-motion');
  assert.equal(result.qualityTargets.photorealisticImage,false);
  assert.equal(result.qualityTargets.photorealisticMotion,false);
  assert.equal(result.qualityTargets.output4k,true);
});

test('photorealistic image target is exposed only with a verified model image route',()=>{
  const result=generationRouteReadiness({
    freeOnlyImageWorkflow:true,
    motionFallback:{enabled:true},
    tools:{ffmpeg:{available:true,libx264:true},ffprobe:{available:true}},
    quality:{photorealisticImage:true}
  });
  assert.equal(result.stages.image.mode,'model-generated');
  assert.equal(result.qualityTargets.photorealisticImage,true);
  assert.equal(result.qualityTargets.photorealisticMotion,false);
});

test('reference forwarding flag alone cannot bypass verified reference support',()=>{
  const result=generationRouteReadiness({...fallbackReport(),referenceForwardingEnabled:true});
  assert.equal(result.referenceForwarding.character,false);
  assert.equal(result.referenceForwarding.world,false);
  assert.equal(result.referenceForwarding.enabled,false);
  assert.ok(result.blockers.includes('reference-forwarding-unverified'));
});

test('generated audio routes are only ready when explicitly verified',()=>{
  const result=generationRouteReadiness({
    ...fallbackReport(),
    freeOnlyVoiceWorkflow:true,
    freeOnlyMusicWorkflow:true,
    freeOnlySfxWorkflow:true,
    freeOnlyLipSyncWorkflow:true
  });
  assert.equal(result.stages.voice.state,'GENERATED_ROUTE_READY');
  assert.equal(result.stages.music.state,'GENERATED_ROUTE_READY');
  assert.equal(result.stages.sfx.state,'GENERATED_ROUTE_READY');
  assert.equal(result.stages.lipSync.state,'GENERATED_ROUTE_READY');
  assert.equal(result.generatedAudioReady,true);
  assert.ok(!result.blockers.includes('generated-voice-unverified'));
  assert.ok(!result.blockers.includes('generated-music-unverified'));
  assert.ok(!result.blockers.includes('lip-sync-unverified'));
});

test('rows remain owner-facing and do not invent quality proof',()=>{
  const rows=generationRouteRows(fallbackReport());
  assert.equal(rows.find(row=>row.name==='image').state,'DRAFT_ROUTE_READY');
  assert.match(rows.find(row=>row.name==='image').detail,/model-backed image generation is not verified/i);
  assert.equal(rows.find(row=>row.name==='character/world references').state,'NOT VERIFIED');
});
