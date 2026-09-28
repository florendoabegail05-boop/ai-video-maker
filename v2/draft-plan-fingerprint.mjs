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

function clean(value,max=240){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

function jobDescriptor(job={}){
  return {
    id:clean(job.id,160)||null,
    type:clean(job.type,80)||null,
    sceneId:clean(job.sceneId,160)||null,
    state:clean(job.state,80)||null,
    route:clean(job.route,160)||null,
    generatedRouteAvailable:job.generatedRouteAvailable===true,
    destructive:job.destructive===true
  };
}

export function draftPlanDescriptor(plan){
  if(!plan||plan.kind!=='aivm-v2-draft-job-plan')throw Error('Draft job plan is required.');
  return {
    schema:1,
    projectId:plan.projectId||null,
    costMode:clean(plan.costMode,80)||null,
    jobs:(plan.jobs||[]).map(jobDescriptor)
  };
}

export function draftPlanFingerprint(plan){
  return `dpf1-${hash32(stableStringify(draftPlanDescriptor(plan)))}`;
}

export function compareDraftPlans(savedPlan,currentPlan){
  const saved=draftPlanFingerprint(savedPlan);
  const current=draftPlanFingerprint(currentPlan);
  return {
    match:saved===current,
    savedFingerprint:saved,
    currentFingerprint:current,
    reason:saved===current?'match':'execution-plan-changed'
  };
}
