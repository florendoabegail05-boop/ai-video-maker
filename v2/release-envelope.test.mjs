import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset} from './core.mjs';
import {setPublishingDetails,setFinalVerification} from './publishing.mjs';
import {makeFinalOutputManifest} from './final-output.mjs';
import {setAssetProvenance} from './asset-provenance.mjs';
import {makeOwnerReleaseApproval} from './release-approval.mjs';
import {releaseEnvelopeStatus,makeReleaseEnvelope} from './release-envelope.mjs';

function completeProject(){
  let p=planScenes(createProject('Short story','Release test'),5);
  const scene=p.scenes[0];
  p=addAsset(p,scene.id,{kind:'video',name:'scene.mp4',hasFile:true,size:100000,duration:5,sourcePath:'/local/scene.mp4',provider:'local-import'});
  p=updateAsset(p,p.assets.at(-1).id,'keep');
  p=setAssetProvenance(p,p.assets.at(-1).id,{origin:'owner-created',rightsStatus:'owner-confirmed'});
  p=setPublishingDetails(p,{title:'Release test',description:'Description'});
  const manifest=makeFinalOutputManifest(p,{video:{width:1080,height:1920},duration:5,bytes:2_000_000,provider:'browser-file-metadata'});
  p=setFinalVerification(p,manifest);
  return p;
}

test('ready project still requires explicit owner approval',()=>{
  const project=completeProject();
  const status=releaseEnvelopeStatus(project,null);
  assert.equal(status.deterministicReady,true);
  assert.equal(status.state,'OWNER APPROVAL REQUIRED');
  assert.equal(status.publishAuthorized,false);
});

test('fresh complete approval produces manual-publish-only envelope',()=>{
  const project=completeProject();
  const approval=makeOwnerReleaseApproval(project,{visualAudioApproved:true,rightsApproved:true,platformSettingsReviewed:true,ownerNote:'Reviewed'});
  const status=releaseEnvelopeStatus(project,approval);
  assert.equal(status.ownerApprovalComplete,true);
  assert.equal(status.state,'OWNER APPROVED — MANUAL PUBLISH ONLY');
  const envelope=makeReleaseEnvelope(project,approval);
  assert.equal(envelope.publishAuthorized,false);
  assert.equal(envelope.ownerApproval.publishAuthorized,false);
  assert.equal(envelope.publishing.finalVideoVerified,true);
  assert.equal(envelope.provenance.complete,true);
  assert.doesNotMatch(JSON.stringify(envelope),/\/local\/scene\.mp4|sourcePath|bridgeUrl/);
});

test('changing release inputs makes prior approval stale',()=>{
  let project=completeProject();
  const approval=makeOwnerReleaseApproval(project,{visualAudioApproved:true,rightsApproved:true,platformSettingsReviewed:true});
  project=setPublishingDetails(project,{title:'Changed title',description:'Description'});
  const status=releaseEnvelopeStatus(project,approval);
  assert.equal(status.ownerApprovalFresh,false);
  assert.equal(status.state,'OWNER APPROVAL STALE');
  assert.equal(status.publishAuthorized,false);
});
