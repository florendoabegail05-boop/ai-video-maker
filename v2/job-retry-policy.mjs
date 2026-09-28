import {classifyJobFailure} from './job-failure-classifier.mjs';

const DEFAULT_LIMITS={director:1,image:2,motion:2,audio:1,captions:1,assemble:1,verify:1};

function clean(value,max=300){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function retryLimitForJob(job,limits={}){
  const type=job?.type||'unknown';
  const raw=limits[type]??DEFAULT_LIMITS[type]??0;
  const value=Number(raw);
  return Number.isFinite(value)&&value>=0?Math.floor(value):0;
}

export function evaluateDraftJobRetry(job,entry,{limits={},failureReason='',failureCode=''}={}){
  if(!job?.id)return {allowed:false,reason:'missing-job',automaticRetryAllowed:false};
  if(!entry||entry.jobId!==job.id)return {allowed:false,reason:'missing-ledger-entry',automaticRetryAllowed:false};
  if(entry.stale)return {allowed:false,reason:'stale-ledger-entry',automaticRetryAllowed:false};
  if(['MANUAL','BLOCKED','OPTIONAL','DONE','SKIPPED','RUNNING'].includes(entry.state))return {allowed:false,reason:`state-${String(entry.state||'unknown').toLowerCase()}`,automaticRetryAllowed:false};
  if(entry.state!=='FAILED')return {allowed:false,reason:'not-failed',automaticRetryAllowed:false};
  const limit=retryLimitForJob(job,limits);
  const attempts=Number(entry.attempts)||0;
  const failure=classifyJobFailure({code:failureCode,message:clean(failureReason||entry.message)});
  if(!failure.retryEligible){
    return {
      allowed:false,
      reason:failure.reason,
      attempts,
      limit,
      failure,
      automaticRetryAllowed:false
    };
  }
  if(attempts>=limit){
    return {
      allowed:false,
      reason:'retry-limit-reached',
      attempts,
      limit,
      failure,
      automaticRetryAllowed:false
    };
  }
  return {
    allowed:true,
    reason:'retry-eligible',
    attempts,
    limit,
    remaining:Math.max(0,limit-attempts),
    failure,
    automaticRetryAllowed:false,
    note:'Retry is eligible but must be started explicitly by the live executor with a fresh operation and generation-input guard. This policy never spends money, changes providers, deletes files, uploads private media or bypasses owner actions.'
  };
}

export function retryableDraftJobs(plan,ledger,options={}){
  if(!plan||plan.kind!=='aivm-v2-draft-job-plan')throw Error('Draft job plan is required.');
  if(!ledger||ledger.kind!=='aivm-v2-draft-execution-ledger')throw Error('Draft execution ledger is required.');
  if(plan.projectId!==ledger.projectId){
    return {
      schema:1,
      kind:'aivm-v2-retryable-draft-jobs',
      projectId:plan.projectId||null,
      valid:false,
      reason:'project-mismatch',
      items:[],
      count:0,
      automaticRetryAllowed:false
    };
  }
  const planRevision=Number(plan.projectRevision)||0;
  const ledgerRevision=Number(ledger.projectRevision)||0;
  if(planRevision!==ledgerRevision){
    return {
      schema:1,
      kind:'aivm-v2-retryable-draft-jobs',
      projectId:plan.projectId||null,
      valid:false,
      reason:'project-revision-mismatch',
      planRevision,
      ledgerRevision,
      items:[],
      count:0,
      automaticRetryAllowed:false
    };
  }
  const entries=new Map((ledger.entries||[]).map(entry=>[entry.jobId,entry]));
  const items=[];
  for(const job of plan.jobs||[]){
    const decision=evaluateDraftJobRetry(job,entries.get(job.id),options);
    if(decision.allowed)items.push({jobId:job.id,type:job.type,sceneId:job.sceneId||null,...decision});
  }
  return {
    schema:1,
    kind:'aivm-v2-retryable-draft-jobs',
    projectId:plan.projectId||null,
    valid:true,
    reason:'current',
    items,
    count:items.length,
    automaticRetryAllowed:false,
    note:'Advisory only. Each retry needs fresh current-state guards and the FREE ONLY route must still be verified at execution time.'
  };
}
