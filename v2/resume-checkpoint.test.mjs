import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset} from './core.mjs';
import {resumeCheckpoint,shouldAskOwnerNow} from './resume-checkpoint.mjs';

test('new project resumes with system work instead of owner interruption',()=>{
  let project=planScenes(createProject('A short story'),5);
  const checkpoint=resumeCheckpoint(project);
  assert.equal(checkpoint.systemWorkRemaining,true);
  assert.equal(checkpoint.ownerInterruptionNeeded,false);
  assert.equal(shouldAskOwnerNow(project),false);
  assert.notEqual(checkpoint.nextAction.kind,'owner-approval');
  assert.equal(checkpoint.publishAuthorized,false);
});

test('stale generated media is prioritized before owner review',()=>{
  let project=planScenes(createProject('A short story'),5);
  const scene=project.scenes[0].id;
  project=addAsset(project,scene,{kind:'image',name:'generated.png',hasFile:true,size:100,sourcePath:'/media/generated.png',provider:'fallback'});
  const id=project.assets.at(-1).id;
  project=updateAsset(project,id,'regenerate');
  const checkpoint=resumeCheckpoint(project);
  assert.equal(checkpoint.stage,'MEDIA REFRESH');
  assert.equal(checkpoint.nextAction.id,'regenerate-stale-media');
  assert.equal(checkpoint.ownerInterruptionNeeded,false);
});

test('checkpoint never authorizes publishing',()=>{
  const project=planScenes(createProject('A short story'),5);
  const checkpoint=resumeCheckpoint(project);
  assert.equal(checkpoint.publishAuthorized,false);
  assert.match(checkpoint.note,/never authorizes publishing/i);
});
