import test from 'node:test';
import assert from 'node:assert/strict';
import {createOneClickSession} from './one-click-orchestrator.mjs';
import {updateDraftJobState} from './draft-execution-ledger.mjs';
import {prepareNextOneClickDispatch,validateOneClickDispatch} from './one-click-dispatch-envelope.mjs';

function project(){
  return {
    id:'prompt-contract-project',revision:2,prompt:'A child walks through a moonlit garden.',style:'cinematic',hardwareMode:'light',
    bible:{character:'Mina, age 7, yellow raincoat.',world:'Moonlit garden with a blue gate.',visualRules:'Cool moonlight from camera left.'},
    scenes:[{id:'scene-1',order:1,duration:5,beat:'Mina opens the gate.',prompt:'Mina opens the blue gate.',caption:'',direction:{shot:'wide establishing shot',camera:'gentle push-in',motion:'One readable action.',continuityGoal:'Establish anchors.',audioIntent:'Garden ambience.'},assetIds:[]}],
    assets:[
      {id:'char-ref',sceneId:'scene-1',kind:'image',name:'mina.png',hasFile:true,size:10,sourcePath:'C:\\AIVM\\mina.png',status:'kept',locked:true,reference:true,referenceRole:'character',referenceLabel:'Mina master'},
      {id:'world-ref',sceneId:'scene-1',kind:'image',name:'garden.png',hasFile:true,size:10,sourcePath:'C:\\AIVM\\garden.png',status:'kept',locked:true,reference:true,referenceRole:'world',referenceLabel:'Garden master'}
    ]
  };
}

const report={imageFallback:{enabled:true},motionFallback:{enabled:true},tools:{ffmpeg:{available:true},ffprobe:{available:true}}};

test('draft planning threads the same metadata-only generation contract into guarded image dispatch',()=>{
  const p=project();
  let session=createOneClickSession(p,report,{creation:{wantAudio:false,wantMotion:false,wantCaptions:false}});
  const imageJob=session.plan.jobs.find(item=>item.id==='image:scene-1');
  assert.equal(imageJob.promptContract.kind,'aivm-v2-generation-prompt-contract');
  assert.deepEqual(imageJob.promptContract.referenceImageAssetIds,['char-ref','world-ref']);
  assert.equal(imageJob.promptContract.referenceMode,'metadata-only');

  session={...session,ledger:updateDraftJobState(session.ledger,'director:project','RUNNING')};
  session={...session,ledger:updateDraftJobState(session.ledger,'director:project','DONE')};
  const prepared=prepareNextOneClickDispatch(p,report,session,{creation:{wantAudio:false,wantMotion:false,wantCaptions:false}});
  assert.equal(prepared.prepared,true);
  assert.equal(prepared.envelope.jobType,'image');
  assert.deepEqual(prepared.envelope.payload.promptContract,imageJob.promptContract);
  assert.deepEqual(prepared.envelope.payload.characterReferenceIds,['char-ref']);
  assert.deepEqual(prepared.envelope.payload.worldReferenceIds,['world-ref']);
  assert.doesNotMatch(JSON.stringify(prepared.envelope.payload.promptContract),/C:\\\\AIVM/i);
  assert.equal(validateOneClickDispatch(p,prepared.envelope).ok,true);

  const tampered={...prepared.envelope,payload:{...prepared.envelope.payload,promptContract:{...prepared.envelope.payload.promptContract,sceneId:'other-scene'}}};
  assert.equal(validateOneClickDispatch(p,tampered).reason,'prompt-contract-mismatch');
});
