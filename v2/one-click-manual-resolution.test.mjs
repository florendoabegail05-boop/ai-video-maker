import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,addProjectAudio,editScene} from './core.mjs';
import {createOneClickSession} from './one-click-orchestrator.mjs';
import {updateDraftJobState} from './draft-execution-ledger.mjs';
import {resolveManualOneClickJob,rebaseOneClickSessionForManualMedia} from './one-click-manual-resolution.mjs';

function project(){return planScenes(createProject('A child waves beside a tree.'),5);}
function report(){return {imageFallback:{enabled:false},motionFallback:{enabled:true},tools:{ffmpeg:{available:true},ffprobe:{available:true}}};}
function options(){return {creation:{wantAudio:false,wantMotion:true,wantCaptions:true}};}
function directorDone(p,r=report(),opts=options()){
  let s=createOneClickSession(p,r,opts);
  s={...s,ledger:updateDraftJobState(s.ledger,'director:project','RUNNING')};
  s={...s,ledger:updateDraftJobState(s.ledger,'director:project','DONE')};
  return s;
}

test('imported image safely rebases a stale manual session and satisfies the image job',()=>{
  const r=report();
  let p=project();
  const scene=p.scenes[0];
  const s=directorDone(p,r);
  p=addAsset(p,scene.id,{kind:'image',name:'owner.png',hasFile:true,sourcePath:'C:\\AIVM\\media\\owner.png',provider:'local-import'});
  const result=resolveManualOneClickJob(p,r,s,`image:${scene.id}`,{...options(),explicitResolution:true});
  assert.equal(result.resolved,true);
  assert.equal(result.mode,'image');
  assert.equal(result.session.projectRevision,p.revision);
  assert.equal(result.session.ledger.projectRevision,p.revision);
  assert.equal(result.session.ledger.entries.find(item=>item.jobId===`image:${scene.id}`).state,'DONE');
  assert.equal(result.nextJob.type,'motion');
  assert.deepEqual(result.resultAssetIds,[p.assets.at(-1).id]);
});

test('an existing local scene video skips both manual image and generated motion without deleting media',()=>{
  const r=report();
  let p=project();
  const scene=p.scenes[0];
  const s=directorDone(p,r);
  p=addAsset(p,scene.id,{kind:'video',name:'owner.mp4',hasFile:true,sourcePath:'C:\\AIVM\\media\\owner.mp4',provider:'local-import',duration:5});
  const videoId=p.assets.at(-1).id;
  const result=resolveManualOneClickJob(p,r,s,`image:${scene.id}`,{...options(),explicitResolution:true});
  assert.equal(result.resolved,true);
  assert.equal(result.mode,'video');
  assert.deepEqual(result.resolvedJobs,[`image:${scene.id}`,`motion:${scene.id}`]);
  assert.equal(result.session.ledger.entries.find(item=>item.jobId===`image:${scene.id}`).state,'SKIPPED');
  assert.equal(result.session.ledger.entries.find(item=>item.jobId===`motion:${scene.id}`).state,'SKIPPED');
  assert.deepEqual(result.resultAssetIds,[videoId]);
  assert.equal(p.assets.length,1);
});

test('imported project audio can satisfy a MANUAL audio job',()=>{
  const r={imageFallback:{enabled:true},motionFallback:{enabled:false},tools:{ffmpeg:{available:true},ffprobe:{available:true}}};
  const creation={wantAudio:true,wantMotion:false,wantCaptions:false};
  let p=project();
  let s=directorDone(p,r,{creation});
  p=addProjectAudio(p,{role:'music',name:'music.wav',sourcePath:'C:\\AIVM\\media\\music.wav',size:2048});
  const result=resolveManualOneClickJob(p,r,s,'audio:project',{creation,explicitResolution:true});
  assert.equal(result.resolved,true);
  assert.equal(result.mode,'audio');
  assert.equal(result.session.ledger.entries.find(item=>item.jobId==='audio:project').state,'DONE');
  assert.deepEqual(result.resultAssetIds,[p.assets.at(-1).id]);
});

test('manual resolution refuses to rebase when story or generation inputs changed',()=>{
  const r=report();
  let p=project();
  const scene=p.scenes[0];
  const s=directorDone(p,r);
  p=editScene(p,scene.id,'The child now runs through a rainy market.');
  p=addAsset(p,scene.id,{kind:'image',name:'owner.png',hasFile:true,sourcePath:'C:\\AIVM\\media\\owner.png',provider:'local-import'});
  const result=resolveManualOneClickJob(p,r,s,`image:${scene.id}`,{...options(),explicitResolution:true});
  assert.equal(result.resolved,false);
  assert.equal(result.reason,'manual-resume-inputs-changed');
  assert.equal(result.nextAction,'REPLAN');
});

test('manual rebase waits instead of rebasing while a job is still running',()=>{
  const r=report();
  let p=project();
  const scene=p.scenes[0];
  let s=createOneClickSession(p,r,options());
  s={...s,ledger:updateDraftJobState(s.ledger,'director:project','RUNNING')};
  p=addAsset(p,scene.id,{kind:'image',name:'owner.png',hasFile:true,sourcePath:'C:\\AIVM\\media\\owner.png',provider:'local-import'});
  const result=rebaseOneClickSessionForManualMedia(p,r,s,options());
  assert.equal(result.rebased,false);
  assert.equal(result.reason,'job-still-running');
  assert.equal(result.nextAction,'WAIT');
});

test('manual jobs are never silently completed without explicit resolution',()=>{
  const p=project(),r=report(),s=directorDone(p,r);
  const result=resolveManualOneClickJob(p,r,s,`image:${p.scenes[0].id}`,options());
  assert.equal(result.resolved,false);
  assert.equal(result.reason,'explicit-resolution-required');
  assert.equal(result.nextAction,'OWNER_OR_MANUAL_INPUT_REQUIRED');
});
