import test from 'node:test';
import assert from 'node:assert/strict';
import {currentReleaseContext} from './current-release-context.mjs';
import {releaseSignature} from './release-approval.mjs';

function project(rightsStatus='owner-confirmed'){
  return {
    id:'p1',revision:1,prompt:'x',style:'cinematic',hardwareMode:'light',
    scenes:[{id:'s1',order:1,duration:5,prompt:'x',caption:'',assetIds:['a1']}],
    assets:[{
      id:'a1',sceneId:'s1',kind:'video',name:'scene.mp4',hasFile:true,sourcePath:'/media/scene.mp4',
      provider:'local-import',status:'kept',locked:false,
      provenance:{origin:'owner-created',rightsStatus,sourceLabel:'Owner media',credit:'',note:''}
    }],
    publishing:{title:'Test',description:'Test description'}
  };
}

function approvalFor(p,overrides={}){
  return {
    schema:1,
    kind:'aivm-v2-owner-release-approval',
    projectId:p.id,
    projectRevision:p.revision,
    releaseSignature:releaseSignature(p),
    renderSignature:null,
    approvedAt:'2026-09-29T00:00:00.000Z',
    visualAudioApproved:true,
    rightsApproved:true,
    platformSettingsReviewed:true,
    publishAuthorized:false,
    ...overrides
  };
}

test('rights readiness is derived from project provenance instead of a caller boolean',()=>{
  const p=project('needs-review');
  const context=currentReleaseContext(p);
  assert.equal(context.rights.complete,false);
  assert.equal(context.rights.status,'review-required');
  assert.equal(context.provenanceSummary.needingReview,1);
  assert.equal(context.publishAuthorized,false);
});

test('a complete fresh owner release approval is recognized as current',()=>{
  const p=project();
  const context=currentReleaseContext(p,{ownerReleaseApproval:approvalFor(p)});
  assert.equal(context.rights.complete,true);
  assert.equal(context.ownerApproval.current,true);
  assert.equal(context.ownerApproval.status,'approved-current');
  assert.equal(context.approvalFreshness.fresh,true);
});

test('rights metadata change makes an earlier approval stale',()=>{
  const p=project();
  const approval=approvalFor(p);
  const changed={...p,assets:p.assets.map(asset=>({...asset,provenance:{...asset.provenance,credit:'Changed credit'}}))};
  const context=currentReleaseContext(changed,{ownerReleaseApproval:approval});
  assert.equal(context.ownerApproval.current,false);
  assert.equal(context.approvalFreshness.fresh,false);
  assert.equal(context.approvalFreshness.reason,'release-inputs-changed');
});

test('matching signature is insufficient when explicit owner confirmation flags are incomplete',()=>{
  const p=project();
  const context=currentReleaseContext(p,{ownerReleaseApproval:approvalFor(p,{platformSettingsReviewed:false})});
  assert.equal(context.ownerApproval.current,false);
  assert.equal(context.publishAuthorized,false);
  assert.equal(context.automaticPublishingAllowed,false);
});
