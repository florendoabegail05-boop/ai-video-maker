import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateDraftJobRetry,retryLimitForJob,retryableDraftJobs} from './job-retry-policy.mjs';

const imageJob={id:'image:s1',type:'image',sceneId:'s1'};
const failed={jobId:'image:s1',state:'FAILED',attempts:1,stale:false,message:'temporary local bridge error'};

test('image retry is eligible below conservative limit but never auto-started',()=>{
  const result=evaluateDraftJobRetry(imageJob,failed);
  assert.equal(result.allowed,true);
  assert.equal(result.limit,2);
  assert.equal(result.automaticRetryAllowed,false);
});

test('retry stops at limit',()=>{
  const result=evaluateDraftJobRetry(imageJob,{...failed,attempts:2});
  assert.equal(result.allowed,false);
  assert.equal(result.reason,'retry-limit-reached');
});

test('stale and owner/paid failures require replan or owner action',()=>{
  assert.equal(evaluateDraftJobRetry(imageJob,{...failed,stale:true}).allowed,false);
  const paid=evaluateDraftJobRetry(imageJob,{...failed,message:'paid provider credit required'});
  assert.equal(paid.allowed,false);
  assert.equal(paid.reason,'owner-or-paid-action-required');
  const changed=evaluateDraftJobRetry(imageJob,{...failed,message:'scene changed while rendering'});
  assert.equal(changed.reason,'state-changed-replan-required');
});

test('manual blocked running and done jobs are not retry candidates',()=>{
  for(const state of ['MANUAL','BLOCKED','RUNNING','DONE','SKIPPED','OPTIONAL']){
    assert.equal(evaluateDraftJobRetry(imageJob,{...failed,state}).allowed,false);
  }
});

test('custom retry limits are bounded and explicit',()=>{
  assert.equal(retryLimitForJob(imageJob,{image:3}),3);
  assert.equal(retryLimitForJob({id:'x',type:'unknown'}),0);
});

test('retryableDraftJobs returns only eligible failed jobs',()=>{
  const plan={kind:'aivm-v2-draft-job-plan',projectId:'p1',jobs:[imageJob,{id:'motion:s1',type:'motion',sceneId:'s1'}]};
  const ledger={kind:'aivm-v2-draft-execution-ledger',entries:[failed,{jobId:'motion:s1',state:'DONE',attempts:1,stale:false}]};
  const result=retryableDraftJobs(plan,ledger);
  assert.deepEqual(result.items.map(item=>item.jobId),['image:s1']);
  assert.equal(result.automaticRetryAllowed,false);
});
