import {buildRoutePlan} from './provider-router.mjs';
import {capabilityDisclosure} from './capability-disclosure.mjs';

function stage(id,label,state,message,details={}){return{id,label,state,message,...details};}

export function buildCreationPlan(project,report,{wantAudio=true,wantCaptions=true,wantMotion=true}={}){
  const route=buildRoutePlan(report,{costMode:'FREE ONLY'});
  const disclosure=capabilityDisclosure(report,{project,costMode:'FREE ONLY'});
  const stages=[];

  stages.push(stage('director','AI Director','READY','Create or refresh the structured scene plan from the project prompt.'));

  if(route.image?.verified){
    stages.push(stage('images','Scene images','READY',route.image.reason,{route:route.image.kind}));
  }else{
    stages.push(stage('images','Scene images','BLOCKED','No verified FREE ONLY image route is available. Importing owner media remains allowed.',{route:route.image?.kind||'unavailable'}));
  }

  if(wantMotion){
    if(route.video?.verified)stages.push(stage('motion','Scene motion','READY',route.video.reason,{route:route.video.kind}));
    else stages.push(stage('motion','Scene motion','OPTIONAL','No verified generated-motion route is available. Imported clips can still be used.',{route:route.video?.kind||'unavailable'}));
  }

  if(wantAudio){
    const generated=route.audio?.voice?.verified||route.audio?.music?.verified||route.audio?.sfx?.verified;
    stages.push(stage('audio','Audio',generated?'READY':'MANUAL',generated?'A verified FREE ONLY local audio route is available.':'Use imported voice/music/SFX until a verified local generation route is available.',{generatedRouteAvailable:!!generated}));
  }

  stages.push(stage('captions','Captions',wantCaptions?'READY':'OPTIONAL',wantCaptions?'Captions can be created and edited locally.':'Captions are optional for this creation request.'));

  const ffmpeg=report?.tools?.ffmpeg?.available===true;
  const ffprobe=report?.tools?.ffprobe?.available===true;
  stages.push(stage('assemble','Final assembly',ffmpeg?'READY':'BLOCKED',ffmpeg?'Local FFmpeg assembly route is available.':'FFmpeg is required for local final assembly.'));
  stages.push(stage('verify','Final verification',ffprobe?'READY':'BLOCKED',ffprobe?'FFprobe can verify final media facts after render.':'FFprobe is required for trusted final media verification.'));

  const blockers=stages.filter(item=>item.state==='BLOCKED');
  const manual=stages.filter(item=>item.state==='MANUAL');
  return {
    schema:1,
    kind:'aivm-v2-creation-plan',
    projectId:project?.id||null,
    costMode:'FREE ONLY',
    canCreateDraft:blockers.every(item=>item.id!=='images'),
    canAssembleFinal:blockers.every(item=>item.id!=='assemble'),
    canVerifyFinal:blockers.every(item=>item.id!=='verify'),
    blockers:blockers.map(item=>item.id),
    manualSteps:manual.map(item=>item.id),
    stages,
    disclosure,
    ownerApprovalRequired:false,
    note:'This plan selects only currently verified FREE ONLY routes. It does not download models, enable paid providers, upload private media, delete assets, or claim unverified quality.'
  };
}

export function nextCreationStep(project,report,options={}){
  const plan=buildCreationPlan(project,report,options);
  return plan.stages.find(item=>item.state==='BLOCKED')||plan.stages.find(item=>item.state==='MANUAL')||plan.stages.find(item=>item.state==='READY')||null;
}
