import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset,setSceneCaption} from './core.mjs';
import {captureOperationGuard,validateOperationGuard,assertOperationGuard,sceneSignature} from './operation-guard.mjs';

test('matching project and scene guard passes',()=>{
  const project=planScenes(createProject('A small story'),10);
  const sceneId=project.scenes[0].id;
  const guard=captureOperationGuard(project,{kind:'generate-image',sceneId});
  assert.ok(sceneSignature(project,sceneId));
  assert.deepEqual(validateOperationGuard(project,guard),{ok:true,reason:'match'});
});

test('scene edits reject stale async results even when unrelated revisions may be allowed',()=>{
  let project=planScenes(createProject('A small story'),10);
  const sceneId=project.scenes[0].id;
  const guard=captureOperationGuard(project,{kind:'generate-image',sceneId});
  project=setSceneCaption(project,sceneId,'Changed caption');
  assert.equal(validateOperationGuard(project,guard,{allowUnrelatedRevision:true}).reason,'scene-changed');
  assert.throws(()=>assertOperationGuard(project,guard,{allowUnrelatedRevision:true}),/stale/);
});

test('unrelated revision can be accepted only when caller opts in',()=>{
  let project=planScenes(createProject('Two scenes'),10);
  const first=project.scenes[0].id,second=project.scenes[1].id;
  const guard=captureOperationGuard(project,{kind:'scene-task',sceneId:first});
  project=setSceneCaption(project,second,'Unrelated scene caption');
  assert.equal(validateOperationGuard(project,guard).reason,'revision-changed');
  assert.deepEqual(validateOperationGuard(project,guard,{allowUnrelatedRevision:true}),{ok:true,reason:'match'});
});

test('asset lock changes block a result captured before owner lock',()=>{
  let project=planScenes(createProject('One scene'),5);
  const sceneId=project.scenes[0].id;
  project=addAsset(project,sceneId,{kind:'image',name:'candidate.png',hasFile:true,sourcePath:'/media/candidate.png',provider:'fallback'});
  const assetId=project.assets.at(-1).id;
  const guard=captureOperationGuard(project,{kind:'regenerate-asset',assetId});
  project=updateAsset(project,assetId,'lock');
  assert.equal(validateOperationGuard(project,guard,{allowUnrelatedRevision:true}).reason,'asset-became-locked');
});

test('render-sensitive guard catches current timeline render changes',()=>{
  let project=planScenes(createProject('One scene'),5);
  const guard=captureOperationGuard(project,{kind:'assemble-final'});
  project=setSceneCaption(project,project.scenes[0].id,'Burn this into final');
  assert.equal(validateOperationGuard(project,guard,{allowUnrelatedRevision:true,requireRenderMatch:true}).reason,'render-inputs-changed');
});

test('different project is never accepted',()=>{
  const a=planScenes(createProject('A'),5);
  const b=planScenes(createProject('B'),5);
  const guard=captureOperationGuard(a);
  assert.equal(validateOperationGuard(b,guard,{allowUnrelatedRevision:true}).reason,'project-changed');
});
