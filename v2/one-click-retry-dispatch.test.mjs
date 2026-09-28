import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset} from './core.mjs';
import {createOneClickSession} from './one-click-orchestrator.mjs';
import {updateDraftJobState} from './draft-execution-ledger.mjs';
import {prepareOneClickRetryDispatch} from './one-click-retry-dispatch.mjs';
import {validateOneClickDispatch} from './one-click-dispatch-envelope.mjs';

function project(){return planScenes(createProject('A child waves beside a tree.'),5);}
function report(){return {imageFallback:{enabled:true},motionFallback:{enabled:true},tools:{ffmpeg:{available:true},ffprobe:{available:true}}};}
const creation={wantAudio:false,wantMotion:true,wantCaptions:true};

function failedImageSession(p,r,message='temporary local bridge timeout'){
  let session=createOneClickSession(p,r,{creation});
  session={...session,ledger:updateDraftJobState(session.ledger,'director:project','RUNNING')};
  session={...session,ledger:updateDraftJobState(session.ledger,'director:project','DONE')};
  const imageId=`image:${p.scenes[0].id}`;
  session={...session,ledger:updateDraftJobState(session.ledger,imageId,'RUNNING')};
  session={...session,ledger:updateDraftJobState(session.ledger,imageId,'FAILED',{message})};
  return {session,imageId};
}

test('eligible image failure can be explicitly prepared as a fresh guarded retry',()=>{
  const p=project(),r=report();
  const {session,imageId}=failedImageSession(p,r);
  const retry=prepareOneClickRetryDispatch(p,r,session,imageId,{creation,explicitRetry:true});
  assert.equal(retry.prepared,true);
  assert.equal(retry.reason,'retry-ready');
  assert.equal(retry.nextAction,'DISPATCH_PREPARED_RETRY');
  assert.equal(retry.envelope.retry,true);
  assert.equal(retry.envelope.jobType,'image');
  assert.equal(retry.envelope.retryAttempt,2);
  assert.equal(retry.envelope.automaticRetryAllowed,false);
  assert.equal(retry.envelope.publishAuthorized,false);
  assert.equal(retry.session.ledger.entries.find(item=>item.jobId===imageId).state,'RUNNING');
  assert.deepEqual(validateOneClickDispatch(p,retry.envelope),{ok:true,reason:'current-free-only-guarded'});
});

test('retry never starts without an explicit retry request',()=>{
  const p=project(),r=report();
  const {session,imageId}=failedImageSession(p,r);
  const retry=prepareOneClickRetryDispatch(p,r,session,imageId,{creation});
  assert.equal(retry.prepared,false);
  assert.equal(retry.reason,'explicit-retry-required');
  assert.equal(retry.automaticRetryAllowed,false);
  assert.equal(retry.session.ledger.entries.find(item=>item.jobId===imageId).state,'FAILED');
});

test('owner, login, captcha or paid failures cannot be retried by the dispatcher',()=>{
  const p=project(),r=report();
  const {session,imageId}=failedImageSession(p,r,'captcha login permission required');
  const retry=prepareOneClickRetryDispatch(p,r,session,imageId,{creation,explicitRetry:true});
  assert.equal(retry.prepared,false);
  assert.equal(retry.reason,'owner-or-paid-action-required');
  assert.equal(retry.nextAction,'OWNER_OR_MANUAL_INPUT_REQUIRED');
});

test('retry limit is enforced before a second retry can start',()=>{
  const p=project(),r=report();
  const {session,imageId}=failedImageSession(p,r);
  const atLimit={...session,ledger:updateDraftJobState(session.ledger,imageId,'RUNNING')};
  const failedAgain={...atLimit,ledger:updateDraftJobState(atLimit.ledger,imageId,'FAILED',{message:'temporary local bridge timeout'})};
  const retry=prepareOneClickRetryDispatch(p,r,failedAgain,imageId,{creation,explicitRetry:true});
  assert.equal(retry.prepared,false);
  assert.equal(retry.reason,'retry-limit-reached');
});

test('project revision drift forces replan instead of retrying stale work',()=>{
  const p=project(),r=report();
  const {session,imageId}=failedImageSession(p,r);
  const changed={...p,revision:p.revision+1};
  const retry=prepareOneClickRetryDispatch(changed,r,session,imageId,{creation,explicitRetry:true});
  assert.equal(retry.prepared,false);
  assert.equal(retry.nextAction,'REPLAN');
});

test('motion retry binds the exact current source image in its fresh generation guard',()=>{
  const r=report();
  let p=project();
  const scene=p.scenes[0];
  p=addAsset(p,scene.id,{kind:'image',name:'source.png',hasFile:true,sourcePath:'C:\\AIVM\\media\\source.png',provider:'basic-local-still'});
  let session=createOneClickSession(p,r,{creation});
  session={...session,ledger:updateDraftJobState(session.ledger,'director:project','RUNNING')};
  session={...session,ledger:updateDraftJobState(session.ledger,'director:project','DONE')};
  const imageId=`image:${scene.id}`;
  session={...session,ledger:updateDraftJobState(session.ledger,imageId,'RUNNING')};
  session={...session,ledger:updateDraftJobState(session.ledger,imageId,'DONE')};
  const motionId=`motion:${scene.id}`;
  session={...session,ledger:updateDraftJobState(session.ledger,motionId,'RUNNING')};
  session={...session,ledger:updateDraftJobState(session.ledger,motionId,'FAILED',{message:'temporary ffmpeg lock'})};
  const retry=prepareOneClickRetryDispatch(p,r,session,motionId,{creation,explicitRetry:true});
  assert.equal(retry.prepared,true);
  assert.equal(retry.envelope.jobType,'motion');
  assert.equal(retry.envelope.payload.sourceAssetId,p.assets.at(-1).id);
  assert.equal(retry.envelope.generationGuard.parentAssetId,p.assets.at(-1).id);
});
