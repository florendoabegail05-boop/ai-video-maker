import {loadProjects} from './core.mjs';
import {quickStartNeedsPlanning} from './quick-start.mjs';

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

export function installQuickStartUi(){
  const create=el('createDraft');
  const plan=el('plan');
  const prompt=el('prompt');
  if(!create||!plan||!prompt||create.dataset.quickStartBound==='1')return false;
  create.dataset.quickStartBound='1';
  create.textContent='Create video · FREE ONLY';
  create.title='From one prompt: create or reuse the scene plan, then continue the guarded local production workflow.';

  create.addEventListener('click',event=>{
    if(replayingPlannedClick){
      replayingPlannedClick=false;
      return;
    }

    try{
      const idea=prompt.value.trim();
      const current=selectedProject();
      if(!quickStartNeedsPlanning(current,idea))return;

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
