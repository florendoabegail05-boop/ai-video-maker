import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes} from './core.mjs';
import {createOneClickSession} from './one-click-orchestrator.mjs';
import {updateDraftJobState} from './draft-execution-ledger.mjs';
import {prepareNextOneClickDispatch} from './one-click-dispatch-envelope.mjs';
import {commitOneClickGeneratedMedia} from './one-click-media-commit.mjs';

function project(){return planScenes(createProject('A child waves beside a tree.'),5);}
function report(){return {imageFallback:{enabled:true},motionFallback:{enabled:true},tools:{ffmpeg:{available:true},ffprobe:{available:true}}};}
const options={creation:{wantAudio:false,wantMotion:false,wantCaptions:false}};
function imageDispatch(p,r){
  let s=createOneClickSession(p,r,options);
  s={...s,ledger:updateDraftJobState(s.ledger,'director:project','RUNNING')};
  s={...s,ledger:updateDraftJobState(s.ledger,'director:project','DONE')};
  return prepareNextOneClickDispatch(p,r,s,options);
}

test('relative generated-media result path is rejected without project mutation',()=>{
  const p=project(),r=report(),prepared=imageDispatch(p,r);
  const result=commitOneClickGeneratedMedia(p,r,prepared.session,prepared.envelope,{ok:true,sourcePath:'generated/scene.png'},options);
  assert.equal(result.accepted,false);
  assert.equal(result.reason,'relative-generated-media-path-not-allowed');
  assert.equal(result.project,p);
  assert.equal(result.session,prepared.session);
  assert.equal(p.assets.length,0);
});

test('absolute path containing parent traversal is rejected without registration',()=>{
  const p=project(),r=report(),prepared=imageDispatch(p,r);
  const result=commitOneClickGeneratedMedia(p,r,prepared.session,prepared.envelope,{ok:true,sourcePath:'C:\\AIVM\\media\\..\\outside.png'},options);
  assert.equal(result.accepted,false);
  assert.equal(result.reason,'generated-media-path-traversal');
  assert.equal(result.registeredMedia,false);
  assert.equal(result.project.assets.length,0);
});

test('unsupported generated-media extension is rejected',()=>{
  const p=project(),r=report(),prepared=imageDispatch(p,r);
  const result=commitOneClickGeneratedMedia(p,r,prepared.session,prepared.envelope,{ok:true,sourcePath:'C:\\AIVM\\media\\scene.exe'},options);
  assert.equal(result.accepted,false);
  assert.equal(result.reason,'generated-media-extension-not-allowed');
  assert.equal(result.project.assets.length,0);
});
