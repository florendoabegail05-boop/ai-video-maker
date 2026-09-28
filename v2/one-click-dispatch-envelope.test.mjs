import test from 'node:test';
import assert from 'node:assert/strict';
import {createOneClickSession} from './one-click-orchestrator.mjs';
import {updateDraftJobState} from './draft-execution-ledger.mjs';
import {prepareNextOneClickDispatch,validateOneClickDispatch} from './one-click-dispatch-envelope.mjs';

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

function session(p=project(),r=report()){
  return createOneClickSession(p,r,{creation:{wantAudio:false,wantMotion:true,wantCaptions:true}});
}

test('prepares the first safe FREE ONLY job with a current guard',()=>{
  const p=project(),r=report(),s=session(p,r);
  const prepared=prepareNextOneClickDispatch(p,r,s,{creation:{wantAudio:false,wantMotion:true,wantCaptions:true}});
  assert.equal(prepared.prepared,true);
  assert.equal(prepared.envelope.jobType,'director');
  assert.equal(prepared.envelope.costMode,'FREE ONLY');
  assert.equal(prepared.envelope.paidProviderAllowed,false);
  assert.equal(prepared.envelope.externalUploadAllowed,false);
  assert.equal(prepared.envelope.publishAuthorized,false);
  assert.equal(prepared.session.ledger.entries.find(item=>item.jobId==='director:project').state,'RUNNING');
  assert.deepEqual(validateOneClickDispatch(p,prepared.envelope),{ok:true,reason:'current-free-only-guarded'});
});

test('rejects a prepared dispatch after the project revision changes',()=>{
  const p=project(),r=report(),s=session(p,r);
  const prepared=prepareNextOneClickDispatch(p,r,s,{creation:{wantAudio:false,wantMotion:true,wantCaptions:true}});
  const changed={...p,revision:2};
  const result=validateOneClickDispatch(changed,prepared.envelope);
  assert.equal(result.ok,false);
  assert.equal(result.reason,'stale-dispatch:revision-changed');
});

test('the next image job carries scene-scoped payload without local file paths',()=>{
  const p=project(),r=report();
  let s=session(p,r);
  s={...s,ledger:updateDraftJobState(s.ledger,'director:project','RUNNING')};
  s={...s,ledger:updateDraftJobState(s.ledger,'director:project','DONE')};
  const prepared=prepareNextOneClickDispatch(p,r,s,{creation:{wantAudio:false,wantMotion:true,wantCaptions:true}});
  assert.equal(prepared.prepared,true);
  assert.equal(prepared.envelope.jobType,'image');
  assert.equal(prepared.envelope.sceneId,'scene-1');
  assert.equal(prepared.envelope.payload.sceneId,'scene-1');
  assert.match(prepared.envelope.payload.prompt,/child waves/i);
  assert.equal('sourcePath' in prepared.envelope.payload,false);
});

test('paid or future-provider routes are never accepted by the dispatch validator',()=>{
  const p=project(),r=report(),s=session(p,r);
  const prepared=prepareNextOneClickDispatch(p,r,s,{creation:{wantAudio:false,wantMotion:true,wantCaptions:true}});
  const unsafe={...prepared.envelope,payload:{...prepared.envelope.payload,route:'future-provider'}};
  const result=validateOneClickDispatch(p,unsafe);
  assert.equal(result.ok,false);
  assert.equal(result.reason,'unsafe-or-paid-route');
});
