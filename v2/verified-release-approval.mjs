import {provenanceAudit} from './asset-provenance.mjs';
import {finalVerificationGate} from './final-verification-gate.mjs';
import {publishingDetails} from './publishing.mjs';
import {releaseSignature} from './release-approval.mjs';
import {renderSignature} from './render-signature.mjs';

function clean(value,max=300){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
function machineVerified(reconciliation,field){
  const fact=reconciliation?.selected?.[field];
  return !!fact
    &&['ffprobe','bridge'].includes(fact.source)
    &&fact.trusted===true
    &&fact.stale!==true
    &&fact.value===true;
}
function approvalFlagsComplete(approval){
  return approval?.visualAudioApproved===true
    &&approval?.rightsApproved===true
    &&approval?.platformSettingsReviewed===true;
}

export function verifiedReleaseApprovalPreflight(project,factSets=[],options={}){
  if(!project?.id)throw Error('Project is required.');
  const sets=Array.isArray(factSets)?factSets:[factSets];
  const technical=finalVerificationGate(project,sets,options.technical||{});
  const provenance=provenanceAudit(project);
  const publishing=publishingDetails(project);
  const titleReady=String(publishing?.title||'').trim().length>0;
  const machineCoreVerified=['width','height','duration'].every(field=>machineVerified(technical.reconciliation,field));
  const blockers=[];

  if(technical.passed!==true)blockers.push('Current final output has not passed the configured technical verification gate.');
  if(!machineCoreVerified)blockers.push('Current width, height and duration must be established by FFprobe/bridge-class evidence before owner release approval.');
  if(provenance.complete!==true)blockers.push(`${provenance.summary.needingReview} asset rights/source record${provenance.summary.needingReview===1?'':'s'} still require review.`);
  if(!titleReady)blockers.push('A publishing title is required before owner release approval.');

  return {
    schema:1,
    kind:'aivm-v2-verified-release-approval-preflight',
    projectId:project.id,
    allowed:blockers.length===0,
    blockers,
    releaseSignature:releaseSignature(project),
    renderSignature:renderSignature(project),
    technical:{
      passed:technical.passed===true,
      machineCoreVerified,
      blockers:[...(technical.blockers||[])],
      blockerReasons:[...(technical.blockerReasons||[])]
    },
    provenanceSummary:provenance.summary,
    publishing:{titleReady},
    publishAuthorized:false,
    automaticPublishingAllowed:false,
    note:'Owner approval preflight requires current technical verification, FFprobe/bridge-class core media facts, complete project provenance and a publishing title. Passing preflight does not publish anything.'
  };
}

export function makeVerifiedOwnerReleaseApproval(project,factSets=[],values={},options={}){
  const preflight=verifiedReleaseApprovalPreflight(project,factSets,options);
  if(!preflight.allowed)throw Error(preflight.blockers.join(' '));
  if(values.visualAudioApproved!==true)throw Error('Owner visual/audio approval is required.');
  if(values.rightsApproved!==true)throw Error('Owner rights/credits approval is required.');
  if(values.platformSettingsReviewed!==true)throw Error('Owner platform-settings review is required.');
  const approvedAt=new Date().toISOString();
  return {
    schema:1,
    kind:'aivm-v2-verified-owner-release-approval',
    projectId:project.id,
    projectRevision:Number(project.revision)||0,
    releaseSignature:preflight.releaseSignature,
    renderSignature:preflight.renderSignature,
    approvedAt,
    technicalVerifiedAtApproval:true,
    technicalVerificationSource:'current-ffprobe-or-bridge-core-facts',
    visualAudioApproved:true,
    rightsApproved:true,
    platformSettingsReviewed:true,
    ownerNote:clean(values.ownerNote,300)||null,
    publishAuthorized:false,
    automaticPublishingAllowed:false,
    note:'Verified owner review record only. It is bound to the current release/render signature and trusted machine-class core media facts. It never uploads, schedules or publishes automatically.'
  };
}

export function verifiedReleaseApprovalFreshness(project,approval){
  if(!approval||approval.kind!=='aivm-v2-verified-owner-release-approval'||approval.projectId!==project?.id){
    return {fresh:false,reason:approval?.kind==='aivm-v2-owner-release-approval'?'verified-approval-required':'missing-or-invalid'};
  }
  if(approval.technicalVerifiedAtApproval!==true)return {fresh:false,reason:'technical-verification-missing'};
  if(!approvalFlagsComplete(approval))return {fresh:false,reason:'owner-confirmations-incomplete'};
  const currentRelease=releaseSignature(project);
  if(approval.releaseSignature!==currentRelease){
    return {fresh:false,reason:'release-inputs-changed',currentSignature:currentRelease,approvedSignature:approval.releaseSignature||null};
  }
  const currentRender=renderSignature(project);
  if(approval.renderSignature!==currentRender){
    return {fresh:false,reason:'render-inputs-changed',currentRenderSignature:currentRender,approvedRenderSignature:approval.renderSignature||null};
  }
  return {
    fresh:true,
    reason:'match',
    currentSignature:currentRelease,
    approvedSignature:approval.releaseSignature,
    currentRenderSignature:currentRender,
    approvedRenderSignature:approval.renderSignature
  };
}
