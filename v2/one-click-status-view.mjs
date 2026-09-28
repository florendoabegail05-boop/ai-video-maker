import {inspectOneClickSession,oneClickCompletionStatus} from './one-click-orchestrator.mjs';

function pct(done,total){return total>0?Math.round((done/total)*100):0;}
function label(value){return String(value||'').replace(/[_-]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());}
function optionalEntry(entry){return entry?.plannedState==='OPTIONAL'||(!entry?.plannedState&&entry?.state==='OPTIONAL');}

export function ownerApprovalReviewDetail(reason=''){
  switch(String(reason||'')){
    case 'release-inputs-changed':
      return 'Release metadata or provenance changed after the previous approval. Review and approve the current release again.';
    case 'render-inputs-changed':
      return 'Render inputs changed after the previous approval. Review the current verified render and approve the release again.';
    case 'technical-evidence-changed':
      return 'Trusted technical evidence changed after the previous approval. Review the current verified media facts and approve again.';
    case 'technical-verification-not-current':
      return 'The previous approval no longer has current trusted machine verification. Re-establish verification before approving the release again.';
    case 'technical-verification-missing':
    case 'technical-verification-signature-missing':
      return 'The previous approval is missing the required technical-verification record. Create a new verified owner approval for the current release.';
    case 'verified-approval-required':
      return 'The older approval record does not satisfy the verified one-click release boundary. Record verified owner approval for the current release.';
    case 'owner-confirmations-incomplete':
      return 'All explicit owner release confirmations must be completed for the current release.';
    default:
      return 'Explicit verified owner release approval is required for the current release.';
  }
}

function executionProgress(entries=[]){
  const actionable=entries.filter(item=>!optionalEntry(item));
  const done=actionable.filter(item=>['DONE','SKIPPED'].includes(item.state));
  const failed=actionable.filter(item=>['FAILED','BLOCKED'].includes(item.state));
  const manual=actionable.filter(item=>item.state==='MANUAL');
  const running=actionable.filter(item=>item.state==='RUNNING');
  const pending=actionable.filter(item=>item.state==='PENDING');
  return {
    actionable:actionable.length,
    optional:entries.length-actionable.length,
    done:done.length,
    failed:failed.length,
    manual:manual.length,
    running:running.length,
    pending:pending.length,
    percent:pct(done.length,actionable.length)
  };
}

function completionNextAction(completion,execution){
  if(execution?.progress?.readyForVerification!==true)return execution?.nextAction||'WAIT';
  switch(completion?.state){
    case 'TECHNICAL VERIFICATION REQUIRED':return 'RUN_FINAL_VERIFICATION';
    case 'BLOCKED':return 'REVIEW_FINAL_OUTPUT_BLOCKERS';
    case 'RIGHTS REVIEW REQUIRED':return 'REVIEW_RIGHTS';
    case 'OWNER APPROVAL REQUIRED':return 'OWNER_REVIEW_AND_APPROVE';
    case 'OWNER APPROVED — MANUAL PUBLISH ONLY':return 'MANUAL_PUBLISH_AVAILABLE';
    default:return completion?.state||'WAIT';
  }
}

