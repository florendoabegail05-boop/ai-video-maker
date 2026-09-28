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
  assert.equal(result.publishAuthorized,false);
});

test('blocks when trusted dimensions do not match expected output',()=>{
  const p=project();
  const machine=machineFinalMediaFacts(p,{width:720,height:1280,duration:5,audioStream:false},'ffprobe');
  const result=finalVerificationGate(p,[machine]);
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('dimensions'));
});

test('does not let browser-only facts prove required audio stream',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{width:1080,height:1920,duration:5,fileSize:1000,mimeType:'video/mp4'});
  const result=finalVerificationGate(p,[browser],{requireAudioStream:true});
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('audio-stream'));
});

test('surfaces browser and ffprobe contradictions as blockers',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{width:1080,height:1920,duration:5});
  const machine=machineFinalMediaFacts(p,{width:720,height:1280,duration:6,audioStream:true},'ffprobe');
  const result=finalVerificationGate(p,[browser,machine]);
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('contradictions'));
});

test('stale fact sets cannot verify a changed render',()=>{
  const p=project();
  const machine=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,audioStream:true},'ffprobe');
  const changed={...p,scenes:[{...p.scenes[0],duration:6}]};
  const result=finalVerificationGate(changed,[machine],{requireAudioStream:true});
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('dimensions'));
  assert.ok(result.blockers.includes('duration'));
  assert.ok(result.blockers.includes('audio-stream'));
});

test('audio may remain informational when not required',()=>{
  const p=project();
  const machine=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5},'ffprobe');
  const result=finalVerificationGate(p,[machine],{requireAudioStream:false});
  assert.equal(result.passed,true);
  assert.equal(result.checks.find(item=>item.id==='audio-stream').state,'INFO');
});
