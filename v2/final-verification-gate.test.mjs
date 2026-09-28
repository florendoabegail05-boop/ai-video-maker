import test from 'node:test';
import assert from 'node:assert/strict';
import {browserFinalMediaFacts,machineFinalMediaFacts} from './final-media-facts.mjs';
import {finalVerificationGate} from './final-verification-gate.mjs';

function project(){return {id:'p1',revision:1,scenes:[{id:'s1',order:1,duration:5,assetIds:[]}],assets:[]};}

test('passes core technical gate with trusted matching machine facts',()=>{
  const p=project();
  const machine=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,fps:30,audioStream:true,videoCodec:'h264',audioCodec:'aac',container:'mov,mp4'},'ffprobe');
  const result=finalVerificationGate(p,[machine],{requireAudioStream:true,requireFps:true,requireCodecs:true,requireContainer:true});
  assert.equal(result.passed,true);
  assert.deepEqual(result.blockers,[]);
  assert.deepEqual(result.blockerReasons,[]);
  assert.equal(result.publishAuthorized,false);
});

test('blocks known wrong dimensions with a hard mismatch reason',()=>{
  const p=project();
  const machine=machineFinalMediaFacts(p,{width:720,height:1280,duration:5,audioStream:false},'ffprobe');
  const result=finalVerificationGate(p,[machine]);
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('dimensions'));
  assert.ok(result.blockerReasons.includes('dimensions-mismatch'));
});

test('current browser dimensions and duration can fill unknown machine facts for browser-observable fields',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{width:1080,height:1920,duration:5,fileSize:1000,mimeType:'video/mp4'});
  const machine=machineFinalMediaFacts(p,{width:null,height:null,duration:null,audioStream:null},'ffprobe');
  const result=finalVerificationGate(p,[machine,browser]);
  assert.equal(result.passed,true);
  assert.equal(result.checks.find(item=>item.id==='dimensions').state,'PASS');
  assert.equal(result.checks.find(item=>item.id==='duration').state,'PASS');
  assert.equal(result.reconciliation.selected.width.source,'browser');
});

test('does not let browser-only facts prove required audio stream',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{width:1080,height:1920,duration:5,fileSize:1000,mimeType:'video/mp4'});
  const result=finalVerificationGate(p,[browser],{requireAudioStream:true});
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('audio-stream'));
  assert.ok(result.blockerReasons.includes('audio-unknown'));
});

test('verified missing required audio is distinguished from unknown audio',()=>{
  const p=project();
  const machine=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,audioStream:false},'ffprobe');
  const result=finalVerificationGate(p,[machine],{requireAudioStream:true});
  assert.equal(result.passed,false);
  assert.ok(result.blockerReasons.includes('audio-absent'));
});

test('surfaces browser and ffprobe contradictions as hard blockers',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{width:1080,height:1920,duration:5});
  const machine=machineFinalMediaFacts(p,{width:720,height:1280,duration:6,audioStream:true},'ffprobe');
  const result=finalVerificationGate(p,[browser,machine]);
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('contradictions'));
  assert.ok(result.blockerReasons.includes('facts-contradict'));
});

test('stale fact sets cannot verify a changed render and are classified as unknown evidence',()=>{
  const p=project();
  const machine=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,audioStream:true},'ffprobe');
  const changed={...p,scenes:[{...p.scenes[0],duration:6}]};
  const result=finalVerificationGate(changed,[machine],{requireAudioStream:true});
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('dimensions'));
  assert.ok(result.blockers.includes('duration'));
  assert.ok(result.blockers.includes('audio-stream'));
  assert.ok(result.blockerReasons.includes('dimensions-unknown'));
  assert.ok(result.blockerReasons.includes('duration-unknown'));
  assert.ok(result.blockerReasons.includes('audio-unknown'));
});

test('audio may remain informational when not required',()=>{
  const p=project();
  const machine=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5},'ffprobe');
  const result=finalVerificationGate(p,[machine],{requireAudioStream:false});
  assert.equal(result.passed,true);
  assert.equal(result.checks.find(item=>item.id==='audio-stream').state,'INFO');
});
