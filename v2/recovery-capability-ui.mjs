import {loadProjects,saveProject} from './core.mjs';
import {captureRecoverySnapshot,recoverySnapshotsFor,restoreStoredSnapshot,removeRecoverySnapshot} from './recovery-store.mjs';
import {decorateProjectButtons,chooseProject} from './project-selection.mjs';
import {adapterAvailabilitySummary} from './adapter-registry.mjs';
import {bridgeCapabilities} from './local-provider.mjs';

const el=id=>document.getElementById(id);
let activeProjectId='';

function status(message){const node=el('recoveryCapabilityStatus');if(node)node.textContent=message;}
function projects(){try{return loadProjects(localStorage);}catch{return [];}}
function decorate(){decorateProjectButtons(el('projects'),projects());}
function activeProject(){
  const all=projects();
  return chooseProject(all,{projectId:el('projects')?.dataset.activeProjectId||activeProjectId,name:el('name')?.value||'',prompt:(el('prompt')?.value||'').trim()});
}
function clickProject(projectId){
  decorate();
  const button=[...(el('projects')?.querySelectorAll('button')||[])].find(item=>item.dataset.projectId===projectId);
  if(button){button.click();activeProjectId=projectId;return true;}
  return false;
}
function makeButton(label,handler){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=label;button.addEventListener('click',handler);return button;}

function renderRecovery(){
  const host=el('recoveryHistory');if(!host)return;host.replaceChildren();
  const project=activeProject();
  if(!project){host.textContent='Select or create a project to use recovery snapshots.';return;}
  activeProjectId=project.id;
  const items=recoverySnapshotsFor(localStorage,project.id);
  const head=document.createElement('p');head.textContent=`${items.length} saved recovery point${items.length===1?'':'s'} for this project. Snapshots contain project metadata only, not duplicated media bytes.`;host.append(head);
  if(!items.length)return;
  for(const snapshot of items.slice(0,10)){
    const row=document.createElement('div');row.className='asset-item';
    const title=document.createElement('div');
    const when=snapshot.createdAt?new Date(snapshot.createdAt).toLocaleString():'';
    title.textContent=`${snapshot.label} · revision ${snapshot.projectRevision} · ${when}`;
    const actions=document.createElement('div');actions.className='actions';
    actions.append(makeButton('Restore metadata',()=>{
      try{
        const current=activeProject();if(!current)throw Error('Select the project first.');
        captureRecoverySnapshot(localStorage,current,{label:'Before recovery restore',reason:'pre-restore'});
        const restored=restoreStoredSnapshot(localStorage,snapshot.snapshotId,current);
        saveProject(localStorage,restored);
        if(!clickProject(restored.id))window.location.reload();
        status(`Restored ${snapshot.label}. A safety snapshot of the previous state was kept.`);
        queueMicrotask(renderRecovery);
      }catch(error){status(error.message);}
    }));
    actions.append(makeButton('Delete snapshot',()=>{
      try{removeRecoverySnapshot(localStorage,snapshot.snapshotId);renderRecovery();status('Recovery snapshot deleted. Current project and media were not changed.');}
      catch(error){status(error.message);}
    }));
    row.append(title,actions);host.append(row);
  }
}

async function renderCapabilityRegistry(){
  const host=el('adapterRegistry');if(!host)return;host.replaceChildren();
  const button=el('checkAdapterRegistry');if(button)button.disabled=true;
  try{
    const report=await bridgeCapabilities();
    const summary=adapterAvailabilitySummary(report);
    for(const kind of ['image','video','voice','music','sfx','lipsync','upscale']){
      const row=document.createElement('p');
      const entries=summary[kind]||[];
      const strong=document.createElement('strong');strong.textContent=kind.toUpperCase()+': ';
      row.append(strong,document.createTextNode(entries.length?entries.map(item=>`${item.label} · verified`).join('; '):'No verified FREE ONLY adapter reported'));
      host.append(row);
    }
    const note=document.createElement('p');note.textContent='This registry reflects only the bridge capability response. It does not download models, enable paid providers, or prove artistic quality.';host.append(note);
    status('Capability registry refreshed from the local bridge.');
  }catch(error){host.textContent='Local capability registry unavailable until the bridge is running.';status('Capability registry check stopped: '+error.message);}
  finally{if(button)button.disabled=false;}
}

el('createRecoverySnapshot')?.addEventListener('click',()=>{
  try{
    const project=activeProject();if(!project)throw Error('Select or create a project first.');
    captureRecoverySnapshot(localStorage,project,{label:`Manual save · revision ${project.revision}`,reason:'manual'});
    renderRecovery();status('Recovery snapshot saved. Media bytes were not duplicated.');
  }catch(error){status(error.message);}
});
el('refreshRecovery')?.addEventListener('click',renderRecovery);
el('checkAdapterRegistry')?.addEventListener('click',renderCapabilityRegistry);
el('projects')?.addEventListener('click',event=>{const button=event.target.closest?.('button[data-project-id]');if(button?.dataset.projectId)activeProjectId=button.dataset.projectId;queueMicrotask(()=>{decorate();renderRecovery();});});
const projectHost=el('projects');if(projectHost)new MutationObserver(()=>decorate()).observe(projectHost,{childList:true});
const summary=el('summary');if(summary)new MutationObserver(()=>queueMicrotask(renderRecovery)).observe(summary,{childList:true,characterData:true,subtree:true});
window.addEventListener('storage',()=>{decorate();renderRecovery();});

decorate();renderRecovery();
