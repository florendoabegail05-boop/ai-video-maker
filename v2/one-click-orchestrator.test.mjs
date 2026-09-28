import test from 'node:test';
import assert from 'node:assert/strict';
import {createOneClickSession,inspectOneClickSession,oneClickCompletionStatus} from './one-click-orchestrator.mjs';

function project(){return {
  id:'p1',revision:1,prompt:'Make a short',style:'cinematic',hardwareMode:'light',
  scenes:[{id:'s1',order:0,duration:5,prompt:'Scene one',caption:'',assetIds:[]}],
  assets:[]
};}

function report(){return {
  freeOnlyImageWorkflow:true,
  imageFallback:{enabled:true},
  motionFallback:{enabled:true},
  tools:{ffmpeg:{available:true},ffprobe:{available:true}},
  quality:{}
};}

test('creates a FREE ONLY session with no publish authority',()=>{
  const session=createOneClickSession(project(),report());
  assert.equal(session.costMode,'FREE ONLY');
  assert.equal(session.publishAuthorized,false);
  assert.equal(session.automaticPublishingAllowed,false);
});

test('first executable job is director',()=>{
  const p=project(),r=report();
  const session=createOneClickSession(p,r);
  const inspected=inspectOneClickSession(p,r,session);
  assert.equal(inspected.valid,true);
  assert.equal(inspected.nextAction,'RUN_NEXT_READY_JOB');
  assert.equal(inspected.nextJob.id,'director:project');
});

test('project revision change requires replan instead of continuing stale session',()=>{
  const p=project(),r=report();
  const session=createOneClickSession(p,r);
  const changed={...p,revision:2};
  const inspected=inspectOneClickSession(changed,r,session);
  assert.equal(inspected.valid,false);
  assert.equal(inspected.nextAction,'REPLAN');
});

test('incomplete session never produces publish readiness',()=>{
  const p=project(),r=report();
  const session=createOneClickSession(p,r);
  const status=oneClickCompletionStatus(p,r,session);
  assert.equal(status.readiness,null);
  assert.equal(status.publishAuthorized,false);
  assert.notEqual(status.state,'OWNER APPROVED — MANUAL PUBLISH ONLY');
});
