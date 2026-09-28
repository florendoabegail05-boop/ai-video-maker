import {provenanceAudit} from './asset-provenance.mjs';
import {releaseApprovalFreshness} from './release-approval.mjs';

function approvalFlagsComplete(approval){
  return approval?.visualAudioApproved===true
    &&approval?.rightsApproved===true
    &&approval?.platformSettingsReviewed===true;
}

export function currentReleaseContext(project,{ownerReleaseApproval=null}={}){
  if(!project?.id)throw Error('Project is required.');
  const provenance=provenanceAudit(project);
  const freshness=ownerReleaseApproval
    ?releaseApprovalFreshness(project,ownerReleaseApproval)
    :{fresh:false,reason:'missing-or-invalid'};
  const approvalValid=ownerReleaseApproval?.kind==='aivm-v2-owner-release-approval'
    &&ownerReleaseApproval.projectId===project.id
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
      reason:approvalCurrent?'release-approval-current':freshness.reason||'approval-required',
      approvedAt:approvalCurrent?ownerReleaseApproval.approvedAt||null:null,
      releaseSignature:approvalCurrent?ownerReleaseApproval.releaseSignature||null:null,
      renderSignature:approvalCurrent?ownerReleaseApproval.renderSignature||null:null,
      source:'owner-release-approval'
    },
    approvalFreshness:freshness,
    provenanceSummary:provenance.summary,
    publishAuthorized:false,
    automaticPublishingAllowed:false,
    note:'Rights readiness comes from the project provenance audit, and owner approval counts only when a complete owner release-approval record is still fresh for the current release inputs. This context never publishes or authorizes automatic publishing.'
  };
}