export function oneClickStatusView(project,report,session,options={}){
  const execution=inspectOneClickSession(project,report,session,{creation:options.creation||{}});
  if(!execution.valid){
    return {
      schema:1,
      kind:'aivm-v2-one-click-status-view',
      state:'REPLAN REQUIRED',
      progress:0,
      headline:'Project changed',
      detail:'The saved one-click session no longer matches the current project or executable plan. Create a fresh plan before continuing.',
      nextAction:'REPLAN',
      executionNextAction:'REPLAN',
      nextJob:null,
      sections:[],
      ownerActionRequired:false,
      publishAuthorized:false
    };
  }

  const completion=oneClickCompletionStatus(project,report,session,options);
  const entries=session?.ledger?.entries||[];
  const creationProgress=executionProgress(entries);
  const progress=creationProgress.percent;
  const nextJob=execution.nextJob;
  const rights=completion.releaseContext?.rights||null;
  const ownerApproval=completion.releaseContext?.ownerApproval||null;
  const ownerActionRequired=execution.nextAction==='OWNER_OR_MANUAL_INPUT_REQUIRED'
    ||completion.state==='RIGHTS REVIEW REQUIRED'
    ||completion.state==='OWNER APPROVAL REQUIRED'
    ||(completion.readiness?.technicallyReady===true&&rights?.blocked===true)
    ||(completion.readiness?.technicallyReady===true&&rights?.complete!==true)
    ||(completion.readiness?.technicallyReady===true&&rights?.complete===true&&ownerApproval?.current!==true);

  let verifyState='WAITING';
  let verifyDetail='Wait for required creation jobs to finish successfully';
  if(execution.progress.readyForVerification===true){
    if(completion.readiness?.technicallyReady===true){
      verifyState='DONE';
      verifyDetail='Current render passed the configured technical verification gate.';
    }else if(completion.readiness?.technicalHardBlocked===true){
      verifyState='BLOCKED';
      verifyDetail='Current evidence shows a known technical output problem that must be fixed.';
    }else{
      verifyState='REQUIRED';
      verifyDetail='Trusted current final-media evidence is still required.';
    }
  }else if(execution.nextAction==='REVIEW_BLOCKERS'){
    verifyDetail='Resolve creation blockers before final verification.';
  }else if(execution.nextAction==='OWNER_OR_MANUAL_INPUT_REQUIRED'){
    verifyDetail='Complete the required manual/import step before final verification.';
  }

  let reviewState='WAITING';
  let reviewDetail='Available after technical verification';
  if(completion.readiness){
    if(completion.manualPublishEligible===true){
      reviewState='DONE';
      reviewDetail='Rights and current owner approval are complete. Publishing still remains manual.';
    }else if(completion.readiness?.technicallyReady!==true){
      reviewState='WAITING';
      reviewDetail='Complete technical verification before release review.';
    }else if(rights?.blocked===true){
      reviewState='BLOCKED';
      reviewDetail='Rights review is blocked.';
    }else if(rights?.complete!==true){
      reviewState='REQUIRED';
      reviewDetail='Review asset provenance, rights and required credits.';
    }else if(ownerApproval?.current!==true){
      reviewState='REQUIRED';
      reviewDetail=ownerApprovalReviewDetail(ownerApproval?.reason);
    }else{
      reviewState='PENDING';
      reviewDetail='Owner release review is not complete.';
    }
  }

  const planJobs=Number(session.plan?.summary?.jobs);
  const planCount=Number.isFinite(planJobs)?planJobs:entries.length;
  const sections=[
    {id:'plan',label:'Plan',state:'DONE',detail:`${planCount} jobs prepared`},
    {id:'create',label:'Create',state:execution.nextAction==='REVIEW_BLOCKERS'?'BLOCKED':execution.nextAction==='OWNER_OR_MANUAL_INPUT_REQUIRED'?'MANUAL':execution.progress.readyForVerification?'DONE':'IN PROGRESS',detail:`${creationProgress.done}/${creationProgress.actionable} required jobs complete`},
    {id:'verify',label:'Verify',state:verifyState,detail:verifyDetail},
    {id:'review',label:'Owner Review',state:reviewState,detail:reviewDetail}
  ];

  let headline='Creating video';
  let detail=nextJob?`${label(nextJob.type)}${nextJob.sceneId?` for ${nextJob.sceneId}`:''} is ready next.`:'Waiting for the next safe step.';
  if(execution.nextAction==='OWNER_OR_MANUAL_INPUT_REQUIRED'){
    headline='Manual input needed';
    detail='A required manual/import step is blocking automatic progress.';
  }else if(execution.nextAction==='REVIEW_BLOCKERS'){
    headline='Creation blocked';
    detail='One or more creation jobs are failed or blocked and must be resolved before final verification.';
  }else if(execution.progress.readyForVerification===true){
    if(completion.state==='TECHNICAL VERIFICATION REQUIRED'){
      headline='Final verification required';
      detail='Creation is complete, but trusted current final-media evidence is still missing.';
    }else if(completion.state==='BLOCKED'){
      headline='Final output blocked';
      detail='A known technical or rights blocker must be resolved before owner approval.';
    }else if(completion.state==='RIGHTS REVIEW REQUIRED'){
      headline='Rights review required';
      detail='Technical verification passed. Review current asset provenance, rights and credits.';
    }else if(completion.state==='OWNER APPROVAL REQUIRED'){
      headline='Owner approval required';
      detail=ownerApprovalReviewDetail(ownerApproval?.reason);
    }else if(completion.state==='OWNER APPROVED — MANUAL PUBLISH ONLY'){
      headline='Ready for manual publish';
      detail='Current technical, rights and owner-review requirements are complete. Publishing remains a manual owner action.';
    }else{
      headline=label(completion.state);
      detail=completion.readiness?.note||'Creation jobs are complete; finish verification and review requirements.';
    }
  }

  return {
    schema:1,
    kind:'aivm-v2-one-click-status-view',
    state:completion.state,
    progress,
    creationProgress,
    headline,
    detail,
    nextAction:completionNextAction(completion,execution),
    executionNextAction:execution.nextAction,
    nextJob,
    sections,
    ownerActionRequired,
    rightsSummary:rights?.summary||null,
    ownerApprovalState:ownerApproval?{current:ownerApproval.current===true,status:ownerApproval.status||null,reason:ownerApproval.reason||null}:null,
    manualPublishEligible:completion.manualPublishEligible===true,
    automaticExecutionAllowed:false,
    automaticPublishingAllowed:false,
    publishAuthorized:false,
    note:'Presentation model only. Optional jobs stay optional even after they are skipped/resolved. This view does not execute jobs, change files, enable paid providers, upload private media, or publish.'
  };
}
