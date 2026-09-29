import {buildRoutePlan} from './provider-router.mjs';
import {adapterAvailabilitySummary} from './adapter-registry.mjs';

function firstAdapter(summary,kind){return (summary?.[kind]||[])[0]||null;}

function imageStage(summary){
  const adapter=firstAdapter(summary,'image');
  if(!adapter)return {state:'UNAVAILABLE',mode:'none',verified:false,provider:'unavailable',detail:'No verified FREE ONLY image route is available.'};
  if(adapter.id==='image:local-comfyui')return {state:'MODEL_ROUTE_READY',mode:'model-generated',verified:true,provider:adapter.id,detail:'Verified FREE ONLY local model image route is available.'};
  if(adapter.id==='image:fallback')return {state:'DRAFT_ROUTE_READY',mode:'local-draft',verified:true,provider:adapter.id,detail:'A verified local draft still route is available, but model-backed image generation is not verified.'};
  return {state:'VERIFIED_ROUTE_READY',mode:'verified-provider',verified:true,provider:adapter.id,detail:'A verified FREE ONLY image route is available, but it is not classified here as model-backed generation.'};
}

function videoStage(summary,report){
  const adapter=firstAdapter(summary,'video');
  if(!adapter)return {state:'UNAVAILABLE',mode:'none',verified:false,provider:'unavailable',detail:'No verified FREE ONLY video route is available.'};
  if(adapter.id==='video:motion-fallback')return {state:'DRAFT_ROUTE_READY',mode:'ffmpeg-draft-motion',verified:true,provider:adapter.id,detail:'Verified local FFmpeg camera motion is available; generative motion is not implied.'};
  const configured=report?.routes?.video;
  if(configured?.generative===true&&adapter.id===`video:${configured.provider}`)return {state:'MODEL_ROUTE_READY',mode:'model-generated',verified:true,provider:adapter.id,detail:'Verified FREE ONLY generative video route is available.'};
  return {state:'VERIFIED_ROUTE_READY',mode:'verified-provider',verified:true,provider:adapter.id,detail:'A verified FREE ONLY video route is available, but it is not classified here as generative motion.'};
}

function audioStage(summary,kind,label){
  const adapter=firstAdapter(summary,kind);
  if(adapter)return {state:'GENERATED_ROUTE_READY',mode:'generated',verified:true,provider:adapter.id,detail:`Verified FREE ONLY ${label} generation route is available.`};
  return {state:'IMPORT_ONLY',mode:'import',verified:false,provider:'import-only',detail:`${label} can be supplied by importing local media; generation is not verified.`};
}

export function generationRouteReadiness(report={},options={}){
  const plan=buildRoutePlan(report,{costMode:options.costMode||'FREE ONLY',ownerApproved:options.ownerApproved===true});
  const summary=adapterAvailabilitySummary(report);
  const image=imageStage(summary);
  const video=videoStage(summary,report);
  const voice=audioStage(summary,'voice','voice');
  const music=audioStage(summary,'music','music');
  const sfx=audioStage(summary,'sfx','sound-effect');
  const lipSyncAdapter=firstAdapter(summary,'lipsync');
  const lipSync=lipSyncAdapter
    ?{state:'GENERATED_ROUTE_READY',mode:'generated',verified:true,provider:lipSyncAdapter.id,detail:'Verified FREE ONLY lip-sync route is available.'}
    :{state:'UNAVAILABLE',mode:'none',verified:false,provider:'unavailable',detail:'Lip-sync is not verified on the active FREE ONLY setup.'};

  const characterReference=report?.supportsCharacterReferences===true;
  const worldReference=report?.supportsWorldReferences===true;
  const referenceForwarding={
    character:characterReference,
    world:worldReference,
    enabled:report?.referenceForwardingEnabled===true&&(characterReference||worldReference),
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

  const generatedAudioReady=voice.mode==='generated'||music.mode==='generated'||sfx.mode==='generated';
  const noQuality={photorealisticImage:false,photorealisticMotion:false,nativeAudio:false,lipSync:false,output4k:false};
  const qualityTargets=report?.mock===true?noQuality:{
    photorealisticImage:image.mode==='model-generated'&&plan.quality.photorealisticImage===true,
    photorealisticMotion:video.mode==='model-generated'&&plan.quality.photorealisticMotion===true,
    nativeAudio:generatedAudioReady&&plan.quality.nativeAudio===true,
    lipSync:lipSync.verified&&plan.quality.lipSync===true,
    output4k:image.verified&&video.verified&&plan.quality.output4k===true
  };

  return {
    schema:1,
    kind:'aivm-v2-generation-route-readiness',
    costMode:plan.costMode,
    stages:{image,video,voice,music,sfx,lipSync},
    referenceForwarding,
    qualityTargets,
    canCreateLocalDraft:image.verified&&video.verified,
    canAssembleWithImportedAudio:image.verified&&video.verified,
    modelBackedGenerationReady:image.mode==='model-generated'&&video.mode==='model-generated',
    generatedAudioReady,
    blockers,
    safeguards:{paidProvidersEnabled:false,automaticModelDownload:false,automaticPublishing:false},
    note:'Readiness is derived from the verified FREE ONLY adapter registry. Draft fallbacks, imported audio and quality targets are not presented as model generation, native audio, lip-sync or artistic-quality proof.'
  };
}

export function generationRouteRows(report={},options={}){
  const readiness=generationRouteReadiness(report,options);
  const rows=[];
  for(const [name,stage] of Object.entries(readiness.stages))rows.push({name,state:stage.state,detail:stage.detail});
  rows.push({name:'character/world references',state:readiness.referenceForwarding.enabled?'VERIFIED ROUTE':'NOT VERIFIED',detail:readiness.referenceForwarding.enabled?'Reference forwarding is enabled by a verified local mapping.':readiness.referenceForwarding.reason||'Reference forwarding is not verified.'});
  return rows;
}
