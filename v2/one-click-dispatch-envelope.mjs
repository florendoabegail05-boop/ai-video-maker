import {inspectOneClickSession} from './one-click-orchestrator.mjs';
import {captureOperationGuard,validateOperationGuard} from './operation-guard.mjs';
import {updateDraftJobState} from './draft-execution-ledger.mjs';

const DISPATCHABLE_TYPES=new Set(['director','image','motion','captions','assemble','verify']);

function clean(value,max=500){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
function unsafeRoute(route){const value=String(route||'').toLowerCase();return value.includes('paid')||value.includes('future-provider');}

function guardOptions(job){
  if(job?.type==='assemble'||job?.type==='verify')return {allowUnrelatedRevision:false,requireRenderMatch:true};
  if(job?.type==='image'||job?.type==='motion')return {allowUnrelatedRevision:true,requireRenderMatch:false};
  return {allowUnrelatedRevision:false,requireRenderMatch:false};
}

function payloadForJob(job){
  const payload={jobId:job.id,type:job.type,sceneId:job.sceneId||null,route:job.route||null};
  if(job.type==='image'){
    payload.prompt=clean(job.prompt,4000);
    payload.directorBrief=clean(job.directorBrief,8000);
    payload.characterReferenceIds=[...(job.characterReferenceIds||[])];
    payload.worldReferenceIds=[...(job.worldReferenceIds||[])];
  }else if(job.type==='motion'){
    payload.directorBrief=clean(job.directorBrief,8000);
  }
  return payload;
}

export function prepareNextOneClickDispatch(project,report,session,options={}){
  const execution=inspectOneClickSession(project,report,session,{creation:options.creation||{}});
  if(!execution.valid)return {prepared:false,reason:execution.reason||'session-invalid',nextAction:execution.nextAction||'REPLAN',session};
  const next=execution.nextJob;
  if(!next)return {prepared:false,reason:'no-ready-job',nextAction:execution.nextAction,session};
  const fullJob=(session.plan?.jobs||[]).find(item=>item.id===next.id);
  if(!fullJob)return {prepared:false,reason:'job-missing-from-session-plan',nextAction:'REPLAN',session};
  if(!DISPATCHABLE_TYPES.has(fullJob.type))return {prepared:false,reason:'job-requires-live-or-owner-adapter',nextAction:execution.nextAction,jobId:fullJob.id,session};
  if(unsafeRoute(fullJob.route))return {prepared:false,reason:'unsafe-or-paid-route',nextAction:'REVIEW_BLOCKERS',jobId:fullJob.id,session};

  const guard=captureOperationGuard(project,{
    kind:`one-click:${fullJob.type}`,
    sceneId:['image','motion'].includes(fullJob.type)?fullJob.sceneId:null
  });
  const ledger=updateDraftJobState(session.ledger,fullJob.id,'RUNNING',{message:'Prepared for guarded FREE ONLY dispatch.'});
  const preparedSession={...session,started:true,ledger};
  return {
    prepared:true,
    reason:'ready',
    nextAction:'DISPATCH_PREPARED_JOB',
    session:preparedSession,
    envelope:{
      schema:1,
      kind:'aivm-v2-one-click-dispatch-envelope',
      projectId:project.id,
      projectRevision:Number(project.revision)||0,
      jobId:fullJob.id,
      jobType:fullJob.type,
      sceneId:fullJob.sceneId||null,
      costMode:'FREE ONLY',
      guard,
      guardOptions:guardOptions(fullJob),
      payload:payloadForJob(fullJob),
      dispatchable:true,
      paidProviderAllowed:false,
      externalUploadAllowed:false,
      destructiveReplacementAllowed:false,
      automaticPublishingAllowed:false,
      publishAuthorized:false,
      note:'Prepared internal dispatch metadata only. The live executor must revalidate this guard immediately before any provider, FFmpeg or FFprobe action and must preserve locked/imported media.'
    }
  };
}

export function validateOneClickDispatch(project,envelope){
  if(!envelope||envelope.kind!=='aivm-v2-one-click-dispatch-envelope')return {ok:false,reason:'invalid-envelope'};
  if(envelope.costMode!=='FREE ONLY'||envelope.paidProviderAllowed===true)return {ok:false,reason:'paid-route-not-allowed'};
  if(envelope.externalUploadAllowed===true)return {ok:false,reason:'external-upload-not-allowed'};
  if(envelope.destructiveReplacementAllowed===true)return {ok:false,reason:'destructive-replacement-not-allowed'};
  if(envelope.publishAuthorized===true||envelope.automaticPublishingAllowed===true)return {ok:false,reason:'publishing-not-allowed'};
  if(!DISPATCHABLE_TYPES.has(envelope.jobType))return {ok:false,reason:'unsupported-job-type'};
  if(unsafeRoute(envelope.payload?.route))return {ok:false,reason:'unsafe-or-paid-route'};
  const guard=validateOperationGuard(project,envelope.guard,envelope.guardOptions||{});
  if(!guard.ok)return {ok:false,reason:`stale-dispatch:${guard.reason}`};
  return {ok:true,reason:'current-free-only-guarded'};
}
