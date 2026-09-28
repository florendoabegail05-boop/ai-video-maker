import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDraftJobPlan,nextDraftJob} from './draft-job-plan.mjs';

function project(){return{
  id:'p1',revision:3,prompt:'Make a funny short',style:'cinematic',hardwareMode:'light',
  scenes:[
    {id:'s1',order:1,duration:5,prompt:'Baby looks serious in a bedroom',caption:'Boss is watching',assetIds:[]},
    {id:'s2',order:2,duration:5,prompt:'Mom carries laundry behind him',caption:'Work harder',assetIds:[]}
  ],
  assets:[]
};}

const available={
  freeOnlyImageWorkflow:true,
  imageFallback:{enabled:true},motionFallback:{enabled:true},
  tools:{ffmpeg:{available:true},ffprobe:{available:true}},
  quality:{},freeOnlyVoiceWorkflow:false,freeOnlyMusicWorkflow:false,freeOnlySfxWorkflow:false,freeOnlyLipSyncWorkflow:false
};

test('builds ordered FREE ONLY jobs per scene and final stages',()=>{
  const plan=buildDraftJobPlan(project(),available);
  assert.equal(plan.costMode,'FREE ONLY');
  assert.equal(plan.automaticPublishingAllowed,false);
  assert.equal(plan.jobs.filter(item=>item.type==='image').length,2);
  assert.equal(plan.jobs.filter(item=>item.type==='motion').length,2);
  assert.equal(plan.jobs.find(item=>item.id==='assemble:final').state,'READY');
  assert.equal(plan.jobs.find(item=>item.id==='verify:final').state,'READY');
  assert.equal(plan.jobs.find(item=>item.id==='audio:project').state,'MANUAL');
  assert.match(plan.jobs.find(item=>item.id==='image:s1').directorBrief,/AI DIRECTOR BRIEF/);
});

test('falls back to manual images without a verified image route and never invents paid routing',()=>{
  const report={tools:{ffmpeg:{available:true},ffprobe:{available:true}},imageFallback:{enabled:false},motionFallback:{enabled:false},quality:{}};
  const plan=buildDraftJobPlan(project(),report,{wantMotion:false,wantAudio:false});
  assert.equal(plan.jobs.find(item=>item.id==='image:s1').state,'MANUAL');
  assert.equal(plan.jobs.find(item=>item.id==='image:s1').route,'unavailable');
  assert.equal(plan.costMode,'FREE ONLY');
});

test('blocked FFmpeg/FFprobe become the next priority before ready jobs',()=>{
  const report={freeOnlyImageWorkflow:true,imageFallback:{enabled:true},motionFallback:{enabled:true},tools:{ffmpeg:{available:false},ffprobe:{available:false}},quality:{}};
  const plan=buildDraftJobPlan(project(),report,{wantAudio:false});
  assert.equal(plan.jobs.find(item=>item.id==='assemble:final').state,'BLOCKED');
  assert.equal(plan.jobs.find(item=>item.id==='verify:final').state,'BLOCKED');
  assert.equal(nextDraftJob(project(),report,{wantAudio:false}).id,'assemble:final');
});

test('does not mutate project or expose automatic destructive/publishing permission',()=>{
  const p=project();const before=JSON.stringify(p);
  const plan=buildDraftJobPlan(p,available);
  assert.equal(JSON.stringify(p),before);
  assert.ok(plan.jobs.every(item=>item.destructive!==true));
  assert.equal(plan.ownerApprovalRequired,false);
  assert.equal(plan.automaticPublishingAllowed,false);
});
