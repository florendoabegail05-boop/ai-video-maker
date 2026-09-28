import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateDraftJobRetry,retryLimitForJob,retryableDraftJobs} from './job-retry-policy.mjs';

const imageJob={id:'image:s1',type:'image',sceneId:'s1'};
const failed={jobId:'image:s1',state:'FAILED',attempts:1,stale:false,message:'temporary local bridge error'};

test('image retry is eligible below conservative attempt cap but never auto-started',()=>{
  const result=evaluateDraftJobRetry(imageJob,failed);
  assert.equal(result.allowed,true);
  assert.equal(result.limit,2);
  assert.equal(result.failure.category,'TRANSIENT');
  assert.equal(result.automaticRetryAllowed,false);
});

test('retry stops at attempt cap without losing the classified failure',()=>{
  const result=evaluateDraftJobRetry(imageJob,{...failed,attempts:2});
  assert.equal(result.allowed,false);
  assert.equal(result.reason,'retry-limit-reached');
  assert.equal(result.failure.category,'TRANSIENT');
  assert.equal(result.failure.retryEligible,true);
  assert.equal(result.attempts,2);
  assert.equal(result.limit,2);
});

test('non-retryable failure meaning outranks an exhausted retry counter',()=>{
  const paid=evaluateDraftJobRetry(imageJob,{...failed,attempts:2,message:'paid provider credit required'});
  assert.equal(paid.allowed,false);
  assert.equal(paid.reason,'owner-or-paid-action-required');
  assert.equal(paid.failure.retryEligible,false);
  assert.equal(paid.attempts,2);
});

test('stale and owner or paid failures require replan or owner action',()=>{
  assert.equal(evaluateDraftJobRetry(imageJob,{...failed,stale:true}).allowed,false);
  const paid=evaluateDraftJobRetry(imageJob,{...failed,message:'paid provider credit required'});
  assert.equal(paid.allowed,false);
  assert.equal(paid.reason,'owner-or-paid-action-required');
  const changed=evaluateDraftJobRetry(imageJob,{...failed,message:'scene changed while rendering'});
  assert.equal(changed.allowed,false);
  assert.equal(changed.reason,'state-changed-replan-required');
});

test('missing capabilities do not enter a retry loop',()=>{
  const result=evaluateDraftJobRetry(imageJob,{...failed,message:'FFmpeg missing on this device'});
  assert.equal(result.allowed,false);
  assert.equal(result.reason,'capability-required');
  assert.equal(result.failure.nextAction,'REVIEW_BLOCKERS');
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

test('retryableDraftJobs returns only eligible failed jobs for the same project revision',()=>{
  const plan={kind:'aivm-v2-draft-job-plan',projectId:'p1',projectRevision:3,jobs:[imageJob,{id:'motion:s1',type:'motion',sceneId:'s1'}]};
  const ledger={kind:'aivm-v2-draft-execution-ledger',projectId:'p1',projectRevision:3,entries:[failed,{jobId:'motion:s1',state:'DONE',attempts:1,stale:false}]};
  const result=retryableDraftJobs(plan,ledger);
  assert.equal(result.valid,true);
  assert.deepEqual(result.items.map(item=>item.jobId),['image:s1']);
  assert.equal(result.automaticRetryAllowed,false);
});

test('retryableDraftJobs refuses project mismatch',()=>{
  const plan={kind:'aivm-v2-draft-job-plan',projectId:'p1',projectRevision:1,jobs:[imageJob]};
  const ledger={kind:'aivm-v2-draft-execution-ledger',projectId:'p2',projectRevision:1,entries:[failed]};
  const result=retryableDraftJobs(plan,ledger);
  assert.equal(result.valid,false);
  assert.equal(result.reason,'project-mismatch');
  assert.equal(result.count,0);
});

test('retryableDraftJobs refuses revision mismatch',()=>{
  const plan={kind:'aivm-v2-draft-job-plan',projectId:'p1',projectRevision:2,jobs:[imageJob]};
  const ledger={kind:'aivm-v2-draft-execution-ledger',projectId:'p1',projectRevision:1,entries:[failed]};
  const result=retryableDraftJobs(plan,ledger);
  assert.equal(result.valid,false);
  assert.equal(result.reason,'project-revision-mismatch');
  assert.equal(result.count,0);
});
