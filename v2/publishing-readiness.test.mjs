import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset} from './core.mjs';
import {setPublishingDetails,setFinalVerification} from './publishing.mjs';
import {publishingReadiness,ownerReadyChecklist} from './publishing-readiness.mjs';

function verifiedManifest(project){return{schema:1,kind:'aivm-v2-final-output-manifest',projectId:project.id,projectRevision:project.revision,verifiedAt:new Date().toISOString(),verified:true,expected:{width:1080,height:1920,duration:5},actual:{width:1080,height:1920,duration:5,bytes:100000,hasVideo:true,hasAudio:false},issues:[],provider:'test'};}

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
