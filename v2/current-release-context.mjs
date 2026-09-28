import {provenanceAudit} from './asset-provenance.mjs';
import {verifiedReleaseApprovalFreshness} from './verified-release-approval.mjs';

function approvalFlagsComplete(approval){
  return approval?.visualAudioApproved===true
    &&approval?.rightsApproved===true
    &&approval?.platformSettingsReviewed===true;
}

export function currentReleaseContext(project,{ownerReleaseApproval=null,factSets=[],technical={}}={}){
  if(!project?.id)throw Error('Project is required.');
  const provenance=provenanceAudit(project);
  const freshness=ownerReleaseApproval
    ?verifiedReleaseApprovalFreshness(project,ownerReleaseApproval,factSets,{technical})
    :{fresh:false,reason:'missing-or-invalid'};
  const approvalValid=ownerReleaseApproval?.kind==='aivm-v2-verified-owner-release-approval'
    &&ownerReleaseApproval.projectId===project.id
    &&ownerReleaseApproval.technicalVerifiedAtApproval===true
    &&typeof ownerReleaseApproval.technicalVerificationSignature==='string'
    &&ownerReleaseApproval.technicalVerificationSignature.length>0
    &&approvalFlagsComplete(ownerReleaseApproval);
  const approvalCurrent=approvalValid&&freshness.fresh===true;

  return {
    schema:1,
    kind:'aivm-v2-current-release-context',
    projectId:project.id,
    rights:{
      complete:provenance.complete===true,
      status:provenance.complete===true?'complete':'review-required',
      blocked:false,
      summary:provenance.summary,
      source:'project-provenance-audit'
    },
    ownerApproval:{
      current:approvalCurrent,
      status:approvalCurrent?'approved-current':'approval-required',
      reason:approvalCurrent?'verified-release-approval-current':freshness.reason||'approval-required',
      approvedAt:approvalCurrent?ownerReleaseApproval.approvedAt||null:null,
      releaseSignature:approvalCurrent?ownerReleaseApproval.releaseSignature||null:null,
      renderSignature:approvalCurrent?ownerReleaseApproval.renderSignature||null:null,
      technicalVerificationSignature:approvalCurrent?ownerReleaseApproval.technicalVerificationSignature||null:null,
      technicalVerifiedAtApproval:approvalCurrent,
      source:'verified-owner-release-approval'
    },
    approvalFreshness:freshness,
    provenanceSummary:provenance.summary,
    publishAuthorized:false,
    automaticPublishingAllowed:false,
    note:'Rights readiness comes from current project provenance. One-click owner approval counts only when a verified owner release-approval record remains bound to the current release inputs and the current trusted technical-evidence stamp. Legacy records, stale evidence or arbitrary approval booleans do not satisfy this boundary.'
  };
}
