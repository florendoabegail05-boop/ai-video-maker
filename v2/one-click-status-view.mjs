import {inspectOneClickSession,oneClickCompletionStatus} from './one-click-orchestrator.mjs';

function pct(done,total){return total>0?Math.round((done/total)*100):0;}
function label(value){return String(value||'').replace(/[_-]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());}

export function oneClickStatusView(project,report,session,options={}){
  const execution=inspectOneClickSession(project,report,session,{creation:options.creation||{}});
  if(!execution.valid){
    return {
      schema:1,
      kind:'aivm-v2-one-click-status-view',
      state:'REPLAN REQUIRED',
      progress:0,
      headline:'Project changed',
      detail:'The saved one-click session no longer matches the current project. Create a fresh plan before continuing.',
      nextAction:'REPLAN',
      nextJob:null,
      sections:[],
      ownerActionRequired:false,
      publishAuthorized:false
    };
  }

  const completion=oneClickCompletionStatus(project,report,session,options);
  const entries=session?.ledger?.entries||[];
  const terminalDone=entries.filter(item=>['DONE','SKIPPED'].includes(item.state)).length;
  const progress=pct(terminalDone,entries.length);
  const nextJob=execution.nextJob;
  const ownerActionRequired=execution.nextAction==='OWNER_OR_MANUAL_INPUT_REQUIRED'||completion.state==='RIGHTS REVIEW REQUIRED'||completion.state==='OWNER APPROVAL REQUIRED';

  const sections=[
    {id:'plan',label:'Plan',state:'DONE',detail:`${session.plan?.summary?.jobs||entries.length} jobs prepared`},
    {id:'create',label:'Create',state:execution.progress.complete?'DONE':execution.nextAction==='REVIEW_BLOCKERS'?'BLOCKED':execution.nextAction==='OWNER_OR_MANUAL_INPUT_REQUIRED'?'MANUAL':'IN PROGRESS',detail:`${terminalDone}/${entries.length} jobs complete`},
    {id:'verify',label:'Verify',state:completion.readiness?.technicallyReady===true?'DONE':execution.progress.complete?'PENDING':'WAITING',detail:execution.progress.complete?'Final technical verification required':'Wait for creation jobs to finish'},
    {id:'review',label:'Owner Review',state:completion.state==='OWNER APPROVED — MANUAL PUBLISH ONLY'?'DONE':completion.readiness?'PENDING':'WAITING',detail:completion.readiness?'Rights and owner approval remain separate':'Available after technical verification'}
  ];

  let headline='Creating video';
  let detail=nextJob?`${label(nextJob.type)}${nextJob.sceneId?` for ${nextJob.sceneId}`:''} is ready next.`:'Waiting for the next safe step.';
  if(execution.nextAction==='OWNER_OR_MANUAL_INPUT_REQUIRED'){
    headline='Manual input needed';
    detail='A required manual/import step is blocking automatic progress.';
  }else if(execution.nextAction==='REVIEW_BLOCKERS'){
    headline='Creation blocked';
    detail='One or more jobs are blocked and must be resolved before continuing.';
  }else if(execution.progress.complete){
    headline=completion.state==='OWNER APPROVED — MANUAL PUBLISH ONLY'?'Ready for manual publish':label(completion.state);
    detail=completion.readiness?.note||'Creation jobs are complete; finish verification and review requirements.';
  }

  return {
    schema:1,
    kind:'aivm-v2-one-click-status-view',
    state:completion.state,
    progress,
    headline,
    detail,
    nextAction:execution.nextAction,
    nextJob,
    sections,
    ownerActionRequired,
    manualPublishEligible:completion.manualPublishEligible===true,
    automaticExecutionAllowed:false,
    automaticPublishingAllowed:false,
    publishAuthorized:false,
    note:'Presentation model only. It does not execute jobs, change files, enable paid providers, upload private media, or publish.'
  };
}
