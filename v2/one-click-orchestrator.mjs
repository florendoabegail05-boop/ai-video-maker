import {buildDraftJobPlan} from './draft-job-plan.mjs';
import {createDraftExecutionLedger,draftExecutionSummary} from './draft-execution-ledger.mjs';
import {schedulableDraftJobs} from './job-dependency-scheduler.mjs';
import {draftPlanFingerprint} from './draft-plan-fingerprint.mjs';
import {currentReleaseContext} from './current-release-context.mjs';
import {outputReadinessSummary,outputReadinessLabel} from './output-readiness-summary.mjs';

function compactJob(plan,entry){
  const job=(plan.jobs||[]).find(item=>item.id===entry?.jobId)||null;
  return job?{
    id:job.id,
    type:job.type,
    sceneId:job.sceneId||null,
    state:entry?.state||job.state,
    route:job.route||null,
    message:entry?.message||job.message||null
  }:null;
}

export function createOneClickSession(project,report,options={}){
  if(!project?.id)throw Error('Project is required.');
  const plan=buildDraftJobPlan(project,report,options.creation||{});
  const ledger=createDraftExecutionLedger(project,report,options.creation||{});
  return {
    schema:1,
    kind:'aivm-v2-one-click-session',
    projectId:project.id,
    projectRevision:Number(project.revision)||0,
    costMode:'FREE ONLY',
    plan,
    planFingerprint:draftPlanFingerprint(plan),
    ledger,
    started:false,
    automaticPublishingAllowed:false,
    publishAuthorized:false,
    note:'One-click session metadata only. Live execution must still start each job through guarded FREE ONLY routes. No paid provider, upload, delete, destructive replacement or publication is authorized here.'
  };
}

export function inspectOneClickSession(project,report,session,options={}){
  if(!session||session.kind!=='aivm-v2-one-click-session')throw Error('One-click session is required.');
  if(session.projectId!==project?.id)return {valid:false,reason:'project-changed',nextAction:'REPLAN'};
  if(Number(session.projectRevision)!==Number(project.revision||0))return {valid:false,reason:'project-revision-changed',nextAction:'REPLAN'};

  const plan=buildDraftJobPlan(project,report,options.creation||{});
  const savedFingerprint=session.planFingerprint||draftPlanFingerprint(session.plan);
  const currentFingerprint=draftPlanFingerprint(plan);
  if(savedFingerprint!==currentFingerprint){
    return {
      valid:false,
      reason:'execution-plan-changed',
      nextAction:'REPLAN',
      savedPlanFingerprint:savedFingerprint,
      currentPlanFingerprint:currentFingerprint,
      publishAuthorized:false,
      note:'Provider/capability or creation-option drift changed the executable plan. Build a fresh one-click session instead of continuing stale routes.'
    };
  }

  const scheduled=schedulableDraftJobs(plan,session.ledger);
  const progress=draftExecutionSummary(session.ledger);
  const readyJobs=scheduled.ready.map(item=>{
    const entry=(session.ledger.entries||[]).find(row=>row.jobId===item.jobId);
    return compactJob(plan,entry);
  }).filter(Boolean);

  let nextAction='WAIT';
  if(readyJobs.length)nextAction='RUN_NEXT_READY_JOB';
  else if(scheduled.manual.length)nextAction='OWNER_OR_MANUAL_INPUT_REQUIRED';
  else if(scheduled.blocked.length)nextAction='REVIEW_BLOCKERS';
  else if(progress.complete)nextAction='VERIFY_OUTPUT';

  return {
    valid:true,
    reason:'current',
    projectId:project.id,
    planFingerprint:currentFingerprint,
    nextAction,
    nextJob:readyJobs[0]||null,
    readyJobs,
    blocked:scheduled.blocked,
    manual:scheduled.manual,
    waiting:scheduled.waiting,
    progress,
    automaticExecutionAllowed:false,
    publishAuthorized:false
  };
}

export function oneClickCompletionStatus(project,report,session,{factSets=[],technical={},ownerReleaseApproval=null,creation={}}={}){
  const execution=inspectOneClickSession(project,report,session,{creation});
  if(!execution.valid)return {
    schema:1,
    kind:'aivm-v2-one-click-completion-status',
    state:'REPLAN REQUIRED',
    execution,
    readiness:null,
    publishAuthorized:false
  };

  if(!execution.progress.complete||execution.nextAction!=='VERIFY_OUTPUT'){
    return {
      schema:1,
      kind:'aivm-v2-one-click-completion-status',
      state:execution.nextAction,
      execution,
      readiness:null,
      manualPublishEligible:false,
      automaticPublishingAllowed:false,
      publishAuthorized:false,
      note:'Output readiness is evaluated only after all required creation jobs finish successfully enough to reach VERIFY_OUTPUT. Failed, blocked or manual jobs must be resolved first.'
    };
  }

  const releaseContext=currentReleaseContext(project,{ownerReleaseApproval});
  const readiness=outputReadinessSummary(project,factSets,{
    technical,
    rights:releaseContext.rights,
    ownerApproval:releaseContext.ownerApproval
  });
  return {
    schema:1,
    kind:'aivm-v2-one-click-completion-status',
    state:outputReadinessLabel(readiness),
    execution,
    readiness,
    releaseContext,
    manualPublishEligible:readiness.manualPublishEligible===true,
    automaticPublishingAllowed:false,
    publishAuthorized:false,
    note:'Finishing all required creation jobs does not equal publish approval. Rights readiness is derived from current project provenance, and owner approval counts only when a complete release-approval record is fresh for the current release inputs. Publishing remains manual.'
  };
}
