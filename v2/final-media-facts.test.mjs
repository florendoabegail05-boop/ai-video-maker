import test from 'node:test';
import assert from 'node:assert/strict';
import {browserFinalMediaFacts,machineFinalMediaFacts,reconcileFinalMediaFacts} from './final-media-facts.mjs';

function project(){return {id:'p1',revision:1,scenes:[{id:'s1',order:1,duration:5,prompt:'x',caption:'',assetIds:[]}],assets:[]};}

test('browser facts do not invent stream or fps evidence',()=>{
  const p=project();
  const facts=browserFinalMediaFacts(p,{width:1080,height:1920,duration:5,fileSize:123,mimeType:'video/mp4'});
  assert.equal(facts.evidence.width.trusted,true);
  assert.equal(facts.evidence.height.trusted,true);
  assert.equal(facts.evidence.audioStream,undefined);
  assert.equal(facts.evidence.fps,undefined);
});

test('ffprobe facts can verify audio stream, fps and target resolution',()=>{
  const p=project();
  const facts=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,fps:30,audioStream:true,videoCodec:'h264',audioCodec:'aac',container:'mov,mp4'},'ffprobe');
  assert.equal(facts.evidence.audioStream.value,true);
  assert.equal(facts.evidence.audioStream.trusted,true);
  assert.equal(facts.evidence.fps.value,true);
  assert.equal(facts.evidence.resolution1080x1920.value,true);
  assert.equal(facts.evidence.resolution2160x3840.value,false);
});

test('audio stream does not become native audio claim',()=>{
  const p=project();
  const facts=machineFinalMediaFacts(p,{audioStream:true},'ffprobe');
  assert.equal(facts.evidence.nativeAudio,undefined);
  assert.match(facts.note,/does not prove native generated audio/i);
});

test('reconciliation prefers explicit machine facts and surfaces material contradictions',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{width:720,height:1280,duration:5});
  const machine=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,fps:30,audioStream:false},'ffprobe');
  const out=reconcileFinalMediaFacts(p,browser,machine);
  assert.equal(out.selected.width.source,'ffprobe');
  assert.equal(out.selected.audioStream.value,false);
  assert.equal(out.hasContradictions,true);
  assert.ok(out.contradictions.some(item=>item.field==='width'));
  assert.equal(out.publishAuthorized,false);
});

test('browser dimensions and duration fill current trusted gaps when machine evidence is unknown',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{width:1080,height:1920,duration:5,fileSize:123,mimeType:'video/mp4'});
  const machine=machineFinalMediaFacts(p,{width:null,height:null,duration:null,fps:30,audioStream:null},'ffprobe');
  const out=reconcileFinalMediaFacts(p,machine,browser);
  assert.equal(out.selected.width.source,'browser');
  assert.equal(out.selected.width.value,true);
  assert.equal(out.selected.height.source,'browser');
  assert.equal(out.selected.duration.source,'browser');
  assert.equal(out.selected.fileSize.source,'browser');
  assert.equal(out.selected.mimeType.source,'browser');
  assert.equal(out.selected.fps.source,'ffprobe');
});

test('machine-only technical fields never fall back to browser facts',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{width:1080,height:1920,duration:5,mimeType:'video/mp4'});
  const machine=machineFinalMediaFacts(p,{audioStream:null,fps:null,videoCodec:null,audioCodec:null,container:null},'ffprobe');
  const out=reconcileFinalMediaFacts(p,browser,machine);
  assert.equal(out.selected.audioStream.source,'ffprobe');
  assert.equal(out.selected.audioStream.value,null);
  assert.equal(out.selected.fps.source,'ffprobe');
  assert.equal(out.selected.fps.value,null);
  assert.equal(out.selected.videoCodec.value,null);
  assert.equal(out.selected.audioCodec.value,null);
  assert.equal(out.selected.container.value,null);
});

test('small browser versus ffprobe duration rounding does not create a contradiction',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{duration:5});
  const machine=machineFinalMediaFacts(p,{duration:5.01},'ffprobe');
  const out=reconcileFinalMediaFacts(p,browser,machine);
  assert.equal(out.hasContradictions,false);
  assert.equal(out.durationContradictionToleranceSeconds,0.05);
});

test('material browser versus ffprobe duration disagreement remains a contradiction',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{duration:5});
  const machine=machineFinalMediaFacts(p,{duration:5.2},'ffprobe');
  const out=reconcileFinalMediaFacts(p,browser,machine);
  assert.equal(out.hasContradictions,true);
  const duration=out.contradictions.find(item=>item.field==='duration');
  assert.ok(duration);
  assert.ok(duration.deltaSeconds>out.durationContradictionToleranceSeconds);
});

test('stale render-bound fact sets are ignored',()=>{
  const p=project();
  const facts=machineFinalMediaFacts(p,{width:1080,height:1920,audioStream:true},'ffprobe');
  const changed={...p,scenes:[{...p.scenes[0],duration:6}]};
  const out=reconcileFinalMediaFacts(changed,facts);
  assert.equal(out.selected.audioStream,null);
  assert.equal(out.selected.width,null);
});

test('portable reconciliation excludes local paths',()=>{
  const p=project();
  const facts=machineFinalMediaFacts(p,{width:1080,height:1920,audioStream:true,sourcePath:'C:\\secret\\video.mp4'},'bridge');
  const out=reconcileFinalMediaFacts(p,facts);
  const json=JSON.stringify(out);
  assert.equal(json.includes('C:\\secret'),false);
  assert.equal(out.portable,true);
});
