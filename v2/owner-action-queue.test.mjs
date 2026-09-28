import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset} from './core.mjs';
import {ownerActionQueue,needsOwnerInterruption} from './owner-action-queue.mjs';

function projectWithImportedAsset(){
  let project=planScenes(createProject('Small story'),5);
  const sceneId=project.scenes[0].id;
  project=addAsset(project,sceneId,{kind:'image',name:'photo.png',hasFile:true,size:100,sourcePath:'/media/photo.png',provider:'local-import'});
  return project;
}

test('rights review is surfaced as a blocking owner action',()=>{
  const project=projectWithImportedAsset();
  const queue=ownerActionQueue(project);
  assert.equal(queue.publishAuthorized,false);
  assert.equal(queue.actions.some(item=>item.id==='review-rights'&&item.blocking),true);
  assert.equal(needsOwnerInterruption(project),true);
});

test('optional cleanup remains owner-review only and never permits automatic deletion',()=>{
  let project=projectWithImportedAsset();
  const sceneId=project.scenes[0].id;
  project=addAsset(project,sceneId,{kind:'video',name:'derived.mp4',hasFile:true,size:500,sourcePath:'/media/derived.mp4',provider:'fallback',parentAssetId:project.assets[0].id});
  const derivedId=project.assets.at(-1).id;
  project={...project,assets:project.assets.map(asset=>asset.id===derivedId?{...asset,status:'needs regeneration'}:asset)};
  const queue=ownerActionQueue(project,{includeCleanup:true});
  const cleanup=queue.actions.find(item=>item.id==='review-storage-cleanup');
  assert.ok(cleanup);
  assert.deepEqual(cleanup.candidateIds,[derivedId]);
  assert.equal(queue.publishAuthorized,false);
});

test('system-fix work is labeled separately from genuine owner interruption',()=>{
  const project={...createProject('Broken'),scenes:[],assets:[],publishing:{}};
  const queue=ownerActionQueue(project,{includeBackup:true});
  const fixes=queue.actions.filter(item=>item.kind==='system-fix');
  assert.ok(fixes.length>=1);
  assert.equal(fixes.every(item=>item.blocking===false),true);
});
