import test from 'node:test';
import assert from 'node:assert/strict';
import {oneClickStatusView,ownerApprovalReviewDetail} from './one-click-status-view.mjs';
import {createOneClickSession} from './one-click-orchestrator.mjs';
import {machineFinalMediaFacts} from './final-media-facts.mjs';

function project(){return {id:'p1',revision:1,prompt:'demo',style:'custom',hardwareMode:'light',bible:{character:'',world:'',visualRules:''},scenes:[{id:'s1',order:1,duration:5,prompt:'scene one',caption:'',assetIds:[]}],assets:[]};}
function report(){return {imageFallback:{enabled:true},motionFallback:{enabled:true},tools:{ffmpeg:{available:true},ffprobe:{available:true}}};}
const creation={wantAudio:false,wantMotion:false,wantCaptions:false};

function completedSession(p,r){
  const session=createOneClickSession(p,r,{creation});
  return {
    ...session,
    ledger:{
      ...session.ledger,
      entries:session.ledger.entries.map(entry=>entry.plannedState==='OPTIONAL'?entry:{...entry,state:'DONE',stale:false})
    }
  };
}

test('status view starts with creation progress and no publish authority',()=>{
  const p=project(),r=report(),s=createOneClickSession(p,r,{creation});
  const view=oneClickStatusView(p,r,s,{creation});
  assert.equal(view.kind,'aivm-v2-one-click-status-view');
  assert.equal(view.progress,0);
  assert.equal(view.publishAuthorized,false);
  assert.equal(view.automaticPublishingAllowed,false);
  assert.equal(view.sections[0].state,'DONE');
  assert.equal(view.creationProgress.actionable,s.ledger.entries.filter(item=>item.plannedState!=='OPTIONAL').length);
});

test('changed project requires replan instead of continuing stale session',()=>{
  const p=project(),r=report(),s=createOneClickSession(p,r,{creation});
  const changed={...p,revision:2};
  const view=oneClickStatusView(changed,r,s,{creation});
  assert.equal(view.state,'REPLAN REQUIRED');
  assert.equal(view.nextAction,'REPLAN');
  assert.equal(view.publishAuthorized,false);
});

test('completed creation with missing trusted final facts asks for verification, not owner approval',()=>{
  const p=project(),r=report(),s=completedSession(p,r);
  const view=oneClickStatusView(p,r,s,{creation});
  assert.equal(view.state,'TECHNICAL VERIFICATION REQUIRED');
  assert.equal(view.nextAction,'RUN_FINAL_VERIFICATION');
  assert.equal(view.sections.find(item=>item.id==='verify').state,'REQUIRED');
  assert.equal(view.sections.find(item=>item.id==='review').state,'WAITING');
  assert.equal(view.ownerActionRequired,false);
  assert.equal(view.manualPublishEligible,false);
});

test('technical pass advances to rights review using current project provenance',()=>{
  const p=project(),r=report(),s=completedSession(p,r);
  const facts=[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5},'ffprobe')];
  const view=oneClickStatusView(p,r,s,{creation,factSets:facts});
  assert.equal(view.state,'RIGHTS REVIEW REQUIRED');
  assert.equal(view.nextAction,'REVIEW_RIGHTS');
  assert.equal(view.sections.find(item=>item.id==='verify').state,'DONE');
  assert.equal(view.sections.find(item=>item.id==='review').state,'REQUIRED');
  assert.equal(view.ownerActionRequired,true);
  assert.equal(view.rightsSummary.needingReview,0);
  assert.equal(view.rightsSummary.assets,0);
  assert.equal(view.publishAuthorized,false);
});

test('settled failed creation remains blocked and does not masquerade as final verification work',()=>{
  const p=project(),r=report();
  const session=createOneClickSession(p,r,{creation:{wantAudio:false,wantMotion:true,wantCaptions:true}});
  const failed={
    ...session,
    ledger:{
      ...session.ledger,
      entries:session.ledger.entries.map(entry=>({
        ...entry,
        state:entry.jobId==='image:s1'?'FAILED':entry.plannedState==='OPTIONAL'?'OPTIONAL':'DONE',
        stale:false
      }))
    }
  };
  const view=oneClickStatusView(p,r,failed,{creation:{wantAudio:false,wantMotion:true,wantCaptions:true}});
  assert.equal(view.state,'REVIEW_BLOCKERS');
  assert.equal(view.nextAction,'REVIEW_BLOCKERS');
  assert.equal(view.headline,'Creation blocked');
  assert.equal(view.sections.find(item=>item.id==='create').state,'BLOCKED');
  assert.equal(view.sections.find(item=>item.id==='verify').state,'WAITING');
  assert.equal(view.sections.find(item=>item.id==='review').state,'WAITING');
  assert.equal(view.manualPublishEligible,false);
});

test('skipped optional jobs stay outside required progress totals',()=>{
  const p=project(),r=report();
  const session=createOneClickSession(p,r,{creation:{wantAudio:false,wantMotion:true,wantCaptions:false}});
  const optionalIds=new Set(session.ledger.entries.filter(entry=>entry.plannedState==='OPTIONAL').map(entry=>entry.jobId));
  const adjusted={
    ...session,
    ledger:{
      ...session.ledger,
      entries:session.ledger.entries.map(entry=>optionalIds.has(entry.jobId)?{...entry,state:'SKIPPED'}:entry)
    }
  };
  const view=oneClickStatusView(p,r,adjusted,{creation:{wantAudio:false,wantMotion:true,wantCaptions:false}});
  assert.equal(view.creationProgress.optional,optionalIds.size);
  assert.equal(view.creationProgress.actionable,session.ledger.entries.length-optionalIds.size);
  assert.equal(view.progress,0);
});

test('owner approval refresh reasons give specific safe review guidance',()=>{
  assert.match(ownerApprovalReviewDetail('release-inputs-changed'),/metadata or provenance changed/i);
  assert.match(ownerApprovalReviewDetail('render-inputs-changed'),/render inputs changed/i);
  assert.match(ownerApprovalReviewDetail('technical-evidence-changed'),/technical evidence changed/i);
  assert.match(ownerApprovalReviewDetail('technical-verification-not-current'),/re-establish verification/i);
  assert.match(ownerApprovalReviewDetail('technical-verification-signature-missing'),/new verified owner approval/i);
  assert.match(ownerApprovalReviewDetail('verified-approval-required'),/older approval record/i);
  assert.match(ownerApprovalReviewDetail('owner-confirmations-incomplete'),/all explicit owner release confirmations/i);
  assert.match(ownerApprovalReviewDetail('missing-or-invalid'),/explicit verified owner release approval/i);
});
