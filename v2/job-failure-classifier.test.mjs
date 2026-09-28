import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyJobFailure} from './job-failure-classifier.mjs';

test('owner and paid failures require manual action and never retry automatically',()=>{
  const result=classifyJobFailure({code:'LOGIN_REQUIRED',message:'Owner login permission required'});
  assert.equal(result.category,'OWNER_ACTION_REQUIRED');
  assert.equal(result.retryEligible,false);
  assert.equal(result.nextAction,'OWNER_OR_MANUAL_INPUT_REQUIRED');
  assert.equal(result.automaticRetryAllowed,false);
});

test('stale state failures require replan',()=>{
  const result=classifyJobFailure('generation inputs changed while rendering');
  assert.equal(result.category,'STATE_CHANGED');
  assert.equal(result.reason,'state-changed-replan-required');
  assert.equal(result.nextAction,'REPLAN');
});

test('missing capability is a blocker, not a retry loop',()=>{
  const result=classifyJobFailure({message:'FFmpeg missing on this device'});
  assert.equal(result.category,'CAPABILITY_MISSING');
  assert.equal(result.retryEligible,false);
  assert.equal(result.nextAction,'REVIEW_BLOCKERS');
});

test('temporary local failures may be retried explicitly',()=>{
  const result=classifyJobFailure({message:'temporary local bridge error'});
  assert.equal(result.category,'TRANSIENT');
  assert.equal(result.retryEligible,true);
  assert.equal(result.nextAction,'RETRY_ELIGIBLE');
  assert.equal(result.automaticRetryAllowed,false);
});

test('unknown failures remain reviewable and may be retried only under retry policy caps',()=>{
  const result=classifyJobFailure({message:'unexpected executor failure'});
  assert.equal(result.category,'UNKNOWN');
  assert.equal(result.retryEligible,true);
  assert.equal(result.automaticRetryAllowed,false);
});
