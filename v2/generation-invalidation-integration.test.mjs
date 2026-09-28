import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset,editScene,setBible,reusableAsset} from './core.mjs';
import {setReferenceAsset,clearReferenceAsset} from './references.mjs';

function generatedImage(project,sceneId,name='generated.png'){
  return addAsset(project,sceneId,{kind:'image',name,hasFile:true,sourcePath:'/media/'+name,provider:'fallback'});
}

test('editing a scene prompt invalidates only unlocked generated media in that scene',()=>{
  let project=planScenes(createProject('A small story'),10);
  const first=project.scenes[0].id,second=project.scenes[1].id;
  project=generatedImage(project,first,'first.png');
  const firstId=project.assets.at(-1).id;
  project=generatedImage(project,second,'second.png');
  const secondId=project.assets.at(-1).id;
  project=editScene(project,first,'A revised first scene');
  assert.equal(project.assets.find(a=>a.id===firstId).status,'needs regeneration');
  assert.equal(project.assets.find(a=>a.id===secondId).status,'candidate');
  assert.equal(reusableAsset(project,first,'image'),null);
});

test('locked generated media survives prompt edits by owner choice',()=>{
  let project=planScenes(createProject('A small story'),5);
  const scene=project.scenes[0].id;
  project=generatedImage(project,scene,'locked.png');
  const id=project.assets.at(-1).id;
  project=updateAsset(project,id,'lock');
  project=editScene(project,scene,'Changed prompt but keep approved image');
  assert.equal(project.assets.find(a=>a.id===id).locked,true);
  assert.notEqual(project.assets.find(a=>a.id===id).status,'needs regeneration');
  assert.equal(reusableAsset(project,scene,'image').id,id);
});

test('changing character/world guidance invalidates unlocked generated visuals but not imports',()=>{
  let project=planScenes(createProject('A small story'),5);
  const scene=project.scenes[0].id;
  project=generatedImage(project,scene,'generated.png');
  const generated=project.assets.at(-1).id;
  project=addAsset(project,scene,{kind:'image',name:'imported.png',hasFile:true,sourcePath:'/media/imported.png',provider:'local-import'});
  const imported=project.assets.at(-1).id;
  project=setBible(project,{character:'Same child in every scene',world:'Blue room',visualRules:'Soft light'});
  assert.equal(project.assets.find(a=>a.id===generated).status,'needs regeneration');
  assert.notEqual(project.assets.find(a=>a.id===imported).status,'needs regeneration');
});

test('setting or clearing visual references invalidates other unlocked generated visuals while preserving the reference asset',()=>{
  let project=planScenes(createProject('A small story'),10);
  const first=project.scenes[0].id,second=project.scenes[1].id;
  project=addAsset(project,first,{kind:'image',name:'reference.png',hasFile:true,sourcePath:'/media/reference.png',provider:'local-import'});
  const referenceId=project.assets.at(-1).id;
  project=generatedImage(project,second,'other.png');
  const otherId=project.assets.at(-1).id;
  project=setReferenceAsset(project,referenceId,{role:'character',label:'Main character',locked:true});
  assert.equal(project.assets.find(a=>a.id===referenceId).locked,true);
  assert.equal(project.assets.find(a=>a.id===otherId).status,'needs regeneration');
  project=clearReferenceAsset(project,referenceId);
  assert.equal(project.assets.find(a=>a.id===referenceId).reference,false);
});
