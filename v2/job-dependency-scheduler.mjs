const TERMINAL_OK=new Set(['DONE','SKIPPED']);
const WAIT_STATES=new Set(['PENDING','RUNNING']);

function entryMap(ledger){return new Map((ledger?.entries||[]).map(entry=>[entry.jobId,entry]));}
function jobMap(plan){return new Map((plan?.jobs||[]).map(job=>[job.id,job]));}

export function jobDependencies(job,plan){
  if(!job?.id)return [];
  if(job.type==='director')return [];
  if(job.type==='image')return ['director:project'];
  if(job.type==='motion')return [`image:${job.sceneId}`];
  if(job.type==='audio'||job.type==='captions')return ['director:project'];
  if(job.type==='assemble'){
    return (plan.jobs||[])
      .filter(item=>['motion','image','audio','captions'].includes(item.type)&&item.state!=='OPTIONAL')
      .map(item=>item.id);
  }
  if(job.type==='verify')return ['assemble:final'];
  return [];
}

function dependencyState(entries,ids){
  const missing=ids.filter(id=>!entries.has(id));
  const failed=ids.filter(id=>['FAILED','BLOCKED'].includes(entries.get(id)?.state));
  const manual=ids.filter(id=>entries.get(id)?.state==='MANUAL');
  const waiting=ids.filter(id=>WAIT_STATES.has(entries.get(id)?.state));
  const complete=ids.filter(id=>TERMINAL_OK.has(entries.get(id)?.state));
  return {missing,failed,manual,waiting,complete};
}

export function schedulableDraftJobs(plan,ledger){
  if(!plan||plan.kind!=='aivm-v2-draft-job-plan')throw Error('Draft job plan is required.');
  if(!ledger||ledger.kind!=='aivm-v2-draft-execution-ledger')throw Error('Draft execution ledger is required.');
  if(plan.projectId!==ledger.projectId)return {ready:[],blocked:[],manual:[],waiting:[],reason:'project-mismatch'};
  const jobs=jobMap(plan),entries=entryMap(ledger);
  const ready=[],blocked=[],manual=[],waiting=[];
  for(const job of jobs.values()){
    const entry=entries.get(job.id);
    if(!entry){blocked.push({jobId:job.id,reason:'missing-ledger-entry'});continue;}
    if(entry.stale){blocked.push({jobId:job.id,reason:'stale-ledger-entry'});continue;}
    if(entry.state==='DONE'||entry.state==='SKIPPED'||entry.state==='RUNNING'||entry.state==='OPTIONAL')continue;
    if(entry.state==='MANUAL'){manual.push({jobId:job.id,reason:'manual-step'});continue;}
    if(entry.state==='BLOCKED'||entry.state==='FAILED'){blocked.push({jobId:job.id,reason:`job-${entry.state.toLowerCase()}`});continue;}
    const deps=jobDependencies(job,plan);
    const dep=dependencyState(entries,deps);
    if(dep.missing.length||dep.failed.length){blocked.push({jobId:job.id,reason:'dependency-blocked',dependencies:dep});continue;}
    if(dep.manual.length){manual.push({jobId:job.id,reason:'dependency-manual',dependencies:dep});continue;}
    if(dep.waiting.length){waiting.push({jobId:job.id,reason:'dependency-waiting',dependencies:dep});continue;}
    ready.push({jobId:job.id,type:job.type,sceneId:job.sceneId||null,dependencies:deps});
  }
  return {ready,blocked,manual,waiting,reason:'ok'};
}

export function nextSchedulableDraftJob(plan,ledger){
  const result=schedulableDraftJobs(plan,ledger);
  return result.ready[0]||null;
}

export function draftScheduleSummary(plan,ledger){
  const result=schedulableDraftJobs(plan,ledger);
  return {
    schema:1,
    kind:'aivm-v2-draft-schedule-summary',
    projectId:plan?.projectId||null,
    ready:result.ready.length,
    blocked:result.blocked.length,
    manual:result.manual.length,
    waiting:result.waiting.length,
    next:result.ready[0]||null,
    automaticExecutionAllowed:false,
    publishAuthorized:false,
    note:'Scheduling is advisory. A READY job may start only through the live executor using current operation guards. This module never runs providers, deletes files, uploads media, enables paid routes, or publishes.'
  };
}
