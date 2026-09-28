import {loadProjects,saveProject} from './core.mjs';
import {chooseProject,decorateProjectButtons} from './project-selection.mjs';
import {makeFinalOutputManifest} from './final-output.mjs';
import {setFinalVerification,finalVerificationStatus} from './publishing.mjs';

const el=id=>document.getElementById(id);
let activeProjectId='';

function projects(){try{return loadProjects(localStorage);}catch{return [];}}
function decorate(){decorateProjectButtons(el('projects'),projects());}
function activeProject(){
  return chooseProject(projects(),{projectId:el('projects')?.dataset.activeProjectId||activeProjectId,name:el('name')?.value||'',prompt:(el('prompt')?.value||'').trim()});
}
function status(message){const node=el('finalVerificationStatus');if(node)node.textContent=message;}
function clickProject(projectId){
  decorate();
  const button=[...(el('projects')?.querySelectorAll('button')||[])].find(item=>item.dataset.projectId===projectId);
  if(button){button.click();activeProjectId=projectId;return true;}
  return false;
}

function renderSavedStatus(){
  const host=el('finalVerificationSummary');if(!host)return;
  host.replaceChildren();
  const project=activeProject();
  if(!project){host.textContent='Select or create a project first.';return;}
  activeProjectId=project.id;
  const state=finalVerificationStatus(project);
  const saved=project.publishing?.finalVerification;
  if(!state.saved){host.textContent='Final MP4 media facts: not yet verified for this project.';return;}
  if(!state.fresh){
    const p=document.createElement('p');
    const strong=document.createElement('strong');strong.textContent='Final MP4 verification: STALE';
    p.append(strong,document.createTextNode(' · Render inputs changed after the saved verification. Re-assemble/download the current final MP4 and verify it again.'));
    host.append(p);
    return;
  }
  const actual=saved.actual||{};
  const p=document.createElement('p');
  const strong=document.createElement('strong');strong.textContent='Basic final-media verification saved: PASS';
  p.append(strong,document.createTextNode(` · ${actual.width||'?'}×${actual.height||'?'} · ${Number(actual.duration||0).toFixed(2)}s · ${(Number(actual.bytes||0)/1048576).toFixed(1)} MB`));
  host.append(p);
  const note=document.createElement('p');
  note.textContent='This confirms deterministic browser-readable media facts for the current render inputs only. It does not verify photorealism, identity consistency, anatomy, flicker, lip-sync, audio quality or artistic quality.';
  host.append(note);
}

function inspectVideoFile(file){
  return new Promise((resolve,reject)=>{
    if(!file) return reject(Error('Choose the final MP4 first.'));
    if(file.size<1024) return reject(Error('Final MP4 file is unexpectedly small.'));
    const video=document.createElement('video');
    const url=URL.createObjectURL(file);
    const cleanup=()=>{URL.revokeObjectURL(url);video.removeAttribute('src');video.load();};
    const timer=setTimeout(()=>{cleanup();reject(Error('Could not read final MP4 metadata in time.'));},15000);
    video.preload='metadata';
    video.onloadedmetadata=()=>{
      clearTimeout(timer);
      const media={video:{width:video.videoWidth,height:video.videoHeight},duration:Number.isFinite(video.duration)?video.duration:null,bytes:file.size,audio:null,provider:'browser-file-metadata'};
      cleanup();resolve(media);
    };
    video.onerror=()=>{clearTimeout(timer);cleanup();reject(Error('The selected file could not be read as a browser-supported video.'));};
    video.src=url;
  });
}

async function verifySelectedFile(){
  const button=el('verifyFinalOutput');if(button)button.disabled=true;
  try{
    const project=activeProject();if(!project)throw Error('Select or create a project first.');
    const file=el('finalOutputFile')?.files?.[0];
    const media=await inspectVideoFile(file);
    const manifest=makeFinalOutputManifest(project,media,{aspect:'9:16',width:1080,height:1920,fps:30,durationTolerance:0.35});
    const errors=manifest.issues.filter(item=>item.severity==='error');
    if(errors.length){status('Verification did not pass: '+errors.map(item=>item.message).join(' '));return;}
    const latest=activeProject();
    if(!latest||latest.id!==project.id||latest.revision!==project.revision)throw Error('Project changed during verification. Select the current final MP4 and retry.');
    const next=setFinalVerification(latest,manifest);
    saveProject(localStorage,next);
    activeProjectId=next.id;
    if(!clickProject(next.id))window.location.reload();
    renderSavedStatus();
    status('Basic final-media verification saved for the current render inputs. Human visual/audio review is still required before publishing.');
  }catch(error){status('Final-output verification stopped: '+error.message);}
  finally{if(button)button.disabled=false;}
}

el('verifyFinalOutput')?.addEventListener('click',verifySelectedFile);
el('projects')?.addEventListener('click',event=>{const button=event.target.closest?.('button[data-project-id]');if(button?.dataset.projectId)activeProjectId=button.dataset.projectId;queueMicrotask(renderSavedStatus);});
const projectHost=el('projects');if(projectHost)new MutationObserver(()=>decorate()).observe(projectHost,{childList:true});
const summary=el('summary');if(summary)new MutationObserver(()=>queueMicrotask(renderSavedStatus)).observe(summary,{childList:true,characterData:true,subtree:true});
const scenes=el('scenes');if(scenes)new MutationObserver(()=>queueMicrotask(renderSavedStatus)).observe(scenes,{childList:true,subtree:true});
window.addEventListener('storage',()=>{decorate();renderSavedStatus();});

decorate();renderSavedStatus();
