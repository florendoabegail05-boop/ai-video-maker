import {finalVerificationGate} from './final-verification-gate.mjs';

function state(label,ok,blocking=false,details={}){return{label,ok:ok===true,blocking:blocking===true,...details};}

export function outputReadinessSummary(project,factSets=[],options={}){
  const technical=finalVerificationGate(project,factSets,options.technical||{});
  const rights=options.rights||null;
  const ownerApproval=options.ownerApproval||null;

  const rightsKnown=rights?.complete===true||rights?.status==='complete';
  const rightsBlocked=rights?.blocked===true||rights?.status==='blocked';
  const approvalCurrent=ownerApproval?.current===true||ownerApproval?.status==='approved-current';

  const checks=[
    state('technical-verification',technical.passed,technical.passed!==true,{blockers:technical.blockers||[]}),
    rightsBlocked
      ?state('rights-review',false,true,{reason:'rights-blocked'})
      :rightsKnown
        ?state('rights-review',true,false,{reason:'rights-complete'})
        :state('rights-review',false,false,{reason:'rights-not-yet-confirmed'}),
    approvalCurrent
      ?state('owner-approval',true,false,{reason:'owner-approval-current'})
      :state('owner-approval',false,false,{reason:'owner-approval-required'})
  ];

  const blockers=checks.filter(item=>item.blocking).map(item=>item.label);
  const remaining=checks.filter(item=>!item.ok).map(item=>item.label);
  const technicallyReady=technical.passed===true;
  const readyForOwnerReview=technicallyReady&&blockers.length===0;
  const manualPublishEligible=readyForOwnerReview&&rightsKnown&&approvalCurrent;

  return {
    schema:1,
    kind:'aivm-v2-output-readiness-summary',
    projectId:project?.id||null,
    renderSignature:technical.renderSignature||null,
    technicallyReady,
    readyForOwnerReview,
    manualPublishEligible,
    checks,
    blockers,
    remaining,
    technical,
    publishAuthorized:false,
    automaticPublishingAllowed:false,
    note:'This summary keeps technical verification, rights review and owner approval separate. Even when all are satisfied, publishing remains a manual owner-controlled action.'
  };
}

export function outputReadinessLabel(summary){
  if(!summary||summary.kind!=='aivm-v2-output-readiness-summary')return 'UNKNOWN';
  if(summary.blockers?.length)return 'BLOCKED';
  if(!summary.technicallyReady)return 'TECHNICAL VERIFICATION REQUIRED';
  if(summary.remaining?.includes('rights-review'))return 'RIGHTS REVIEW REQUIRED';
  if(summary.remaining?.includes('owner-approval'))return 'OWNER APPROVAL REQUIRED';
  if(summary.manualPublishEligible)return 'OWNER APPROVED — MANUAL PUBLISH ONLY';
  return 'OWNER REVIEW REQUIRED';
}
