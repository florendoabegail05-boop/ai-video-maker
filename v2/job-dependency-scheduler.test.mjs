import test from 'node:test';
import assert from 'node:assert/strict';
import {schedulableDraftJobs,nextSchedulableDraftJob,draftScheduleSummary,jobDependencies} from './job-dependency-scheduler.mjs';

function plan(){return {kind:'aivm-v2-draft-job-plan',projectId:'p1',jobs:[
 {id:'director:project',type:'director',state:'READY'},
 {id:'image:s1',type:'image',sceneId:'s1',state:'READY'},
 {id:'motion:s1',type:'motion',sceneId:'s1',state:'READY'},
 {id:'audio:project',type:'audio',state:'MANUAL'},
 {id:'captions:project',type:'captions',state:'READY'},
 {id:'assemble:final',type:'assemble',state:'READY'},
 {id:'verify:final',type:'verify',state:'READY'}
]};}
function ledger(states={}){const p=plan();return {kind:'aivm-v2-draft-execution-ledger',projectId:'p1',entries:p.jobs.map(j=>({jobId:j.id,state:states[j.id]|| (j.state==='MANUAL'?'MANUAL':'PENDING'),stale:false}))};}

test('director is first schedulable job',()=>{const r=schedulableDraftJobs(plan(),ledger());assert.deepEqual(r.ready.map(x=>x.jobId),['director:project']);assert.equal(nextSchedulableDraftJob(plan(),ledger()).jobId,'director:project');});

test('image waits for director and motion waits for image',()=>{let l=ledger({'director:project':'DONE'});let r=schedulableDraftJobs(plan(),l);assert.ok(r.ready.some(x=>x.jobId==='image:s1'));assert.ok(r.ready.some(x=>x.jobId==='captions:project'));assert.ok(r.waiting.some(x=>x.jobId==='motion:s1'));
 l=ledger({'director:project':'DONE','image:s1':'DONE'});r=schedulableDraftJobs(plan(),l);assert.ok(r.ready.some(x=>x.jobId==='motion:s1'));});

test('assemble does not run through unresolved manual dependency',()=>{const l=ledger({'director:project':'DONE','image:s1':'DONE','motion:s1':'DONE','captions:project':'DONE'});const r=schedulableDraftJobs(plan(),l);assert.ok(r.manual.some(x=>x.jobId==='assemble:final'));assert.equal(r.ready.some(x=>x.jobId==='assemble:final'),false);});

test('verify depends on final assembly',()=>{const deps=jobDependencies({id:'verify:final',type:'verify'},plan());assert.deepEqual(deps,['assemble:final']);const l=ledger({'director:project':'DONE','image:s1':'DONE','motion:s1':'DONE','captions:project':'DONE','audio:project':'SKIPPED','assemble:final':'DONE'});const r=schedulableDraftJobs(plan(),l);assert.ok(r.ready.some(x=>x.jobId==='verify:final'));});

test('failed dependency blocks downstream job',()=>{const l=ledger({'director:project':'DONE','image:s1':'FAILED'});const r=schedulableDraftJobs(plan(),l);const motion=r.blocked.find(x=>x.jobId==='motion:s1');assert.equal(motion.reason,'dependency-blocked');});

test('stale entries never schedule and summary never authorizes execution or publish',()=>{const l=ledger();l.entries.find(x=>x.jobId==='director:project').stale=true;const r=schedulableDraftJobs(plan(),l);assert.equal(r.ready.length,0);assert.ok(r.blocked.some(x=>x.jobId==='director:project'));const s=draftScheduleSummary(plan(),l);assert.equal(s.automaticExecutionAllowed,false);assert.equal(s.publishAuthorized,false);});

test('project revision mismatch refuses all scheduling',()=>{
  const p={...plan(),projectRevision:7};
  const l={...ledger(),projectRevision:6};
  const result=schedulableDraftJobs(p,l);
  assert.equal(result.reason,'project-revision-mismatch');
  assert.equal(result.ready.length,0);
  assert.equal(result.blocked.length,0);
  assert.equal(nextSchedulableDraftJob(p,l),null);
  const summary=draftScheduleSummary(p,l);
  assert.equal(summary.valid,false);
  assert.equal(summary.reason,'project-revision-mismatch');
  assert.equal(summary.planRevision,7);
  assert.equal(summary.ledgerRevision,6);
  assert.equal(summary.automaticExecutionAllowed,false);
  assert.equal(summary.publishAuthorized,false);
});

test('a revisioned plan does not schedule against an unrevisioned ledger',()=>{
  const p={...plan(),projectRevision:4};
  const l=ledger();
  const result=schedulableDraftJobs(p,l);
  assert.equal(result.reason,'project-revision-mismatch');
  assert.equal(result.ready.length,0);
});
