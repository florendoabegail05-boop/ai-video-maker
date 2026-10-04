const KINDS=new Set(['image','video','voice','music','sfx','lipsync','upscale']);
const LOCAL_ENGINES=new Set(['comfyui','local-process']);

function text(value){return String(value||'').trim();}
function bool(value){return value===true;}
function loopbackEndpoint(value){
  const endpoint=text(value);
  if(!endpoint)return true;
  try{
    const url=new URL(endpoint);
    return (url.protocol==='http:'||url.protocol==='https:')&&['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  }catch{return false;}
}

function qualityTargets(input={}){
  return {
    photorealisticImage:bool(input.photorealisticImage),
    photorealisticMotion:bool(input.photorealisticMotion),
    nativeAudio:bool(input.nativeAudio),
    lipSync:bool(input.lipSync),
    output4k:bool(input.output4k)
  };
}

export function localWorkflowReadiness(manifest={},evidence={}){
  const kind=text(manifest.kind).toLowerCase();
  const engine=text(manifest.engine).toLowerCase();
  const blockers=[];

  if(!KINDS.has(kind))blockers.push('unsupported-kind');
  if(!LOCAL_ENGINES.has(engine))blockers.push('unsupported-local-engine');
  if(manifest.freeOnly!==true)blockers.push('free-only-not-declared');
  if(manifest.local!==true)blockers.push('local-only-not-declared');
  if(manifest.remote===true)blockers.push('remote-provider-disallowed');
  if(engine==='comfyui'&&!text(manifest.endpoint))blockers.push('local-endpoint-required');
  if(!loopbackEndpoint(manifest.endpoint))blockers.push('non-loopback-endpoint-disallowed');

  const runtime={
    mock:evidence.mock===true,
    workflowReadable:evidence.workflowReadable===true,
    runnerReachable:evidence.runnerReachable===true,
    modelFilesPresent:evidence.modelFilesPresent===true,
    outputProbeVerified:evidence.outputProbeVerified===true
  };
  if(runtime.mock)blockers.push('mock-evidence-disallowed');
  if(!runtime.workflowReadable)blockers.push('workflow-not-readable');
  if(!runtime.runnerReachable)blockers.push('runner-not-reachable');
  if(!runtime.modelFilesPresent)blockers.push('model-files-not-verified');
  if(!runtime.outputProbeVerified)blockers.push('output-probe-not-verified');

  const routeVerified=blockers.length===0;
  const declaredReferences={
    character:manifest.references?.character===true,
    world:manifest.references?.world===true
  };
  const exactReferenceMapVerified=evidence.referenceNodeMapVerified===true;
  const referenceForwarding={
    character:routeVerified&&declaredReferences.character&&exactReferenceMapVerified,
    world:routeVerified&&declaredReferences.world&&exactReferenceMapVerified,
    nodeMapVerified:exactReferenceMapVerified,
    enabled:routeVerified&&exactReferenceMapVerified&&(declaredReferences.character||declaredReferences.world)
  };

  return {
    schema:1,
    kind:'aivm-v2-local-workflow-readiness',
    workflowKind:KINDS.has(kind)?kind:'unknown',
    engine:LOCAL_ENGINES.has(engine)?engine:'unknown',
    workflowId:text(manifest.id)||null,
    routeVerified,
    runtime,
    declaredReferences,
    referenceForwarding,
    qualityTargets:qualityTargets(manifest.qualityTargets),
    verifiedOutputClaims:{
      photorealisticImage:false,
      photorealisticMotion:false,
      nativeAudio:false,
      lipSync:false,
      output4k:false
    },
    blockers,
    safeguards:{
      freeOnlyRequired:true,
      localOnlyRequired:true,
      paidProvidersEnabled:false,
      automaticModelDownload:false,
      automaticPublishing:false
    },
    note:'Configuration alone never verifies a local AI route. Runtime readability, runner reachability, model presence and a probed output are required. Quality targets are not output proof, and reference forwarding requires an exact verified node mapping.'
  };
}

export function canRegisterVerifiedLocalWorkflow(manifest={},evidence={}){
  return localWorkflowReadiness(manifest,evidence).routeVerified;
}
