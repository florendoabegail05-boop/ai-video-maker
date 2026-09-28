import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset,addProjectAudio} from './core.mjs';
import {storageCleanupPlan,cleanupCandidateIds} from './storage-cleanup-plan.mjs';

function addVideo(project,sceneId,name,{status='candidate',locked=false,parentAssetId=null,size=1000}={}){
  project=addAsset(project,sceneId,{kind:'video',name,sourcePath:'/media/'+name,hasFile:true,duration:5,parentAssetId,size,provider:'fallback'});
  const id=project.assets.at(-1).id;
  if(status==='kept')project=updateAsset(project,id,'keep');
  if(status==='needs regeneration')project=updateAsset(project,id,'regenerate');
  if(locked)project=updateAsset(project,id,'lock');
  return [project,id];
}

test('selected scene media is always protected from cleanup suggestions',()=>{
  let project=planScenes(createProject('One scene'),5);
  const scene=project.scenes[0].id;
  project=addAsset(project,scene,{kind:'image',name:'still.png',sourcePath:'/media/still.png',hasFile:true,provider:'fallback'});
  const still=project.assets.at(-1).id;
  [project]=addVideo(project,scene,'clip.mp4',{status:'kept',parentAssetId:still});
  const plan=storageCleanupPlan(project);
  const selected=plan.items.find(item=>item.name==='clip.mp4');
  assert.equal(selected.protected,true);
  assert.match(selected.protectedBy,/selected video/);
  assert.equal(selected.candidateForOwnerReview,false);
  assert.equal(plan.automaticDeletionAllowed,false);
});

test('locked and reference assets are protected even when stale',()=>{
  let project=planScenes(createProject('One scene'),5);
  const scene=project.scenes[0].id;
  project=addAsset(project,scene,{kind:'image',name:'locked.png',sourcePath:'/media/locked.png',hasFile:true,provider:'fallback'});
  const locked=project.assets.at(-1).id;
  project=updateAsset(project,locked,'lock');
  project={...project,assets:project.assets.map(a=>a.id===locked?{...a,status:'needs regeneration'}:a)};
  project=addAsset(project,scene,{kind:'image',name:'reference.png',sourcePath:'/media/reference.png',hasFile:true,provider:'local-import'});
  const ref=project.assets.at(-1).id;
  project={...project,assets:project.assets.map(a=>a.id===ref?{...a,reference:true,referenceRole:'character'}:a)};
  const plan=storageCleanupPlan(project);
  assert.equal(plan.items.find(i=>i.assetId===locked).protected,true);
  assert.equal(plan.items.find(i=>i.assetId===ref).protected,true);
  assert.deepEqual(cleanupCandidateIds(project),[]);
});

test('only stale unlocked derived media becomes an owner-review cleanup candidate',()=>{
  let project=planScenes(createProject('Two scenes'),10);
  const scene=project.scenes[0].id;
  project=addAsset(project,scene,{kind:'image',name:'parent.png',sourcePath:'/media/parent.png',hasFile:true,provider:'fallback'});
  const parent=project.assets.at(-1).id;
  let staleId;
  [project,staleId]=addVideo(project,scene,'stale.mp4',{status:'needs regeneration',parentAssetId:parent,size:4096});
  project=addAsset(project,project.scenes[1].id,{kind:'video',name:'ordinary.mp4',sourcePath:'/media/ordinary.mp4',hasFile:true,duration:5,provider:'local-import'});
  const plan=storageCleanupPlan(project);
  assert.equal(plan.reviewCandidates,1);
  assert.equal(plan.estimatedReviewBytes,4096);
  assert.deepEqual(cleanupCandidateIds(project),[staleId]);
  assert.equal(plan.items.find(i=>i.name==='ordinary.mp4').candidateForOwnerReview,false);
});

test('selected project audio is protected',()=>{
  let project=createProject('Audio story');
  project=addProjectAudio(project,{role:'music',name:'music.wav',sourcePath:'/media/music.wav',size:1234});
  const plan=storageCleanupPlan(project);
  assert.equal(plan.items[0].protected,true);
  assert.match(plan.items[0].protectedBy,/selected project audio/);
});
