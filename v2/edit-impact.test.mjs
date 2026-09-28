import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset} from './core.mjs';
import {previewScenePromptImpact,previewBibleImpact,previewReferenceImpact,previewSceneMoveImpact,previewEditImpact} from './edit-impact.mjs';

function generated(project,sceneId,name,kind='image'){
  return addAsset(project,sceneId,{kind,name,hasFile:true,sourcePath:'/media/'+name,provider:'fallback',duration:kind==='video'?5:null});
}

test('scene prompt impact targets only unlocked generated visuals in that scene',()=>{
  let project=planScenes(createProject('Story'),10);
  const first=project.scenes[0].id,second=project.scenes[1].id;
  project=generated(project,first,'a.png');const a=project.assets.at(-1).id;
  project=generated(project,second,'b.png');const b=project.assets.at(-1).id;
  project=addAsset(project,first,{kind:'image',name:'imported.png',hasFile:true,sourcePath:'/media/imported.png',provider:'local-import'});
  const result=previewScenePromptImpact(project,first);
  assert.deepEqual(result.wouldInvalidate,[a]);
  assert.ok(!result.ids.includes(b));
  assert.equal(result.unlocked,1);
});

test('locked generated visuals are reported as preserved',()=>{
  let project=planScenes(createProject('Story'),5);
  const scene=project.scenes[0].id;
  project=generated(project,scene,'locked.png');const id=project.assets.at(-1).id;
  project=updateAsset(project,id,'lock');
  const result=previewBibleImpact(project);
  assert.deepEqual(result.wouldInvalidate,[]);
  assert.deepEqual(result.wouldPreserveLocked,[id]);
  assert.equal(result.locked,1);
});

test('reference impact is global but never mutates project',()=>{
  let project=planScenes(createProject('Story'),10);
  project=generated(project,project.scenes[0].id,'one.png');
  project=generated(project,project.scenes[1].id,'two.mp4','video');
  const before=JSON.stringify(project);
  const result=previewReferenceImpact(project);
  assert.equal(result.change,'visual-reference');
  assert.equal(result.wouldInvalidate.length,2);
  assert.equal(JSON.stringify(project),before);
});

test('scene move impact reviews continuity from earliest moved position onward without auto invalidation',()=>{
  let project=planScenes(createProject('Story'),15);
  for(const [index,scene] of project.scenes.entries())project=generated(project,scene.id,`s${index}.png`);
  const moved=project.scenes[1].id;
  const result=previewSceneMoveImpact(project,moved,-1);
  assert.equal(result.autoInvalidate,false);
  assert.deepEqual(result.scope.continuityAffectedSceneIds,project.scenes.map(scene=>scene.id));
  assert.equal(result.suggestedReview.length,3);
});

test('moving a later scene affects only that earliest position onward',()=>{
  let project=planScenes(createProject('Story'),20);
  for(const [index,scene] of project.scenes.entries())project=generated(project,scene.id,`s${index}.png`);
  const moved=project.scenes[2].id;
  const result=previewSceneMoveImpact(project,moved,1);
  assert.deepEqual(result.scope.continuityAffectedSceneIds,project.scenes.slice(2).map(scene=>scene.id));
  assert.equal(result.suggestedReview.length,2);
});

test('generic preview dispatches and rejects unsafe input',()=>{
  const project=planScenes(createProject('Story'),5);
  assert.equal(previewEditImpact(project,{type:'scene-prompt',sceneId:project.scenes[0].id}).change,'scene-prompt');
  assert.throws(()=>previewEditImpact(project,{type:'unknown'}),/Unsupported/);
  assert.throws(()=>previewSceneMoveImpact(project,project.scenes[0].id,-1),/Cannot move/);
});
