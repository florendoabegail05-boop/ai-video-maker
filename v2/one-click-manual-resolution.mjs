import {buildDraftJobPlan} from './draft-job-plan.mjs';
import {draftPlanFingerprint} from './draft-plan-fingerprint.mjs';
import {updateDraftJobState} from './draft-execution-ledger.mjs';
import {inspectOneClickSession} from './one-click-orchestrator.mjs';
import {reusableAsset,selectedProjectAudio} from './core.mjs';

function stableStringify(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stableStringify(value[key])).join(',')+'}';
}

function hash32(text){
  let hash=0x811c9dc5;
  for(let i=0;i<text.length;i++){
    hash^=text.charCodeAt(i);
    hash=Math.imul(hash,0x01000193)>>>0;
  }
  return hash.toString(16).padStart(8,'0');
}

function clean(value,max=8000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

function resumeJobDescriptor(job={}){
  return {
    id:clean(job.id,160)||null,
    type:clean(job.type,80)||null,
    sceneId:clean(job.sceneId,160)||null,
    sceneOrder:Number(job.sceneOrder)||0,
    state:clean(job.state,80)||null,
    route:clean(job.route,160)||null,
    prompt:clean(job.prompt,4000),
    directorBrief:clean(job.directorBrief,8000),
    characterReferenceIds:[...(job.characterReferenceIds||[])],
    worldReferenceIds:[...(job.worldReferenceIds||[])],
    generatedRouteAvailable:job.generatedRouteAvailable===true,
    destructive:job.destructive===true
  };
}

export function manualResumePlanFingerprint(plan){
  if(!plan||plan.kind!=='aivm-v2-draft-job-plan')throw Error('Draft job plan is required.');
  return `mrf1-${hash32(stableStringify({
    projectId:plan.projectId||null,
    costMode:plan.costMode||null,
    jobs:(plan.jobs||[]).map(resumeJobDescriptor)
  }))}`;
}

export function rebaseOneClickSessionForManualMedia(project,report,session,{creation={}}={}){
  if(!project?.id)return {rebased:false,reason:'project-missing',nextAction:'REPLAN',session};
  if(!session||session.kind!=='aivm-v2-one-click-session')throw Error('One-click session is required.');
  if(session.projectId!==project.id)return {rebased:false,reason:'project-changed',nextAction:'REPLAN',session};
  if((session.ledger?.entries||[]).some(entry=>entry.state==='RUNNING')){
    return {rebased:false,reason:'job-still-running',nextAction:'WAIT',session,publishAuthorized:false};
  }

  const currentPlan=buildDraftJobPlan(project,report,creation);
  const savedResume=manualResumePlanFingerprint(session.plan);
  const currentResume=manualResumePlanFingerprint(currentPlan);
  if(savedResume!==currentResume){
    return {
      rebased:false,
      reason:'manual-resume-inputs-changed',
      nextAction:'REPLAN',
      savedResumeFingerprint:savedResume,
      currentResumeFingerprint:currentResume,
      session,
      publishAuthorized:false,
      note:'Manual resume is allowed only when executable routes, prompts, director guidance and reference IDs still match. Story/generation input changes require a fresh plan.'
    };
  }

  const currentIds=new Set((currentPlan.jobs||[]).map(job=>job.id));
  const savedIds=new Set((session.ledger?.entries||[]).map(entry=>entry.jobId));
  if(currentIds.size!==savedIds.size||[...currentIds].some(id=>!savedIds.has(id))){
    return {rebased:false,reason:'manual-resume-job-set-changed',nextAction:'REPLAN',session,publishAuthorized:false};
  }

  const revision=Number(project.revision)||0;
  const ledger={...session.ledger,projectRevision:revision};
  const rebasedSession={
    ...session,
    projectRevision:revision,
    plan:currentPlan,
    planFingerprint:draftPlanFingerprint(currentPlan),
    ledger
  };
  return {
    rebased:true,
    reason:'manual-media-only-rebase',
    nextAction:'RESOLVE_MANUAL_JOB',
    session:rebasedSession,
    publishAuthorized:false,
    note:'Session metadata was rebased only after confirming the executable plan and generation-relevant job inputs did not change. Existing job progress is preserved.'
  };
}

function manualEvidence(project,job){
  if(job.type==='image'){
    const image=reusableAsset(project,job.sceneId,'image');
    if(image)return {satisfied:true,mode:'image',assetIds:[image.id],message:'Existing local scene image satisfies the manual image requirement.'};
    const video=reusableAsset(project,job.sceneId,'video');
    if(video)return {satisfied:true,mode:'video',assetIds:[video.id],message:'Existing local scene video satisfies scene visuals; image generation and generated motion are unnecessary.'};
    return {satisfied:false,mode:null,assetIds:[],message:'Import or keep a local image/video for this scene before resolving the manual image step.'};
  }
  if(job.type==='audio'){
    const assets=[selectedProjectAudio(project,'voice'),selectedProjectAudio(project,'music')].filter(Boolean);
    if(assets.length)return {satisfied:true,mode:'audio',assetIds:assets.map(asset=>asset.id),message:'Imported project audio satisfies the manual audio requirement.'};
    return {satisfied:false,mode:null,assetIds:[],message:'Import local voice or music before resolving the manual audio step.'};
  }
  return {satisfied:false,mode:null,assetIds:[],message:'This manual job type has no evidence-based resolver.'};
}

export function resolveManualOneClickJob(project,report,session,jobId,options={}){
  if(options.explicitResolution!==true){
    return {
      resolved:false,
      reason:'explicit-resolution-required',
      nextAction:'OWNER_OR_MANUAL_INPUT_REQUIRED',
      session,
      publishAuthorized:false,
      note:'Manual steps are never silently marked complete. Resolve only after the local/imported media is actually present in the current project.'
    };
  }

  let working=session;
  if(Number(session?.projectRevision)!==Number(project?.revision||0)){
    const rebased=rebaseOneClickSessionForManualMedia(project,report,session,{creation:options.creation||{}});
    if(!rebased.rebased)return {...rebased,resolved:false};
    working=rebased.session;
  }else{
    const currentPlan=buildDraftJobPlan(project,report,options.creation||{});
    if(manualResumePlanFingerprint(working.plan)!==manualResumePlanFingerprint(currentPlan)){
      return {resolved:false,reason:'manual-resume-inputs-changed',nextAction:'REPLAN',session:working,publishAuthorized:false};
    }
  }

  const job=(working.plan?.jobs||[]).find(item=>item.id===jobId);
  const entry=(working.ledger?.entries||[]).find(item=>item.jobId===jobId);
  if(!job||!entry)return {resolved:false,reason:'manual-job-missing',nextAction:'REPLAN',session:working,publishAuthorized:false};
  if(entry.state!=='MANUAL')return {resolved:false,reason:'job-not-manual',nextAction:'REVIEW_BLOCKERS',session:working,publishAuthorized:false};

  const evidence=manualEvidence(project,job);
  if(!evidence.satisfied){
    return {
      resolved:false,
      reason:'manual-evidence-missing',
      nextAction:'OWNER_OR_MANUAL_INPUT_REQUIRED',
      evidence,
      session:working,
      publishAuthorized:false
    };
  }

  let ledger=working.ledger;
  const resolvedJobs=[];
  if(job.type==='image'&&evidence.mode==='video'){
    ledger=updateDraftJobState(ledger,job.id,'SKIPPED',{message:evidence.message,resultAssetIds:evidence.assetIds});
    resolvedJobs.push(job.id);
    const motionId=`motion:${job.sceneId}`;
    const motionEntry=(ledger.entries||[]).find(item=>item.jobId===motionId);
    if(motionEntry&&['PENDING','OPTIONAL','MANUAL'].includes(motionEntry.state)){
      ledger=updateDraftJobState(ledger,motionId,'SKIPPED',{message:'Existing local scene video is reused; generated motion is skipped.',resultAssetIds:evidence.assetIds});
      resolvedJobs.push(motionId);
    }
  }else{
    ledger=updateDraftJobState(ledger,job.id,'DONE',{message:evidence.message,resultAssetIds:evidence.assetIds});
    resolvedJobs.push(job.id);
  }

  const updatedSession={...working,ledger};
  const execution=inspectOneClickSession(project,report,updatedSession,{creation:options.creation||{}});
  return {
    resolved:true,
    reason:'manual-evidence-accepted',
    mode:evidence.mode,
    resultAssetIds:evidence.assetIds,
    resolvedJobs,
    nextAction:execution.valid?execution.nextAction:'REPLAN',
    nextJob:execution.valid?execution.nextJob:null,
    session:updatedSession,
    execution,
    destructiveReplacementAllowed:false,
    automaticPublishingAllowed:false,
    publishAuthorized:false,
    note:'Manual resolution changes execution metadata only. It reuses already-present local project media and never deletes, overwrites, uploads, purchases or publishes anything.'
  };
}
