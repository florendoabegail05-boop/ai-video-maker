import {createAdapterDescriptor,canUseAdapter} from './media-adapters.mjs';

const KINDS=['image','video','voice','music','sfx','lipsync','upscale'];

function bool(value){return value===true;}

export function adapterRegistryFromCapabilities(report={}){
  const routes=report.routes||{};
  const workflows=report.workflows||{};
  const generatedAudio=report.generatedAudio||report.audioGeneration||{};
  const entries=[];

  if(routes.image?.provider&&routes.image.provider!=='unavailable')entries.push(createAdapterDescriptor({id:`image:${routes.image.provider}`,kind:'image',label:`Image · ${routes.image.provider}`,freeOnly:true,local:routes.image.provider!=='remote',verified:bool(routes.image.verified)||bool(report.freeOnlyImageWorkflow)||routes.image.provider==='fallback',capabilities:{referenceImages:bool(report.supportsCharacterReferences)||bool(report.supportsWorldReferences)}}));
  if(routes.video?.provider&&routes.video.provider!=='unavailable')entries.push(createAdapterDescriptor({id:`video:${routes.video.provider}`,kind:'video',label:`Video · ${routes.video.provider}`,freeOnly:true,local:routes.video.provider!=='remote',verified:bool(routes.video.verified)||routes.video.provider==='motion-fallback',capabilities:{temporalConsistency:routes.video.temporalConsistency||'unknown',referenceImages:bool(report.supportsCharacterReferences)}}));

  const audioKinds=[['voice','freeOnlyVoiceWorkflow'],['music','freeOnlyMusicWorkflow'],['sfx','freeOnlySfxWorkflow'],['lipsync','freeOnlyLipSyncWorkflow']];
  for(const [kind,key] of audioKinds){
    const verified=bool(report[key])||bool(generatedAudio[kind]);
    if(verified)entries.push(createAdapterDescriptor({id:`${kind}:verified-local`,kind,label:`${kind} · verified local`,freeOnly:true,local:true,verified:true,capabilities:{}}));
  }
  if(bool(report.verifiedUpscale))entries.push(createAdapterDescriptor({id:'upscale:verified-local',kind:'upscale',label:'Upscale · verified local',freeOnly:true,local:true,verified:true,capabilities:{maxWidth:report.upscaleMaxWidth,maxHeight:report.upscaleMaxHeight}}));

  return entries;
}

export function availableAdapters(report,kind,{costMode='FREE ONLY',ownerApproved=false}={}){
  if(!KINDS.includes(kind))throw Error('Unsupported adapter kind.');
  return adapterRegistryFromCapabilities(report)
    .filter(adapter=>adapter.kind===kind)
    .map(adapter=>({adapter,policy:canUseAdapter(adapter,{costMode,ownerApproved})}))
    .filter(item=>item.policy.allowed);
}

export function adapterAvailabilitySummary(report){
  return Object.fromEntries(KINDS.map(kind=>[kind,availableAdapters(report,kind).map(item=>({id:item.adapter.id,label:item.adapter.label,local:item.adapter.local,verified:item.adapter.verified}))]));
}
