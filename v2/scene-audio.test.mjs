import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSceneAudio,setSceneAudio,sceneAudioSummary,projectAudioPlan,generatedAudioAvailability} from './scene-audio.mjs';

const base={scenes:[{id:'s1',order:1},{id:'s2',order:2}]};

test('scene audio metadata is normalized without changing other scenes',()=>{
  const next=setSceneAudio(base,'s1',{dialogue:'  Hello   there  ',voiceId:'mom',ambience:'kitchen room tone',sfx:'plate clink',musicCue:'soft intro'});
  assert.equal(next.scenes[0].dialogue,'Hello there');
  assert.equal(next.scenes[1].dialogue,undefined);
  assert.equal(base.scenes[0].dialogue,undefined);
});

test('dialogue without a voice is flagged for assignment',()=>{
  const project=setSceneAudio(base,'s1',{dialogue:'Hi'});
  const summary=sceneAudioSummary(project,'s1');
  assert.equal(summary.hasDialogue,true);
  assert.equal(summary.needsVoiceAssignment,true);
});

test('project plan preserves scene order',()=>{
  const project=setSceneAudio(base,'s2',{sfx:'door opens'});
  const plan=projectAudioPlan(project);
  assert.deepEqual(plan.map(item=>item.order),[1,2]);
  assert.equal(plan[1].hasAudioCue,true);
});

test('generated audio stays unavailable unless capability is explicitly verified',()=>{
  assert.deepEqual(generatedAudioAvailability({}),{voice:false,ambience:false,sfx:false,music:false,lipSync:false,note:'Manual local audio import remains available even when generated-audio routes are unavailable.'});
  assert.equal(generatedAudioAvailability({freeOnlyVoiceWorkflow:true}).voice,true);
});

test('missing scene fails',()=>assert.throws(()=>setSceneAudio(base,'missing',{}),/Scene missing/));

test('normalizer enforces compact field limits',()=>assert.equal(normalizeSceneAudio({dialogue:'x'.repeat(800)}).dialogue.length,500));
