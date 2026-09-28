import test from 'node:test';
import assert from 'node:assert/strict';
import {createOneClickSession,inspectOneClickSession,oneClickCompletionStatus} from './one-click-orchestrator.mjs';
import {machineFinalMediaFacts} from './final-media-facts.mjs';
import {makeVerifiedOwnerReleaseApproval} from './verified-release-approval.mjs';

function project(){return {
  id:'p1',revision:1,prompt:'Make a short',style:'cinematic',hardwareMode:'light',
  bible:{character:'',world:'',visualRules:''},
  scenes:[{id:'s1',order:0,duration:5,prompt:'Scene one',caption:'',assetIds:[]}],
  assets:[]
};}

function releaseProject(){return {
  ...project(),
  scenes:[{id:'s1',order:1,duration:5,prompt:'Scene one',caption:'',assetIds:['a1']}],
  assets:[{
    id:'a1',sceneId:'s1',kind:'video',name:'scene.mp4',hasFile:true,sourcePath:'/media/scene.mp4',provider:'local-import',status:'kept',locked:false,
    provenance:{origin:'owner-created',rightsStatus:'owner-confirmed',sourceLabel:'Owner media',credit:'',note:''}
  }],
  publishing:{title:'Ready title',description:'Ready description'}
};}

function report(){return {
  freeOnlyImageWorkflow:true,
  imageFallback:{enabled:true},
  motionFallback:{enabled:true},
  tools:{ffmpeg:{available:true},ffprobe:{available:true}},
  quality:{}
};}

function completedSession(p,r,creation){
  const session=createOneClickSession(p,r,{creation});
  return {
    ...session,
    ledger:{
      ...session.ledger,
      entries:session.ledger.entries.map(entry=>entry.plannedState==='OPTIONAL'?entry:{...entry,state:'DONE',stale:false})
    }
  };
}

test('creates a FREE ONLY session with no publish authority',()=>{
  const session=createOneClickSession(project(),report());
  assert.equal(session.costMode,'FREE ONLY');
  assert.match(session.planFingerprint,/^dpf1-/);
  assert.equal(session.publishAuthorized,false);
  assert.equal(session.automaticPublishingAllowed,false);
});

test('first executable job is director',()=>{
  const p=project(),r=report();
  const session=createOneClickSession(p,r);
  const inspected=inspectOneClickSession(p,r,session);
  assert.equal(inspected.valid,true);
  assert.equal(inspected.nextAction,'RUN_NEXT_READY_JOB');
  assert.equal(inspected.nextJob.id,'director:project');
});

test('project revision change requires replan instead of continuing stale session',()=>{
  const p=project(),r=report();
  const session=createOneClickSession(p,r);
  const changed={...p,revision:2};
  const inspected=inspectOneClickSession(changed,r,session);
  assert.equal(inspected.valid,false);
  assert.equal(inspected.nextAction,'REPLAN');
});

test('provider capability drift requires replan instead of using the saved route',()=>{
  const p=project(),r=report();
  const session=createOneClickSession(p,r);
  const changedReport={...r,freeOnlyImageWorkflow:false};
  const inspected=inspectOneClickSession(p,changedReport,session);
  assert.equal(inspected.valid,false);
  assert.equal(inspected.reason,'execution-plan-changed');
  assert.equal(inspected.nextAction,'REPLAN');
  assert.notEqual(inspected.savedPlanFingerprint,inspected.currentPlanFingerprint);
});

test('changing creation options requires a fresh one-click plan',()=>{
  const p=project(),r=report();
  const session=createOneClickSession(p,r,{creation:{wantMotion:true,wantAudio:false,wantCaptions:true}});
  const inspected=inspectOneClickSession(p,r,session,{creation:{wantMotion:false,wantAudio:false,wantCaptions:true}});
  assert.equal(inspected.valid,false);
  assert.equal(inspected.reason,'execution-plan-changed');
});

test('incomplete session never produces publish readiness',()=>{
  const p=project(),r=report();
  const session=createOneClickSession(p,r);
  const status=oneClickCompletionStatus(p,r,session);
  assert.equal(status.readiness,null);
  assert.equal(status.publishAuthorized,false);
  assert.notEqual(status.state,'OWNER APPROVED — MANUAL PUBLISH ONLY');
});

test('terminal failed creation job cannot fall through into final readiness',()=>{
  const p=project(),r=report();
  const session=createOneClickSession(p,r,{creation:{wantAudio:false,wantMotion:true,wantCaptions:true}});
  const failedSession={
    ...session,
    ledger:{
      ...session.ledger,
      entries:session.ledger.entries.map(entry=>({
        ...entry,
        state:entry.jobId==='image:s1'?'FAILED':entry.state==='OPTIONAL'?'OPTIONAL':'DONE',
        stale:false
      }))
    }
  };
  const inspected=inspectOneClickSession(p,r,failedSession,{creation:{wantAudio:false,wantMotion:true,wantCaptions:true}});
  assert.equal(inspected.progress.complete,true);
  assert.equal(inspected.nextAction,'REVIEW_BLOCKERS');
  const status=oneClickCompletionStatus(p,r,failedSession,{creation:{wantAudio:false,wantMotion:true,wantCaptions:true}});
  assert.equal(status.state,'REVIEW_BLOCKERS');
  assert.equal(status.readiness,null);
  assert.equal(status.manualPublishEligible,false);
  assert.equal(status.publishAuthorized,false);
});

test('manual publish eligibility requires the same current technical evidence stamp used for verified owner approval',()=>{
  const p=releaseProject(),r=report();
  const creation={wantAudio:false,wantMotion:false,wantCaptions:false};
  const session=completedSession(p,r,creation);
  const facts=[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5},'ffprobe')];
  const approval=makeVerifiedOwnerReleaseApproval(p,facts,{
    visualAudioApproved:true,
    rightsApproved:true,
    platformSettingsReviewed:true
  });
  const ready=oneClickCompletionStatus(p,r,session,{creation,factSets:facts,ownerReleaseApproval:approval});
  assert.equal(ready.state,'OWNER APPROVED — MANUAL PUBLISH ONLY');
  assert.equal(ready.manualPublishEligible,true);
  assert.equal(ready.publishAuthorized,false);

  const changedFacts=[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5.1},'ffprobe')];
  const stale=oneClickCompletionStatus(p,r,session,{creation,factSets:changedFacts,ownerReleaseApproval:approval});
  assert.equal(stale.state,'OWNER APPROVAL REQUIRED');
  assert.equal(stale.releaseContext.ownerApproval.reason,'technical-evidence-changed');
  assert.equal(stale.manualPublishEligible,false);
});
