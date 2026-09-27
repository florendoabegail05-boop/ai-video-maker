import {loadProjects,saveProject,revise} from './core.mjs';
import {setSceneAudio,sceneAudioSummary,generatedAudioAvailability} from './scene-audio.mjs';
import {runTechnicalQc} from './technical-qc.mjs';
import {bridgeCapabilities} from './local-provider.mjs';

const el=id=>document.getElementById(id);

function activeProject(){
  try{
    const projects=loadProjects(localStorage);
    const name=el('name')?.value||'';
    const prompt=(el('prompt')?.value||'').trim();
    const exact=projects.filter(p=>p.name===name&&p.prompt===prompt);
    if(exact.length===1)return exact[0];
    const byPrompt=projects.filter(p=>p.prompt===prompt);
    if(byPrompt.length===1)return byPrompt[0];
    const byName=projects.filter(p=>p.name===name);
    return byName.length===1?byName[0]:null;
  }catch{return null;}
}

function status(message){if(el('audioPlanStatus'))el('audioPlanStatus').textContent=message;}
function button(label,handler,secondary=true){const b=document.createElement('button');b.type='button';b.textContent=label;if(secondary)b.className='secondary';b.addEventListener('click',handler);return b;}

function reselect(project){
  const match=[...(el('projects')?.querySelectorAll('button')||[])].find(node=>node.textContent===project.name);
  if(match){match.click();return true;}
  return false;
}

function persistPatch(project,patched,message){
  const next=revise(project,patched);
  saveProject(localStorage,next);
  if(!reselect(next))window.location.reload();
  status(message+' Revision '+next.revision+'.');
  return next;
}

function audioField(label,value,maxLength,rows=1){
  const wrap=document.createElement('label');wrap.textContent=label;
  const input=rows>1?document.createElement('textarea'):document.createElement('input');
  input.value=value||'';input.maxLength=maxLength;if(rows>1)input.rows=rows;wrap.append(input);return {wrap,input};
}

function renderAudioPlanner(project){
  const host=el('sceneAudioPlanner');if(!host)return;host.replaceChildren();
  if(!project){host.textContent='Select or create a project to plan scene audio.';return;}
  if(!project.scenes?.length){host.textContent='Create a scene plan first.';return;}
  for(const scene of project.scenes){
    const summary=sceneAudioSummary(project,scene.id);
    const card=document.createElement('section');card.className='scene';
    const title=document.createElement('h3');title.textContent=`Scene ${scene.order} audio plan`;
    const dialogue=audioField('Dialogue / spoken line',summary.dialogue,500,2);
    const voice=audioField('Voice ID / character voice label',summary.voiceId,80);
    const ambience=audioField('Ambience',summary.ambience,300);
    const sfx=audioField('Sound effects',summary.sfx,300);
    const music=audioField('Music cue',summary.musicCue,300);
    const actions=document.createElement('div');actions.className='actions';
    actions.append(button('Save scene audio plan',()=>{
      const latest=activeProject()||project;
      try{
        const patched=setSceneAudio(latest,scene.id,{dialogue:dialogue.input.value,voiceId:voice.input.value,ambience:ambience.input.value,sfx:sfx.input.value,musicCue:music.input.value});
        persistPatch(latest,patched,`Scene ${scene.order} audio plan saved`);
      }catch(error){status(error.message);}
    },false));
    if(summary.needsVoiceAssignment){const warning=document.createElement('p');warning.textContent='Dialogue exists but no voice is assigned yet. Manual voice import remains available.';card.append(warning);}
    card.append(title,dialogue.wrap,voice.wrap,ambience.wrap,sfx.wrap,music.wrap,actions);host.append(card);
  }
}

function refreshQcGate(project){
  const assemble=el('assemble');const gate=el('qcGateStatus');if(!assemble||!gate)return;
  if(!project){assemble.disabled=true;gate.textContent='Final assembly is disabled until a project is selected.';return;}
  const report=runTechnicalQc(project,{targetAspect:'9:16'});
  assemble.disabled=!report.passed;
  gate.textContent=report.passed
    ?`Technical QC gate passed (${report.summary.warnings} warning${report.summary.warnings===1?'':'s'}). Final assembly remains subject to bridge/render checks.`
    :`Final assembly blocked by ${report.summary.errors} technical QC error${report.summary.errors===1?'':'s'}. Existing assets were not changed.`;
}

function refresh(){const project=activeProject();renderAudioPlanner(project);refreshQcGate(project);}

el('checkAudioRoutes')?.addEventListener('click',async()=>{
  try{
    const caps=await bridgeCapabilities();const availability=generatedAudioAvailability(caps);
    const node=el('audioRouteStatus');
    if(node)node.textContent=`FREE ONLY generated audio — Voice: ${availability.voice?'available':'not verified'} · Ambience: ${availability.ambience?'available':'not verified'} · SFX: ${availability.sfx?'available':'not verified'} · Music: ${availability.music?'available':'not verified'} · Lip-sync: ${availability.lipSync?'available':'not verified'}. ${availability.note}`;
  }catch(error){const node=el('audioRouteStatus');if(node)node.textContent='Could not verify generated-audio routes. Manual local audio import still works when the bridge supports import. '+error.message;}
});

el('runQc')?.addEventListener('click',()=>queueMicrotask(()=>refreshQcGate(activeProject())));
el('refreshAudioPlan')?.addEventListener('click',refresh);
const summary=el('summary');if(summary)new MutationObserver(()=>queueMicrotask(refresh)).observe(summary,{childList:true,characterData:true,subtree:true});
const scenes=el('scenes');if(scenes)new MutationObserver(()=>queueMicrotask(refresh)).observe(scenes,{childList:true,subtree:false});
const projects=el('projects');if(projects)projects.addEventListener('click',()=>queueMicrotask(refresh));
refresh();
