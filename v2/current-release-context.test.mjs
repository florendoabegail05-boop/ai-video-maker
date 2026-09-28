import test from 'node:test';
import assert from 'node:assert/strict';
import {currentReleaseContext} from './current-release-context.mjs';
import {machineFinalMediaFacts} from './final-media-facts.mjs';
import {makeVerifiedOwnerReleaseApproval} from './verified-release-approval.mjs';

function project(rightsStatus='owner-confirmed'){
  return {
    id:'p1',revision:1,prompt:'x',style:'cinematic',hardwareMode:'light',bible:{character:'',world:'',visualRules:''},
    scenes:[{id:'s1',order:1,duration:5,prompt:'x',caption:'',assetIds:['a1']}],
    assets:[{
      id:'a1',sceneId:'s1',kind:'video',name:'scene.mp4',hasFile:true,sourcePath:'/media/scene.mp4',
      provider:'local-import',status:'kept',locked:false,
      provenance:{origin:'owner-created',rightsStatus,sourceLabel:'Owner media',credit:'',note:''}
    }],
    publishing:{title:'Test',description:'Test description'}
  };
}
function factsFor(p){return [machineFinalMediaFacts(p,{width:1080,height:1920,duration:5},'ffprobe')];}
function verifiedApprovalFor(p,overrides={}){
  const approval=makeVerifiedOwnerReleaseApproval(p,factsFor(p),{
    visualAudioApproved:true,
    rightsApproved:true,
    platformSettingsReviewed:true
  });
  return {...approval,...overrides};
}

test('rights readiness is derived from project provenance instead of a caller boolean',()=>{
  const p=project('needs-review');
  const context=currentReleaseContext(p);
  assert.equal(context.rights.complete,false);
  assert.equal(context.rights.status,'review-required');
  assert.equal(context.provenanceSummary.needingReview,1);
  assert.equal(context.publishAuthorized,false);
});

test('a complete fresh verified owner release approval is recognized as current',()=>{
  const p=project();
  const context=currentReleaseContext(p,{ownerReleaseApproval:verifiedApprovalFor(p)});
  assert.equal(context.rights.complete,true);
  assert.equal(context.ownerApproval.current,true);
  assert.equal(context.ownerApproval.status,'approved-current');
  assert.equal(context.ownerApproval.technicalVerifiedAtApproval,true);
  assert.equal(context.approvalFreshness.fresh,true);
});

test('rights metadata change makes an earlier verified approval stale',()=>{
  const p=project();
  const approval=verifiedApprovalFor(p);
  const changed={...p,assets:p.assets.map(asset=>({...asset,provenance:{...asset.provenance,credit:'Changed credit'}}))};
  const context=currentReleaseContext(changed,{ownerReleaseApproval:approval});
  assert.equal(context.ownerApproval.current,false);
  assert.equal(context.approvalFreshness.fresh,false);
  assert.equal(context.approvalFreshness.reason,'release-inputs-changed');
});

test('matching release signature is insufficient when explicit owner confirmation flags are incomplete',()=>{
  const p=project();
  const context=currentReleaseContext(p,{ownerReleaseApproval:verifiedApprovalFor(p,{platformSettingsReviewed:false})});
  assert.equal(context.ownerApproval.current,false);
  assert.equal(context.publishAuthorized,false);
  assert.equal(context.automaticPublishingAllowed,false);
});

test('legacy owner approval record cannot bypass verified one-click release approval',()=>{
  const p=project();
  const legacy={
    schema:1,
    kind:'aivm-v2-owner-release-approval',
    projectId:p.id,
    visualAudioApproved:true,
    rightsApproved:true,
    platformSettingsReviewed:true
  };
  const context=currentReleaseContext(p,{ownerReleaseApproval:legacy});
  assert.equal(context.ownerApproval.current,false);
  assert.equal(context.ownerApproval.reason,'verified-approval-required');
  assert.equal(context.publishAuthorized,false);
});
