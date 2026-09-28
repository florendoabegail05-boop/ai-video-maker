import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraftExecutionLedger,validateDraftExecutionLedger,updateDraftJobState,markLedgerStale,draftExecutionSummary} from './draft-execution-ledger.mjs';

function project(){return {id:'p1',revision:1,prompt:'test',style:'custom',hardwareMode:'light',scenes:[{id:'s1',order:1,duration:5,prompt:'scene one',caption:''}],assets:[]};}
function report(){return {freeOnlyImageWorkflow:true,imageFallback:{enabled:true},motionFallback:{enabled:true},tools:{ffmpeg:{available:true},ffprobe:{available:true}},quality:{}};}

test('creates ledger from current FREE ONLY draft plan',()=>{
 const p=project(),r=report();
 const ledger=createDraftExecutionLedger(p,r,{wantAudio:false});
 assert.equal(ledger.projectId,'p1');
 assert.ok(ledger.entries.some(e=>e.jobId==='image:s1'));
 assert.ok(ledger.entries.some(e=>e.jobId==='assemble:final'));
 assert.equal(ledger.automaticPublishingAllowed,false);
});

test('tracks running and done states without reopening completed work',()=>{
 let ledger=createDraftExecutionLedger(project(),report(),{wantAudio:false});
 ledger=updateDraftJobState(ledger,'image:s1','RUNNING');
 assert.equal(ledger.entries.find(e=>e.jobId==='image:s1').attempts,1);
 ledger=updateDraftJobState(ledger,'image:s1','DONE',{resultAssetIds:['a1']});
 const done=ledger.entries.find(e=>e.jobId==='image:s1');
 assert.equal(done.state,'DONE');assert.deepEqual(done.resultAssetIds,['a1']);
 assert.throws(()=>updateDraftJobState(ledger,'image:s1','RUNNING'),/cannot be silently reopened/i);
});

test('detects project revision drift and marks unfinished work stale',()=>{
 const p=project(),r=report();
 let ledger=createDraftExecutionLedger(p,r,{wantAudio:false});
 const changed={...p,revision:2};
 const check=validateDraftExecutionLedger(changed,r,ledger,{wantAudio:false});
 assert.equal(check.valid,false);assert.equal(check.reason,'project-revision-changed');
 ledger=markLedgerStale(ledger,'revision changed');
 assert.ok(ledger.entries.filter(e=>!['DONE','SKIPPED','FAILED','BLOCKED','MANUAL'].includes(e.state)).every(e=>e.stale));
});

test('summary points to unfinished work and never authorizes publish',()=>{
 let ledger=createDraftExecutionLedger(project(),report(),{wantAudio:false});
 const summary=draftExecutionSummary(ledger);
 assert.ok(summary.unfinished>0);assert.equal(summary.publishAuthorized,false);assert.ok(summary.next);
 assert.equal(summary.readyForVerification,false);
});

test('settled failed work is not successful or ready for verification',()=>{
 let ledger=createDraftExecutionLedger(project(),report(),{wantAudio:false});
 ledger={...ledger,entries:ledger.entries.map(entry=>entry.state==='OPTIONAL'?entry:{...entry,state:entry.jobId==='image:s1'?'FAILED':'DONE',stale:false})};
 const summary=draftExecutionSummary(ledger);
 assert.equal(summary.settled,true);
 assert.equal(summary.complete,true);
 assert.equal(summary.successful,false);
 assert.equal(summary.readyForVerification,false);
});

test('all required DONE or SKIPPED jobs are ready for verification even with optional jobs untouched',()=>{
 let ledger=createDraftExecutionLedger(project(),report(),{wantAudio:false,wantMotion:false,wantCaptions:false});
 ledger={...ledger,entries:ledger.entries.map(entry=>entry.state==='OPTIONAL'?entry:{...entry,state:'DONE',stale:false})};
 const summary=draftExecutionSummary(ledger);
 assert.equal(summary.settled,true);
 assert.equal(summary.successful,true);
 assert.equal(summary.readyForVerification,true);
 assert.equal(summary.required,ledger.entries.filter(entry=>entry.state!=='OPTIONAL').length);
});
