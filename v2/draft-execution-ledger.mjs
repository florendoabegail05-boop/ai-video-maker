import {buildDraftJobPlan} from './draft-job-plan.mjs';

const TERMINAL=new Set(['DONE','SKIPPED','FAILED','BLOCKED','MANUAL']);
const ACTIVE=new Set(['PENDING','RUNNING','DONE','SKIPPED','FAILED','BLOCKED','MANUAL','OPTIONAL']);

function now(){return new Date().toISOString();}
function normalizeState(value){const state=String(value||'PENDING').toUpperCase();if(!ACTIVE.has(state))throw Error('Unknown draft job execution state.');return state;}
function jobMap(plan){return new Map(plan.jobs.map(job=>[job.id,job]));}
function optionalEntry(entry){return entry?.plannedState==='OPTIONAL'||(!entry?.plannedState&&entry?.state==='OPTIONAL');}
function normalizedResultAssetIds(values){return [...new Set((Array.isArray(values)?values:[]).filter(Boolean))];}

export function createDraftExecutionLedger(project,report,options={}){
  const plan=buildDraftJobPlan(project,report,options);
  const createdAt=now();
  return {
    schema:1,
    kind:'aivm-v2-draft-execution-ledger',
    projectId:project.id,
    projectRevision:Number(project.revision)||0,
    planSummary:plan.summary,
    createdAt,
    updatedAt:createdAt,
    entries:plan.jobs.map(job=>({
      jobId:job.id,
      type:job.type,
      plannedState:job.state,
      state:job.state==='BLOCKED'?'BLOCKED':job.state==='MANUAL'?'MANUAL':job.state==='OPTIONAL'?'OPTIONAL':'PENDING',
      attempts:0,
      startedAt:null,
      finishedAt:null,
      resultAssetIds:[],
      message:null,
      stale:false
    })),
    automaticPublishingAllowed:false,
    destructiveRecoveryAllowed:false,
    note:'Progress metadata only. It does not execute providers, delete files, overwrite locked/imported media, publish, upload, or enable paid routes.'
  };
}

export function validateDraftExecutionLedger(project,report,ledger,options={}){
  if(!ledger||ledger.kind!=='aivm-v2-draft-execution-ledger')return {valid:false,reason:'invalid-ledger'};
  if(ledger.projectId!==project?.id)return {valid:false,reason:'project-changed'};
  const plan=buildDraftJobPlan(project,report,options);
  const current=jobMap(plan),saved=new Map((ledger.entries||[]).map(entry=>[entry.jobId,entry]));
  const missing=[...current.keys()].filter(id=>!saved.has(id));
  const obsolete=[...saved.keys()].filter(id=>!current.has(id));
  const revisionChanged=Number(ledger.projectRevision)!==Number(project.revision||0);
  return {valid:missing.length===0&&obsolete.length===0&&!revisionChanged,reason:revisionChanged?'project-revision-changed':missing.length?'jobs-added':obsolete.length?'jobs-removed':'match',missing,obsolete,revisionChanged};
}

export function updateDraftJobState(ledger,jobId,state,options={}){
  if(!ledger||ledger.kind!=='aivm-v2-draft-execution-ledger')throw Error('Draft execution ledger is required.');
  state=normalizeState(state);
  const exists=(ledger.entries||[]).some(entry=>entry.jobId===jobId);
  if(!exists)throw Error('Draft job is not in this ledger.');
  const message=options?.message??null;
  const hasResultAssetIds=Object.prototype.hasOwnProperty.call(options||{},'resultAssetIds');
  const replacementResultAssetIds=hasResultAssetIds?normalizedResultAssetIds(options.resultAssetIds):null;
  const stamp=now();
  const entries=ledger.entries.map(entry=>{
    if(entry.jobId!==jobId)return entry;
    if(TERMINAL.has(entry.state)&&entry.state==='DONE'&&state!=='DONE')throw Error('Completed jobs cannot be silently reopened. Create a fresh guarded operation instead.');
    const startedAt=state==='RUNNING'?(entry.startedAt||stamp):entry.startedAt;
    const finishedAt=TERMINAL.has(state)?stamp:null;
    const attempts=state==='RUNNING'&&entry.state!=='RUNNING'?(Number(entry.attempts)||0)+1:Number(entry.attempts)||0;
    const resultAssetIds=hasResultAssetIds?replacementResultAssetIds:normalizedResultAssetIds(entry.resultAssetIds);
    return {...entry,state,attempts,startedAt,finishedAt,resultAssetIds,message:message?String(message).slice(0,500):null};
  });
  return {...ledger,entries,updatedAt:stamp};
}

export function markLedgerStale(ledger,reason='project state changed'){
  if(!ledger||ledger.kind!=='aivm-v2-draft-execution-ledger')throw Error('Draft execution ledger is required.');
  return {...ledger,updatedAt:now(),entries:ledger.entries.map(entry=>TERMINAL.has(entry.state)?entry:{...entry,stale:true,message:entry.message||String(reason).slice(0,500)})};
}

export function draftExecutionSummary(ledger){
  const entries=Array.isArray(ledger?.entries)?ledger.entries:[];
  const counts={};
  for(const entry of entries)counts[entry.state]=(counts[entry.state]||0)+1;
  const required=entries.filter(entry=>!optionalEntry(entry));
  const optional=entries.filter(optionalEntry);
  const unfinished=required.filter(entry=>!TERMINAL.has(entry.state));
  const staleCount=required.filter(entry=>entry.stale).length;
  const settled=unfinished.length===0&&required.every(entry=>entry.state!=='RUNNING'&&entry.state!=='PENDING');
  const successful=required.length>0&&required.every(entry=>['DONE','SKIPPED'].includes(entry.state)&&entry.stale!==true);
  return {
    total:entries.length,
    required:required.length,
    optional:optional.length,
    counts,
    unfinished:unfinished.length,
    stale:staleCount,
    next:unfinished.find(entry=>entry.state==='RUNNING')||unfinished.find(entry=>entry.state==='PENDING')||null,
    settled,
    successful,
    readyForVerification:successful,
    complete:settled,
    publishAuthorized:false,
    note:'Required-vs-optional status comes from the planned job state, so an OPTIONAL job stays optional even after it is SKIPPED or otherwise resolved. complete/settled only means required jobs are no longer pending or running. readyForVerification/successful requires every required job to be DONE or SKIPPED and current.'
  };
}
