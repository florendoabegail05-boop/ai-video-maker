import {releaseEnvelopeStatus} from './release-envelope.mjs';
import {provenanceAudit} from './asset-provenance.mjs';
import {backupPreflight} from './backup-audit.mjs';
import {storageCleanupPlan} from './storage-cleanup-plan.mjs';

function action(id,kind,message,blocking=false,details={}){
  return {id,kind,message,blocking,...details};
}

export function ownerActionQueue(project,{approval=null,includeBackup=false,includeCleanup=false}={}){
  const actions=[];
  const release=releaseEnvelopeStatus(project,approval);
  const provenance=provenanceAudit(project);

  if(provenance.summary.needingReview>0){
    actions.push(action('review-rights','owner-review',`${provenance.summary.needingReview} asset rights/source record${provenance.summary.needingReview===1?'':'s'} need owner review.`,true,{count:provenance.summary.needingReview}));
  }

  if(release.state==='OWNER APPROVAL REQUIRED'){
    actions.push(action('approve-release','owner-approval','Review final visual/audio output, rights/credits and platform settings, then record owner release approval.',true));
  }else if(release.state==='OWNER APPROVAL STALE'){
    actions.push(action('refresh-release-approval','owner-approval','The earlier owner approval is stale because release inputs changed. Re-review the current release before publishing.',true));
  }else if(release.state==='OWNER APPROVAL INCOMPLETE'){
    actions.push(action('complete-release-approval','owner-approval','Complete all required owner approval checks for the current release.',true));
  }else if(release.state==='BLOCKED'){
    actions.push(action('resolve-release-blockers','system-fix','Release checks still have blocking items. Resolve deterministic blockers before asking the owner to approve.',false,{blockers:[...release.blockers]}));
  }else if(release.state==='OWNER APPROVED — MANUAL PUBLISH ONLY'){
    actions.push(action('manual-publish','owner-action','Release is owner-approved for review purposes. Publishing remains a separate manual owner action.',false));
  }

  if(includeBackup){
    const backup=backupPreflight(project);
    if(!backup.allowed){
      actions.push(action('fix-backup-preflight','system-fix','Complete backup preflight has blocking errors. Fix those before creating a private recovery ZIP.',false,{errors:backup.summary.errors,warnings:backup.summary.warnings}));
    }else if(backup.summary.warnings>0){
      actions.push(action('review-backup-warnings','owner-review',`Complete backup can proceed, with ${backup.summary.warnings} warning${backup.summary.warnings===1?'':'s'} to review.`,false));
    }
  }

  if(includeCleanup){
    const cleanup=storageCleanupPlan(project);
    if(cleanup.reviewCandidates>0){
      actions.push(action('review-storage-cleanup','owner-review',`${cleanup.reviewCandidates} stale derived media item${cleanup.reviewCandidates===1?' is':'s are'} optional cleanup candidates. Nothing will be deleted automatically.`,false,{candidateIds:cleanup.items.filter(item=>item.candidateForOwnerReview).map(item=>item.assetId),estimatedReviewBytes:cleanup.estimatedReviewBytes}));
    }
  }

  const blocking=actions.filter(item=>item.blocking);
  return {
    schema:1,
    kind:'aivm-v2-owner-action-queue',
    projectId:project?.id||null,
    projectRevision:Number(project?.revision)||0,
    releaseState:release.state,
    publishAuthorized:false,
    actions,
    blockingCount:blocking.length,
    ownerActionCount:actions.filter(item=>item.kind==='owner-action'||item.kind==='owner-approval'||item.kind==='owner-review').length,
    nextAction:actions[0]||null,
    note:'This queue minimizes owner interruptions. System-fix items should be handled by the app/Work where possible. Nothing here authorizes automatic publishing, deletion, paid calls, uploads or destructive changes.'
  };
}

export function needsOwnerInterruption(project,options={}){
  const queue=ownerActionQueue(project,options);
  return queue.actions.some(item=>item.kind==='owner-approval'||item.kind==='owner-review'||item.kind==='owner-action');
}
