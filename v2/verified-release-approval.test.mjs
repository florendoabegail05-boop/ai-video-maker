import test from 'node:test';
import assert from 'node:assert/strict';
import {browserFinalMediaFacts,machineFinalMediaFacts} from './final-media-facts.mjs';
import {makeVerifiedOwnerReleaseApproval,verifiedReleaseApprovalPreflight,verifiedReleaseApprovalFreshness} from './verified-release-approval.mjs';

function project(rightsStatus='owner-confirmed',title='Ready title'){
  return {
    id:'p1',revision:1,prompt:'x',style:'cinematic',hardwareMode:'light',bible:{character:'',world:'',visualRules:''},
    scenes:[{id:'s1',order:1,duration:5,prompt:'x',caption:'',assetIds:['a1']}],
    assets:[{
      id:'a1',sceneId:'s1',kind:'video',name:'scene.mp4',hasFile:true,sourcePath:'/media/scene.mp4',provider:'local-import',status:'kept',locked:false,
      provenance:{origin:'owner-created',rightsStatus,sourceLabel:'Owner media',credit:'',note:''}
    }],
    publishing:{title,description:'Description'}
  };
}
function approvalValues(){return {visualAudioApproved:true,rightsApproved:true,platformSettingsReviewed:true};}

test('verified owner approval requires machine-class current width height and duration evidence',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{width:1080,height:1920,duration:5,fileSize:1000,mimeType:'video/mp4'});
  const preflight=verifiedReleaseApprovalPreflight(p,[browser]);
  assert.equal(preflight.allowed,false);
  assert.equal(preflight.technical.passed,true);
  assert.equal(preflight.technical.machineCoreVerified,false);
  assert.equal(preflight.technical.signature,null);
  assert.match(preflight.blockers.join(' '),/FFprobe|bridge/i);
});

test('current machine facts plus complete provenance and title allow explicit owner approval',()=>{
  const p=project();
  const machine=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,fps:30,audioStream:true,videoCodec:'h264',audioCodec:'aac',container:'mov,mp4'},'ffprobe');
  const facts=[machine];
  const preflight=verifiedReleaseApprovalPreflight(p,facts);
  assert.equal(preflight.allowed,true);
  assert.equal(preflight.technical.machineCoreVerified,true);
  assert.match(preflight.technical.signature,/^tvs1-/);
  const approval=makeVerifiedOwnerReleaseApproval(p,facts,approvalValues());
  assert.equal(approval.kind,'aivm-v2-verified-owner-release-approval');
  assert.equal(approval.technicalVerifiedAtApproval,true);
  assert.equal(approval.technicalVerificationSignature,preflight.technical.signature);
  assert.equal(approval.publishAuthorized,false);
  assert.equal(approval.automaticPublishingAllowed,false);
  assert.equal(verifiedReleaseApprovalFreshness(p,approval,facts).fresh,true);
});

test('incomplete provenance or missing publishing title blocks verified owner approval',()=>{
  const factsFor=p=>[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5},'ffprobe')];
  const rights=project('needs-review');
  assert.equal(verifiedReleaseApprovalPreflight(rights,factsFor(rights)).allowed,false);
  assert.match(verifiedReleaseApprovalPreflight(rights,factsFor(rights)).blockers.join(' '),/rights\/source/i);
  const noTitle=project('owner-confirmed','');
  assert.equal(verifiedReleaseApprovalPreflight(noTitle,factsFor(noTitle)).allowed,false);
  assert.match(verifiedReleaseApprovalPreflight(noTitle,factsFor(noTitle)).blockers.join(' '),/publishing title/i);
});

test('release input changes stale a previously verified approval',()=>{
  const p=project();
  const facts=[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5},'ffprobe')];
  const approval=makeVerifiedOwnerReleaseApproval(p,facts,approvalValues());
  const changed={...p,publishing:{...p.publishing,title:'Changed title'}};
  const changedFacts=[machineFinalMediaFacts(changed,{width:1080,height:1920,duration:5},'ffprobe')];
  const freshness=verifiedReleaseApprovalFreshness(changed,approval,changedFacts);
  assert.equal(freshness.fresh,false);
  assert.equal(freshness.reason,'release-inputs-changed');
});

test('verified approval is not current when trusted technical evidence is no longer supplied',()=>{
  const p=project();
  const facts=[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5},'ffprobe')];
  const approval=makeVerifiedOwnerReleaseApproval(p,facts,approvalValues());
  const freshness=verifiedReleaseApprovalFreshness(p,approval,[]);
  assert.equal(freshness.fresh,false);
  assert.equal(freshness.reason,'technical-verification-not-current');
});

test('changed measured technical evidence invalidates the earlier approval stamp',()=>{
  const p=project();
  const facts=[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5},'ffprobe')];
  const approval=makeVerifiedOwnerReleaseApproval(p,facts,approvalValues());
  const changedFacts=[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5.1},'ffprobe')];
  const freshness=verifiedReleaseApprovalFreshness(p,approval,changedFacts);
  assert.equal(freshness.fresh,false);
  assert.equal(freshness.reason,'technical-evidence-changed');
});

test('legacy owner approval records do not satisfy verified one-click approval freshness',()=>{
  const p=project();
  const legacy={kind:'aivm-v2-owner-release-approval',projectId:p.id};
  const freshness=verifiedReleaseApprovalFreshness(p,legacy,[]);
  assert.equal(freshness.fresh,false);
  assert.equal(freshness.reason,'verified-approval-required');
});
