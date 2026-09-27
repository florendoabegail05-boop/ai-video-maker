import {loadProjects,saveProject,revise} from './core.mjs';
import {setReferenceAsset,clearReferenceAsset,referenceSummary} from './references.mjs';
import {runTechnicalQc,visualQcAvailability} from './technical-qc.mjs';

const KEY='aivm.v2.projects.v1';
const el=id=>document.getElementById(id);

export function chooseActiveProject(projects,{name='',prompt=''}={}){
  const exact=projects.filter(project=>project.name===name&&project.prompt===prompt);
  if(exact.length===1)return exact[0];
  const byPrompt=projects.filter(project=>project.prompt===prompt);
  if(byPrompt.length===1)return byPrompt[0];
  const byName=projects.filter(project=>project.name===name);
  if(byName.length===1)return byName[0];
  return null;
}

function activeProject(){
  try{return chooseActiveProject(loadProjects(localStorage),{name:el('name')?.value||'',prompt:(el('prompt')?.value||'').trim()});}
  catch{return null;}
}

function status(message){const node=el('enhancementStatus');if(node)node.textContent=message;}

function reselectProject(project){
  const buttons=[...(el('projects')?.querySelectorAll('button')||[])];
  const match=buttons.find(button=>button.textContent===project.name);
  if(match){match.click();return true;}
  return false;
}

function savePatchedProject(project,patched,message){
  const next=revise(project,patched);
  saveProject(localStorage,next);
  if(!reselectProject(next))window.location.reload();
  status(message+' Revision '+next.revision+'.');
  return next;
}

function referenceButton(label,handler){
  const button=document.createElement('button');
  button.type='button';
  button.className='secondary';
  button.textContent=label;
  button.addEventListener('click',handler);
  return button;
}

function setRole(project,asset,role){
  try{
    const patched=setReferenceAsset(project,asset.id,{role,label:asset.name,locked:true});
    savePatchedProject(project,patched,`${asset.name} saved as ${role} reference and locked`);
  }catch(error){status(error.message);}
}

function clearRole(project,asset){
  try{
    const patched=clearReferenceAsset(project,asset.id);
    savePatchedProject(project,patched,`${asset.name} removed from visual references`);
  }catch(error){status(error.message);}
}

function renderReferences(project){
  const host=el('referenceLibrary');
  if(!host)return;
  host.replaceChildren();
  if(!project){host.textContent='Select or create a project to manage visual references.';return;}
  const summary=referenceSummary(project);
  const summaryLine=document.createElement('p');
  summaryLine.textContent=`Character refs: ${summary.characters.length} · World refs: ${summary.worlds.length}. References are local project assets; marking one never replaces the original file.`;
  host.append(summaryLine);
  const images=(project.assets||[]).filter(asset=>asset.kind==='image'&&asset.hasFile!==false);
  if(!images.length){const p=document.createElement('p');p.textContent='Import or generate an image first, then mark it as a Character or World reference.';host.append(p);return;}
  for(const asset of images){
    const row=document.createElement('div');row.className='asset-item';
    const title=document.createElement('div');
    title.textContent=`${asset.name} · ${asset.referenceRole?asset.referenceRole.toUpperCase()+' REFERENCE':'not a visual reference'}${asset.locked?' · LOCKED':''}`;
    const actions=document.createElement('div');actions.className='actions';
    actions.append(referenceButton('Character reference',()=>setRole(activeProject()||project,asset,'character')));
    actions.append(referenceButton('World reference',()=>setRole(activeProject()||project,asset,'world')));
    if(asset.referenceRole)actions.append(referenceButton('Clear reference',()=>clearRole(activeProject()||project,asset)));
    row.append(title,actions);host.append(row);
  }
}

function renderQc(project){
  const host=el('qcReport');
  if(!host)return;
  host.replaceChildren();
  if(!project){host.textContent='Select or create a project to run technical preflight.';return;}
  const report=runTechnicalQc(project,{targetAspect:'9:16'});
  const head=document.createElement('p');
  const strong=document.createElement('strong');strong.textContent=report.passed?'Technical preflight: PASS':'Technical preflight: NEEDS ATTENTION';
  head.append(strong,document.createTextNode(` · ${report.summary.errors} errors · ${report.summary.warnings} warnings`));host.append(head);
  if(!report.issues.length){const p=document.createElement('p');p.textContent='No deterministic project-structure issues found. This does not evaluate visual realism, flicker, anatomy or identity drift.';host.append(p);}
  for(const item of report.issues){const p=document.createElement('p');p.textContent=`${item.severity.toUpperCase()} · ${item.code} · ${item.message}`;host.append(p);}
  const visual=visualQcAvailability(null);
  const p=document.createElement('p');p.textContent=`Visual AI QC: unavailable until a verified evaluator actually runs. ${visual.note}`;host.append(p);
}

function refresh(){const project=activeProject();renderReferences(project);renderQc(project);}

el('runQc')?.addEventListener('click',()=>{renderQc(activeProject());status('Technical QC preflight refreshed. No assets were changed.');});
el('refreshReferences')?.addEventListener('click',refresh);

const summary=el('summary');
if(summary)new MutationObserver(()=>queueMicrotask(refresh)).observe(summary,{childList:true,characterData:true,subtree:true});
const projects=el('projects');
if(projects)projects.addEventListener('click',()=>queueMicrotask(refresh));
const scenes=el('scenes');
if(scenes)new MutationObserver(()=>queueMicrotask(refresh)).observe(scenes,{childList:true,subtree:false});
window.addEventListener('storage',event=>{if(event.key===KEY)refresh();});

refresh();
