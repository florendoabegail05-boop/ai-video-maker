import {loadProjects} from './core.mjs';
import {quickStartNeedsPlanning,suggestProjectName} from './quick-start.mjs';

const el=id=>document.getElementById(id);
let replayingPlannedClick=false;

function projectsNow(){
  try{return loadProjects(localStorage);}catch{return [];}
}

function selectedProject(){
  const id=el('projects')?.dataset.activeProjectId||'';
  return id?projectsNow().find(project=>project.id===id)||null:null;
}

function show(message){
  const notice=el('notice');
  if(notice)notice.textContent=message;
}

function placeWorkflowStatus(shell){
  const move=()=>{
    const workflow=el('oneClickStudio');
    if(workflow&&workflow.previousElementSibling!==shell)shell.after(workflow);
  };
  move();
  queueMicrotask(move);
}

function productizeCreateAction(create,plan){
  create.textContent='Create video · FREE ONLY';
  create.title='From one prompt: create or reuse the scene plan, then continue the guarded local production workflow.';
  create.setAttribute('aria-describedby','quickStartHint');
  plan.textContent='Plan only';
  plan.classList.add('secondary');
  plan.title='Create or refresh a scene plan without starting local production.';

  const existing=el('quickStartBar');
  if(existing){placeWorkflowStatus(existing);return;}
  const planActions=plan.parentElement;
  if(!planActions)return;
  const shell=document.createElement('section');
  shell.id='quickStartBar';
  shell.className='quick-start-bar';
  const copy=document.createElement('div');
  const title=document.createElement('strong');
  title.textContent='One prompt → guarded local video';
  const hint=document.createElement('p');
  hint.id='quickStartHint';
  hint.textContent='One click can create the scene plan when needed, preserve an existing plan when reusable, then continue the verified FREE ONLY workflow. If a required local route is unavailable, production stops instead of switching to a paid provider.';
  copy.append(title,hint);
  const actions=document.createElement('div');
  actions.className='actions quick-start-actions';
  actions.append(create);
  shell.append(copy,actions);
  planActions.before(shell);
  placeWorkflowStatus(shell);
}

export function installQuickStartUi(){
  const create=el('createDraft');
  const plan=el('plan');
  const prompt=el('prompt');
  const name=el('name');
  if(!create||!plan||!prompt||create.dataset.quickStartBound==='1')return false;
  create.dataset.quickStartBound='1';
  productizeCreateAction(create,plan);

  create.addEventListener('click',event=>{
    if(replayingPlannedClick){
      replayingPlannedClick=false;
      return;
    }

    try{
      const idea=prompt.value.trim();
      const current=selectedProject();
      if(!quickStartNeedsPlanning(current,idea))return;

      // A changed idea should not accidentally inherit the old project's visible
      // name just because the owner did not edit that optional field.
      if(name&&(!current||current.prompt!==idea)){
        const visible=name.value.trim();
        if(!visible||visible===current?.name)name.value=suggestProjectName(idea);
      }

      // An unexpected project with media but no scene plan needs deliberate repair;
      // never guess how those media records should be attached to a new plan.
      if(current?.prompt===idea&&(current.assets||[]).length>0&&!(current.scenes||[]).length){
        throw Error('This project has media but no scene plan. Repair or restore its plan before one-click production.');
      }

      // Stop the existing one-click listener only for this first click. Reuse the
      // Studio's existing planner/persistence path so there is one authoritative
      // owner of project state and history.
      event.preventDefault();
      event.stopImmediatePropagation();
      plan.click();

      const planned=selectedProject();
      if(!planned||planned.prompt!==idea||!(planned.scenes||[]).length){
        throw Error('Scene planning did not complete. Review the project notice, then try again.');
      }

      show('Scene plan created safely. Starting guarded FREE ONLY production…');
      replayingPlannedClick=true;
      create.click();
    }catch(error){
      event.preventDefault();
      event.stopImmediatePropagation();
      replayingPlannedClick=false;
      show('One-click stopped: '+error.message);
    }
  },{capture:true});

  return true;
}

installQuickStartUi();
