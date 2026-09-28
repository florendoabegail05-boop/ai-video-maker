import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCreationPlan,nextCreationStep} from './creation-plan.mjs';

const project={id:'p1',revision:1,scenes:[],assets:[]};

function report(overrides={}){
  return {
    freeOnlyImageWorkflow:false,
    imageFallback:{enabled:true},
    motionFallback:{enabled:true},
    tools:{ffmpeg:{available:true},ffprobe:{available:true}},
    quality:{},
    ...overrides
  };
}

test('uses verified FREE ONLY fallbacks and keeps generated audio manual when unavailable',()=>{
  const plan=buildCreationPlan(project,report());
  assert.equal(plan.costMode,'FREE ONLY');
  assert.equal(plan.canCreateDraft,true);
  assert.equal(plan.canAssembleFinal,true);
  assert.equal(plan.canVerifyFinal,true);
  assert.deepEqual(plan.blockers,[]);
  assert.deepEqual(plan.manualSteps,['audio']);
  assert.equal(plan.stages.find(item=>item.id==='images').route,'basic-local-still');
  assert.equal(plan.stages.find(item=>item.id==='motion').route,'ffmpeg-camera-motion');
  assert.equal(plan.ownerApprovalRequired,false);
});

test('blocks image generation when no verified free image route exists but documents import fallback',()=>{
  const plan=buildCreationPlan(project,report({imageFallback:{enabled:false}}));
  assert.equal(plan.canCreateDraft,false);
  assert.ok(plan.blockers.includes('images'));
  assert.match(plan.stages.find(item=>item.id==='images').message,/Importing owner media/);
});

test('final assembly and trusted verification are independently blocked by missing tools',()=>{
  const plan=buildCreationPlan(project,report({tools:{ffmpeg:{available:false},ffprobe:{available:false}}}));
  assert.equal(plan.canAssembleFinal,false);
  assert.equal(plan.canVerifyFinal,false);
  assert.ok(plan.blockers.includes('assemble'));
  assert.ok(plan.blockers.includes('verify'));
});

test('optional motion does not create a blocker when no video route exists',()=>{
  const plan=buildCreationPlan(project,report({motionFallback:{enabled:false}}));
  const motion=plan.stages.find(item=>item.id==='motion');
  assert.equal(motion.state,'OPTIONAL');
  assert.ok(!plan.blockers.includes('motion'));
});

test('next creation step prefers a real blocker over manual or ready stages',()=>{
  const next=nextCreationStep(project,report({imageFallback:{enabled:false}}));
  assert.equal(next.id,'images');
});
