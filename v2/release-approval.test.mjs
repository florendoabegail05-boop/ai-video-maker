import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset,setSceneCaption} from './core.mjs';
import {setPublishingDetails,setFinalVerification} from './publishing.mjs';
import {makeFinalOutputManifest} from './final-output.mjs';
import {setAssetProvenance} from './asset-provenance.mjs';
import {releaseApprovalPreflight,makeOwnerReleaseApproval,releaseApprovalFreshness} from './release-approval.mjs';

function completeProject(){
  let project=planScenes(createProject('One safe scene','Release test'),5);
  const scene=project.scenes[0];
  project=addAsset(project,scene.id,{kind:'video',name:'scene.mp4',hasFile:true,size:100000,duration:5,sourcePath:'/media/scene.mp4',provider:'local-import'});
  const assetId=project.assets.at(-1).id;
  project=updateAsset(project,assetId,'keep');
  project=setAssetProvenance(project,assetId,{origin:'owner-created',rightsStatus:'owner-confirmed'});
  project=setPublishingDetails(project,{title:'Release test',description:'Owner-reviewed description'});
  const manifest=makeFinalOutputManifest(project,{video:{width:1080,height:1920},duration:5,bytes:2_000_000,provider:'browser-file-metadata'});
  project=setFinalVerification(project,manifest);
  return project;
}

test('approval preflight requires deterministic readiness and complete provenance',()=>{
  let project=planScenes(createProject('Incomplete','Incomplete'),5);
  let preflight=releaseApprovalPreflight(project);
  assert.equal(preflight.allowed,false);
  assert.ok(preflight.blockers.length>=1);

  project=completeProject();
  preflight=releaseApprovalPreflight(project);
  assert.equal(preflight.allowed,true);
  assert.equal(preflight.provenanceSummary.needingReview,0);
});

test('owner release approval requires all explicit owner confirmations and never authorizes publishing',()=>{
  const project=completeProject();
  assert.throws(()=>makeOwnerReleaseApproval(project,{visualAudioApproved:true,rightsApproved:true}),/platform-settings/i);
  const approval=makeOwnerReleaseApproval(project,{visualAudioApproved:true,rightsApproved:true,platformSettingsReviewed:true,ownerNote:'Reviewed locally'});
  assert.equal(approval.publishAuthorized,false);
  assert.equal(approval.visualAudioApproved,true);
  assert.match(approval.note,/does not upload, publish/i);
  assert.equal(releaseApprovalFreshness(project,approval).fresh,true);
});

test('render or publishing metadata changes make prior release approval stale',()=>{
  let project=completeProject();
  const approval=makeOwnerReleaseApproval(project,{visualAudioApproved:true,rightsApproved:true,platformSettingsReviewed:true});
  project=setPublishingDetails(project,{title:'Changed title',description:'Owner-reviewed description'});
  assert.equal(releaseApprovalFreshness(project,approval).fresh,false);

  project=completeProject();
  const approval2=makeOwnerReleaseApproval(project,{visualAudioApproved:true,rightsApproved:true,platformSettingsReviewed:true});
  project=setSceneCaption(project,project.scenes[0].id,'New burned-in caption');
  assert.equal(releaseApprovalFreshness(project,approval2).fresh,false);
});

test('rights metadata changes make prior release approval stale',()=>{
  let project=completeProject();
  const approval=makeOwnerReleaseApproval(project,{visualAudioApproved:true,rightsApproved:true,platformSettingsReviewed:true});
  const assetId=project.assets[0].id;
  project=setAssetProvenance(project,assetId,{origin:'licensed',rightsStatus:'license-confirmed',credit:'Updated credit'});
  assert.equal(releaseApprovalFreshness(project,approval).fresh,false);
});
