import {inspectOneClickSession} from './one-click-orchestrator.mjs';
import {captureOperationGuard} from './operation-guard.mjs';
import {captureGenerationInputGuard} from './generation-input-guard.mjs';
import {evaluateDraftJobRetry} from './job-retry-policy.mjs';
import {updateDraftJobState} from './draft-execution-ledger.mjs';
import {validateOneClickDispatch} from './one-click-dispatch-envelope.mjs';

const DISPATCHABLE_TYPES=new Set(['director','image','motion','captions','assemble','verify']);

function clean(value,max=500){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
function unsafeRoute(route){const value=String(route||'').toLowerCase();return value.includes('paid')||value.includes('future-provider');}

function guardOptions(job){
  if(job?.type==='assemble'||job?.type==='verify')return {allowUnrelatedRevision:false,requireRenderMatch:true};
  if(job?.type==='image'||job?.type==='motion')return {allowUnrelatedRevision:true,requireRenderMatch:false};
  return {allowUnrelatedRevision:false,requireRenderMatch:false};
}

function payloadForJob(job,generationGuard=null){
  const payload={jobId:job.id,type:job.type,sceneId:job.sceneId||null,route:job.route||null};
  if(job.type==='image'){
    payload.prompt=clean(job.prompt,4000);
    payload.directorBrief=clean(job.directorBrief,8000);
    payload.characterReferenceIds=[...(job.characterReferenceIds||[])];
    payload.worldReferenceIds=[...(job.worldReferenceIds||[])];
  }else if(job.type==='motion'){
    payload.directorBrief=clean(job.directorBrief,8000);
    payload.sourceAssetId=generationGuard?.parentAssetId||null;
  }
  return payload;
}

function deniedAction(reason=''){
  if(reason==='owner-or-paid-action-required')return 'OWNER_OR_MANUAL_INPUT_REQUIRED';
  if(['state-changed-replan-required','stale-ledger-entry','project-mismatch','project-revision-mismatch'].includes(reason))return 'REPLAN';
  return 'REVIEW_FAILURE';
}

export function prepareOneClickRetryDispatch(project,report,session,jobId,options={}){
  if(!session||session.kind!=='aivm-v2-one-click-session')throw Error('One-click session is required.');
  if(options.explicitRetry!==true){
    return {
      prepared:false,
      reason:'explicit-retry-required',
      nextAction:'REVIEW_FAILURE',
      session,
      automaticRetryAllowed:false,
      publishAuthorized:false,
      note:'Retries never start automatically. A live executor or owner action must explicitly request this retry.'
    };
  }

  const execution=inspectOneClickSession(project,report,session,{creation:options.creation||{}});
  if(!execution.valid){
    return {prepared:false,reason:execution.reason||'session-invalid',nextAction:'REPLAN',session,automaticRetryAllowed:false,publishAuthorized:false};
  }

  const job=(session.plan?.jobs||[]).find(item=>item.id===jobId);
  const entry=(session.ledger?.entries||[]).find(item=>item.jobId===jobId);
  if(!job||!entry)return {prepared:false,reason:'retry-job-missing',nextAction:'REPLAN',session,automaticRetryAllowed:false,publishAuthorized:false};

  const retry=evaluateDraftJobRetry(job,entry,{
    limits:options.retryLimits||{},
    failureReason:options.failureReason||entry.message||'',
    failureCode:options.failureCode||''
  });
  if(!retry.allowed){
    return {
      prepared:false,
      reason:retry.reason,
      nextAction:deniedAction(retry.reason),
      retry,
      session,
      automaticRetryAllowed:false,
      publishAuthorized:false
    };
  }

  if(!DISPATCHABLE_TYPES.has(job.type))return {prepared:false,reason:'job-requires-live-or-owner-adapter',nextAction:'REVIEW_FAILURE',retry,session,automaticRetryAllowed:false,publishAuthorized:false};
  if(unsafeRoute(job.route))return {prepared:false,reason:'unsafe-or-paid-route',nextAction:'REVIEW_BLOCKERS',retry,session,automaticRetryAllowed:false,publishAuthorized:false};

  const guard=captureOperationGuard(project,{
    kind:`one-click-retry:${job.type}`,
    sceneId:['image','motion'].includes(job.type)?job.sceneId:null
  });
  const generationGuard=['image','motion'].includes(job.type)
    ?captureGenerationInputGuard(project,job.sceneId,{type:job.type,route:job.route||null})
    :null;
  if(job.type==='motion'&&!generationGuard?.parentAssetId){
    return {prepared:false,reason:'motion-source-image-missing',nextAction:'OWNER_OR_MANUAL_INPUT_REQUIRED',retry,session,automaticRetryAllowed:false,publishAuthorized:false};
  }

  const payload=payloadForJob(job,generationGuard);
  const ledger=updateDraftJobState(session.ledger,job.id,'RUNNING',{message:'Explicit guarded FREE ONLY retry prepared.'});
  const updatedEntry=(ledger.entries||[]).find(item=>item.jobId===job.id);
  const preparedSession={...session,started:true,ledger};
  const envelope={
    schema:1,
    kind:'aivm-v2-one-click-dispatch-envelope',
    projectId:project.id,
    projectRevision:Number(project.revision)||0,
    jobId:job.id,
    jobType:job.type,
    sceneId:job.sceneId||null,
    costMode:'FREE ONLY',
    guard,
    generationGuard,
    guardOptions:guardOptions(job),
    payload,
    retry:true,
    retryAttempt:Number(updatedEntry?.attempts)||0,
    dispatchable:true,
    paidProviderAllowed:false,
    externalUploadAllowed:false,
    destructiveReplacementAllowed:false,
    automaticRetryAllowed:false,
    automaticPublishingAllowed:false,
    publishAuthorized:false,
    note:'Explicit retry dispatch only. Revalidate all guards immediately before execution; do not switch providers, spend money, delete/overwrite media, upload private files or publish.'
  };
  const validation=validateOneClickDispatch(project,envelope);
  if(!validation.ok){
    return {prepared:false,reason:validation.reason,nextAction:String(validation.reason).startsWith('stale-')?'REPLAN':'REVIEW_BLOCKERS',retry,session,automaticRetryAllowed:false,publishAuthorized:false};
  }
  return {
    prepared:true,
    reason:'retry-ready',
    nextAction:'DISPATCH_PREPARED_RETRY',
    retry,
    session:preparedSession,
    envelope,
    automaticRetryAllowed:false,
    publishAuthorized:false
  };
}
