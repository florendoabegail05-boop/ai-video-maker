import test from 'node:test';
import assert from 'node:assert/strict';
import {oneClickStatusView} from './one-click-status-view.mjs';
import {createOneClickSession} from './one-click-orchestrator.mjs';

function project(){return {id:'p1',revision:1,prompt:'demo',style:'custom',hardwareMode:'light',scenes:[{id:'s1',order:1,duration:5,prompt:'scene one',assetIds:[]}],assets:[]};}
function report(){return {imageFallback:{enabled:true},motionFallback:{enabled:true},tools:{ffmpeg:{available:true},ffprobe:{available:true}}};}

test('status view starts with creation progress and no publish authority',()=>{
  const p=project(),r=report(),s=createOneClickSession(p,r);
  const view=oneClickStatusView(p,r,s);
  assert.equal(view.kind,'aivm-v2-one-click-status-view');
  assert.equal(view.progress,0);
  assert.equal(view.publishAuthorized,false);
  assert.equal(view.automaticPublishingAllowed,false);
  assert.equal(view.sections[0].state,'DONE');
});

test('changed project requires replan instead of continuing stale session',()=>{
  const p=project(),r=report(),s=createOneClickSession(p,r);
  const changed={...p,revision:2};
  const view=oneClickStatusView(changed,r,s);
  assert.equal(view.state,'REPLAN REQUIRED');
  assert.equal(view.nextAction,'REPLAN');
  assert.equal(view.publishAuthorized,false);
});
