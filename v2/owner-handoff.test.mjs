import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset} from './core.mjs';
import {setPublishingDetails,setFinalVerification} from './publishing.mjs';
import {makeFinalOutputManifest} from './final-output.mjs';
import {makeOwnerHandoffPackage} from './owner-handoff.mjs';

test('owner handoff is portable and names blockers when incomplete',()=>{
  const project=planScenes(createProject('PRIVATE PROMPT','Demo'),5);
  const result=makeOwnerHandoffPackage(project);
  assert.equal(result.state,'NOT READY');
  assert.ok(result.blockers.length>0);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE PROMPT|sourcePath|127\.0\.0\.1|"history"/);
});

test('owner handoff becomes owner-review state only with fresh final verification',()=>{
  let project=planScenes(createProject('Story','Demo'),5);
  const scene=project.scenes[0];
  project=addAsset(project,scene.id,{kind:'video',name:'clip.mp4',hasFile:true,size:100000,duration:5,sourcePath:'C:/private/clip.mp4'});
  project=updateAsset(project,project.assets.at(-1).id,'keep');
  project=setPublishingDetails(project,{title:'Demo title',description:'Description'});
  const manifest=makeFinalOutputManifest(project,{video:{width:1080,height:1920},duration:5,bytes:1000000});
  project=setFinalVerification(project,manifest);
  const result=makeOwnerHandoffPackage(project);
  assert.equal(result.state,'OWNER REVIEW REQUIRED');
  assert.equal(result.deterministicChecksPassed,true);
  assert.equal(result.finalVideoVerification.fresh,true);
  assert.equal(result.blockers.length,0);
});
