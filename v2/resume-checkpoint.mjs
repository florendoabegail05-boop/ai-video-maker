import {auditProjectIntegrity} from './project-integrity.mjs';
import {generatedFreshnessSummary} from './generation-freshness.mjs';
import {publishingReadiness} from './publishing-readiness.mjs';
import {ownerActionQueue} from './owner-action-queue.mjs';

function nextSystemAction(project,{approval=null}={}){
  const integrity=auditProjectIntegrity(project);
  if(!integrity.passed){
    return {id:'fix-project-integrity',kind:'system-fix',stage:'PROJECT REPAIR',message:`Resolve ${integrity.summary.errors} project integrity error${integrity.summary.errors===1?'':'s'} before continuing.`};
  }

  const freshness=generatedFreshnessSummary(project);
  if(freshness.stale>0){
    return {id:'regenerate-stale-media',kind:'system-fix',stage:'MEDIA REFRESH',message:`Regenerate ${freshness.stale} stale unlocked generated media item${freshness.stale===1?'':'s'} while preserving locked/imported assets.`};
  }

  const readiness=publishingReadiness(project);
  const firstBlocker=readiness.items.find(item=>item.blocking);
  if(firstBlocker){
    return {id:`resolve-${firstBlocker.id}`,kind:'system-fix',stage:'BUILD / VERIFY',message:firstBlocker.message,readinessItem:firstBlocker.id};
  }

  const owner=ownerActionQueue(project,{approval});
  const firstOwner=owner.actions.find(item=>item.kind!=='system-fix');
  if(firstOwner){
    return {id:firstOwner.id,kind:firstOwner.kind,stage:firstOwner.id==='manual-publish'?'MANUAL PUBLISH':'OWNER REVIEW',message:firstOwner.message};
  }

  return {id:'no-action',kind:'none',stage:'READY',message:'No unresolved deterministic or owner action was found for the current project state.'};
}

export function resumeCheckpoint(project,{approval=null}={}){
  const integrity=auditProjectIntegrity(project);
  const freshness=generatedFreshnessSummary(project);
  const readiness=publishingReadiness(project);
  const ownerQueue=ownerActionQueue(project,{approval});
  const next=nextSystemAction(project,{approval});
  const systemWorkRemaining=!integrity.passed||freshness.stale>0||readiness.summary.blocking>0||ownerQueue.actions.some(item=>item.kind==='system-fix');
  const ownerInterruptionNeeded=!systemWorkRemaining&&ownerQueue.actions.some(item=>['owner-review','owner-approval','owner-action'].includes(item.kind));

  return {
    schema:1,
    kind:'aivm-v2-resume-checkpoint',
    projectId:project?.id||null,
    projectRevision:Number(project?.revision)||0,
    stage:next.stage,
    nextAction:next,
    systemWorkRemaining,
    ownerInterruptionNeeded,
    publishAuthorized:false,
    summary:{
      integrityErrors:integrity.summary.errors,
      integrityWarnings:integrity.summary.warnings,
      staleGeneratedMedia:freshness.stale,
      readinessBlockers:readiness.summary.blocking,
      ownerQueueItems:ownerQueue.actions.length
    },
    note:'Resume guidance only. System-fix work should be completed without interrupting the owner when safe. This checkpoint never authorizes publishing, deletion, paid calls, uploads or destructive changes.'
  };
}

export function shouldAskOwnerNow(project,options={}){
  return resumeCheckpoint(project,options).ownerInterruptionNeeded;
}
