import test from 'node:test';
import assert from 'node:assert/strict';
import {createOneClickSession} from './one-click-orchestrator.mjs';
import {prepareNextOneClickDispatch} from './one-click-dispatch-envelope.mjs';
import {processOneClickDispatchResult} from './one-click-result-processor.mjs';

function project(){
  return {
    id:'project-1',
    revision:1,
    prompt:'A small cinematic test scene.',
    style:'cinematic',
    hardwareMode:'light',
    scenes:[{id:'scene-1',order:1,duration:5,prompt:'A child waves beside a tree.',caption:'Hello',assetIds:[]}],
    assets:[]
  };
}

function report(){
  return {
    imageFallback:{enabled:true},
    motionFallback:{enabled:true},
    tools:{ffmpeg:{available:true},ffprobe:{available:true}}
  };
}

const creation={wantAudio:false,wantMotion:true,wantCaptions:true};

function firstDispatch(p=project(),r=report()){
  const session=createOneClickSession(p,r,{creation});
  return prepareNextOneClickDispatch(p,r,session,{creation});
}

test('accepts a current guarded result and advances to the next safe job',()=>{
  const p=project(),r=report(),prepared=firstDispatch(p,r);
  const result=processOneClickDispatchResult(p,r,prepared.session,prepared.envelope,{ok:true,message:'Director plan ready.'},{creation});
  assert.equal(result.accepted,true);
  assert.equal(result.nextAction,'RUN_NEXT_READY_JOB');
  assert.equal(result.nextJob.type,'image');
  assert.equal(result.session.ledger.entries.find(item=>item.jobId==='director:project').state,'DONE');
  assert.equal(result.publishAuthorized,false);
});

test('rejects a result when the dispatch became stale',()=>{
  const p=project(),r=report(),prepared=firstDispatch(p,r);
  const changed={...p,revision:2};
  const result=processOneClickDispatchResult(changed,r,prepared.session,prepared.envelope,{ok:true},{creation});
  assert.equal(result.accepted,false);
  assert.match(result.reason,/stale-dispatch|project-revision/i);
  assert.equal(result.nextAction,'REPLAN');
  assert.equal(prepared.session.ledger.entries.find(item=>item.jobId==='director:project').state,'RUNNING');
});

test('records a failed image job and exposes retry eligibility without auto retrying',()=>{
  const p=project(),r=report();
  const director=firstDispatch(p,r);
  const directorDone=processOneClickDispatchResult(p,r,director.session,director.envelope,{ok:true},{creation});
  const image=prepareNextOneClickDispatch(p,r,directorDone.session,{creation});
  assert.equal(image.envelope.jobType,'image');
  const failed=processOneClickDispatchResult(p,r,image.session,image.envelope,{ok:false,error:'temporary local provider error'},{creation});
  assert.equal(failed.accepted,false);
  assert.equal(failed.nextAction,'RETRY_ELIGIBLE');
  assert.equal(failed.retry.allowed,true);
  assert.equal(failed.automaticRetryAllowed,false);
  assert.equal(failed.session.ledger.entries.find(item=>item.jobId===image.envelope.jobId).state,'FAILED');
});

test('does not silently accept result asset ids that are not already represented in the project',()=>{
  const p=project(),r=report(),prepared=firstDispatch(p,r);
  const result=processOneClickDispatchResult(p,r,prepared.session,prepared.envelope,{ok:true,assetIds:['unknown-asset']},{creation});
  assert.equal(result.accepted,false);
  assert.equal(result.reason,'result-assets-not-in-project');
  assert.equal(result.nextAction,'REVIEW_BLOCKERS');
});

test('owner or paid-action failures are never marked for automatic retry',()=>{
  const p=project(),r=report();
  const director=firstDispatch(p,r);
  const result=processOneClickDispatchResult(p,r,director.session,director.envelope,{ok:false,error:'login permission required'},{creation});
  assert.equal(result.accepted,false);
  assert.equal(result.nextAction,'OWNER_OR_MANUAL_INPUT_REQUIRED');
  assert.equal(result.retry.allowed,false);
  assert.equal(result.retry.reason,'owner-or-paid-action-required');
});
