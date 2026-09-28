import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset,setSceneCaption} from './core.mjs';
import {setPublishingDetails,setFinalVerification} from './publishing.mjs';
import {makeFinalOutputManifest} from './final-output.mjs';
import {publishingReadiness,ownerReadyChecklist} from './publishing-readiness.mjs';

function verifiedManifest(project){return makeFinalOutputManifest(project,{video:{width:1080,height:1920},duration:project.scenes.reduce((sum,scene)=>sum+scene.duration,0),bytes:100000,provider:'test'});}

test('new project is not ready and names blocking reasons',()=>{
  const project=createProject('A test video','Test');
  const result=publishingReadiness(project);
  assert.equal(result.readyForOwnerReview,false);
  assert.equal(result.state,'NOT READY');
  assert.ok(result.items.some(item=>item.id==='scene-plan'&&item.blocking));
  assert.ok(result.items.some(item=>item.id==='final-verification'&&item.blocking));
});

test('complete deterministic package becomes owner-review required, never auto publish-ready',()=>{
  let project=planScenes(createProject('One scene','Test'),5);
  const scene=project.scenes[0];
  project=addAsset(project,scene.id,{kind:'video',name:'scene.mp4',hasFile:true,size:100000,duration:5,sourcePath:'C:/local/scene.mp4'});
  project=updateAsset(project,project.assets.at(-1).id,'keep');
  project=setPublishingDetails(project,{title:'Ready title',description:'Description'});
  project=setFinalVerification(project,verifiedManifest(project));
  const result=publishingReadiness(project);
  assert.equal(result.readyForOwnerReview,true);
  assert.equal(result.state,'OWNER REVIEW REQUIRED');
  assert.equal(result.summary.blocking,0);
  assert.ok(result.items.some(item=>item.id==='human-review'&&item.state==='owner'));
  assert.ok(result.items.some(item=>item.id==='rights-review'&&item.state==='owner'));
  const checklist=ownerReadyChecklist(project);
  assert.equal(checklist.deterministicChecksPassed,true);
  assert.match(checklist.note,/does not publish/i);
});

test('optional captions and audio never block deterministic owner review',()=>{
  let project=planScenes(createProject('One scene','Test'),5);
  const scene=project.scenes[0];
  project=addAsset(project,scene.id,{kind:'video',name:'scene.mp4',hasFile:true,size:100000,duration:5,sourcePath:'C:/local/scene.mp4'});
  project=updateAsset(project,project.assets.at(-1).id,'keep');
  project=setPublishingDetails(project,{title:'Ready title',description:''});
  project=setFinalVerification(project,verifiedManifest(project));
  const result=publishingReadiness(project);
  assert.equal(result.readyForOwnerReview,true);
  assert.equal(result.items.find(item=>item.id==='captions').state,'optional');
  assert.equal(result.items.find(item=>item.id==='audio').state,'optional');
});

test('render-input change makes saved final verification stale and blocks owner readiness',()=>{
  let project=planScenes(createProject('One scene','Test'),5);
  const scene=project.scenes[0];
  project=addAsset(project,scene.id,{kind:'video',name:'scene.mp4',hasFile:true,size:100000,duration:5,sourcePath:'C:/local/scene.mp4'});
  project=updateAsset(project,project.assets.at(-1).id,'keep');
  project=setPublishingDetails(project,{title:'Ready title',description:''});
  project=setFinalVerification(project,verifiedManifest(project));
  project=setSceneCaption(project,scene.id,'Changed after verification');
  const result=publishingReadiness(project);
  assert.equal(result.readyForOwnerReview,false);
  const finalItem=result.items.find(item=>item.id==='final-verification');
  assert.equal(finalItem.blocking,true);
  assert.match(finalItem.message,/stale/i);
});
