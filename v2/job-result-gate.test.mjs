import test from 'node:test';
import assert from 'node:assert/strict';
import {captureOperationGuard} from './operation-guard.mjs';
import {evaluateDraftJobResult,jobGuardOptions} from './job-result-gate.mjs';

function project(){
  return {
    id:'p1',revision:3,scenes:[{id:'s1',order:1,duration:5,prompt:'baby waves',caption:'',assetIds:['a1']}],
    assets:[{id:'a1',kind:'image',sceneId:'s1',locked:false,status:'kept',hasFile:true,size:12}],
    publishing:{}
  };
}
function ledger(){return {kind:'aivm-v2-draft-execution-ledger',entries:[{jobId:'image:s1',state:'RUNNING',stale:false,attempts:1,resultAssetIds:[]},{jobId:'assemble:final',state:'RUNNING',stale:false,attempts:1,resultAssetIds:[]}]};}

test('scene generation accepts a matching guarded result',()=>{
  const p=project(),l=ledger(),job={id:'image:s1',type:'image'};
  const guard=captureOperationGuard(p,{kind:'image',sceneId:'s1'});
  const result=evaluateDraftJobResult(p,l,job,{assetIds:['a1'],message:'done'},{guard});
  assert.equal(result.accepted,true);
  assert.equal(result.ledger.entries.find(e=>e.jobId===job.id).state,'DONE');
});

test('scene edit rejects an in-flight scene result even when unrelated revisions are allowed',()=>{
  const p=project(),job={id:'image:s1',type:'image'},guard=captureOperationGuard(p,{kind:'image',sceneId:'s1'});
  const changed={...p,revision:4,scenes:[{...p.scenes[0],prompt:'baby laughs'}]};
  const result=evaluateDraftJobResult(changed,ledger(),job,{assetIds:['a1']},{guard});
  assert.equal(result.accepted,false);
  assert.match(result.reason,/scene-changed/);
});

test('final assembly requires render signature to remain current',()=>{
  const p=project(),job={id:'assemble:final',type:'assemble'},guard=captureOperationGuard(p,{kind:'assemble'});
  const changed={...p,revision:4,scenes:[{...p.scenes[0],caption:'new'}]};
  const result=evaluateDraftJobResult(changed,ledger(),job,{assetIds:[]},{guard});
  assert.equal(result.accepted,false);
});

test('non-running and stale ledger entries reject results',()=>{
  const p=project(),job={id:'image:s1',type:'image'},guard=captureOperationGuard(p,{kind:'image',sceneId:'s1'});
  const done={...ledger(),entries:[{...ledger().entries[0],state:'DONE'},ledger().entries[1]]};
  assert.equal(evaluateDraftJobResult(p,done,job,{assetIds:['a1']},{guard}).reason,'job-not-running');
  const stale={...ledger(),entries:[{...ledger().entries[0],stale:true},ledger().entries[1]]};
  assert.equal(evaluateDraftJobResult(p,stale,job,{assetIds:['a1']},{guard}).reason,'ledger-entry-stale');
});

test('unknown or newly locked result asset is rejected',()=>{
  const p=project(),job={id:'image:s1',type:'image'},guard=captureOperationGuard(p,{kind:'image',sceneId:'s1'});
  assert.equal(evaluateDraftJobResult(p,ledger(),job,{assetIds:['missing']},{guard}).reason,'result-assets-not-in-project');
  const locked={...p,assets:[{...p.assets[0],locked:true}]};
  const lockedGuard=captureOperationGuard(locked,{kind:'image',sceneId:'s1'});
  assert.equal(evaluateDraftJobResult(locked,ledger(),job,{assetIds:['a1']},{guard:lockedGuard}).reason,'result-target-locked');
});

test('guard policy is strictest for final operations',()=>{
  assert.deepEqual(jobGuardOptions({type:'image'}),{allowUnrelatedRevision:true,requireRenderMatch:false});
  assert.deepEqual(jobGuardOptions({type:'assemble'}),{allowUnrelatedRevision:false,requireRenderMatch:true});
});
