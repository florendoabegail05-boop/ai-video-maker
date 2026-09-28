import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset,setSceneCaption,addProjectAudio} from './core.mjs';
import {makeFinalOutputManifest} from './final-output.mjs';
import {renderSignature,verificationFreshness} from './render-signature.mjs';

test('publishing metadata edits do not change render signature',()=>{
  let project=planScenes(createProject('Story','Name'),5);
  const before=renderSignature(project);
  project={...project,publishing:{title:'Changed title',description:'Metadata only'}};
  assert.equal(renderSignature(project),before);
});

test('timeline caption, selected clip and project audio change render signature',()=>{
  let project=planScenes(createProject('Story','Name'),5);
  const scene=project.scenes[0];
  const base=renderSignature(project);
  project=setSceneCaption(project,scene.id,'Hello');
  const captionSignature=renderSignature(project);
  assert.notEqual(captionSignature,base);
  project=addAsset(project,scene.id,{kind:'video',name:'clip.mp4',hasFile:true,size:1000,duration:5,sourcePath:'C:/clip.mp4'});
  project=updateAsset(project,project.assets.at(-1).id,'keep');
  const clipSignature=renderSignature(project);
  assert.notEqual(clipSignature,captionSignature);
  project=addProjectAudio(project,{role:'music',name:'music.wav',size:2000,sourcePath:'C:/music.wav'});
  assert.notEqual(renderSignature(project),clipSignature);
});

test('verification becomes stale after render inputs change',()=>{
  let project=planScenes(createProject('Story','Name'),5);
  const manifest=makeFinalOutputManifest(project,{video:{width:1080,height:1920},duration:5,bytes:500000});
  assert.equal(verificationFreshness(project,manifest).fresh,true);
  project=setSceneCaption(project,project.scenes[0].id,'New burned-in caption');
  const state=verificationFreshness(project,manifest);
  assert.equal(state.fresh,false);
  assert.equal(state.reason,'render-inputs-changed');
});
