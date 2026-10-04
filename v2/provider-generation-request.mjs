import {generationRouteReadiness} from './generation-route-readiness.mjs';

const SAFE_ROUTE_MAP={
  image:{'basic-local-still':'image:fallback','local-comfyui':'image:local-comfyui'},
  motion:{'ffmpeg-camera-motion':'video:motion-fallback'}
};

function clean(value,max=8000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
function clone(value){return value==null?null:JSON.parse(JSON.stringify(value));}
function unique(values){return [...new Set((Array.isArray(values)?values:[]).map(item=>String(item||'').trim()).filter(Boolean))];}
function positiveInt(value){const n=Number(value);return Number.isInteger(n)&&n>0?n:null;}
function positiveNumber(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}

function outputSpec(input={}){
  return {
    width:positiveInt(input.width),
    height:positiveInt(input.height),
    fps:positiveNumber(input.fps),
    durationSeconds:positiveNumber(input.durationSeconds),
    format:clean(input.format,80)||null,
    aspectRatio:clean(input.aspectRatio,40)||null
  };
}

function assertDispatchEnvelope(envelope){
  if(!envelope||envelope.kind!=='aivm-v2-one-click-dispatch-envelope')throw Error('A guarded one-click dispatch envelope is required.');
  if(!['image','motion'].includes(envelope.jobType))throw Error('Provider generation requests support image or motion jobs only.');
  if(envelope.costMode!=='FREE ONLY'||envelope.paidProviderAllowed===true)throw Error('FREE ONLY dispatch is required.');
  if(envelope.externalUploadAllowed===true)throw Error('External upload is not allowed.');
  if(envelope.automaticPublishingAllowed===true||envelope.publishAuthorized===true)throw Error('Publishing authorization is not allowed in a generation request.');
  const contract=envelope.payload?.promptContract;
  if(!contract||contract.kind!=='aivm-v2-generation-prompt-contract')throw Error('Generation prompt contract is required.');
  if(contract.projectId!==envelope.projectId||contract.sceneId!==envelope.sceneId)throw Error('Generation prompt contract does not match the dispatch scope.');
  return contract;
}

export function buildProviderGenerationRequest(envelope,report={},options={}){
  const contract=assertDispatchEnvelope(envelope);
  const readiness=generationRouteReadiness(report,{costMode:'FREE ONLY'});
  const stage=envelope.jobType==='image'?readiness.stages.image:readiness.stages.video;
  const route=clean(envelope.payload?.route,160)||'unavailable';
  const expectedProvider=SAFE_ROUTE_MAP[envelope.jobType]?.[route]||null;
  const blockers=[];
  if(report?.mock===true)blockers.push('mock-capability-report');
  if(stage?.verified!==true)blockers.push('verified-route-unavailable');
  if(!expectedProvider)blockers.push('unsupported-dispatch-route');
  else if(stage?.provider!==expectedProvider)blockers.push('dispatch-route-readiness-mismatch');

  const characterReferenceAssetIds=unique(envelope.payload?.characterReferenceIds?.length?envelope.payload.characterReferenceIds:contract.characterReferenceAssetIds);
  const worldReferenceAssetIds=unique(envelope.payload?.worldReferenceIds?.length?envelope.payload.worldReferenceIds:contract.worldReferenceAssetIds);
  const referenceImageAssetIds=unique([...characterReferenceAssetIds,...worldReferenceAssetIds]);
  const canForwardReferences=envelope.jobType==='image'&&readiness.referenceForwarding.enabled===true&&stage?.provider==='image:local-comfyui';

  return {
    schema:1,
    kind:'aivm-v2-provider-generation-request',
    projectId:envelope.projectId,
    projectRevision:Number(envelope.projectRevision)||0,
    jobId:envelope.jobId,
    jobType:envelope.jobType,
    sceneId:envelope.sceneId,
    costMode:'FREE ONLY',
    route,
    routeReadiness:{
      state:stage?.state||'UNAVAILABLE',
      mode:stage?.mode||'none',
      verified:stage?.verified===true,
      provider:stage?.provider||'unavailable'
    },
    prompt:clean(envelope.payload?.prompt||contract.sourcePrompt,6000),
    directorBrief:clean(envelope.payload?.directorBrief,8000),
    promptContract:clone(contract),
    sourceAssetId:envelope.jobType==='motion'?(envelope.payload?.sourceAssetId||null):null,
    references:{
      mode:canForwardReferences?'verified-local-id-resolution':'metadata-only',
      forwardingEnabled:canForwardReferences,
      characterAssetIds:characterReferenceAssetIds,
      worldAssetIds:worldReferenceAssetIds,
      allAssetIds:referenceImageAssetIds,
      includeFilesystemPaths:false,
      includeBytes:false
    },
    output:outputSpec(options.output),
    requirements:{
      verifiedRouteRequired:true,
      freeOnlyRequired:true,
      localMediaPreservationRequired:true,
      paidProviderAllowed:false,
      externalUploadAllowed:false,
      automaticModelDownloadAllowed:false,
      destructiveReplacementAllowed:false,
      automaticPublishingAllowed:false
    },
    capabilityClaims:{
      modelGenerated:stage?.mode==='model-generated',
      referenceForwarding:canForwardReferences,
      photorealistic:envelope.jobType==='image'?readiness.qualityTargets.photorealisticImage===true:readiness.qualityTargets.photorealisticMotion===true
    },
    ready:blockers.length===0,
    blockers,
    note:'Provider-neutral execution request. It carries approved reference asset IDs only; adapters must resolve bytes locally and only when reference forwarding is explicitly verified. It never includes local file paths, enables paid providers, downloads models, replaces source media, or authorizes publishing.'
  };
}
