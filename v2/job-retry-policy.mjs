const DEFAULT_LIMITS={director:1,image:2,motion:2,audio:1,captions:1,assemble:1,verify:1};

function clean(value,max=300){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function retryLimitForJob(job,limits={}){
  const type=job?.type||'unknown';
  const raw=limits[type]??DEFAULT_LIMITS[type]??0;
  const value=Number(raw);
  return Number.isFinite(value)&&value>=0?Math.floor(value):0;
}

export function evaluateDraftJobRetry(job,entry,{limits={},failureReason=''}={}){
  if(!job?.id)return {allowed:false,reason:'missing-job',automaticRetryAllowed:false};
  if(!entry||entry.jobId!==job.id)return {allowed:false,reason:'missing-ledger-entry',automaticRetryAllowed:false};
  if(entry.stale)return {allowed:false,reason:'stale-ledger-entry',automaticRetryAllowed:false};
  if(['MANUAL','BLOCKED','OPTIONAL','DONE','SKIPPED','RUNNING'].includes(entry.state))return {allowed:false,reason:`state-${String(entry.state||'unknown').toLowerCase()}`,automaticRetryAllowed:false};
  if(entry.state!=='FAILED')return {allowed:false,reason:'not-failed',automaticRetryAllowed:false};
  const limit=retryLimitForJob(job,limits);
  const attempts=Number(entry.attempts)||0;
  if(attempts>=limit)return {allowed:false,reason:'retry-limit-reached',attempts,limit,automaticRetryAllowed:false};
  const text=clean(failureReason||entry.message).toLowerCase();
  if(/paid|payment|credit|billing|login|captcha|permission|owner approval|manual/.test(text)){
    return {allowed:false,reason:'owner-or-paid-action-required',attempts,limit,automaticRetryAllowed:false};
  }
  if(/locked|stale|project changed|scene changed|render inputs changed/.test(text)){
    return {allowed:false,reason:'state-changed-replan-required',attempts,limit,automaticRetryAllowed:false};
  }
  return {
    allowed:true,
    reason:'retry-eligible',
    attempts,
    limit,
    remaining:Math.max(0,limit-attempts),
    automaticRetryAllowed:false,
    note:'Retry is eligible but must be started explicitly by the live executor with a fresh operation guard. This policy never spends money, changes providers, deletes files, or bypasses owner actions.'
  };
}

export function retryableDraftJobs(plan,ledger,options={}){
  if(!plan||plan.kind!=='aivm-v2-draft-job-plan')throw Error('Draft job plan is required.');
  if(!ledger||ledger.kind!=='aivm-v2-draft-execution-ledger')throw Error('Draft execution ledger is required.');
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
    items,
    count:items.length,
    automaticRetryAllowed:false,
    note:'Advisory only. Each retry needs a new current-state operation guard and the FREE ONLY route must still be verified at execution time.'
  };
}
