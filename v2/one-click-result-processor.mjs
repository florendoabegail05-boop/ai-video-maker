import {validateOneClickDispatch} from './one-click-dispatch-envelope.mjs';
import {evaluateDraftJobResult,rejectDraftJobResult} from './job-result-gate.mjs';
import {evaluateDraftJobRetry} from './job-retry-policy.mjs';
import {inspectOneClickSession} from './one-click-orchestrator.mjs';

function clean(value,max=500){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
function resultOk(result){return result?.ok===true||result?.success===true||result?.status==='ok'||result?.status==='success';}
function staleReason(reason=''){return String(reason).startsWith('stale-dispatch:')||String(reason).startsWith('stale-generation:');}

export function processOneClickDispatchResult(project,report,session,envelope,result={},options={}){
  if(!session||session.kind!=='aivm-v2-one-click-session')throw Error('One-click session is required.');
  if(!envelope||envelope.kind!=='aivm-v2-one-click-dispatch-envelope')throw Error('One-click dispatch envelope is required.');
  if(session.projectId!==project?.id)return {accepted:false,reason:'project-changed',nextAction:'REPLAN',session,publishAuthorized:false};
  if(envelope.projectId!==project.id)return {accepted:false,reason:'envelope-project-mismatch',nextAction:'REPLAN',session,publishAuthorized:false};

  const job=(session.plan?.jobs||[]).find(item=>item.id===envelope.jobId);
  if(!job)return {accepted:false,reason:'job-missing-from-session-plan',nextAction:'REPLAN',session,publishAuthorized:false};
  if(job.type!==envelope.jobType)return {accepted:false,reason:'job-type-mismatch',nextAction:'REPLAN',session,publishAuthorized:false};

  const dispatchCheck=validateOneClickDispatch(project,envelope);
  if(!dispatchCheck.ok){
    return {
      accepted:false,
      reason:dispatchCheck.reason,
      nextAction:staleReason(dispatchCheck.reason)?'REPLAN':'REVIEW_BLOCKERS',
      session,
      publishAuthorized:false,
      note:'Rejected dispatch results do not mutate the project, ledger, media bytes or files.'
    };
  }

  const entry=(session.ledger?.entries||[]).find(item=>item.jobId===job.id);
  if(!entry)return {accepted:false,reason:'job-not-in-ledger',nextAction:'REPLAN',session,publishAuthorized:false};
  if(entry.state!=='RUNNING')return {accepted:false,reason:'job-not-running',nextAction:'REVIEW_BLOCKERS',session,publishAuthorized:false};

  if(!resultOk(result)){
    const failureReason=clean(result?.error||result?.reason||result?.message||'Executor reported failure.');
    const failedLedger=rejectDraftJobResult(session.ledger,job.id,failureReason);
    const failedEntry=failedLedger.entries.find(item=>item.jobId===job.id);
    const retry=evaluateDraftJobRetry(job,failedEntry,{limits:options.retryLimits||{},failureReason});
    let nextAction='REVIEW_FAILURE';
    if(retry.allowed)nextAction='RETRY_ELIGIBLE';
    else if(retry.reason==='state-changed-replan-required')nextAction='REPLAN';
    else if(retry.reason==='owner-or-paid-action-required')nextAction='OWNER_OR_MANUAL_INPUT_REQUIRED';
    return {
      accepted:false,
      reason:'executor-failure',
      failureReason,
      nextAction,
      retry,
      session:{...session,ledger:failedLedger},
      publishAuthorized:false,
      automaticRetryAllowed:false,
      note:'Failure handling records progress only. It does not retry automatically, switch providers, spend money, delete files, upload private media or publish.'
    };
  }

  const accepted=evaluateDraftJobResult(project,session.ledger,job,{
    assetIds:Array.isArray(result.assetIds)?result.assetIds:[],
    message:clean(result?.message||'Executor completed the guarded job.')
  },{guard:envelope.guard});

  if(!accepted.accepted){
    return {
      accepted:false,
      reason:accepted.reason,
      nextAction:String(accepted.reason||'').startsWith('stale-result:')?'REPLAN':'REVIEW_BLOCKERS',
      details:accepted,
      session,
      publishAuthorized:false,
      note:'Rejected results are not applied and the current session remains unchanged.'
    };
  }

  const updatedSession={...session,ledger:accepted.ledger};
  const execution=inspectOneClickSession(project,report,updatedSession,{creation:options.creation||{}});
  return {
    accepted:true,
    reason:'guarded-result-accepted',
    nextAction:execution.valid?execution.nextAction:'REPLAN',
    nextJob:execution.valid?execution.nextJob:null,
    resultAssetIds:accepted.resultAssetIds,
    session:updatedSession,
    execution,
    publishAuthorized:false,
    automaticPublishingAllowed:false,
    note:'The guarded result advanced session metadata only. Applying new bytes or replacing media remains a separate non-destructive operation.'
  };
}
