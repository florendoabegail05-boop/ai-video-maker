import {buildCreationPlan} from './creation-plan.mjs';
import {directorBrief} from './director.mjs';
import {referenceSummary} from './references.mjs';

function job(id,type,state,message,details={}){return{id,type,state,message,...details};}
function clean(value,max=8000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function buildDraftJobPlan(project,report,{wantMotion=true,wantAudio=true,wantCaptions=true}={}){
  if(!project?.id)throw Error('Project is required.');
  const creation=buildCreationPlan(project,report,{wantMotion,wantAudio,wantCaptions});
  const refs=referenceSummary(project);
  const scenes=Array.isArray(project.scenes)?project.scenes:[];
  const jobs=[];

  jobs.push(job('director:project','director','READY','Use the saved project prompt and scene plan as the source of truth.',{
    projectId:project.id,
    sceneCount:scenes.length
  }));

  const imageStage=creation.stages.find(item=>item.id==='images');
  const motionStage=creation.stages.find(item=>item.id==='motion');

  for(const scene of scenes){
    const brief=directorBrief(project,scene.id);
    const scenePrompt=clean(scene.prompt||scene.beat||project.prompt||'',4000);
    if(imageStage?.state==='READY'){
      jobs.push(job(`image:${scene.id}`,'image','READY',`Generate or reuse the scene image through ${imageStage.route||'the verified FREE ONLY image route'}.`,{
        sceneId:scene.id,
        sceneOrder:scene.order,
        route:imageStage.route||null,
        prompt:scenePrompt,
        directorBrief:brief,
        characterReferenceIds:refs.characters.map(item=>item.id),
        worldReferenceIds:refs.worlds.map(item=>item.id),
        destructive:false
      }));
    }else{
      jobs.push(job(`image:${scene.id}`,'image','MANUAL','No verified FREE ONLY generated-image route is available. Keep existing/imported media or import an owner image.',{
        sceneId:scene.id,
        sceneOrder:scene.order,
        route:imageStage?.route||'unavailable',
        prompt:scenePrompt,
        directorBrief:brief,
        destructive:false
      }));
    }

    if(wantMotion){
      if(motionStage?.state==='READY'){
        jobs.push(job(`motion:${scene.id}`,'motion','READY',`Animate the selected scene image/clip through ${motionStage.route||'the verified FREE ONLY motion route'}.`,{
          sceneId:scene.id,
          sceneOrder:scene.order,
          route:motionStage.route||null,
          directorBrief:brief,
          destructive:false
        }));
      }else{
        jobs.push(job(`motion:${scene.id}`,'motion','OPTIONAL','Generated motion is not verified. Preserve/import a clip or keep a still until a verified route is available.',{
          sceneId:scene.id,
          sceneOrder:scene.order,
          route:motionStage?.route||'unavailable',
          destructive:false
        }));
      }
    }
  }

  const audioStage=creation.stages.find(item=>item.id==='audio');
  if(wantAudio&&audioStage){
    jobs.push(job('audio:project','audio',audioStage.state,audioStage.message,{
      generatedRouteAvailable:audioStage.generatedRouteAvailable===true,
      destructive:false
    }));
  }

  if(wantCaptions){
    jobs.push(job('captions:project','captions','READY','Create/edit captions locally from scene captions; do not claim speech recognition unless a verified transcription route is connected.',{destructive:false}));
  }else{
    jobs.push(job('captions:project','captions','OPTIONAL','Captions were not requested for this creation plan.',{destructive:false}));
  }

  const assemble=creation.stages.find(item=>item.id==='assemble');
  jobs.push(job('assemble:final','assemble',assemble?.state||'BLOCKED',assemble?.message||'Final assembly status unavailable.',{destructive:false}));
  const verify=creation.stages.find(item=>item.id==='verify');
  jobs.push(job('verify:final','verify',verify?.state||'BLOCKED',verify?.message||'Final verification status unavailable.',{destructive:false}));

  const blocking=jobs.filter(item=>item.state==='BLOCKED');
  const manual=jobs.filter(item=>item.state==='MANUAL');
  return {
    schema:1,
    kind:'aivm-v2-draft-job-plan',
    projectId:project.id,
    projectRevision:Number(project.revision)||0,
    costMode:'FREE ONLY',
    jobs,
    summary:{jobs:jobs.length,ready:jobs.filter(item=>item.state==='READY').length,manual:manual.length,optional:jobs.filter(item=>item.state==='OPTIONAL').length,blocked:blocking.length},
    canStartAutomatically:blocking.length===0,
    ownerApprovalRequired:false,
    automaticPublishingAllowed:false,
    note:'Execution blueprint only. Each async job must still use current-state guards before applying results. Preserve locked/imported media, never auto-enable paid providers, and never delete existing files as part of draft generation.'
  };
}

export function nextDraftJob(project,report,options={}){
  const plan=buildDraftJobPlan(project,report,options);
  return plan.jobs.find(item=>item.state==='BLOCKED')||plan.jobs.find(item=>item.state==='MANUAL')||plan.jobs.find(item=>item.state==='READY')||plan.jobs.find(item=>item.state==='OPTIONAL')||null;
}
