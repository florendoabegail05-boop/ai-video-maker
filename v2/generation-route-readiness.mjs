import {buildRoutePlan} from './provider-router.mjs';

function verified(route){return route?.verified===true;}

function imageStage(plan,report){
  if(plan.image.kind==='local-comfyui'&&verified(plan.image)){
    return {
      state:'MODEL_ROUTE_READY',
      mode:'model-generated',
      verified:true,
      provider:plan.image.kind,
      detail:'Verified FREE ONLY local model image route is available.'
    };
  }
  if(verified(plan.image)){
    return {
      state:'DRAFT_ROUTE_READY',
      mode:'local-draft',
      verified:true,
      provider:plan.image.kind,
      detail:'A verified local draft still route is available, but model-backed image generation is not verified.'
    };
  }
  return {
    state:'UNAVAILABLE',
    mode:'none',
    verified:false,
    provider:plan.image.kind,
    detail:plan.image.reason||'No verified FREE ONLY image route is available.'
  };
}

function videoStage(plan){
  if(verified(plan.video)){
    return {
      state:plan.video.kind==='ffmpeg-camera-motion'?'DRAFT_ROUTE_READY':'MODEL_ROUTE_READY',
      mode:plan.video.kind==='ffmpeg-camera-motion'?'ffmpeg-draft-motion':'model-generated',
      verified:true,
      provider:plan.video.kind,
      detail:plan.video.kind==='ffmpeg-camera-motion'?'Verified local FFmpeg camera motion is available; generative motion is not implied.':'Verified FREE ONLY local video route is available.'
    };
  }
  return {state:'UNAVAILABLE',mode:'none',verified:false,provider:plan.video.kind,detail:plan.video.reason||'No verified FREE ONLY video route is available.'};
}

function audioStage(route,label){
  if(verified(route))return {state:'GENERATED_ROUTE_READY',mode:'generated',verified:true,provider:route.kind,detail:`Verified FREE ONLY ${label} generation route is available.`};
  if(route?.kind==='import-only')return {state:'IMPORT_ONLY',mode:'import',verified:false,provider:'import-only',detail:`${label} can be supplied by importing local media; generation is not verified.`};
  return {state:'UNAVAILABLE',mode:'none',verified:false,provider:route?.kind||'unavailable',detail:`No verified FREE ONLY ${label} route is available.`};
}

export function generationRouteReadiness(report={},options={}){
  const plan=buildRoutePlan(report,{costMode:options.costMode||'FREE ONLY',ownerApproved:options.ownerApproved===true});
  const image=imageStage(plan,report);
  const video=videoStage(plan);
  const voice=audioStage(plan.audio.voice,'voice');
  const music=audioStage(plan.audio.music,'music');
  const sfx=audioStage(plan.audio.sfx,'sound-effect');
  const lipSync=verified(plan.audio.lipSync)
    ?{state:'GENERATED_ROUTE_READY',mode:'generated',verified:true,provider:plan.audio.lipSync.kind,detail:'Verified FREE ONLY lip-sync route is available.'}
    :{state:'UNAVAILABLE',mode:'none',verified:false,provider:plan.audio.lipSync.kind,detail:'Lip-sync is not verified on the active FREE ONLY setup.'};

  const referenceForwarding={
    character:report?.supportsCharacterReferences===true,
    world:report?.supportsWorldReferences===true,
    enabled:report?.referenceForwardingEnabled===true,
    reason:report?.referenceReason||null
  };

  const blockers=[];
  if(image.state==='UNAVAILABLE')blockers.push('image-route-unavailable');
  if(video.state==='UNAVAILABLE')blockers.push('video-route-unavailable');
  if(image.mode!=='model-generated')blockers.push('model-image-generation-unverified');
  if(video.mode!=='model-generated')blockers.push('model-motion-generation-unverified');
  if(referenceForwarding.enabled!==true)blockers.push('reference-forwarding-unverified');
  if(voice.mode!=='generated')blockers.push('generated-voice-unverified');
  if(music.mode!=='generated')blockers.push('generated-music-unverified');
  if(lipSync.mode!=='generated')blockers.push('lip-sync-unverified');

  return {
    schema:1,
    kind:'aivm-v2-generation-route-readiness',
    costMode:plan.costMode,
    stages:{image,video,voice,music,sfx,lipSync},
    referenceForwarding,
    qualityTargets:{...plan.quality},
    canCreateLocalDraft:image.verified&&video.verified,
    canAssembleWithImportedAudio:image.verified&&video.verified,
    modelBackedGenerationReady:image.mode==='model-generated'&&video.mode==='model-generated',
    generatedAudioReady:voice.mode==='generated'||music.mode==='generated'||sfx.mode==='generated',
    blockers,
    safeguards:{paidProvidersEnabled:false,automaticModelDownload:false,automaticPublishing:false},
    note:'Readiness reports only verified active routes. Draft fallbacks, imported audio and quality targets are not presented as model generation, native audio, lip-sync or artistic-quality proof.'
  };
}

export function generationRouteRows(report={},options={}){
  const readiness=generationRouteReadiness(report,options);
  const rows=[];
  for(const [name,stage] of Object.entries(readiness.stages))rows.push({name,state:stage.state,detail:stage.detail});
  rows.push({name:'character/world references',state:readiness.referenceForwarding.enabled?'VERIFIED ROUTE':'NOT VERIFIED',detail:readiness.referenceForwarding.enabled?'Reference forwarding is enabled by a verified local mapping.':readiness.referenceForwarding.reason||'Reference forwarding is not verified.'});
  return rows;
}
