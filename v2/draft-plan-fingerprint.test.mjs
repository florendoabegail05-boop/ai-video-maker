import test from 'node:test';
import assert from 'node:assert/strict';
import {draftPlanFingerprint,compareDraftPlans} from './draft-plan-fingerprint.mjs';

function plan(overrides={}){
  return {
    schema:1,
    kind:'aivm-v2-draft-job-plan',
    projectId:'p1',
    projectRevision:1,
    costMode:'FREE ONLY',
    jobs:[
      {id:'director:project',type:'director',state:'READY'},
      {id:'image:s1',type:'image',sceneId:'s1',state:'READY',route:'basic-local-still',destructive:false},
      {id:'motion:s1',type:'motion',sceneId:'s1',state:'READY',route:'ffmpeg-camera-motion',destructive:false},
      {id:'assemble:final',type:'assemble',state:'READY',destructive:false}
    ],
    ...overrides
  };
}

test('revision-only rebases do not change the execution fingerprint',()=>{
  const a=plan();
  const b={...a,projectRevision:9};
  assert.equal(draftPlanFingerprint(a),draftPlanFingerprint(b));
  assert.equal(compareDraftPlans(a,b).match,true);
});

test('route change forces execution replan',()=>{
  const a=plan();
  const b={...a,jobs:a.jobs.map(job=>job.id==='image:s1'?{...job,route:'local-comfyui'}:job)};
  const compared=compareDraftPlans(a,b);
  assert.equal(compared.match,false);
  assert.equal(compared.reason,'execution-plan-changed');
});

test('READY to MANUAL capability drift changes the fingerprint',()=>{
  const a=plan();
  const b={...a,jobs:a.jobs.map(job=>job.id==='image:s1'?{...job,state:'MANUAL',route:'unavailable'}:job)};
  assert.notEqual(draftPlanFingerprint(a),draftPlanFingerprint(b));
});

test('adding or removing jobs changes the fingerprint',()=>{
  const a=plan();
  const b={...a,jobs:a.jobs.filter(job=>job.type!=='motion')};
  assert.equal(compareDraftPlans(a,b).match,false);
});
