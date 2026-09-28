import {makePublishingPackage} from './publishing.mjs';
import {makeOwnerHandoffPackage} from './owner-handoff.mjs';
import {portableProvenanceSummary} from './asset-provenance.mjs';
import {releaseApprovalFreshness,releaseApprovalPreflight,releaseSignature} from './release-approval.mjs';

function safeApproval(approval){
  if(!approval||approval.kind!=='aivm-v2-owner-release-approval')return null;
  return {
    schema:approval.schema||1,
    kind:approval.kind,
    projectId:approval.projectId||null,
    projectRevision:Number(approval.projectRevision)||0,
    releaseSignature:approval.releaseSignature||null,
    renderSignature:approval.renderSignature||null,
    approvedAt:approval.approvedAt||null,
    visualAudioApproved:approval.visualAudioApproved===true,
    rightsApproved:approval.rightsApproved===true,
    platformSettingsReviewed:approval.platformSettingsReviewed===true,
    ownerNote:approval.ownerNote||null,
    publishAuthorized:false
  };
}

export function releaseEnvelopeStatus(project,approval=null){
  const preflight=releaseApprovalPreflight(project);
  const freshness=releaseApprovalFreshness(project,approval);
  const approved=!!approval&&freshness.fresh&&approval.visualAudioApproved===true&&approval.rightsApproved===true&&approval.platformSettingsReviewed===true;
  return {
    deterministicReady:preflight.allowed,
    ownerApprovalPresent:!!approval,
    ownerApprovalFresh:freshness.fresh,
    ownerApprovalComplete:approved,
    publishAuthorized:false,
    state:!preflight.allowed?'BLOCKED':!approval?'OWNER APPROVAL REQUIRED':!freshness.fresh?'OWNER APPROVAL STALE':approved?'OWNER APPROVED — MANUAL PUBLISH ONLY':'OWNER APPROVAL INCOMPLETE',
    releaseSignature:releaseSignature(project),
    blockers:preflight.blockers,
    approvalReason:freshness.reason
  };
}

export function makeReleaseEnvelope(project,approval=null){
  const status=releaseEnvelopeStatus(project,approval);
  const publishing=makePublishingPackage(project);
  const handoff=makeOwnerHandoffPackage(project);
  const provenance=portableProvenanceSummary(project);
  return {
    schema:1,
    kind:'aivm-v2-release-envelope',
    projectId:project?.id||null,
    projectRevision:Number(project?.revision)||0,
    releaseSignature:status.releaseSignature,
    state:status.state,
    deterministicReady:status.deterministicReady,
    ownerApprovalFresh:status.ownerApprovalFresh,
    ownerApprovalComplete:status.ownerApprovalComplete,
    publishAuthorized:false,
    publishing,
    handoff,
    provenance,
    ownerApproval:safeApproval(approval),
    blockers:status.blockers,
    note:'Portable handoff package only. It never uploads, schedules or publishes, and owner approval does not authorize automatic publishing.'
  };
}
