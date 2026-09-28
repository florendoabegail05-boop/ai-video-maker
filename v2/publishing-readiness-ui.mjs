import {loadProjects} from './core.mjs';
import {chooseProject,decorateProjectButtons} from './project-selection.mjs';
import {publishingReadiness,ownerReadyChecklist} from './publishing-readiness.mjs';
import {makeOwnerHandoffPackage} from './owner-handoff.mjs';

const el=id=>document.getElementById(id);
let activeProjectId='';
function projects(){try{return loadProjects(localStorage);}catch{return [];}}
function decorate(){decorateProjectButtons(el('projects'),projects());}
function activeProject(){return chooseProject(projects(),{projectId:el('projects')?.dataset.activeProjectId||activeProjectId,name:el('name')?.value||'',prompt:(el('prompt')?.value||'').trim()});}
function status(message){const node=el('publishingReadinessStatus');if(node)node.textContent=message;}
function downloadJson(value,name){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}

function stateLabel(state){return state==='pass'?'PASS':state==='block'?'BLOCKING':state==='owner'?'OWNER ACTION':'OPTIONAL';}

export function renderPublishingReadiness(){
  const host=el('publishingReadiness');if(!host)return;
  host.replaceChildren();
  const project=activeProject();
  const exportButton=el('exportOwnerChecklist');
  const handoffButton=el('exportOwnerHandoff');
  if(!project){host.textContent='Select or create a project to see publishing readiness.';if(exportButton)exportButton.disabled=true;if(handoffButton)handoffButton.disabled=true;return;}
  activeProjectId=project.id;
  const readiness=publishingReadiness(project);
  if(exportButton)exportButton.disabled=false;
  if(handoffButton)handoffButton.disabled=false;
  const head=document.createElement('p');
  const strong=document.createElement('strong');strong.textContent=readiness.state;
  head.append(strong,document.createTextNode(` · ${readiness.summary.blocking} blocking · ${readiness.summary.passed} passed · ${readiness.summary.warnings} optional`));host.append(head);
  const explanation=document.createElement('p');
  explanation.textContent=readiness.readyForOwnerReview?'Deterministic checks are ready. Human visual/audio, rights and platform review are still required before publishing.':'Finish the blocking items below before owner review.';
  host.append(explanation);
  for(const check of readiness.items){
    const row=document.createElement('div');row.className='asset-item';
    const title=document.createElement('div');
    const badge=document.createElement('strong');badge.textContent=`${stateLabel(check.state)} · ${check.label}`;
    const message=document.createElement('p');message.textContent=check.message;
    title.append(badge,message);row.append(title);host.append(row);
  }
}

el('refreshPublishingReadiness')?.addEventListener('click',()=>{renderPublishingReadiness();status('Publishing readiness refreshed from saved project metadata.');});
el('exportOwnerChecklist')?.addEventListener('click',()=>{
  try{const project=activeProject();if(!project)throw Error('Select a project first.');downloadJson(ownerReadyChecklist(project),'aivm-v2-owner-review-checklist.json');status('Owner review checklist exported. Nothing was uploaded or published.');}
  catch(error){status(error.message);}
});
el('exportOwnerHandoff')?.addEventListener('click',()=>{
  try{const project=activeProject();if(!project)throw Error('Select a project first.');const pack=makeOwnerHandoffPackage(project);downloadJson(pack,'aivm-v2-owner-handoff.json');status(pack.deterministicChecksPassed?'Owner handoff exported. Final owner review is still required.':'Handoff status exported with unresolved blockers. Nothing was uploaded or published.');}
  catch(error){status(error.message);}
});
el('projects')?.addEventListener('click',event=>{const button=event.target.closest?.('button[data-project-id]');if(button?.dataset.projectId)activeProjectId=button.dataset.projectId;queueMicrotask(renderPublishingReadiness);});
const projectHost=el('projects');if(projectHost)new MutationObserver(()=>decorate()).observe(projectHost,{childList:true});
const summary=el('summary');if(summary)new MutationObserver(()=>queueMicrotask(renderPublishingReadiness)).observe(summary,{childList:true,characterData:true,subtree:true});
const finalStatus=el('finalVerificationStatus');if(finalStatus)new MutationObserver(()=>queueMicrotask(renderPublishingReadiness)).observe(finalStatus,{childList:true,characterData:true,subtree:true});
const publishStatus=el('publishingStatus');if(publishStatus)new MutationObserver(()=>queueMicrotask(renderPublishingReadiness)).observe(publishStatus,{childList:true,characterData:true,subtree:true});
const scenes=el('scenes');if(scenes)new MutationObserver(()=>queueMicrotask(renderPublishingReadiness)).observe(scenes,{childList:true,subtree:true});
window.addEventListener('storage',()=>{decorate();renderPublishingReadiness();});

decorate();renderPublishingReadiness();
